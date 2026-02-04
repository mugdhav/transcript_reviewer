import { useCallback, useState } from "react";
import { Upload, FileAudio, FileVideo, X, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface FileUploadProps {
  onUpload: (file: File, context: string) => void;
  isUploading: boolean;
  uploadProgress: number;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ACCEPTED_TYPES = ["audio/mpeg", "audio/mp3", "video/mp4"];

export function FileUpload({ onUpload, isUploading, uploadProgress }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [context, setContext] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wordCount = context.trim().split(/\s+/).filter(Boolean).length;
  const isContextValid = wordCount <= 100;

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File is too large. Maximum size is 25MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`;
    }

    const isValidType = ACCEPTED_TYPES.includes(file.type) ||
      file.name.endsWith('.mp3') ||
      file.name.endsWith('.mp4');

    if (!isValidType) {
      return "Invalid file type. Please upload an MP3 or MP4 file.";
    }

    return null;
  }, []);

  const handleFileSelect = useCallback((selectedFile: File) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setError(null);
    setFile(selectedFile);
  }, [validateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  const handleSubmit = () => {
    if (file && isContextValid) {
      onUpload(file, context);
    }
  };

  const clearFile = () => {
    setFile(null);
    setError(null);
  };

  const getFileIcon = () => {
    if (!file) return null;
    if (file.type.startsWith("video") || file.name.endsWith(".mp4")) {
      return <FileVideo className="h-8 w-8 text-primary" />;
    }
    return <FileAudio className="h-8 w-8 text-primary" />;
  };

  return (
    <div className="space-y-6">
      <Card
        className={`relative border-2 border-dashed transition-colors duration-200 ${dragOver
          ? "border-primary bg-accent/50"
          : error
            ? "border-destructive/50"
            : "border-muted-foreground/25 hover:border-primary/50"
          }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept=".mp3,.mp4,audio/mpeg,video/mp4"
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
          data-testid="input-file-upload"
        />

        <div className="p-8 text-center">
          {file ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                {getFileIcon()}
                <div className="text-left">
                  <p className="font-medium truncate max-w-xs" data-testid="text-file-name">
                    {file.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                  disabled={isUploading}
                  data-testid="button-clear-file"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-accent flex items-center justify-center">
                <Upload className="h-8 w-8 text-accent-foreground" />
              </div>
              <div>
                <p className="font-medium text-lg">
                  Drop your audio or video file here
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse
                </p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Badge variant="secondary">MP3</Badge>
                <Badge variant="secondary">MP4</Badge>
                <span className="text-sm text-muted-foreground">up to 25MB</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive" data-testid="text-upload-error">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="context">Context (optional)</Label>
          <span className={`text-xs ${!isContextValid ? "text-destructive" : "text-muted-foreground"}`}>
            {wordCount}/100 words
          </span>
        </div>
        <Textarea
          id="context"
          placeholder="Provide context about the content (e.g., 'A tech podcast about machine learning', 'Interview with John Smith about climate change'). This helps identify subtitle errors more accurately."
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={3}
          disabled={isUploading}
          className="resize-none"
          data-testid="input-context"
        />
        {!isContextValid && (
          <p className="text-xs text-destructive">
            Context must be 100 words or less.
          </p>
        )}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!file || isUploading || !isContextValid}
        className="w-full"
        data-testid="button-start-subtitle-generation"
      >
        {isUploading ? "Uploading..." : "Start Subtitle Generation"}
      </Button>
    </div>
  );
}
