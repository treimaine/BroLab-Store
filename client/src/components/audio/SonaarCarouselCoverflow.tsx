/**
 * SonaarCarouselCoverflow - Example 738 Carousel Coverflow
 *
 * 3D coverflow carousel for featured beats on homepage
 * Features: 3D transforms, smooth animations, touch support
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Pause, Play, ShoppingCart } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

export interface CarouselBeat {
  readonly id: number;
  readonly title: string;
  readonly artist?: string;
  readonly genre: string;
  readonly price: number | string;
  readonly imageUrl: string;
  readonly audioUrl?: string;
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
  readonly onPlay: () => void;
  readonly onSelect?: () => void;
  readonly onAddToCart?: () => void;
}

const CarouselItem = memo(function CarouselItem({
  beat,
  position,
  isActive,
  isPlaying,
  onPlay,
  onSelect,
  onAddToCart,
}: CarouselItemProps): JSX.Element {
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
        "cursor-pointer"
      )}
      style={{
        transform: getTransform(),
        opacity: getOpacity(),
        zIndex: getZIndex(),
      }}
      onClick={isActive ? onSelect : undefined}
      onKeyDown={e => e.key === "Enter" && isActive && onSelect?.()}
      role="button"
      tabIndex={isActive ? 0 : -1}
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

          {/* Play Button - Only on active items with audio */}
          {isActive && beat.audioUrl && (
            <button
              onClick={e => {
                e.stopPropagation();
                onPlay();
              }}
              className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
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
              onClick={e => {
                e.stopPropagation();
                onSelect?.();
              }}
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

export const SonaarCarouselCoverflow = memo(function SonaarCarouselCoverflow({
  beats,
  onBeatSelect,
  onAddToCart,
  autoPlay = true,
  autoPlayInterval = 5000,
  className,
}: SonaarCarouselCoverflowProps): JSX.Element {
  const [activeIndex, setActiveIndex] = useState(0);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-play carousel
  useEffect(() => {
    if (!autoPlay || isPaused || beats.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % beats.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, beats.length, isPaused]);

  // Handle audio playback
  const handlePlay = useCallback(
    (beat: CarouselBeat) => {
      if (!beat.audioUrl) return;

      if (playingId === beat.id) {
        audioRef.current?.pause();
        setPlayingId(null);
      } else {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        audioRef.current = new Audio(beat.audioUrl);
        audioRef.current.play().catch(console.error);
        audioRef.current.onended = () => setPlayingId(null);
        setPlayingId(beat.id);
      }
    },
    [playingId]
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

  if (beats.length === 0) {
    return (
      <div className={cn("text-center py-12 text-gray-400", className)}>No beats to display</div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full overflow-hidden", "py-8 sm:py-12", className)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 3D Container */}
      <div
        className="relative h-[400px] sm:h-[450px] md:h-[500px]"
        style={{ perspective: "1000px" }}
      >
        {beats.map((beat, index) => {
          // Calculate position relative to active
          let position = index - activeIndex;

          // Handle wrapping for infinite feel
          if (position > beats.length / 2) {
            position -= beats.length;
          } else if (position < -beats.length / 2) {
            position += beats.length;
          }

          // Only render visible items
          if (Math.abs(position) > 3) return null;

          return (
            <CarouselItem
              key={beat.id}
              beat={beat}
              position={position}
              isActive={position === 0}
              isPlaying={playingId === beat.id}
              onPlay={() => handlePlay(beat)}
              onSelect={() => onBeatSelect?.(beat)}
              onAddToCart={() => onAddToCart?.(beat)}
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
    </div>
  );
});

export default SonaarCarouselCoverflow;
