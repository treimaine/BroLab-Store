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
import { TabVisibilityManager } from "@/hooks/useTabVisibilityManager";
import { useAudioStore } from "@/stores/useAudioStore";
import { AnimatePresence, motion } from "framer-motion";
import {
  List,
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

// Playing indicator bar configs
const PLAYING_INDICATOR_BARS = [
  { id: "playing-bar-0", delay: 0 },
  { id: "playing-bar-1", delay: 0.1 },
  { id: "playing-bar-2", delay: 0.2 },
];

/**
 * Format duration from number or string to display format
 */
function formatDuration(duration: number | string | undefined): string {
  if (!duration) return "--:--";
  if (typeof duration === "number") {
    const minutes = Math.floor(duration / 60);
    const seconds = String(Math.floor(duration % 60)).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }
  return duration;
}

/**
 * Wait for audio element to be ready for playback
 * Extracted to reduce nesting depth in useEffect
 */
function waitForAudioReady(audio: HTMLAudioElement): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const onCanPlay = (): void => {
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("error", onError);
      resolve();
    };
    const onError = (): void => {
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("error", onError);
      reject(new Error("Audio load failed"));
    };
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("error", onError);
  });
}

/**
 * Check if error is an AbortError (expected when pause interrupts play)
 */
function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/**
 * PlayingIndicator - Animated bars showing current track is playing
 */
function PlayingIndicator(): JSX.Element {
  return (
    <div className="flex items-end gap-[2px] h-4">
      {PLAYING_INDICATOR_BARS.map(bar => (
        <motion.div
          key={bar.id}
          className="w-1 rounded-sm"
          style={{ backgroundColor: SONAAR_COLORS.waveformPlayed }}
          animate={{ height: [4, 12, 4] }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            delay: bar.delay,
          }}
        />
      ))}
    </div>
  );
}

/**
 * TrackItem - Individual track row in the tracklist modal
 */
interface TrackItemProps {
  readonly track: {
    id: string;
    title: string;
    artist: string;
    imageUrl?: string;
    duration?: number | string;
    isFree?: boolean;
  };
  readonly index: number;
  readonly isCurrentTrack: boolean;
  readonly isPlaying: boolean;
  readonly onPlay: () => void;
  readonly onAddToCart: () => void;
}

function TrackItem({
  track,
  index,
  isCurrentTrack,
  isPlaying,
  onPlay,
  onAddToCart,
}: TrackItemProps): JSX.Element {
  const handleAddToCartClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    onAddToCart();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all ${
        isCurrentTrack ? "bg-white/10" : "hover:bg-white/5"
      }`}
      onClick={onPlay}
    >
      {/* Play indicator / Track number */}
      <div className="w-8 flex items-center justify-center">
        {isCurrentTrack && isPlaying ? (
          <PlayingIndicator />
        ) : (
          <span className={`text-sm ${isCurrentTrack ? "text-white" : "text-gray-500"}`}>
            {isCurrentTrack ? "▶" : index + 1}
          </span>
        )}
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${isCurrentTrack ? "text-white" : "text-gray-300"}`}>
          {track.title}
        </p>
      </div>

      {/* Artist */}
      <div className="hidden sm:block text-sm text-gray-500 truncate max-w-[120px]">
        {track.artist}
      </div>

      {/* Duration */}
      <div className="text-sm text-gray-500 w-12 text-right">{formatDuration(track.duration)}</div>

      {/* Add to cart */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleAddToCartClick}
        className="w-8 h-8 p-0 text-gray-500 hover:text-white hover:bg-white/10"
      >
        <ShoppingCart className="w-4 h-4" />
      </Button>
    </motion.div>
  );
}

/**
 * TracklistModal - Modal displaying the queue of tracks
 */
interface TracklistModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly queue: TrackItemProps["track"][];
  readonly currentIndex: number;
  readonly isPlaying: boolean;
  readonly currentTrackArtist?: string;
  readonly onPlayTrack: (index: number) => void;
  readonly onAddTrackToCart: (track: TrackItemProps["track"]) => void;
}

function TracklistModal({
  isOpen,
  onClose,
  queue,
  currentIndex,
  isPlaying,
  currentTrackArtist,
  onPlayTrack,
  onAddTrackToCart,
}: TracklistModalProps): JSX.Element | null {
  if (!isOpen) return null;

  const handlePlayAll = (): void => {
    if (queue.length > 0) {
      onPlayTrack(0);
    }
  };

  const handleBackdropClick = (): void => {
    onClose();
  };

  const handleModalClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg mx-4 max-h-[70vh] rounded-xl overflow-hidden"
        style={{ background: SONAAR_COLORS.backgroundGradient }}
        onClick={handleModalClick}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-xl font-bold" style={{ color: SONAAR_COLORS.waveformPlayed }}>
            {currentTrackArtist || "Tracklist"}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-8 h-8 p-0 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Play All Button */}
        <div className="flex justify-center py-4">
          <Button
            onClick={handlePlayAll}
            className="px-8 py-2 rounded-full font-semibold transition-all hover:scale-105"
            style={{
              backgroundColor: SONAAR_COLORS.waveformPlayed,
              color: "white",
            }}
          >
            PLAY
          </Button>
        </div>

        {/* Track List */}
        <div className="overflow-y-auto max-h-[45vh] px-4 pb-4">
          {queue.map((track, index) => (
            <TrackItem
              key={track.id}
              track={track}
              index={index}
              isCurrentTrack={currentIndex === index}
              isPlaying={isPlaying}
              onPlay={() => onPlayTrack(index)}
              onAddToCart={() => onAddTrackToCart(track)}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

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

        if (isPlaying && TabVisibilityManager.isVisible()) {
          // Add subtle animation when playing (only if tab is visible)
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

    const animate = (): void => {
      // Stop animation loop if tab is hidden to prevent accumulation
      if (!TabVisibilityManager.isVisible()) return;

      drawWaveform();
      animationRef.current = requestAnimationFrame(animate);
    };

    const handleVisibilityChange = (): void => {
      if (TabVisibilityManager.isVisible() && isPlaying) {
        // Cancel any pending frame and restart cleanly with staggered delay
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        // Stagger restart to prevent thundering herd
        const staggerDelay = Math.random() * 200 + 100;
        setTimeout(() => {
          if (TabVisibilityManager.isVisible() && isPlaying) {
            animate();
          }
        }, staggerDelay);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (isPlaying) {
      animate();
    } else {
      drawWaveform();
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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
    queue,
    currentIndex,
    isHandingOff,
    handoffTime,
    setIsPlaying,
    setVolume,
    setCurrentTime,
    setDuration,
    setCurrentTrack,
    nextTrack,
    previousTrack,
    playTrackFromQueue,
    completeHandoff,
  } = useAudioStore();

  const { addItem } = useCartContext();
  const { toast } = useToast();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTracklist, setShowTracklist] = useState(false);
  const lastTrackRef = useRef<string | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if there are multiple tracks in the queue
  const hasMultipleTracks = queue.length > 1;

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
    // Don't reset currentTime if this is a handoff - we'll set it from handoffTime
    if (!isHandingOff) {
      setCurrentTime(0);
    }

    console.log(`🎵 Loading audio for track "${currentTrack.title}": ${currentTrack.audioUrl}`);
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
  }, [
    currentTrack,
    isHandingOff,
    setDuration,
    setCurrentTime,
    setIsPlaying,
    toast,
    stopOtherAudioElements,
  ]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    let isCancelled = false;

    const startPlayback = async (): Promise<void> => {
      stopOtherAudioElements(audio);

      // Handle handoff from ProductArtworkPlayer - resume at saved time
      if (isHandingOff && handoffTime > 0) {
        audio.currentTime = handoffTime;
        completeHandoff();
      }

      // Wait for audio to be ready before playing
      if (audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
        await waitForAudioReady(audio);
      }

      if (!isCancelled) {
        await audio.play();
      }
    };

    const handlePlaybackError = (error: unknown): void => {
      if (isAbortError(error)) {
        console.debug("Play interrupted - likely intentional navigation");
        return;
      }
      console.error("Playback error:", error);
      if (!isCancelled) {
        setIsPlaying(false);
        toast({
          title: "Playback Error",
          description: "Failed to play audio.",
          variant: "destructive",
        });
      }
    };

    if (isPlaying) {
      startPlayback().catch(handlePlaybackError);
    } else {
      audio.pause();
    }

    return () => {
      isCancelled = true;
    };
  }, [
    isPlaying,
    currentTrack,
    isHandingOff,
    handoffTime,
    completeHandoff,
    setIsPlaying,
    toast,
    stopOtherAudioElements,
  ]);

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

  const handlePlayTrackFromQueue = useCallback(
    (index: number): void => {
      playTrackFromQueue(index);
      setIsPlaying(true);
    },
    [playTrackFromQueue, setIsPlaying]
  );

  const handleAddTrackToCart = useCallback(
    (track: { id: string; title: string; imageUrl?: string; isFree?: boolean }): void => {
      addItem({
        beatId: Number.parseInt(track.id, 10),
        title: track.title,
        genre: "Unknown",
        imageUrl: track.imageUrl ?? "",
        licenseType: "basic" as const,
        quantity: 1,
        isFree: track.isFree ?? false,
      });
      toast({
        title: "Added to Cart",
        description: `${track.title} has been added to your cart.`,
      });
    },
    [addItem, toast]
  );

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

            {/* View Tracklist Button - Only show when multiple tracks */}
            {hasMultipleTracks && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTracklist(true)}
                className="w-8 h-8 p-0 rounded-full text-gray-400 hover:text-white hover:bg-white/10 relative"
                title="View Tracklist"
              >
                <List className="w-4 h-4" />
                <span
                  className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                  style={{ backgroundColor: SONAAR_COLORS.waveformPlayed }}
                >
                  {queue.length}
                </span>
              </Button>
            )}

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

        {/* Tracklist Modal */}
        <AnimatePresence>
          <TracklistModal
            isOpen={showTracklist}
            onClose={() => setShowTracklist(false)}
            queue={queue}
            currentIndex={currentIndex}
            isPlaying={isPlaying}
            currentTrackArtist={currentTrack?.artist}
            onPlayTrack={handlePlayTrackFromQueue}
            onAddTrackToCart={handleAddTrackToCart}
          />
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

export default SonaarModernPlayer;
