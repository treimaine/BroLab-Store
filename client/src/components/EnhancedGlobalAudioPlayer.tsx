import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useIsMobile } from "@/hooks/useBreakpoint";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useAudioStore } from "@/store/useAudioStore";
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function EnhancedGlobalAudioPlayer() {
  const {
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    duration,
    setIsPlaying,
    setVolume,
    setCurrentTime,
    setDuration,
    nextTrack,
    previousTrack,
  } = useAudioStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const lastTrackRef = useRef<string | null>(null);
  const lastPlayingRef = useRef<boolean>(false);

  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();

  // Initialize audio context for waveform visualization
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [dataArray, setDataArray] = useState<Uint8Array | null>(null);

  // Update audio source when track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    console.log("🔍 Setting audio source:", currentTrack.audioUrl);

    // Stop all other audio elements when track changes
    document.querySelectorAll("audio").forEach(otherAudio => {
      if (otherAudio !== audio && !otherAudio.paused) {
        console.log("🛑 Stopping other audio on track change");
        otherAudio.pause();
        otherAudio.currentTime = 0;
      }
    });

    audio.src = currentTrack.audioUrl;
    lastTrackRef.current = currentTrack.id;

    // Force play when track changes (if isPlaying is true)
    if (isPlaying) {
      console.log("🎵 Forcing play on track change");
      audio.play().catch(error => {
        console.error("❌ Audio play failed on track change:", error);
      });
    }
  }, [currentTrack?.id, isPlaying]);

  // Handle play/pause separately to avoid loops
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    console.log("🎵 Play/pause state changed:", {
      isPlaying,
      currentTrack: currentTrack.title,
      audioUrl: currentTrack.audioUrl,
    });

    // Only update if state actually changed
    if (lastPlayingRef.current !== isPlaying) {
      if (isPlaying) {
        console.log("▶️ Attempting to play audio...");

        // Only stop other audio elements if this audio is ready to play
        if (audio.readyState >= 2) {
          // HAVE_CURRENT_DATA or higher
          document.querySelectorAll("audio").forEach(otherAudio => {
            if (otherAudio !== audio && !otherAudio.paused) {
              console.log("🛑 Stopping other audio element");
              otherAudio.pause();
              otherAudio.currentTime = 0;
            }
          });
        }

        audio.play().catch(error => {
          console.error("❌ Audio play failed:", error);
        });
      } else {
        console.log("⏸️ Pausing audio...");
        audio.pause();
      }
      lastPlayingRef.current = isPlaying;
    }
  }, [isPlaying, currentTrack?.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      nextTrack();
    });

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
    };
  }, [setCurrentTime, setDuration, setIsPlaying, nextTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Waveform animation disabled to fix AudioContext issues

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (audio && duration) {
      const newTime = (value[0] / 100) * duration;
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!currentTrack) return null;

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 bg-[var(--dark-gray)] border-t border-[var(--medium-gray)] z-50 
        transition-all duration-300 safe-area-inset-bottom
        ${isExpanded && !isMobile ? "h-32" : isMobile ? "h-16" : "h-20"}
      `}
    >
      <audio ref={audioRef} crossOrigin="anonymous" />

      <div className="max-w-7xl mx-auto p-2 sm:p-4">
        {/* Main Player Controls */}
        <div className="flex items-center justify-between">
          {/* Track Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 bg-zinc-800 rounded-lg flex-shrink-0">
              {currentTrack.imageUrl && (
                <img
                  src={currentTrack.imageUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-white font-medium text-sm truncate">{currentTrack.title}</h4>
              <p className="text-gray-400 text-xs truncate">{currentTrack.artist}</p>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={previousTrack}
              className="w-8 h-8 p-0 text-gray-400 hover:text-white"
            >
              <SkipBack className="w-4 h-4" />
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 p-0 bg-[var(--accent-purple)] hover:bg-purple-600"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={nextTrack}
              className="w-8 h-8 p-0 text-gray-400 hover:text-white"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="flex-1 max-w-md mx-4">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-10 text-right">{formatTime(currentTime)}</span>
              <Slider
                value={[duration ? (currentTime / duration) * 100 : 0]}
                max={100}
                step={0.1}
                onValueChange={handleSeek}
                className="flex-1"
              />
              <span className="w-10">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMuted(!isMuted)}
              className="w-8 h-8 p-0 text-gray-400 hover:text-white"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>

            <div className="w-20">
              <Slider
                value={[isMuted ? 0 : volume]}
                max={100}
                step={1}
                onValueChange={handleVolumeChange}
              />
            </div>
          </div>

          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-8 h-8 p-0 text-gray-400 hover:text-white"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
