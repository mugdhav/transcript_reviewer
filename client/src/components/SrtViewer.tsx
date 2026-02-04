import { useState } from "react";
import { Clock, AlertTriangle, CheckCircle2, Edit2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { SrtSegment, Anomaly } from "@shared/schema";

interface SrtViewerProps {
  segments: SrtSegment[];
  anomalies: Anomaly[];
  onSegmentClick?: (segmentId: number) => void;
  onSegmentUpdate?: (segmentId: number, newText: string) => void;
  onTimeJump?: (time: number) => void;
  onPause?: () => void;
  highlightedSegmentId?: number;
  currentTime?: number;
}

export function SrtViewer({ segments, anomalies, onSegmentClick, onSegmentUpdate, onTimeJump, onPause, highlightedSegmentId, currentTime = 0 }: SrtViewerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingSegmentId, setEditingSegmentId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  const parseTime = (timeStr: string) => {
    const [time, ms] = timeStr.split(",");
    const [h, m, s] = time.split(":").map(Number);
    return h * 3600 + m * 60 + s + Number(ms) / 1000;
  };

  const getSegmentAnomalies = (segmentId: number) => {
    return anomalies.filter(a => a.segmentId === segmentId);
  };

  const handleEditClick = (segment: SrtSegment) => {
    setEditingSegmentId(segment.id);
    setEditText(segment.text);
    onPause?.();
  };

  const handleSaveEdit = (segmentId: number) => {
    if (onSegmentUpdate) {
      onSegmentUpdate(segmentId, editText);
    }
    setEditingSegmentId(null);
  };

  const handleCancelEdit = () => {
    setEditingSegmentId(null);
    setEditText("");
  };

  const unresolvedCount = anomalies.filter(a => !a.resolved).length;
  const resolvedCount = anomalies.filter(a => a.resolved).length;

  const highlightAnomalies = (text: string, segmentAnomalies: Anomaly[]) => {
    if (segmentAnomalies.length === 0) return text;

    let result = text;
    const unresolvedAnomalies = segmentAnomalies.filter(a => !a.resolved);

    unresolvedAnomalies.forEach(anomaly => {
      const escapedText = anomaly.flaggedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedText})`, 'gi');
      result = result.replace(regex, `<mark class="bg-amber-200 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 px-0.5 rounded">$1</mark>`);
    });

    return result;
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover-elevate rounded-t-md">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold">SRT Preview</h3>
              <Badge variant="secondary">{segments.length} segments</Badge>
            </div>
            <div className="flex items-center gap-3">
              {unresolvedCount > 0 && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {unresolvedCount} issues
                </Badge>
              )}
              {resolvedCount > 0 && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {resolvedCount} resolved
                </Badge>
              )}
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {segments.map((segment) => {
                  const segmentAnomalies = getSegmentAnomalies(segment.id);
                  const hasUnresolved = segmentAnomalies.some(a => !a.resolved);

                  const start = parseTime(segment.startTime);
                  const end = parseTime(segment.endTime);
                  const isActive = currentTime >= start && currentTime <= end;
                  const isHighlighted = highlightedSegmentId === segment.id || isActive;
                  const isEditing = editingSegmentId === segment.id;

                  return (
                    <div
                      key={segment.id}
                      className={`group p-3 rounded-md border transition-all ${isHighlighted
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : hasUnresolved
                          ? "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10"
                          : "border-border bg-card"
                        }`}
                      onClick={() => {
                        if (!isEditing) {
                          onSegmentClick?.(segment.id);
                          onTimeJump?.(start);
                        }
                      }}
                      data-testid={`segment-${segment.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              #{segment.id}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span className="font-mono">{segment.startTime}</span>
                              <span>→</span>
                              <span className="font-mono">{segment.endTime}</span>
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                              <textarea
                                className="w-full p-2 text-sm border rounded-md bg-background min-h-[60px]"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleSaveEdit(segment.id)}>Save</Button>
                                <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <p
                              className="text-sm leading-relaxed whitespace-pre-wrap"
                              dangerouslySetInnerHTML={{
                                __html: highlightAnomalies(segment.text, segmentAnomalies)
                              }}
                            />
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {segmentAnomalies.length > 0 && !isEditing && (
                            <div className="flex items-center gap-1">
                              {hasUnresolved ? (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                  <AlertTriangle className="h-3 w-3" />
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                  <CheckCircle2 className="h-3 w-3" />
                                </Badge>
                              )}
                            </div>
                          )}

                          {!isEditing && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(segment);
                              }}
                              data-testid={`button-edit-segment-${segment.id}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
