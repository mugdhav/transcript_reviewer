import { FileAudio, FileVideo, CheckCircle2, Loader2, AlertCircle, Home } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { TranscriptionJob, JobStatus } from "@shared/schema";

interface TranscriptionProgressProps {
  job: TranscriptionJob;
}

const statusConfig: Record<JobStatus, { label: string; color: string; icon: typeof Loader2 }> = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground", icon: Loader2 },
  uploading: { label: "Uploading", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: Loader2 },
  processing: { label: "Processing Audio", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Loader2 },
  transcribing: { label: "Transcribing", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: Loader2 },
  analyzing: { label: "Analyzing for Errors", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400", icon: Loader2 },
  completed: { label: "Completed", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
  failed: { label: "Failed", color: "bg-destructive/10 text-destructive", icon: AlertCircle },
};

const steps: { status: JobStatus; label: string }[] = [
  { status: "uploading", label: "Upload" },
  { status: "processing", label: "Process" },
  { status: "transcribing", label: "Transcribe" },
  { status: "analyzing", label: "Analyze" },
  { status: "completed", label: "Done" },
];

export function TranscriptionProgress({ job }: TranscriptionProgressProps) {
  const defaultConfig = { label: "Processing", color: "bg-muted text-muted-foreground", icon: Loader2 };
  const config = statusConfig[job.status] || defaultConfig;
  const StatusIcon = config.icon;
  const isProcessing = !["completed", "failed"].includes(job.status);

  const currentStepIndex = steps.findIndex(s => s.status === job.status);

  const getFileIcon = () => {
    if (job.fileType?.includes("video") || job.fileName?.endsWith(".mp4")) {
      return <FileVideo className="h-5 w-5 text-muted-foreground" />;
    }
    return <FileAudio className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {getFileIcon()}
            <div className="min-w-0">
              <CardTitle className="text-base truncate" data-testid="text-job-filename">
                {job.fileName}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {(job.fileSize / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <Badge variant="secondary" className={config.color} data-testid="badge-job-status">
            <StatusIcon className={`h-3 w-3 mr-1 ${isProcessing ? "animate-spin" : ""}`} />
            {config.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{job.progress}%</span>
          </div>
          <Progress value={job.progress} className="h-2" data-testid="progress-transcription" />
        </div>

        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isPast = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isFailed = job.status === "failed" && index === currentStepIndex;

            return (
              <div key={step.status} className="flex flex-col items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${isFailed
                    ? "bg-destructive text-destructive-foreground"
                    : isPast
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                        ? "bg-primary/20 text-primary border-2 border-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                >
                  {isPast ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isFailed ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : isCurrent && isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className={`text-xs ${isCurrent ? "font-medium" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {job.statusMessage && !job.errorMessage && (
          <div className="text-sm text-center text-amber-600 dark:text-amber-400 font-medium animate-pulse">
            {job.statusMessage}
          </div>
        )}

        {job.status === "failed" && job.errorMessage && (
          <div className="space-y-4">
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="text-job-error">
              {job.errorMessage}
            </div>
            <div className="flex justify-center">
              <Button asChild variant="outline" size="sm">
                <a href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Return to Home
                </a>
              </Button>
            </div>
          </div>
        )}

        {job.userContext && (
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-1">Context provided:</p>
            <p className="text-sm italic">"{job.userContext}"</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
