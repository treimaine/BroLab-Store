import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Pause, Play, Volume2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

// Helper component to avoid nested ternary
function PlayPauseIcon({
  isLoading,
  isPlaying,
  size,
}: {
  readonly isLoading: boolean;
  readonly isPlaying: boolean;
  readonly size: "sm" | "md";
}): React.JSX.Element {
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const spinnerSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";

  if (isLoading) {
    return (
      <div
        className={`${spinnerSize} border-2 border-white border-t-transparent rounded-full animate-spin`}
      />
    );
  }

  if (isPlaying) {
    return <Pause className={iconSize} />;
  }

  return <Play className={`${iconSize} ml-0.5`} />;
}

interface SonaarAudioPlayerProps {
  readonly src: string;
  readonly title?: string;
  readonly artist?: string;
  readonly className?: string;
  readonly autoPlay?: boolean;
  readonly showControls?: boolean;
  readonly compact?: boolean;
}

export function SonaarAudioPlayer({
  src,
  title = "Untitled Beat",
  artist = "BroLab",
  className = "",
  autoPlay: _autoPlay = false,
  showControls = true,
  compact = false,
}: Readonly<SonaarAudioPlayerProps>): React.JSX.Element {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // FIX: Throttle timeupdate to max 4 updates per second (250ms)
    // This prevents excessive state updates that cause browser freezes
    let lastTimeUpdate = 0;
    const TIME_UPDATE_THROTTLE = 250; // ms

    const updateTime = (): void => {
      const now = Date.now();
      if (now - lastTimeUpdate >= TIME_UPDATE_THROTTLE) {
        lastTimeUpdate = now;
        setCurrentTime(audio.currentTime);
      }
    };
    const updateDuration = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    const handleEnded = () => setIsPlaying(false);
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, [src]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const newTime = (value[0] / 100) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;

  if (compact) {
    return (
      <div className={`sonaar-player-compact ${className}`}>
        <audio ref={audioRef} src={src} preload="metadata">
          <track kind="captions" />
        </audio>
        <Button
          onClick={togglePlay}
          size="sm"
          disabled={isLoading}
          className="bg-[var(--accent-purple)] hover:bg-purple-600 rounded-full w-10 h-10 p-0"
        >
          <PlayPauseIcon isLoading={isLoading} isPlaying={isPlaying} size="md" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`sonaar-player bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-lg p-4 ${className}`}
    >
      <audio ref={audioRef} src={src} preload="metadata">
        <track kind="captions" />
      </audio>

      {/* Track Info */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-white font-semibold text-sm">{title}</h4>
          <p className="text-gray-400 text-xs">{artist}</p>
        </div>
        <div className="text-xs text-gray-400">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <Slider
          value={[progressPercentage]}
          onValueChange={handleSeek}
          max={100}
          step={0.1}
          className="sonaar-progress"
        />
      </div>

      {showControls && (
        <div className="flex items-center justify-between">
          {/* Playback Controls */}
          <div className="flex items-center space-x-2">
            <Button
              onClick={togglePlay}
              size="sm"
              disabled={isLoading}
              className="bg-[var(--accent-purple)] hover:bg-purple-600 rounded-full w-8 h-8 p-0"
            >
              <PlayPauseIcon isLoading={isLoading} isPlaying={isPlaying} size="sm" />
            </Button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center space-x-2 flex-1 max-w-20 ml-4">
            <Volume2 className="w-4 h-4 text-gray-400" />
            <Slider
              value={[volume]}
              onValueChange={value => setVolume(value[0])}
              max={100}
              step={1}
              className="sonaar-volume"
            />
          </div>
        </div>
      )}
    </div>
  );
}
