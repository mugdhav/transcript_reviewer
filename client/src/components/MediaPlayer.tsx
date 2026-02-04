import { useRef, useEffect, useState } from "react";
import { Play, Pause, Square, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";

interface MediaPlayerProps {
    url: string;
    fileType: string;
    onTimeUpdate?: (time: number) => void;
    onPause?: () => void;
    onPlay?: () => void;
    mediaRef?: React.RefObject<HTMLMediaElement>;
}

export function MediaPlayer({ url, fileType, onTimeUpdate, onPause, onPlay, mediaRef: externalRef }: MediaPlayerProps) {
    const internalRef = useRef<HTMLMediaElement>(null);
    const mediaRef = (externalRef || internalRef) as React.RefObject<HTMLMediaElement>;
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);

    const isVideo = fileType.includes("video") || fileType.endsWith("mp4");

    useEffect(() => {
        const media = mediaRef.current;
        if (!media) return;

        const handleTimeUpdate = () => {
            setCurrentTime(media.currentTime);
            onTimeUpdate?.(media.currentTime);
        };

        const handleLoadedMetadata = () => {
            setDuration(media.duration);
        };

        const handleEnded = () => {
            setIsPlaying(false);
        };

        media.addEventListener("timeupdate", handleTimeUpdate);
        media.addEventListener("loadedmetadata", handleLoadedMetadata);
        media.addEventListener("ended", handleEnded);

        return () => {
            media.removeEventListener("timeupdate", handleTimeUpdate);
            media.removeEventListener("loadedmetadata", handleLoadedMetadata);
            media.removeEventListener("ended", handleEnded);
        };
    }, [onTimeUpdate]);

    const togglePlay = () => {
        if (mediaRef.current) {
            if (isPlaying) {
                mediaRef.current.pause();
                onPause?.();
            } else {
                mediaRef.current.play();
                onPlay?.();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const stop = () => {
        if (mediaRef.current) {
            mediaRef.current.pause();
            mediaRef.current.currentTime = 0;
            setIsPlaying(false);
            onPause?.();
        }
    };

    const handleSeek = (value: number[]) => {
        if (mediaRef.current) {
            mediaRef.current.currentTime = value[0];
            setCurrentTime(value[0]);
        }
    };

    const handleVolumeChange = (value: number[]) => {
        const newVolume = value[0];
        setVolume(newVolume);
        if (mediaRef.current) {
            mediaRef.current.volume = newVolume;
            mediaRef.current.muted = newVolume === 0;
            setIsMuted(newVolume === 0);
        }
    };

    const toggleMute = () => {
        if (mediaRef.current) {
            mediaRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <Card className="p-4 bg-card border-border shadow-sm">
            <div className="space-y-4">
                {isVideo && (
                    <div className="aspect-video bg-black rounded-md overflow-hidden mb-4">
                        <video
                            ref={mediaRef as React.RefObject<HTMLVideoElement>}
                            src={url}
                            className="w-full h-full"
                            onClick={togglePlay}
                        />
                    </div>
                )}

                {!isVideo && (
                    <audio ref={mediaRef} src={url} className="hidden" />
                )}

                <div className="space-y-2">
                    <Slider
                        value={[currentTime]}
                        max={duration || 100}
                        step={0.1}
                        onValueChange={handleSeek}
                        className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground font-mono">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Button
                            size="icon"
                            variant="outline"
                            onClick={togglePlay}
                            className="h-10 w-10 rounded-full"
                        >
                            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                        </Button>
                        <Button
                            size="icon"
                            variant="outline"
                            onClick={stop}
                            className="h-10 w-10 rounded-full"
                        >
                            <Square className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex items-center gap-3 flex-1 max-w-[200px]">
                        <Button size="icon" variant="ghost" onClick={toggleMute} className="h-8 w-8">
                            {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                        <Slider
                            value={[isMuted ? 0 : volume]}
                            max={1}
                            step={0.01}
                            onValueChange={handleVolumeChange}
                            className="w-full"
                        />
                    </div>
                </div>
            </div>
        </Card>
    );
}

// Add seek ability to the media player via ref
export type MediaPlayerHandle = {
    seekTo: (time: number) => void;
    pause: () => void;
};
