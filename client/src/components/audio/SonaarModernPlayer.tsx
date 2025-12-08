/**
 * SonaarModernPlayer - Modern Audio Player inspired by Sonaar Music Example 097
 *
 * Features:
 * - Bicolor waveform visualization (purple/gray)
 * - Round play button with white border
 * - Dark gradient background
 * - Artwork display on left
 * - Compatible with WooCommerce product data
 *
 * @see https://sonaar.io/mp3-audio-player-pro/music-player-for-wordpress/examples/
 */

import { useCartContext } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAudioStore } from "@/stores/useAudioStore";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2,
  Pause,
  Play,
  ShoppingCart,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// CSS Variables for Sonaar-style theming
const SONAAR_COLORS = {
  waveformPlayed: "#a259ff",
  waveformUnplayed: "#4a4a4a",
  progressCursor: "#a259ff",
  playButtonBg: "rgba(162, 89, 255, 0.9)",
  playButtonBorder: "#ffffff",
  backgroundGradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)",
  textPrimary: "#ffffff",
  textSecondary: "#a0a0a0",
};

interface WaveformCanvasProps {
  readonly currentTime: number;
  readonly duration: number;
  readonly isPlaying: boolean;
  readonly onSeek: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}

/**
 * SpectrumBars - Animated vertical bars visualization (Example 137 style)
 * Displays animated equalizer bars under the artwork during playback
 */
interface SpectrumBarsProps {
  readonly isPlaying: boolean;
  readonly barCount?: number;
}

// Pre-defined bar configurations for consistent animation
const SPECTRUM_BAR_CONFIGS = [
  { id: "bar-0", heightVariant: 16, durationOffset: 0, delay: 0 },
  { id: "bar-1", heightVariant: 14, durationOffset: 0.1, delay: 0.08 },
  { id: "bar-2", heightVariant: 18, durationOffset: 0.2, delay: 0.16 },
  { id: "bar-3", heightVariant: 12, durationOffset: 0.3, delay: 0.24 },
  { id: "bar-4", heightVariant: 15, durationOffset: 0.4, delay: 0.32 },
];

function SpectrumBars({ isPlaying, barCount = 5 }: SpectrumBarsProps): JSX.Element {
  const bars = SPECTRUM_BAR_CONFIGS.slice(0, barCount);

  return (
    <div className="flex items-end justify-center gap-[2px] h-4 w-full">
      {bars.map(bar => (
        <motion.div
          key={bar.id}
          className="w-[3px] rounded-sm"
          style={{ backgroundColor: SONAAR_COLORS.waveformPlayed }}
          initial={{ height: 4 }}
          animate={
            isPlaying
              ? {
                  height: [4, bar.heightVariant, 6, bar.heightVariant - 2, 4],
                }
              : { height: 4 }
          }
          transition={
            isPlaying
              ? {
                  duration: 0.6 + bar.durationOffset,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut",
                  delay: bar.delay,
                }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}

/**
 * BicolorWaveform - Static waveform visualization that works with cross-origin audio
 * Uses a pre-generated waveform pattern instead of Web Audio API to avoid CORS issues
 * with audio files from WordPress/WooCommerce
 */
function BicolorWaveform({
  currentTime,
  duration,
  isPlaying,
  onSeek,
}: WaveformCanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  // Pre-generate a consistent waveform pattern
  const waveformDataRef = useRef<number[]>([]);

  // Generate waveform data once
  useEffect(() => {
    if (waveformDataRef.current.length === 0) {
      const barCount = 60;
      const data: number[] = [];
      for (let i = 0; i < barCount; i++) {
        // Create a natural-looking waveform pattern
        const base = Math.sin(i * 0.3) * 0.3 + 0.5;
        const variation = Math.sin(i * 0.7) * 0.2;
        const noise = Math.sin(i * 1.5) * 0.1;
        data.push(Math.max(0.15, Math.min(1, base + variation + noise)));
      }
      waveformDataRef.current = data;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawWaveform = (): void => {
      const width = canvas.width;
      const height = canvas.height;
      const progress = duration > 0 ? currentTime / duration : 0;
      const progressX = progress * width;

      ctx.clearRect(0, 0, width, height);

      const barCount = 60;
      const barWidth = width / barCount;
      const gap = 2;
      const waveformData = waveformDataRef.current;

      for (let i = 0; i < barCount; i++) {
        // Use pre-generated waveform data with slight animation when playing
        let heightMultiplier = waveformData[i] || 0.5;

        if (isPlaying) {
          // Add subtle animation when playing
          const time = Date.now() / 1000;
          const animOffset = Math.sin(time * 3 + i * 0.2) * 0.1;
          heightMultiplier = Math.max(0.15, Math.min(1, heightMultiplier + animOffset));
        }

        const barHeight = Math.max(4, heightMultiplier * height * 0.8);
        const x = i * barWidth;
        const y = (height - barHeight) / 2;

        // Bicolor: purple for played portion, gray for unplayed
        ctx.fillStyle =
          x < progressX ? SONAAR_COLORS.waveformPlayed : SONAAR_COLORS.waveformUnplayed;
        ctx.fillRect(x + gap / 2, y, barWidth - gap, barHeight);
      }

      // Draw progress cursor
      if (duration > 0) {
        ctx.fillStyle = SONAAR_COLORS.progressCursor;
        ctx.fillRect(progressX - 1, 0, 2, height);
      }
    };

    if (isPlaying) {
      const animate = (): void => {
        drawWaveform();
        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else {
      drawWaveform();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentTime, duration, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={48}
      className="w-full h-12 cursor-pointer rounded-md"
      onClick={onSeek}
      style={{ background: "transparent" }}
    />
  );
}

export function SonaarModernPlayer(): JSX.Element | null {
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
    setCurrentTrack,
    nextTrack,
    previousTrack,
  } = useAudioStore();

  const { addItem } = useCartContext();
  const { toast } = useToast();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const lastTrackRef = useRef<string | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stopOtherAudioElements = useCallback((currentAudio: HTMLAudioElement): void => {
    const allAudio = document.querySelectorAll("audio");
    for (const otherAudio of allAudio) {
      if (otherAudio !== currentAudio && !otherAudio.paused) {
        otherAudio.pause();
        otherAudio.currentTime = 0;
      }
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (lastTrackRef.current === currentTrack.id) return;

    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    setIsLoading(true);
    stopOtherAudioElements(audio);
    setDuration(0);
    setCurrentTime(0);

    audio.src = currentTrack.audioUrl;
    audio.load();
    lastTrackRef.current = currentTrack.id;

    loadingTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      setIsPlaying(false);
      toast({
        title: "Audio Loading Failed",
        description: "The audio file took too long to load.",
        variant: "destructive",
      });
    }, 30000);

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [currentTrack, setDuration, setCurrentTime, setIsPlaying, toast, stopOtherAudioElements]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    const handlePlayPause = async (): Promise<void> => {
      if (isPlaying) {
        try {
          stopOtherAudioElements(audio);
          await audio.play();
        } catch (error) {
          console.error("Playback error:", error);
          setIsPlaying(false);
          toast({
            title: "Playback Error",
            description: "Failed to play audio.",
            variant: "destructive",
          });
        }
      } else {
        audio.pause();
      }
    };

    void handlePlayPause();
  }, [isPlaying, currentTrack, setIsPlaying, toast, stopOtherAudioElements]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = (): void => setCurrentTime(audio.currentTime);

    const handleLoadedMetadata = (): void => {
      if (audio.duration && !Number.isNaN(audio.duration) && Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleCanPlay = (): void => {
      setIsLoading(false);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (isPlaying && audio.paused) {
        audio.play().catch(() => undefined);
      }
    };

    const handleError = (): void => {
      setIsLoading(false);
      setIsPlaying(false);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      toast({
        title: "Audio Error",
        description: "Failed to load audio file.",
        variant: "destructive",
      });
    };

    const handleEnded = (): void => {
      setIsPlaying(false);
      nextTrack();
    };

    const handlePlaying = (): void => setIsLoading(false);
    const handleWaiting = (): void => setIsLoading(true);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("waiting", handleWaiting);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("waiting", handleWaiting);
    };
  }, [setCurrentTime, setDuration, setIsPlaying, nextTrack, toast, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = clickX / rect.width;
    const newTime = progress * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setVolume(Number(e.target.value));
  };

  const handleAddToCart = (): void => {
    if (!currentTrack) return;

    addItem({
      beatId: Number.parseInt(currentTrack.id, 10),
      title: currentTrack.title,
      genre: "Unknown",
      imageUrl: currentTrack.imageUrl ?? "",
      licenseType: "basic" as const,
      quantity: 1,
      isFree: currentTrack.isFree ?? false,
    });
  };

  const getDisplayPrice = (): string => {
    if (!currentTrack) return "";
    if (currentTrack.isFree) return "FREE";
    if (typeof currentTrack.price === "number") {
      return `$${(currentTrack.price / 100).toFixed(2)}`;
    }
    if (typeof currentTrack.price === "string") {
      return currentTrack.price.startsWith("$") ? currentTrack.price : `$${currentTrack.price}`;
    }
    return "";
  };

  const handleClose = (): void => {
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (time: number): string => {
    if (!time || Number.isNaN(time) || !Number.isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const togglePlay = (): void => {
    setIsPlaying(!isPlaying);
  };

  const renderPlayButtonIcon = (): JSX.Element => {
    if (isLoading) {
      return <Loader2 className="w-5 h-5 text-white animate-spin" />;
    }
    if (isPlaying) {
      return <Pause className="w-5 h-5 text-white" />;
    }
    return <Play className="w-5 h-5 text-white ml-0.5" />;
  };

  if (!currentTrack) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 z-50 pb-safe-area-inset-bottom"
        style={{ background: SONAAR_COLORS.backgroundGradient }}
      >
        <audio ref={audioRef} preload="metadata">
          <track kind="captions" />
        </audio>

        <div className="h-1 bg-gray-800">
          <motion.div
            className="h-full"
            style={{ backgroundColor: SONAAR_COLORS.waveformPlayed }}
            initial={{ width: 0 }}
            animate={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            transition={{ duration: 0.1, ease: "linear" }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0 flex flex-col items-center gap-1">
              {currentTrack.imageUrl ? (
                <img
                  src={currentTrack.imageUrl}
                  alt={currentTrack.title}
                  className="w-14 h-14 rounded-lg object-cover shadow-lg"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center">
                  <span className="text-white text-xl">🎵</span>
                </div>
              )}
              {/* Spectrum Bars Animation - Example 137 style */}
              <div className="w-14">
                <SpectrumBars isPlaying={isPlaying} barCount={5} />
              </div>
            </div>

            <div className="flex-shrink-0 w-32 md:w-48 overflow-hidden">
              <h4
                className="text-sm font-semibold truncate"
                style={{ color: SONAAR_COLORS.textPrimary }}
              >
                {currentTrack.title}
              </h4>
              {currentTrack.artist && (
                <p className="text-xs truncate" style={{ color: SONAAR_COLORS.textSecondary }}>
                  {currentTrack.artist}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={previousTrack}
                disabled={isLoading}
                className="w-8 h-8 p-0 rounded-full text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50"
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              <button
                onClick={togglePlay}
                disabled={isLoading}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 disabled:opacity-50"
                style={{
                  background: SONAAR_COLORS.playButtonBg,
                  border: `3px solid ${SONAAR_COLORS.playButtonBorder}`,
                  boxShadow: "0 4px 15px rgba(162, 89, 255, 0.4)",
                }}
              >
                {renderPlayButtonIcon()}
              </button>

              <Button
                variant="ghost"
                size="sm"
                onClick={nextTrack}
                disabled={isLoading}
                className="w-8 h-8 p-0 rounded-full text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 flex items-center gap-3 mx-2 min-w-0">
              <span
                className="text-xs w-10 text-right font-mono"
                style={{ color: SONAAR_COLORS.textSecondary }}
              >
                {formatTime(currentTime)}
              </span>

              <div className="flex-1 min-w-0">
                <BicolorWaveform
                  currentTime={currentTime}
                  duration={duration}
                  isPlaying={isPlaying}
                  onSeek={handleSeek}
                />
              </div>

              <span
                className="text-xs w-10 font-mono"
                style={{ color: SONAAR_COLORS.textSecondary }}
              >
                {formatTime(duration)}
              </span>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMuted(!isMuted)}
                className="w-8 h-8 p-0 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>

              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${SONAAR_COLORS.waveformPlayed} 0%, ${SONAAR_COLORS.waveformPlayed} ${isMuted ? 0 : volume}%, ${SONAAR_COLORS.waveformUnplayed} ${isMuted ? 0 : volume}%, ${SONAAR_COLORS.waveformUnplayed} 100%)`,
                }}
              />
            </div>

            {getDisplayPrice() && (
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddToCart}
                  className="w-8 h-8 p-0 rounded-full text-gray-400 hover:text-white hover:bg-white/10 relative"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                    style={{ backgroundColor: SONAAR_COLORS.waveformPlayed }}
                  />
                </Button>
                <span className="text-sm font-medium text-white">{getDisplayPrice()}</span>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="w-8 h-8 p-0 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default SonaarModernPlayer;
