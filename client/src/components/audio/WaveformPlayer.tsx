import { Pause, Play, Volume2 } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface WaveformPlayerProps {
  src: string;
  height?: number;
  color?: string;
  progressColor?: string;
  className?: string;
}

export const WaveformPlayer = memo(
  ({
    src,
    height = 60,
    color = "rgba(147, 51, 234, 0.3)",
    progressColor = "#9333ea",
    className = "",
  }: WaveformPlayerProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [duration, setDuration] = useState<string>("0:00");
    const [currentTime, setCurrentTime] = useState<string>("0:00");

    useEffect(() => {
      if (!containerRef.current || !src) return;

      // Cleanup previous instance
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }

      // Initialize WaveSurfer
      const wavesurfer = WaveSurfer.create({
        container: containerRef.current,
        waveColor: color,
        progressColor: progressColor,
        cursorColor: progressColor,
        barWidth: 2,
        barGap: 1,
        height: height,
        normalize: true,
        // WaveSurfer v7+ uses WebAudio by default, MediaElement is no longer a separate backend option
        // The library handles audio loading internally
        mediaControls: false,
        interact: true,
        hideScrollbar: true,
      });

      wavesurferRef.current = wavesurfer;

      // Load audio
      setIsLoading(true);
      wavesurfer.load(src);

      // Event listeners
      wavesurfer.on("ready", () => {
        setIsLoading(false);
        const totalDuration = wavesurfer.getDuration();
        setDuration(formatTime(totalDuration));
      });

      wavesurfer.on("play", () => setIsPlaying(true));
      wavesurfer.on("pause", () => setIsPlaying(false));

      wavesurfer.on("audioprocess", () => {
        const current = wavesurfer.getCurrentTime();
        setCurrentTime(formatTime(current));
      });

      // Removed duplicate audioprocess listener

      wavesurfer.on("error", error => {
        console.error("WaveSurfer error:", error);
        setIsLoading(false);
      });

      return () => {
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy();
          wavesurferRef.current = null;
        }
      };
    }, [src, color, progressColor, height]);

    const formatTime = (seconds: number): string => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    };

    const togglePlayPause = () => {
      if (!wavesurferRef.current) return;

      if (isPlaying) {
        wavesurferRef.current.pause();
      } else {
        wavesurferRef.current.play();
      }
    };

    const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!wavesurferRef.current) return;
      const volume = Number.parseFloat(event.target.value);
      wavesurferRef.current.setVolume(volume);
    };

    if (!src) {
      return (
        <div
          className={`bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-lg p-4 ${className}`}
        >
          <div className="text-center text-gray-400">No audio file available</div>
        </div>
      );
    }

    return (
      <div
        className={`bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-lg p-4 ${className}`}
      >
        {/* Controls */}
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={togglePlayPause}
            disabled={isLoading}
            className="flex items-center justify-center w-10 h-10 bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/80 disabled:bg-gray-600 rounded-full transition-colors"
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {!isLoading && isPlaying && <Pause className="w-4 h-4 text-white" />}
            {!isLoading && !isPlaying && <Play className="w-4 h-4 text-white ml-0.5" />}
          </button>

          <div className="flex items-center gap-2 text-sm text-gray-300">
            <span>{currentTime}</span>
            <span>/</span>
            <span>{duration}</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Volume2 className="w-4 h-4 text-gray-400" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              defaultValue="0.8"
              onChange={handleVolumeChange}
              className="w-16 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        </div>

        {/* Waveform */}
        <div ref={containerRef} className="w-full" style={{ height: `${height}px` }} />

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--dark-gray)]/50 rounded-lg">
            <div className="text-sm text-gray-400">Loading audio...</div>
          </div>
        )}
      </div>
    );
  }
);

WaveformPlayer.displayName = "WaveformPlayer";

export default WaveformPlayer;
