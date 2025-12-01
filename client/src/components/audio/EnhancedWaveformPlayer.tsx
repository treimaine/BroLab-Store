import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Download, Heart, Pause, Play, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface EnhancedWaveformPlayerProps {
  src: string;
  title: string;
  artist: string;
  duration?: string;
  bpm?: number;
  genre?: string;
  onLike?: () => void;
  onDownload?: () => void;
  liked?: boolean;
}

export function EnhancedWaveformPlayer({
  src,
  title,
  artist,
  duration,
  bpm: _bpm,
  genre,
  onLike,
  onDownload,
  liked = false,
}: EnhancedWaveformPlayerProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([0.7]);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  useEffect(() => {
    if (!waveformRef.current) return;

    // Initialize WaveSurfer
    waveSurferRef.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "rgba(147, 51, 234, 0.3)",
      progressColor: "#a855f7",
      cursorColor: "#ffffff",
      barWidth: 2,
      barRadius: 1,
      height: 64,
      normalize: true,
      backend: "MediaElement", // Use MediaElement instead of WebAudio for better compatibility
      mediaControls: false,
    });

    // Load audio
    waveSurferRef.current.load(src);

    // Event listeners
    waveSurferRef.current.on("ready", () => {
      setTotalDuration(waveSurferRef.current?.getDuration() || 0);
    });

    waveSurferRef.current.on("audioprocess", () => {
      setCurrentTime(waveSurferRef.current?.getCurrentTime() || 0);
    });

    waveSurferRef.current.on("finish", () => {
      setIsPlaying(false);
    });

    return () => {
      waveSurferRef.current?.destroy();
    };
  }, [src]);

  const togglePlayPause = () => {
    if (!waveSurferRef.current) return;

    if (isPlaying) {
      waveSurferRef.current.pause();
    } else {
      waveSurferRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value);
    waveSurferRef.current?.setVolume(value[0]);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-[var(--medium-gray)] rounded-lg p-4 space-y-4">
      {/* Track Info Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">{title}</h3>
          <p className="text-gray-400 text-sm">{artist}</p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          {genre && <span className="bg-[var(--dark-gray)] px-2 py-1 rounded">{genre}</span>}
          {duration && <span className="bg-[var(--dark-gray)] px-2 py-1 rounded">{duration}</span>}
        </div>
      </div>

      {/* Waveform */}
      <div className="waveform-container">
        <div ref={waveformRef} className="w-full h-full" />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            onClick={togglePlayPause}
            className="bg-[var(--accent-purple)] hover:bg-purple-600 w-10 h-10 rounded-full p-0"
            aria-label={isPlaying ? "Pause track" : "Play track"}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </Button>

          <div className="flex items-center space-x-2">
            <Volume2 className="w-4 h-4 text-gray-400" />
            <div className="w-20">
              <Slider
                value={volume}
                onValueChange={handleVolumeChange}
                max={1}
                step={0.01}
                className="cursor-pointer"
              />
            </div>
          </div>

          <div className="text-sm text-gray-400">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onLike && (
            <Button
              onClick={onLike}
              variant="ghost"
              size="sm"
              className={`${liked ? "text-red-500" : "text-gray-400"} hover:text-red-500`}
              aria-label={liked ? "Unlike track" : "Like track"}
            >
              <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
            </Button>
          )}

          {onDownload && (
            <Button
              onClick={onDownload}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
              aria-label="Download track"
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
