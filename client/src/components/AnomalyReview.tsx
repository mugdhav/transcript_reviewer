import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, ArrowRight, ArrowLeft, Lightbulb, Copy, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import type { Anomaly, AnomalyType, SrtSegment } from "@shared/schema";

interface AnomalyReviewProps {
  anomalies: Anomaly[];
  segments: SrtSegment[];
  onApplyCorrection: (anomalyId: string, correction: string, applyToSimilar: boolean) => void;
  onSkip: (anomalyId: string) => void;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onTimeJump?: (time: number) => void;
}

const anomalyTypeLabels: Record<AnomalyType, { label: string; description: string; color: string }> = {
  unusual_sentence: {
    label: "Unusual Sentence",
    description: "This sentence structure seems unusual or incomplete",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  out_of_context: {
    label: "Out of Context",
    description: "This text doesn't fit the provided context",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
  similar_sounding: {
    label: "Similar Sounding Word",
    description: "This might be a misheard word (homophone)",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  grammar_issue: {
    label: "Grammar Issue",
    description: "Potential grammatical error detected",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

export function AnomalyReview({
  anomalies,
  segments,
  onApplyCorrection,
  onSkip,
  currentIndex,
  onIndexChange,
  onTimeJump,
}: AnomalyReviewProps) {
  const [correction, setCorrection] = useState("");
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [pendingCorrection, setPendingCorrection] = useState<{ anomalyId: string; correction: string } | null>(null);

  const unresolvedAnomalies = anomalies.filter(a => !a.resolved);
  const currentAnomaly = unresolvedAnomalies[currentIndex];

  const parseTime = (timeStr: string) => {
    const [time, ms] = timeStr.split(",");
    const [h, m, s] = time.split(":").map(Number);
    return h * 3600 + m * 60 + s + Number(ms) / 1000;
  };

  useEffect(() => {
    if (currentAnomaly && onTimeJump) {
      const segment = segments.find(s => s.id === currentAnomaly.segmentId);
      if (segment) {
        onTimeJump(parseTime(segment.startTime));
      }
    }
  }, [currentAnomaly?.id, onTimeJump, segments]);

  if (!currentAnomaly) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">All Issues Reviewed</h3>
          <p className="text-muted-foreground">
            You've reviewed all detected anomalies. Your subtitles are ready for export.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentSegment = segments.find(s => s.id === currentAnomaly.segmentId);
  const typeConfig = anomalyTypeLabels[currentAnomaly.type];

  const findSimilarAnomalies = () => {
    return unresolvedAnomalies.filter(
      a => a.id !== currentAnomaly.id &&
        a.flaggedText.toLowerCase() === currentAnomaly.flaggedText.toLowerCase()
    );
  };

  const similarAnomalies = findSimilarAnomalies();

  const handleApplyCorrection = () => {
    const correctionText = correction.trim() || currentAnomaly.suggestion;

    if (similarAnomalies.length > 0) {
      setPendingCorrection({ anomalyId: currentAnomaly.id, correction: correctionText });
      setShowBatchDialog(true);
    } else {
      onApplyCorrection(currentAnomaly.id, correctionText, false);
      setCorrection("");
      if (currentIndex < unresolvedAnomalies.length - 1) {
        onIndexChange(currentIndex);
      }
    }
  };

  const handleBatchDecision = (applyToAll: boolean) => {
    if (pendingCorrection) {
      onApplyCorrection(pendingCorrection.anomalyId, pendingCorrection.correction, applyToAll);
      setPendingCorrection(null);
      setShowBatchDialog(false);
      setCorrection("");
    }
  };

  const handleUseSuggestion = () => {
    setCorrection(currentAnomaly.suggestion);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
      setCorrection("");
    }
  };

  const handleNext = () => {
    onSkip(currentAnomaly.id);
    setCorrection("");
  };

  const confidencePercent = Math.round(currentAnomaly.confidence * 100);

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Review Issue {currentIndex + 1} of {unresolvedAnomalies.length}
              </CardTitle>
              <CardDescription className="mt-1">
                Review and correct potential subtitle errors
              </CardDescription>
            </div>
            <Badge variant="secondary" className={typeConfig.color}>
              {typeConfig.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="p-4 rounded-md bg-muted/50 border">
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
              <span>Segment #{currentAnomaly.segmentId}</span>
              {currentSegment && (
                <>
                  <span>•</span>
                  <span className="font-mono">{currentSegment.startTime} → {currentSegment.endTime}</span>
                </>
              )}
            </div>
            {currentSegment && (
              <p className="text-sm leading-relaxed">
                {currentSegment.text.split(currentAnomaly.flaggedText).map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <mark className="bg-amber-200 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 px-1 rounded font-medium">
                        {currentAnomaly.flaggedText}
                      </mark>
                    )}
                  </span>
                ))}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">{typeConfig.description}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Confidence:</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-32">
                <div
                  className={`h-full rounded-full ${confidencePercent > 70 ? "bg-green-500" : confidencePercent > 40 ? "bg-amber-500" : "bg-red-500"
                    }`}
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
              <span className="text-xs font-medium">{confidencePercent}%</span>
            </div>
          </div>

          <div className="p-4 rounded-md bg-accent/50 border border-accent">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-accent-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-accent-foreground mb-1">Suggested Correction</p>
                <p className="text-sm" data-testid="text-suggestion">{currentAnomaly.suggestion}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleUseSuggestion}
                data-testid="button-use-suggestion"
              >
                <Copy className="h-4 w-4 mr-1" />
                Use
              </Button>
            </div>
          </div>

          {similarAnomalies.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                Found {similarAnomalies.length} similar occurrence{similarAnomalies.length > 1 ? "s" : ""} of this issue
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="correction">Your Correction</Label>
            <Input
              id="correction"
              placeholder={`Enter correction or use suggestion: "${currentAnomaly.suggestion}"`}
              value={correction}
              onChange={(e) => setCorrection(e.target.value)}
              data-testid="input-correction"
            />
          </div>

          <div className="flex items-center justify-between gap-4 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              data-testid="button-previous-anomaly"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={handleNext}
                data-testid="button-skip-anomaly"
              >
                Skip
              </Button>
              <Button
                onClick={handleApplyCorrection}
                data-testid="button-apply-correction"
              >
                Apply Correction
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply to Similar Issues?</DialogTitle>
            <DialogDescription>
              We found {similarAnomalies.length} other occurrence{similarAnomalies.length > 1 ? "s" : ""} of "{currentAnomaly.flaggedText}" in your subtitles.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm mb-4">Would you like to apply the same correction to all of them?</p>
            <div className="p-3 rounded-md bg-muted text-sm">
              <span className="text-muted-foreground">Correction: </span>
              <span className="font-medium">{pendingCorrection?.correction}</span>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handleBatchDecision(false)}
              data-testid="button-apply-single"
            >
              Apply to This One Only
            </Button>
            <Button
              onClick={() => handleBatchDecision(true)}
              data-testid="button-apply-all"
            >
              Apply to All ({similarAnomalies.length + 1})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
