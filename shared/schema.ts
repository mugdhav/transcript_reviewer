import { z } from "zod";

// SRT Segment representing a single subtitle entry
export const srtSegmentSchema = z.object({
  id: z.number(),
  startTime: z.string(), // Format: "00:00:00,000"
  endTime: z.string(),   // Format: "00:00:00,000"
  text: z.string(),
  originalText: z.string().optional(),
});

export type SrtSegment = z.infer<typeof srtSegmentSchema>;

// Anomaly types
export const anomalyTypeSchema = z.enum([
  "unusual_sentence",
  "out_of_context",
  "similar_sounding",
  "grammar_issue",
]);

export type AnomalyType = z.infer<typeof anomalyTypeSchema>;

// Detected anomaly in SRT
export const anomalySchema = z.object({
  id: z.string(),
  segmentId: z.number(),
  type: anomalyTypeSchema,
  flaggedText: z.string(),
  suggestion: z.string(),
  confidence: z.number().min(0).max(1),
  context: z.string().optional(),
  resolved: z.boolean().default(false),
  userCorrection: z.string().optional(),
});

export type Anomaly = z.infer<typeof anomalySchema>;

// Transcription job status
export const jobStatusSchema = z.enum([
  "pending",
  "uploading",
  "processing",
  "transcribing",
  "analyzing",
  "completed",
  "failed",
]);

export type JobStatus = z.infer<typeof jobStatusSchema>;

// Main transcription job
export const transcriptionJobSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
  fileType: z.enum(["mp3", "mp4", "audio/mpeg", "audio/mp3", "video/mp4"]),
  status: jobStatusSchema,
  progress: z.number().min(0).max(100),
  userContext: z.string().max(500).optional(),
  segments: z.array(srtSegmentSchema).optional(),
  anomalies: z.array(anomalySchema).optional(),
  mediaUrl: z.string().optional(),
  createdAt: z.string(),
  completedAt: z.string().optional(),
  errorMessage: z.string().optional(),
});

export type TranscriptionJob = z.infer<typeof transcriptionJobSchema>;

// Upload request
export const uploadRequestSchema = z.object({
  userContext: z.string().max(500).optional(),
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;

// Correction request
export const correctionRequestSchema = z.object({
  jobId: z.string(),
  anomalyId: z.string(),
  correction: z.string(),
  applyToSimilar: z.boolean().default(false),
});

export type CorrectionRequest = z.infer<typeof correctionRequestSchema>;

// Batch correction request
export const batchCorrectionRequestSchema = z.object({
  jobId: z.string(),
  corrections: z.array(z.object({
    anomalyId: z.string(),
    correction: z.string(),
  })),
});

export type BatchCorrectionRequest = z.infer<typeof batchCorrectionRequestSchema>;

// API response types
export const apiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any().optional(),
});

export type ApiResponse<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
};

// Similar anomalies for batch correction
export const similarAnomaliesSchema = z.object({
  original: anomalySchema,
  similar: z.array(anomalySchema),
});

export type SimilarAnomalies = z.infer<typeof similarAnomaliesSchema>;

// Update segment request
export const updateSegmentRequestSchema = z.object({
  jobId: z.string(),
  segmentId: z.number(),
  text: z.string(),
});

export type UpdateSegmentRequest = z.infer<typeof updateSegmentRequestSchema>;
