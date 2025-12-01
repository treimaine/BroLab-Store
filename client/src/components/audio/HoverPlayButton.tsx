import { Button } from "@/components/ui/button";
import { useAudioStore } from "@/stores/useAudioStore";
import { trackAudioAction, trackPlayPreview } from "@/utils/tracking";
import { Pause, Play } from "lucide-react";
import { useState } from "react";

interface HoverPlayButtonProps {
  audioUrl: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  onPlay?: () => void;
  onPause?: () => void;
  productId?: string;
  productName?: string;
  imageUrl?: string;
  price?: number | string;
  isFree?: boolean;
}

export function HoverPlayButton({
  audioUrl,
  className = "",
  size = "md",
  onPlay,
  onPause,
  productId = "",
  productName = "",
  imageUrl = "",
  price,
  isFree = false,
}: HoverPlayButtonProps) {
  const [isLoading] = useState(false);
  const { currentTrack, isPlaying, setCurrentTrack, setIsPlaying } = useAudioStore();

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

  // Check if this is the currently playing track
  const isCurrentTrack = currentTrack?.id === productId;
  const isCurrentlyPlaying = isCurrentTrack && isPlaying;

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isCurrentlyPlaying) {
      // Pause the current track
      setIsPlaying(false);
      trackAudioAction("pause", productId, 0);
      onPause?.();
    } else {
      // Set current track and play
      if (productId && productName) {
        setCurrentTrack({
          id: productId,
          title: productName,
          artist: "Producer",
          url: audioUrl ?? "",
          audioUrl: audioUrl ?? "",
          imageUrl: imageUrl || "/api/placeholder/64/64",
          price: price,
          isFree: isFree,
        });
        setIsPlaying(true);
        trackPlayPreview(productId, productName);
        trackAudioAction("play", productId, 0);
        onPlay?.();
      }
    }
  };

  return (
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
      ) : isCurrentlyPlaying ? (
        <Pause className={iconSizes[size]} />
      ) : (
        <Play className={`${iconSizes[size]} ml-0.5`} />
      )}
    </Button>
  );
}
