import { Button } from "@/components/ui/button";
import { useAudioStore } from "@/store/useAudioStore";
import { trackAudioAction, trackPlayPreview } from "@/utils/tracking";
import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface HoverPlayButtonProps {
  audioUrl: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  onPlay?: () => void;
  onPause?: () => void;
  productId?: string;
  productName?: string;
}

export function HoverPlayButton({
  audioUrl,
  className = "",
  size = "md",
  onPlay,
  onPause,
  productId = "",
  productName = "",
}: HoverPlayButtonProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-6 h-6",
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleEnded = () => {
      setIsPlaying(false);
      onPause?.();
    };

    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl, onPause]);

  const { setCurrentTrack } = useAudioStore();

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      trackAudioAction("pause", productId, audio.currentTime);
      onPause?.();
    } else {
      // Pause any other playing audio first
      document.querySelectorAll("audio").forEach((otherAudio) => {
        if (otherAudio !== audio && !otherAudio.paused) {
          otherAudio.pause();
        }
      });

      // Set current track in global store for enhanced player
      if (productId && productName) {
        setCurrentTrack({
          id: productId,
          title: productName,
          artist: "Producer",
          url: audioUrl ?? "",
          audioUrl: audioUrl ?? "",
          imageUrl: "/api/placeholder/64/64",
        });
      }

      audio.play().catch(console.error);
      setIsPlaying(true);
      trackPlayPreview(productId, productName);
      trackAudioAction("play", productId, 0);
      onPlay?.();
    }
  };

  return (
    <>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <Button
        onClick={togglePlay}
        className={`
          bg-black/70 hover:bg-[var(--accent-purple)] 
          text-white border-0 rounded-full 
          transition-all duration-300 
          backdrop-blur-sm
          ${sizeClasses[size]} 
          ${className}
        `}
        disabled={isLoading}
      >
        {isLoading ? (
          <div
            className={`border-2 border-white border-t-transparent rounded-full animate-spin ${iconSizes[size]}`}
          />
        ) : isPlaying ? (
          <Pause className={iconSizes[size]} />
        ) : (
          <Play className={`${iconSizes[size]} ml-0.5`} />
        )}
      </Button>
    </>
  );
}
