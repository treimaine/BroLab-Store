/**
 * SonaarCarouselCoverflow - Example 738 Carousel Coverflow
 *
 * 3D coverflow carousel for featured beats on homepage
 * Features: 3D transforms, smooth animations, touch support
 * Uses global audio store for synchronized playback across components
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAudioStore } from "@/stores/useAudioStore";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  ShoppingCart,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

/** Audio track for multi-track products */
export interface AudioTrack {
  readonly url: string;
  readonly title?: string;
  readonly artist?: string;
  readonly duration?: string;
}

export interface CarouselBeat {
  readonly id: number;
  readonly title: string;
  readonly artist?: string;
  readonly genre: string;
  readonly price: number | string;
  readonly imageUrl: string;
  readonly audioUrl?: string;
  readonly audioTracks?: AudioTrack[];
  readonly isFree?: boolean;
}

interface SonaarCarouselCoverflowProps {
  readonly beats: CarouselBeat[];
  readonly onBeatSelect?: (beat: CarouselBeat) => void;
  readonly onAddToCart?: (beat: CarouselBeat) => void;
  readonly autoPlay?: boolean;
  readonly autoPlayInterval?: number;
  readonly className?: string;
}

interface CarouselItemProps {
  readonly beat: CarouselBeat;
  readonly position: number;
  readonly isActive: boolean;
  readonly isPlaying: boolean;
  readonly currentTrackIndex: number;
  readonly onPlay: () => void;
  readonly onPrevTrack: () => void;
  readonly onNextTrack: () => void;
  readonly onTrackSelect: (index: number) => void;
  readonly onSelect?: () => void;
  readonly onAddToCart?: () => void;
}

function getTracks(beat: CarouselBeat): AudioTrack[] {
  if (beat.audioTracks && beat.audioTracks.length > 0) {
    return beat.audioTracks;
  }
  if (beat.audioUrl) {
    return [{ url: beat.audioUrl, title: beat.title }];
  }
  return [];
}

const CarouselItem = memo(function CarouselItem({
  beat,
  position,
  isActive,
  isPlaying,
  currentTrackIndex,
  onPlay,
  onPrevTrack,
  onNextTrack,
  onTrackSelect,
  onSelect,
  onAddToCart,
}: CarouselItemProps): JSX.Element {
  const tracks = getTracks(beat);
  const hasMultipleTracks = tracks.length > 1;
  const hasAudio = tracks.length > 0;

  // Calculate 3D transform based on position
  // Note: Must include -50% translate to maintain centering since style.transform overrides CSS classes
  const getTransform = (): string => {
    const absPos = Math.abs(position);
    const direction = position < 0 ? -1 : 1;

    if (position === 0) {
      return "translate(-50%, -50%) translateZ(0) rotateY(0deg) scale(1)";
    }

    const translateX = direction * (absPos * 180 + 100);
    const translateZ = -absPos * 150;
    const rotateY = direction * -45;
    const scale = Math.max(0.6, 1 - absPos * 0.15);

    return `translate(calc(-50% + ${translateX}px), -50%) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`;
  };

  const getOpacity = (): number => {
    const absPos = Math.abs(position);
    if (absPos > 3) return 0;
    return Math.max(0.3, 1 - absPos * 0.25);
  };

  const getZIndex = (): number => {
    return 10 - Math.abs(position);
  };

  const formatPrice = (price: number | string): string => {
    if (beat.isFree) return "FREE";
    const numPrice = typeof price === "string" ? Number.parseFloat(price) : price;
    return `$${numPrice.toFixed(2)}`;
  };

  return (
    <div
      className={cn(
        "absolute left-1/2 top-1/2",
        "w-64 sm:w-72 md:w-80 transition-all duration-500 ease-out",
        isActive ? "cursor-pointer" : "cursor-default"
      )}
      style={{
        transform: getTransform(),
        opacity: getOpacity(),
        zIndex: getZIndex(),
      }}
    >
      <div
        className={cn(
          "relative rounded-xl overflow-hidden shadow-2xl",
          "bg-[var(--dark-gray)] border-2 transition-colors duration-300",
          isActive ? "border-[var(--accent-purple)] shadow-purple-500/30" : "border-transparent"
        )}
      >
        {/* Image */}
        <div className="relative aspect-square">
          <img
            src={beat.imageUrl || "/api/placeholder/400/400"}
            alt={beat.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {/* Audio Controls - Only on active items with audio */}
          {isActive && hasAudio && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3">
              {/* Previous Track Button */}
              {hasMultipleTracks && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onPrevTrack();
                  }}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    "bg-black/60 text-white backdrop-blur-sm",
                    "transform transition-all duration-300 hover:scale-110 hover:bg-black/80"
                  )}
                  aria-label="Previous track"
                >
                  <SkipBack className="w-5 h-5" fill="currentColor" />
                </button>
              )}

              {/* Play/Pause Button */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  onPlay();
                }}
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center",
                  "bg-[var(--accent-purple)] text-white",
                  "transform transition-all duration-300 hover:scale-110",
                  isPlaying && "bg-[var(--accent-cyan)]"
                )}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7" fill="currentColor" />
                ) : (
                  <Play className="w-7 h-7 ml-1" fill="currentColor" />
                )}
              </button>

              {/* Next Track Button */}
              {hasMultipleTracks && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onNextTrack();
                  }}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    "bg-black/60 text-white backdrop-blur-sm",
                    "transform transition-all duration-300 hover:scale-110 hover:bg-black/80"
                  )}
                  aria-label="Next track"
                >
                  <SkipForward className="w-5 h-5" fill="currentColor" />
                </button>
              )}
            </div>
          )}

          {/* Track Indicator Dots */}
          {isActive && hasMultipleTracks && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
              {tracks.map((_, index) => (
                <button
                  key={`track-dot-${beat.id}-${index}`}
                  onClick={e => {
                    e.stopPropagation();
                    onTrackSelect(index);
                  }}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-200",
                    index === currentTrackIndex
                      ? "w-4 bg-[var(--accent-purple)]"
                      : "bg-white/50 hover:bg-white/80"
                  )}
                  aria-label={`Track ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Current Track Title (for multi-track) */}
          {isActive && hasMultipleTracks && tracks[currentTrackIndex]?.title && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 max-w-[80%]">
              <span className="text-xs text-white/80 bg-black/60 px-2 py-1 rounded truncate block">
                {tracks[currentTrackIndex].title}
              </span>
            </div>
          )}

          {/* Price Badge */}
          <Badge
            className={cn(
              "absolute top-3 right-3",
              beat.isFree
                ? "bg-[var(--accent-cyan)] text-black"
                : "bg-[var(--accent-purple)] text-white"
            )}
          >
            {formatPrice(beat.price)}
          </Badge>

          {/* Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-lg font-bold text-white truncate">{beat.title}</h3>
            <p className="text-sm text-gray-300">{beat.genre}</p>
            {beat.artist && <p className="text-xs text-gray-400 mt-1">by {beat.artist}</p>}
          </div>
        </div>

        {/* Action Bar - Only on active */}
        {isActive && (
          <div className="p-3 bg-black/50 flex items-center justify-between">
            <Button
              size="sm"
              variant="ghost"
              onClick={onSelect}
              className="text-white hover:text-[var(--accent-purple)]"
            >
              View Details
            </Button>
            {onAddToCart && !beat.isFree && (
              <Button
                size="sm"
                onClick={e => {
                  e.stopPropagation();
                  onAddToCart();
                }}
                className="bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/80"
              >
                <ShoppingCart className="w-4 h-4 mr-1" />
                Add
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Reflection Effect */}
      {isActive && (
        <div
          className="absolute top-full left-0 right-0 h-20 mt-2 rounded-xl overflow-hidden opacity-30"
          style={{
            transform: "scaleY(-1)",
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)",
          }}
        >
          <img
            src={beat.imageUrl || "/api/placeholder/400/400"}
            alt=""
            className="w-full h-full object-cover blur-sm"
          />
        </div>
      )}
    </div>
  );
});

// Helper to convert CarouselBeat track to store AudioTrack format
function convertToStoreTrack(
  beat: CarouselBeat,
  track: AudioTrack,
  index: number
): import("@/stores/useAudioStore").AudioTrack {
  return {
    id: `carousel-${beat.id}-${index}`,
    title: track.title || beat.title,
    artist: track.artist || beat.artist || "BroLab",
    url: track.url,
    audioUrl: track.url,
    artwork: beat.imageUrl,
    imageUrl: beat.imageUrl,
    price: beat.price,
    isFree: beat.isFree,
  };
}

export const SonaarCarouselCoverflow = memo(function SonaarCarouselCoverflow({
  beats,
  onBeatSelect,
  onAddToCart,
  autoPlay = true,
  autoPlayInterval = 5000,
  className,
}: SonaarCarouselCoverflowProps): JSX.Element {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [trackIndices, setTrackIndices] = useState<Record<number, number>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Use global audio store for synchronized playback
  const { currentTrack, isPlaying, setIsPlaying, playFromQueueBatched } = useAudioStore();

  // Get current track index for a beat
  const getTrackIndex = useCallback(
    (beatId: number): number => trackIndices[beatId] ?? 0,
    [trackIndices]
  );

  // Check if a specific beat is currently playing
  const isBeatPlaying = useCallback(
    (beatId: number): boolean => {
      return Boolean(currentTrack?.id?.startsWith(`carousel-${beatId}-`) && isPlaying);
    },
    [currentTrack, isPlaying]
  );

  // Autoplay interval callback - extracted to reduce nesting depth
  const incrementActiveIndex = useCallback((): void => {
    setActiveIndex(prev => (prev + 1) % beats.length);
  }, [beats.length]);

  // Auto-play carousel (visual rotation, not audio)
  // FIX: Only run autoplay when tab is visible to prevent background CPU usage
  useEffect(() => {
    if (!autoPlay || isPaused || beats.length <= 1) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startAutoplay = (): void => {
      if (intervalId) clearInterval(intervalId);
      // FIX: Add document.hidden check inside interval to prevent accumulated callbacks
      intervalId = setInterval(() => {
        if (!document.hidden) {
          incrementActiveIndex();
        }
      }, autoPlayInterval);
    };

    const stopAutoplay = (): void => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = (): void => {
      if (document.hidden) {
        stopAutoplay();
      } else {
        // Stagger restart to prevent thundering herd
        const delay = Math.random() * 500 + 200;
        setTimeout(startAutoplay, delay);
      }
    };

    // Only start if tab is visible
    if (!document.hidden) {
      startAutoplay();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange, { passive: true });

    return () => {
      stopAutoplay();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [autoPlay, autoPlayInterval, beats.length, isPaused, incrementActiveIndex]);

  // Handle play/pause toggle using global store
  const handlePlay = useCallback(
    (beat: CarouselBeat) => {
      const tracks = getTracks(beat);
      if (tracks.length === 0) return;

      const currentTrackIdx = getTrackIndex(beat.id);
      const trackId = `carousel-${beat.id}-${currentTrackIdx}`;
      const isSameTrack = currentTrack?.id === trackId;

      // If same track, toggle play/pause
      if (isSameTrack) {
        setIsPlaying(!isPlaying);
        return;
      }

      // Convert all tracks to store format and set queue
      const storeTracks = tracks.map((t, i) => convertToStoreTrack(beat, t, i));

      // FIX: Use batched action to prevent multiple re-renders that cause freeze
      // This combines setQueue + setCurrentTrack + setCurrentIndex + setIsPlaying into single update
      playFromQueueBatched(storeTracks, currentTrackIdx, true);
    },
    [currentTrack, isPlaying, getTrackIndex, setIsPlaying, playFromQueueBatched]
  );

  // Handle track change (prev/next)
  const handleTrackChange = useCallback(
    (beat: CarouselBeat, newIndex: number) => {
      const tracks = getTracks(beat);
      if (tracks.length === 0) return;

      // Wrap around
      const wrappedIndex = (newIndex + tracks.length) % tracks.length;
      setTrackIndices(prev => ({ ...prev, [beat.id]: wrappedIndex }));

      // If currently playing this beat, switch to new track in global store
      if (isBeatPlaying(beat.id)) {
        const storeTracks = tracks.map((t, i) => convertToStoreTrack(beat, t, i));
        // FIX: Use batched action to prevent multiple re-renders
        playFromQueueBatched(storeTracks, wrappedIndex, true);
      }
    },
    [isBeatPlaying, playFromQueueBatched]
  );

  // Handle previous track
  const handlePrevTrack = useCallback(
    (beat: CarouselBeat) => {
      const currentIdx = getTrackIndex(beat.id);
      handleTrackChange(beat, currentIdx - 1);
    },
    [getTrackIndex, handleTrackChange]
  );

  // Handle next track
  const handleNextTrack = useCallback(
    (beat: CarouselBeat) => {
      const currentIdx = getTrackIndex(beat.id);
      handleTrackChange(beat, currentIdx + 1);
    },
    [getTrackIndex, handleTrackChange]
  );

  // Handle direct track selection
  const handleTrackSelect = useCallback(
    (beat: CarouselBeat, index: number) => {
      handleTrackChange(beat, index);
    },
    [handleTrackChange]
  );

  // Navigation
  const goToPrev = useCallback(() => {
    setActiveIndex(prev => (prev - 1 + beats.length) % beats.length);
  }, [beats.length]);

  const goToNext = useCallback(() => {
    setActiveIndex(prev => (prev + 1) % beats.length);
  }, [beats.length]);

  // Touch/Swipe support
  const touchStartX = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent): void => {
    touchStartX.current = e.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent): void => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }

    setTimeout(() => setIsPaused(false), 1000);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "ArrowLeft") {
        goToPrev();
      } else if (e.key === "ArrowRight") {
        goToNext();
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [goToPrev, goToNext]);

  // Mouse enter/leave handlers - extracted to reduce nesting
  const handleMouseEnter = useCallback((): void => {
    setIsPaused(true);
  }, []);

  const handleMouseLeave = useCallback((): void => {
    setIsPaused(false);
  }, []);

  // Calculate carousel item position - extracted to reduce nesting depth
  const calculatePosition = useCallback(
    (index: number): number => {
      let position = index - activeIndex;
      const halfLength = beats.length / 2;

      if (position > halfLength) {
        position -= beats.length;
      } else if (position < -halfLength) {
        position += beats.length;
      }

      return position;
    },
    [activeIndex, beats.length]
  );

  // Create item handlers - memoized to prevent recreation
  const createItemHandlers = useCallback(
    (beat: CarouselBeat) => ({
      onPlay: () => handlePlay(beat),
      onPrevTrack: () => handlePrevTrack(beat),
      onNextTrack: () => handleNextTrack(beat),
      onTrackSelect: (idx: number) => handleTrackSelect(beat, idx),
      onSelect: () => onBeatSelect?.(beat),
      onAddToCart: () => onAddToCart?.(beat),
    }),
    [handlePlay, handlePrevTrack, handleNextTrack, handleTrackSelect, onBeatSelect, onAddToCart]
  );

  if (beats.length === 0) {
    return (
      <div className={cn("text-center py-12 text-gray-400", className)}>No beats to display</div>
    );
  }

  return (
    <section
      ref={containerRef}
      aria-label="Beat carousel"
      className={cn("relative w-full overflow-hidden", "py-8 sm:py-12", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 3D Container */}
      <div
        className="relative h-[400px] sm:h-[450px] md:h-[500px]"
        style={{ perspective: "1000px" }}
      >
        {beats.map((beat, index) => {
          const position = calculatePosition(index);

          // Only render visible items
          if (Math.abs(position) > 3) return null;

          const handlers = createItemHandlers(beat);

          return (
            <CarouselItem
              key={beat.id}
              beat={beat}
              position={position}
              isActive={position === 0}
              isPlaying={isBeatPlaying(beat.id)}
              currentTrackIndex={getTrackIndex(beat.id)}
              onPlay={handlers.onPlay}
              onPrevTrack={handlers.onPrevTrack}
              onNextTrack={handlers.onNextTrack}
              onTrackSelect={handlers.onTrackSelect}
              onSelect={handlers.onSelect}
              onAddToCart={handlers.onAddToCart}
            />
          );
        })}
      </div>

      {/* Navigation Arrows */}
      <Button
        variant="ghost"
        size="icon"
        onClick={goToPrev}
        className={cn(
          "absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20",
          "w-10 h-10 sm:w-12 sm:h-12 rounded-full",
          "bg-black/50 text-white hover:bg-[var(--accent-purple)]",
          "transition-all duration-300"
        )}
        aria-label="Previous"
      >
        <ChevronLeft className="w-6 h-6" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={goToNext}
        className={cn(
          "absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20",
          "w-10 h-10 sm:w-12 sm:h-12 rounded-full",
          "bg-black/50 text-white hover:bg-[var(--accent-purple)]",
          "transition-all duration-300"
        )}
        aria-label="Next"
      >
        <ChevronRight className="w-6 h-6" />
      </Button>

      {/* Dots Indicator */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {beats.slice(0, Math.min(beats.length, 10)).map((beat, index) => (
          <button
            key={beat.id}
            onClick={() => setActiveIndex(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              index === activeIndex
                ? "w-6 bg-[var(--accent-purple)]"
                : "bg-white/30 hover:bg-white/50"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Background Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, var(--accent-purple) 0%, transparent 70%)`,
          opacity: 0.1,
        }}
      />
    </section>
  );
});

export default SonaarCarouselCoverflow;
