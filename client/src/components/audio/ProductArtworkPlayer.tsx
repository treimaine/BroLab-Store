/**
 * ProductArtworkPlayer - Artwork with integrated play/pause and spectrum animation
 * Inspired by Sonaar Music Example 137
 *
 * Features:
 * - Play/pause button overlay on artwork
 * - Animated spectrum bars during playback
 * - Integrated with global audio store (stops global player when playing)
 * - Smooth transitions and hover effects
 */

import { useAudioStore } from "@/stores/useAudioStore";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Music, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Sonaar-style colors
const PLAYER_COLORS = {
  accent: "#a259ff",
  overlay: "rgba(0, 0, 0, 0.5)",
  playButtonBg: "rgba(162, 89, 255, 0.9)",
  playButtonBorder: "#ffffff",
};

// Pre-defined bar configurations for spectrum animation
const SPECTRUM_BAR_CONFIGS = [
  { id: "spectrum-0", heightVariant: 20, durationOffset: 0, delay: 0 },
  { id: "spectrum-1", heightVariant: 28, durationOffset: 0.1, delay: 0.06 },
  { id: "spectrum-2", heightVariant: 24, durationOffset: 0.15, delay: 0.12 },
  { id: "spectrum-3", heightVariant: 32, durationOffset: 0.2, delay: 0.18 },
  { id: "spectrum-4", heightVariant: 22, durationOffset: 0.1, delay: 0.24 },
  { id: "spectrum-5", heightVariant: 26, durationOffset: 0.25, delay: 0.3 },
  { id: "spectrum-6", heightVariant: 18, durationOffset: 0.15, delay: 0.36 },
];

interface SpectrumBarsProps {
  readonly isPlaying: boolean;
}

function SpectrumBars({ isPlaying }: SpectrumBarsProps): JSX.Element {
  return (
    <div className="flex items-end justify-center gap-1 h-10">
      {SPECTRUM_BAR_CONFIGS.map(bar => (
        <motion.div
          key={bar.id}
          className="w-1.5 rounded-full"
          style={{ backgroundColor: PLAYER_COLORS.accent }}
          initial={{ height: 8 }}
          animate={
            isPlaying
              ? {
                  height: [8, bar.heightVariant, 12, bar.heightVariant - 4, 8],
                }
              : { height: 8 }
          }
          transition={
            isPlaying
              ? {
                  duration: 0.5 + bar.durationOffset,
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

interface ProductArtworkPlayerProps {
  readonly imageSrc?: string;
  readonly productName: string;
  readonly audioUrl?: string;
  readonly productId?: number;
}

export function ProductArtworkPlayer({
  imageSrc,
  productName,
  audioUrl,
  productId,
}: ProductArtworkPlayerProps): JSX.Element {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlayingLocal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Use global audio store to stop other players when this one plays
  const { currentTrack, setCurrentTrack, setIsPlaying: setGlobalIsPlaying, stop } = useAudioStore();

  // Generate a unique track ID for this product
  const trackId = useMemo(() => `product-${productId ?? productName}`, [productId, productName]);

  // Handle play/pause toggle - manages local audio with global store sync
  const handleTogglePlay = useCallback(async (): Promise<void> => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (isPlaying) {
      // Pause local audio
      audio.pause();
      setIsPlayingLocal(false);
      // Also update global store
      setGlobalIsPlaying(false);
    } else {
      try {
        setIsLoading(true);

        // Stop any other audio playing via global store
        if (currentTrack && currentTrack.id !== trackId) {
          stop();
        }

        // Update global store to mark this track as current (for other components to know)
        setCurrentTrack({
          id: trackId,
          title: productName,
          artist: "BroLab Entertainment",
          url: audioUrl,
          audioUrl: audioUrl,
          artwork: imageSrc,
          imageUrl: imageSrc,
        });

        // Play local audio
        await audio.play();
        setIsPlayingLocal(true);
        setGlobalIsPlaying(true);
        setHasError(false);
      } catch (error) {
        console.error("Playback error:", error);
        setHasError(true);
        setIsPlayingLocal(false);
      } finally {
        setIsLoading(false);
      }
    }
  }, [
    audioUrl,
    isPlaying,
    currentTrack,
    trackId,
    productName,
    imageSrc,
    setCurrentTrack,
    setGlobalIsPlaying,
    stop,
  ]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = (): void => {
      setIsPlayingLocal(false);
      setGlobalIsPlaying(false);
    };
    const handlePause = (): void => setIsPlayingLocal(false);
    const handlePlaying = (): void => {
      setIsLoading(false);
      setIsPlayingLocal(true);
    };
    const handleWaiting = (): void => setIsLoading(true);
    const handleError = (): void => {
      setIsLoading(false);
      setIsPlayingLocal(false);
      setHasError(true);
    };

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("error", handleError);
    };
  }, [setGlobalIsPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      // Clear global store if this track was playing
      const store = useAudioStore.getState();
      if (store.currentTrack?.id === trackId) {
        stop();
      }
    };
  }, [trackId, stop]);

  const renderPlayButtonIcon = (): JSX.Element => {
    if (isLoading) {
      return <Loader2 className="w-8 h-8 text-white animate-spin" />;
    }
    if (isPlaying) {
      return <Pause className="w-8 h-8 text-white" />;
    }
    return <Play className="w-8 h-8 text-white ml-1" />;
  };

  const showPlayButton = audioUrl && !hasError;

  return (
    <div className="space-y-4">
      {/* Local audio element for product page playback */}
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata">
          <track kind="captions" />
        </audio>
      )}

      {/* Artwork with play overlay - using CSS :hover via group class */}
      <div className="relative aspect-square bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center overflow-hidden group">
        {imageSrc ? (
          <img src={imageSrc} alt={productName} className="w-full h-full object-cover" />
        ) : (
          <Music className="w-24 h-24 text-white/20" />
        )}

        {/* Play/Pause overlay - visible on hover (via group-hover) or when playing */}
        {showPlayButton && (
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
              isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
            style={{ backgroundColor: PLAYER_COLORS.overlay }}
          >
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="w-20 h-20 rounded-full flex items-center justify-center transition-all"
              style={{
                background: PLAYER_COLORS.playButtonBg,
                border: `4px solid ${PLAYER_COLORS.playButtonBorder}`,
                boxShadow: "0 4px 20px rgba(162, 89, 255, 0.5)",
              }}
              onClick={() => void handleTogglePlay()}
              disabled={isLoading}
              aria-label={isPlaying ? "Pause audio" : "Play audio"}
            >
              {renderPlayButtonIcon()}
            </motion.button>
          </div>
        )}
      </div>

      {/* Spectrum bars animation - visible when playing */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex justify-center"
          >
            <SpectrumBars isPlaying={isPlaying} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ProductArtworkPlayer;
