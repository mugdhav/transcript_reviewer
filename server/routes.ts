import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import * as fs from "fs";
import * as path from "path";
import { storage } from "./storage";
import { transcribeAudio, generateSrtContent } from "./transcription";
import { correctionRequestSchema } from "@shared/schema";
import { cleanupJob, startCleanupSchedule } from "./cleanup";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

if (!process.env.GOOGLE_API_KEY) {
  console.warn("WARNING: GOOGLE_API_KEY is not set. AI features will fail.");
}

// Configure multer for file uploads
const upload = multer({
  dest: "/tmp/uploads",
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["audio/mpeg", "audio/mp3", "video/mp4"];
    const allowedExts = [".mp3", ".mp4"];

    const ext = path.extname(file.originalname).toLowerCase();
    const isValidMime = allowedMimes.includes(file.mimetype);
    const isValidExt = allowedExts.includes(ext);

    if (isValidMime || isValidExt) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only MP3 and MP4 files are allowed."));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Start the cleanup schedule
  startCleanupSchedule();

  // Serve documentation
  app.use("/docs", (await import("express")).default.static(path.resolve(process.cwd(), "docs")));

  // Upload file and start transcription
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded"
        });
      }

      const { context } = req.body;
      const userContext = context && typeof context === "string" ? context.trim() : undefined;

      // Validate context length (100 words max)
      if (userContext) {
        const wordCount = userContext.split(/\s+/).filter(Boolean).length;
        if (wordCount > 100) {
          fs.unlinkSync(req.file.path);
          return res.status(400).json({
            success: false,
            message: "Context must be 100 words or less",
          });
        }
      }

      // Create job
      const job = await storage.createJob(
        req.file.originalname,
        req.file.size,
        req.file.mimetype,
        userContext,
        req.file.path // Pass the path to store it
      );

      // Start transcription in background
      processTranscription(job.id, req.file.path, req.file.mimetype, userContext).catch(err => {
        console.error("Transcription error:", err);
        storage.updateJobError(job.id, err.message || "Transcription failed");
      });

      // Update status to uploading
      await storage.updateJobStatus(job.id, "uploading", 5);

      res.json({
        success: true,
        data: job,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Upload failed",
      });
    }
  });

  // Stream media file
  app.get("/api/jobs/:id/media", async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job || !(job as any).localFilePath) {
        return res.status(404).json({ message: "Media not found" });
      }

      const filePath = (job as any).localFilePath;
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File no longer exists" });
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': job.fileType,
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': job.fileType,
        };
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to stream media" });
    }
  });

  // Get job status
  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Job not found",
        });
      }

      res.json({
        success: true,
        data: job,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get job status",
      });
    }
  });

  // Apply correction
  app.post("/api/corrections", async (req, res) => {
    try {
      const parseResult = correctionRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid request body",
        });
      }

      const { jobId, anomalyId, correction, applyToSimilar } = parseResult.data;

      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Job not found",
        });
      }

      const anomaly = job.anomalies?.find(a => a.id === anomalyId);
      if (!anomaly) {
        return res.status(404).json({
          success: false,
          message: "Anomaly not found",
        });
      }

      if (applyToSimilar) {
        const count = await storage.applySimilarCorrections(
          jobId,
          anomaly.flaggedText,
          correction
        );

        res.json({
          success: true,
          message: `Applied correction to ${count} occurrence(s)`,
        });
      } else {
        await storage.applyCorrection(jobId, anomalyId, correction);

        res.json({
          success: true,
          message: "Correction applied",
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to apply correction",
      });
    }
  });

  // Manual segment update
  app.patch("/api/jobs/:id/segments/:segmentId", async (req, res) => {
    try {
      const jobId = req.params.id;
      const segmentId = parseInt(req.params.segmentId);
      const { text } = req.body;

      if (isNaN(segmentId) || typeof text !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid segment update request",
        });
      }

      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Job not found",
        });
      }

      await storage.updateSegmentText(jobId, segmentId, text);

      res.json({
        success: true,
        message: "Segment updated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update segment",
      });
    }
  });

  // Export SRT
  app.get("/api/jobs/:id/export", async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Job not found",
        });
      }

      if (!job.segments) {
        return res.status(400).json({
          success: false,
          message: "No transcript available",
        });
      }

      const srtContent = generateSrtContent(job.segments);
      const fileName = job.fileName.replace(/\.(mp3|mp4)$/i, ".srt");

      res.setHeader("Content-Type", "text/srt");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.send(srtContent);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to export SRT",
      });
    }
  });

  // Cleanup Job File
  app.post("/api/cleanup/:id", async (req, res) => {
    try {
      const jobId = req.params.id;
      await cleanupJob(jobId);
      res.json({ success: true, message: "Cleanup initiated" });
    } catch (error) {
      console.error("Cleanup error:", error);
      res.status(500).json({ success: false, message: "Cleanup failed" });
    }
  });

  return httpServer;
}

// Background transcription processing
async function processTranscription(
  jobId: string,
  filePath: string,
  mimeType: string,
  userContext?: string
): Promise<void> {
  try {
    await storage.updateJobStatus(jobId, "processing", 10);

    const { segments, anomalies } = await transcribeAudio(
      filePath,
      mimeType,
      userContext,
      async (status, progress, message) => {
        const statusMap: Record<string, "processing" | "transcribing" | "analyzing" | "completed"> = {
          processing: "processing",
          transcribing: "transcribing",
          analyzing: "analyzing",
          completed: "completed",
        };
        await storage.updateJobStatus(jobId, statusMap[status] || "processing", progress, message);
      }
    );

    await storage.setJobSegments(jobId, segments);
    await storage.setJobAnomalies(jobId, anomalies);
    await storage.updateJobStatus(jobId, "completed", 100);

  } catch (error) {
    await storage.updateJobError(jobId, error instanceof Error ? error.message : "Transcription failed");
    throw error;
  }
}
