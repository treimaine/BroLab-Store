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

import { cn } from "@/lib/utils";
import { useAudioStore } from "@/stores/useAudioStore";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, Music, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Audio track for multi-track products */
export interface AudioTrack {
  readonly url: string;
  readonly title?: string;
  readonly artist?: string;
  readonly duration?: string;
}

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
  readonly audioTracks?: AudioTrack[]; // Multiple tracks for albums/playlists
  readonly productId?: number;
}

export function ProductArtworkPlayer({
  imageSrc,
  productName,
  audioUrl,
  audioTracks,
  productId,
}: ProductArtworkPlayerProps): JSX.Element {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlayingLocal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  // Build tracks array from audioTracks or fallback to single audioUrl
  const tracks: AudioTrack[] = useMemo(() => {
    if (audioTracks && audioTracks.length > 0) {
      return audioTracks;
    }
    if (audioUrl) {
      return [{ url: audioUrl, title: productName }];
    }
    return [];
  }, [audioTracks, audioUrl, productName]);

  const hasMultipleTracks = tracks.length > 1;
  const currentTrackData = tracks[currentTrackIndex];
  const currentAudioUrl = currentTrackData?.url;

  // Use global audio store to stop other players when this one plays
  const { currentTrack, setCurrentTrack, setIsPlaying: setGlobalIsPlaying, stop } = useAudioStore();

  // Generate a unique track ID for this product and track
  const trackId = useMemo(
    () => `product-${productId ?? productName}-${currentTrackIndex}`,
    [productId, productName, currentTrackIndex]
  );

  // Handle play/pause toggle - manages local audio with global store sync
  const handleTogglePlay = useCallback(async (): Promise<void> => {
    const audio = audioRef.current;
    if (!audio || !currentAudioUrl) return;

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
        const trackTitle =
          currentTrackData?.title || `${productName} - Track ${currentTrackIndex + 1}`;
        setCurrentTrack({
          id: trackId,
          title: trackTitle,
          artist: currentTrackData?.artist || "BroLab Entertainment",
          url: currentAudioUrl,
          audioUrl: currentAudioUrl,
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
    currentAudioUrl,
    isPlaying,
    currentTrack,
    trackId,
    productName,
    currentTrackIndex,
    currentTrackData,
    imageSrc,
    setCurrentTrack,
    setGlobalIsPlaying,
    stop,
  ]);

  // Handle track navigation
  const handlePreviousTrack = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const newIndex = currentTrackIndex > 0 ? currentTrackIndex - 1 : tracks.length - 1;
      setCurrentTrackIndex(newIndex);
      // Auto-play the new track if currently playing
      if (isPlaying) {
        setIsPlayingLocal(false);
        // Will trigger play on next render via effect
      }
    },
    [currentTrackIndex, tracks.length, isPlaying]
  );

  const handleNextTrack = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const newIndex = currentTrackIndex < tracks.length - 1 ? currentTrackIndex + 1 : 0;
      setCurrentTrackIndex(newIndex);
      // Auto-play the new track if currently playing
      if (isPlaying) {
        setIsPlayingLocal(false);
      }
    },
    [currentTrackIndex, tracks.length, isPlaying]
  );

  // Auto-play when track changes (if was playing)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentAudioUrl) return;

    // Update audio source when track changes
    if (audio.src !== currentAudioUrl) {
      audio.src = currentAudioUrl;
      audio.load();
    }
  }, [currentAudioUrl]);

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

  const showPlayButton = currentAudioUrl && !hasError;

  return (
    <div className="space-y-4">
      {/* Local audio element for product page playback */}
      {currentAudioUrl && (
        <audio ref={audioRef} src={currentAudioUrl} preload="metadata">
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

        {/* Play/Pause overlay with multi-track navigation - visible on hover or when playing */}
        {showPlayButton && (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-200 ${
              isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
            style={{ backgroundColor: PLAYER_COLORS.overlay }}
          >
            {/* Navigation Controls */}
            <div className="flex items-center gap-3">
              {/* Previous Button - only for multi-track */}
              {hasMultipleTracks && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-12 h-12 rounded-full flex items-center justify-center bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-all"
                  onClick={handlePreviousTrack}
                  aria-label="Previous track"
                >
                  <ChevronLeft className="w-6 h-6" />
                </motion.button>
              )}

              {/* Play/Pause Button */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="w-20 h-20 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: isPlaying ? "rgba(0, 200, 200, 0.9)" : PLAYER_COLORS.playButtonBg,
                  border: `4px solid ${PLAYER_COLORS.playButtonBorder}`,
                  boxShadow: isPlaying
                    ? "0 4px 20px rgba(0, 200, 200, 0.5)"
                    : "0 4px 20px rgba(162, 89, 255, 0.5)",
                }}
                onClick={() => void handleTogglePlay()}
                disabled={isLoading}
                aria-label={isPlaying ? "Pause audio" : "Play audio"}
              >
                {renderPlayButtonIcon()}
              </motion.button>

              {/* Next Button - only for multi-track */}
              {hasMultipleTracks && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-12 h-12 rounded-full flex items-center justify-center bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-all"
                  onClick={handleNextTrack}
                  aria-label="Next track"
                >
                  <ChevronRight className="w-6 h-6" />
                </motion.button>
              )}
            </div>

            {/* Track Indicator Dots - only for multi-track */}
            {hasMultipleTracks && (
              <div className="flex items-center gap-1.5 mt-4">
                {tracks.map((_, index) => (
                  <button
                    key={`track-dot-${index}`}
                    type="button"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setCurrentTrackIndex(index);
                    }}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-200",
                      index === currentTrackIndex
                        ? "bg-[var(--accent-purple)] w-4"
                        : "bg-white/50 hover:bg-white/80"
                    )}
                    aria-label={`Go to track ${index + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Current Track Info - only for multi-track */}
            {hasMultipleTracks && currentTrackData && (
              <div className="mt-3 text-center">
                <p className="text-white text-sm font-medium truncate max-w-[200px]">
                  {currentTrackData.title || `Track ${currentTrackIndex + 1}`}
                </p>
                <p className="text-white/60 text-xs">
                  {currentTrackIndex + 1} / {tracks.length}
                </p>
              </div>
            )}
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
