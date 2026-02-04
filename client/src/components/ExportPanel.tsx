import { Download, FileText, Copy, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { SrtSegment, Anomaly } from "@shared/schema";

interface ExportPanelProps {
  segments: SrtSegment[];
  anomalies: Anomaly[];
  fileName: string;
  onExport: () => void;
  isExporting?: boolean;
}

export function ExportPanel({ segments, anomalies, fileName, onExport, isExporting }: ExportPanelProps) {
  const { toast } = useToast();

  const resolvedCount = anomalies.filter(a => a.resolved).length;
  const unresolvedCount = anomalies.filter(a => !a.resolved).length;

  const generateSrtContent = (): string => {
    return segments.map(segment => {
      return `${segment.id}\n${segment.startTime} --> ${segment.endTime}\n${segment.text}\n`;
    }).join("\n");
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateSrtContent());
      toast({
        title: "Copied to clipboard",
        description: "SRT content has been copied to your clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard. Please try downloading instead.",
        variant: "destructive",
      });
    }
  };

  const getSrtFileName = () => {
    const baseName = fileName.replace(/\.(mp3|mp4)$/i, "");
    return `${baseName}.srt`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Export SRT
        </CardTitle>
        <CardDescription>
          Download your corrected subtitles as an SRT file
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{segments.length} segments</Badge>
          </div>
          {resolvedCount > 0 && (
            <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>{resolvedCount} corrections applied</span>
            </div>
          )}
          {unresolvedCount > 0 && (
            <div className="text-sm text-amber-600 dark:text-amber-400">
              {unresolvedCount} unreviewed issues
            </div>
          )}
        </div>

        <div className="p-4 rounded-md bg-muted/50 border">
          <p className="text-sm text-muted-foreground mb-2">Output file:</p>
          <p className="font-mono text-sm font-medium" data-testid="text-output-filename">
            {getSrtFileName()}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleCopyToClipboard}
            data-testid="button-copy-srt"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy to Clipboard
          </Button>
          <Button
            className="flex-1"
            onClick={onExport}
            disabled={isExporting}
            data-testid="button-download-srt"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exporting..." : "Download SRT"}
          </Button>
        </div>

        {unresolvedCount > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            You can still export with unreviewed issues. They will be included as-is.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
