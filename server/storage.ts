import { randomUUID } from "crypto";
import type {
  TranscriptionJob,
  SrtSegment,
  Anomaly,
  JobStatus,
  CorrectionRequest
} from "@shared/schema";

export interface IStorage {
  createJob(fileName: string, fileSize: number, fileType: string, userContext?: string): Promise<TranscriptionJob>;
  getJob(id: string): Promise<TranscriptionJob | undefined>;
  updateJobStatus(id: string, status: JobStatus, progress?: number, statusMessage?: string): Promise<void>;
  updateJobError(id: string, errorMessage: string): Promise<void>;
  setJobSegments(id: string, segments: SrtSegment[]): Promise<void>;
  setJobAnomalies(id: string, anomalies: Anomaly[]): Promise<void>;
  applyCorrection(jobId: string, anomalyId: string, correction: string): Promise<void>;
  applySimilarCorrections(jobId: string, flaggedText: string, correction: string): Promise<number>;
  updateSegmentText(jobId: string, segmentId: number, newText: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private jobs: Map<string, TranscriptionJob>;

  constructor() {
    this.jobs = new Map();
  }

  async createJob(
    fileName: string,
    fileSize: number,
    fileType: string,
    userContext?: string,
    localFilePath?: string
  ): Promise<TranscriptionJob> {
    const id = randomUUID();
    const job: TranscriptionJob = {
      id,
      fileName,
      fileSize,
      fileType: (fileType || "audio/mpeg") as "mp3" | "mp4" | "audio/mpeg" | "audio/mp3" | "video/mp4",
      status: "pending",
      progress: 0,
      userContext,
      mediaUrl: `/api/jobs/${id}/media`,
      createdAt: new Date().toISOString(),
    };

    // Store local path internally (not in schema)
    (job as any).localFilePath = localFilePath;

    this.jobs.set(id, job);
    return job;
  }

  async getJob(id: string): Promise<TranscriptionJob | undefined> {
    return this.jobs.get(id);
  }

  async updateJobStatus(id: string, status: JobStatus, progress?: number, statusMessage?: string): Promise<void> {
    const job = this.jobs.get(id);
    if (job) {
      job.status = status;
      if (progress !== undefined) {
        job.progress = progress;
      }
      if (statusMessage !== undefined) {
        job.statusMessage = statusMessage;
      } else if (status !== "failed") {
        // Clear status message if not explicitly set and not failed
        job.statusMessage = undefined;
      }
      if (status === "completed") {
        job.completedAt = new Date().toISOString();
      }
      this.jobs.set(id, job);
    }
  }

  async updateJobError(id: string, errorMessage: string): Promise<void> {
    const job = this.jobs.get(id);
    if (job) {
      job.status = "failed";
      job.errorMessage = errorMessage;
      this.jobs.set(id, job);
    }
  }

  async setJobSegments(id: string, segments: SrtSegment[]): Promise<void> {
    const job = this.jobs.get(id);
    if (job) {
      job.segments = segments;
      this.jobs.set(id, job);
    }
  }

  async setJobAnomalies(id: string, anomalies: Anomaly[]): Promise<void> {
    const job = this.jobs.get(id);
    if (job) {
      job.anomalies = anomalies;
      this.jobs.set(id, job);
    }
  }

  async applyCorrection(jobId: string, anomalyId: string, correction: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || !job.anomalies || !job.segments) return;

    const anomaly = job.anomalies.find(a => a.id === anomalyId);
    if (!anomaly) return;

    // Update the anomaly
    anomaly.resolved = true;
    anomaly.userCorrection = correction;
    anomaly.context = `Replaced "${anomaly.flaggedText}" with "${correction}"`;

    // Update the segment text
    const segment = job.segments.find(s => s.id === anomaly.segmentId);
    if (segment) {
      segment.text = segment.text.replace(anomaly.flaggedText, correction);
    }

    this.jobs.set(jobId, job);
  }

  async applySimilarCorrections(jobId: string, flaggedText: string, correction: string): Promise<number> {
    const job = this.jobs.get(jobId);
    if (!job || !job.anomalies || !job.segments) return 0;

    let correctionCount = 0;
    const lowerFlaggedText = flaggedText.toLowerCase();

    for (const anomaly of job.anomalies) {
      if (!anomaly.resolved && anomaly.flaggedText.toLowerCase() === lowerFlaggedText) {
        anomaly.resolved = true;
        anomaly.userCorrection = correction;
        anomaly.context = `Replaced "${anomaly.flaggedText}" with "${correction}"`;
        correctionCount++;

        // Update the segment text
        const segment = job.segments.find(s => s.id === anomaly.segmentId);
        if (segment) {
          segment.text = segment.text.replace(anomaly.flaggedText, correction);
        }
      }
    }

    this.jobs.set(jobId, job);
    return correctionCount;
  }

  async updateSegmentText(jobId: string, segmentId: number, newText: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || !job.segments) return;

    const segment = job.segments.find(s => s.id === segmentId);
    if (segment) {
      segment.text = newText;
      this.jobs.set(jobId, job);
    }
  }
}

export const storage = new MemStorage();
