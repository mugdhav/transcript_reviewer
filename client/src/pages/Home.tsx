import { useState, useCallback, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FileAudio, Sparkles, Shield, Zap, ArrowRight, Upload as UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FileUpload } from "@/components/FileUpload";
import { TranscriptionProgress } from "@/components/TranscriptionProgress";
import { SrtViewer } from "@/components/SrtViewer";
import { AnomalyReview } from "@/components/AnomalyReview";
import { ExportPanel } from "@/components/ExportPanel";
import { MediaPlayer } from "@/components/MediaPlayer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TranscriptionJob, ApiResponse } from "@shared/schema";

type AppView = "landing" | "upload" | "processing" | "review";

export default function Home() {
  const [view, setView] = useState<AppView>("landing");
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentAnomalyIndex, setCurrentAnomalyIndex] = useState(0);
  const [highlightedSegmentId, setHighlightedSegmentId] = useState<number | undefined>();
  const [currentTime, setCurrentTime] = useState(0);
  const mediaPlayerRef = useRef<HTMLMediaElement>(null);
  const { toast } = useToast();

  // Cleanup effect for window unload
  useState(() => {
    const handleBeforeUnload = () => {
      if (currentJobId) {
        navigator.sendBeacon(`/api/cleanup/${currentJobId}`);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  });

  const { data: response, refetch: refetchJob } = useQuery<ApiResponse<TranscriptionJob>>({
    queryKey: ["/api/jobs", currentJobId],
    enabled: !!currentJobId && view === "processing",
    refetchInterval: (query) => {
      const resp = query.state.data as ApiResponse<TranscriptionJob> | undefined;
      const data = resp?.data;
      if (data?.status === "completed" || data?.status === "failed") {
        return false;
      }
      return 2000;
    },
  });

  const job = response?.data;

  const uploadMutation = useMutation({
    mutationFn: async ({ file, context }: { file: File; context: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (context) {
        formData.append("context", context);
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }

      return response.json() as Promise<ApiResponse<TranscriptionJob>>;
    },
    onSuccess: (response) => {
      if (response.success && response.data) {
        setCurrentJobId(response.data.id);
        setView("processing");
        toast({
          title: "Upload successful",
          description: "Your file is being processed. This may take a few minutes.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  const correctionMutation = useMutation({
    mutationFn: async ({
      anomalyId,
      correction,
      applyToSimilar,
    }: {
      anomalyId: string;
      correction: string;
      applyToSimilar: boolean;
    }) => {
      return apiRequest("POST", "/api/corrections", {
        jobId: currentJobId,
        anomalyId,
        correction,
        applyToSimilar,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", currentJobId] });
      refetchJob();
    },
    onError: (error: Error) => {
      toast({
        title: "Correction failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  const segmentUpdateMutation = useMutation({
    mutationFn: async ({ segmentId, text }: { segmentId: number; text: string }) => {
      return apiRequest("PATCH", `/api/jobs/${currentJobId}/segments/${segmentId}`, { text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", currentJobId] });
      refetchJob();
      toast({
        title: "Success",
        description: "Subtitle updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdateSegment = useCallback((segmentId: number, text: string) => {
    segmentUpdateMutation.mutate({ segmentId, text });
  }, [segmentUpdateMutation]);

  const cleanupMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await apiRequest("POST", `/api/cleanup/${jobId}`);
    },
    onSuccess: () => {
      setCurrentJobId(null);
      setView("landing");
    }
  });

  const handleNewFile = useCallback(() => {
    if (currentJobId) {
      cleanupMutation.mutate(currentJobId);
    } else {
      setView("landing");
    }
  }, [currentJobId, cleanupMutation]);

  const handleUpload = useCallback((file: File, context: string) => {
    setUploadProgress(10);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    uploadMutation.mutate({ file, context });
  }, [uploadMutation]);

  const handleApplyCorrection = useCallback(
    (anomalyId: string, correction: string, applyToSimilar: boolean) => {
      correctionMutation.mutate({ anomalyId, correction, applyToSimilar });
    },
    [correctionMutation]
  );

  const handleSkipAnomaly = useCallback(() => {
    if (job?.anomalies) {
      const unresolvedCount = job.anomalies.filter(a => !a.resolved).length;
      if (currentAnomalyIndex < unresolvedCount - 1) {
        setCurrentAnomalyIndex(currentAnomalyIndex + 1);
      }
    }
  }, [job, currentAnomalyIndex]);

  const handleExport = useCallback(async () => {
    if (!job?.segments) return;

    const srtContent = job.segments.map(segment => {
      return `${segment.id}\n${segment.startTime} --> ${segment.endTime}\n${segment.text}\n`;
    }).join("\n");

    const blob = new Blob([srtContent], { type: "text/srt" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = job.fileName.replace(/\.(mp3|mp4)$/i, ".srt");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export complete",
      description: "Your SRT file has been downloaded.",
    });
  }, [job, toast]);

  const handleSegmentClick = useCallback((segmentId: number) => {
    setHighlightedSegmentId(segmentId);
    if (job?.anomalies) {
      const anomalyIndex = job.anomalies
        .filter(a => !a.resolved)
        .findIndex(a => a.segmentId === segmentId);
      if (anomalyIndex !== -1) {
        setCurrentAnomalyIndex(anomalyIndex);
      }
    }
  }, [job]);

  const handleTimeJump = useCallback((time: number) => {
    if (mediaPlayerRef.current) {
      mediaPlayerRef.current.currentTime = time;
    }
  }, []);

  if (job?.status === "completed" && view === "processing") {
    setView("review");
  }

  const renderLanding = () => (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <FileAudio className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">MV Subtitle Generator</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1">
        <section className="pt-10 pb-12 md:pt-16 md:pb-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Generate and Tidy-up <span className="text-primary">SRT Subtitles</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Generate and tidy-up subtitle (SRT) files for MP3 and MP4 files of upto 25 MB.
              Our AI detects and helps you fix subtitle errors, misheard words,
              and out-of-context phrases.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={() => setView("upload")} data-testid="button-get-started">
                Get Started
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" data-testid="button-learn-more" asChild>
                <a
                  href="/docs/help.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Learn More
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <Card className="text-center">
                <CardContent className="pt-8 pb-6">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <UploadIcon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">1. Upload</h3>
                  <p className="text-muted-foreground text-sm">
                    Upload your MP3 or MP4 file (up to 25MB) and optionally provide context about the content.
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-8 pb-6">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">2. Transcribe</h3>
                  <p className="text-muted-foreground text-sm">
                    Our AI (powered by Google Gemini 3) transcribes your audio and detects potential errors.
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-8 pb-6">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">3. Review & Export</h3>
                  <p className="text-muted-foreground text-sm">
                    Review suggested corrections, apply fixes, and download your polished SRT file.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              Key Features
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {[
                { icon: Sparkles, title: "AI Subtitle Generation", desc: "Powered by Google Gemini 3 for accurate speech-to-subtitle" },
                { icon: Shield, title: "Anomaly Detection", desc: "Identifies misheard words and unusual phrases" },
                { icon: Zap, title: "Batch Corrections", desc: "Apply the same fix to multiple similar errors at once" },
                { icon: FileAudio, title: "SRT Export", desc: "Download properly formatted subtitle files" },
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-4 p-4">
                  <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Powered by Google Gemini 3 AI models.</p>
        </div>
      </footer>
    </div>
  );

  const renderUpload = () => (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleNewFile} data-testid="button-back-home">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <FileAudio className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg ml-2">MV Subtitle Generator</span>
            </Button>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Upload Your File</h1>
            <p className="text-muted-foreground">
              Upload an audio (MP3) or video (MP4) file of upto 25MB to generate subtitles in SRT format.
            </p>
          </div>

          <FileUpload
            onUpload={handleUpload}
            isUploading={uploadMutation.isPending}
            uploadProgress={uploadProgress}
          />
        </div>
      </main>
    </div>
  );

  const renderProcessing = () => (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <FileAudio className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">MV Subtitle Generator</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Processing Your File</h1>
            <p className="text-muted-foreground">
              Please wait while we transcribe and analyze your content
            </p>
          </div>

          {job && <TranscriptionProgress job={job} />}
        </div>
      </main>
    </div>
  );

  const renderReview = () => (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleNewFile} data-testid="button-back-home-review">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <FileAudio className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg ml-2">MV Subtitle Generator</span>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleNewFile} data-testid="button-new-file">
              New File
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold mb-1">Review Subtitles</h1>
                <p className="text-muted-foreground text-sm">
                  Review detected issues and make corrections
                </p>
              </div>

              {job?.anomalies && job.segments && (
                <AnomalyReview
                  anomalies={job.anomalies}
                  segments={job.segments}
                  onApplyCorrection={handleApplyCorrection}
                  onSkip={handleSkipAnomaly}
                  currentIndex={currentAnomalyIndex}
                  onIndexChange={setCurrentAnomalyIndex}
                  onTimeJump={handleTimeJump}
                />
              )}

              {job?.segments && job.anomalies && (
                <ExportPanel
                  segments={job.segments}
                  anomalies={job.anomalies}
                  fileName={job.fileName}
                  onExport={handleExport}
                />
              )}
            </div>

            <div className="space-y-6">
              {job && job.mediaUrl && (
                <MediaPlayer
                  url={job.mediaUrl}
                  fileType={job.fileType}
                  onTimeUpdate={setCurrentTime}
                  onPause={() => mediaPlayerRef.current?.pause()}
                  onPlay={() => mediaPlayerRef.current?.play()}
                  mediaRef={mediaPlayerRef as React.RefObject<HTMLMediaElement>}
                />
              )}

              {job?.segments && job.anomalies && (
                <SrtViewer
                  segments={job.segments}
                  anomalies={job.anomalies}
                  onSegmentClick={handleSegmentClick}
                  onSegmentUpdate={handleUpdateSegment}
                  onTimeJump={handleTimeJump}
                  onPause={() => mediaPlayerRef.current?.pause()}
                  highlightedSegmentId={highlightedSegmentId}
                  currentTime={currentTime}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  switch (view) {
    case "upload":
      return renderUpload();
    case "processing":
      return renderProcessing();
    case "review":
      return renderReview();
    default:
      return renderLanding();
  }
}
