import { GoogleGenAI, Type } from "@google/genai";
import * as fs from "fs";
import type { SrtSegment, Anomaly } from "@shared/schema";
import { randomUUID } from "crypto";
import ffmpeg from "fluent-ffmpeg";

if (!process.env.GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY is not set in environment variables");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY as string
});

// Helper to extract audio from video
async function extractAudio(inputPath: string): Promise<string> {
  const outputPath = inputPath + ".mp3";

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat("mp3")
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err))
      .save(outputPath);
  });
}

// Format time in SRT format: HH:MM:SS,mmm
function formatSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}

// Helper to review segments using an LLM for semantics and grammar
async function reviewSegmentsWithLLM(
  segments: SrtSegment[],
  userContext?: string
): Promise<Anomaly[]> {
  if (segments.length === 0) return [];

  const anomalies: Anomaly[] = [];
  // Gemini 3 Flash handles much larger context
  const batchSize = 50;

  for (let i = 0; i < segments.length; i += batchSize) {
    const batch = segments.slice(i, i + batchSize);
    const textToReview = batch.map(s => `[${s.id}] ${s.text}`).join("\n");

    const prompt = `Task: Review the following subtitle segments for grammar, spelling, and semantic errors.
Context: ${userContext || "General speech"}

Instructions:
1. Identify any words or phrases that are used incorrectly in the given context.
2. Use the provided Context to identify subject matter, names, and terminology.
3. Check for homophones that don't fit the sentence context.
4. Flag corrections as "autoFix": true only if you are 100% confident.

Segments:
${textToReview}`;

    try {
      const result = await ai.models.generateContent({
        model: "gemini-3-flash",
        contents: [{ text: prompt }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                segmentId: { type: Type.NUMBER },
                flaggedText: { type: Type.STRING },
                suggestion: { type: Type.STRING },
                reason: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                autoFix: { type: Type.BOOLEAN }
              },
              required: ["segmentId", "flaggedText", "suggestion", "reason", "confidence", "autoFix"],
            },
          },
        },
      });

      const detected = JSON.parse(result.text as string);
      for (const item of detected) {
        anomalies.push({
          id: randomUUID(),
          segmentId: item.segmentId,
          type: "grammar_issue",
          flaggedText: item.flaggedText,
          suggestion: item.suggestion,
          confidence: item.confidence || 0.85,
          context: item.reason + (item.autoFix ? " (Auto-applied)" : ""),
          resolved: item.autoFix || false,
          userCorrection: item.autoFix ? item.suggestion : undefined,
        });
      }
    } catch (e) {
      console.error(`LLM review failed for batch starting at index ${i}:`, e);
    }
  }

  return anomalies;
}

// Analyze text for potential anomalies based on rules and LLM
async function analyzeForAnomalies(
  segments: SrtSegment[],
  userContext?: string
): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = [];

  // 1. Run rule-based checks first (fast)
  for (const segment of segments) {
    const text = segment.text;

    // Check for repeated words
    const repeatedWordMatch = text.match(/\b(\w+)\s+\1\b/i);
    if (repeatedWordMatch) {
      anomalies.push({
        id: randomUUID(),
        segmentId: segment.id,
        type: "grammar_issue",
        flaggedText: repeatedWordMatch[0],
        suggestion: repeatedWordMatch[1],
        confidence: 0.9,
        context: "Repeated word detected",
        resolved: false,
      });
    }
  }

  // 2. Run LLM-based semantic and grammar check
  const llmAnomalies = await reviewSegmentsWithLLM(segments, userContext);

  // Merge anomalies, applying auto-fixes
  const finalAnomalies = [...anomalies];
  for (const llmAnom of llmAnomalies) {
    if (llmAnom.resolved && llmAnom.userCorrection) {
      const segment = segments.find(s => s.id === llmAnom.segmentId);
      if (segment) {
        segment.text = segment.text.replace(llmAnom.flaggedText, llmAnom.userCorrection);
      }
    }

    const isDuplicate = finalAnomalies.some(
      a => a.segmentId === llmAnom.segmentId &&
        a.flaggedText.toLowerCase() === llmAnom.flaggedText.toLowerCase()
    );
    if (!isDuplicate) {
      finalAnomalies.push(llmAnom);
    }
  }

  return finalAnomalies;
}

export async function transcribeAudio(
  filePath: string,
  mimeType: string,
  userContext?: string,
  onProgress?: (status: string, progress: number) => void
): Promise<{ segments: SrtSegment[]; anomalies: Anomaly[] }> {
  try {
    let processPath = filePath;
    let processMimeType = mimeType;
    let tempAudioPath: string | undefined;

    // Even though Gemini handles video, extracting audio can be faster/smaller for API transfer
    if (mimeType.startsWith("video/")) {
      onProgress?.("processing", 10);
      tempAudioPath = await extractAudio(filePath);
      processPath = tempAudioPath;
      processMimeType = "audio/mpeg";
    }

    onProgress?.("processing", 20);

    // Read the audio file
    const nodeBuffer = fs.readFileSync(processPath);
    const audioBase64 = nodeBuffer.toString("base64");

    onProgress?.("transcribing", 30);

    // Call Gemini 3 Flash for transcription with structured output
    const prompt = `Transcribe this audio. Return as a JSON array of subtitle segments.
Each segment must have: id (number), startTime (string HH:MM:SS,mmm), endTime (string HH:MM:SS,mmm), and text (string).
Context to help with terminology: ${userContext || "General speech"}`;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash",
      contents: [
        { inlineData: { mimeType: processMimeType, data: audioBase64 } },
        { text: prompt }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.NUMBER },
              startTime: { type: Type.STRING },
              endTime: { type: Type.STRING },
              text: { type: Type.STRING }
            },
            required: ["id", "startTime", "endTime", "text"]
          }
        }
      }
    });

    // Cleanup extraction temp file
    if (tempAudioPath) {
      try {
        fs.unlinkSync(tempAudioPath);
      } catch { /* ignore */ }
    }

    onProgress?.("transcribing", 70);

    const segments: SrtSegment[] = JSON.parse(result.text as string);

    // Add originalText for tracking
    segments.forEach(s => { s.originalText = s.text; });

    onProgress?.("analyzing", 85);

    // Analyze for anomalies
    const anomalies = await analyzeForAnomalies(segments, userContext);

    onProgress?.("completed", 100);

    return { segments, anomalies };
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
}

export function generateSrtContent(segments: SrtSegment[]): string {
  return segments.map(segment => {
    return `${segment.id}\n${segment.startTime} --> ${segment.endTime}\n${segment.text}\n`;
  }).join("\n");
}
