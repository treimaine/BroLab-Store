/**
 * SonaarGridLayout - Example 039 Grid Layout with Playlist
 *
 * Grid-based beat display with integrated audio player
 * Features: Responsive grid, hover effects, playlist queue
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Pause, Play, Plus, ShoppingCart } from "lucide-react";
import { memo, useCallback, useState } from "react";

export interface GridBeat {
  readonly id: number;
  readonly title: string;
  readonly artist?: string;
  readonly genre: string;
  readonly bpm?: number;
  readonly price: number | string;
  readonly imageUrl: string;
  readonly audioUrl?: string;
  readonly duration?: string;
  readonly isFree?: boolean;
  readonly tags?: string[];
}

interface SonaarGridLayoutProps {
  readonly beats: GridBeat[];
  readonly onBeatSelect?: (beat: GridBeat) => void;
  readonly onAddToCart?: (beat: GridBeat) => void;
  readonly onAddToPlaylist?: (beat: GridBeat) => void;
  readonly columns?: 2 | 3 | 4 | 5;
  readonly className?: string;
  readonly isLoading?: boolean;
}

interface GridItemProps {
  readonly beat: GridBeat;
  readonly isPlaying: boolean;
  readonly onPlay: () => void;
  readonly onSelect?: () => void;
  readonly onAddToCart?: () => void;
  readonly onAddToPlaylist?: () => void;
}

const GridItem = memo(function GridItem({
  beat,
  isPlaying,
  onPlay,
  onSelect,
  onAddToCart,
  onAddToPlaylist,
}: GridItemProps): JSX.Element {
  const [isHovered, setIsHovered] = useState(false);

  const formatPrice = (price: number | string): string => {
    if (beat.isFree) return "FREE";
    const numPrice = typeof price === "string" ? Number.parseFloat(price) : price;
    return `$${numPrice.toFixed(2)}`;
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300",
        "bg-[var(--dark-gray)] border-[var(--medium-gray)]",
        "hover:border-[var(--accent-purple)] hover:shadow-lg hover:shadow-purple-500/20",
        isPlaying && "border-[var(--accent-purple)] ring-2 ring-[var(--accent-purple)]/50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-0">
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden">
          <img
            src={beat.imageUrl || "/api/placeholder/400/400"}
            alt={beat.title}
            className={cn(
              "w-full h-full object-cover transition-transform duration-500",
              isHovered && "scale-110"
            )}
            loading="lazy"
          />

          {/* Overlay */}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent",
              "transition-opacity duration-300",
              isHovered ? "opacity-100" : "opacity-60"
            )}
          />

          {/* Play Button */}
          <button
            onClick={onPlay}
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
              "w-14 h-14 rounded-full flex items-center justify-center",
              "bg-[var(--accent-purple)] text-white",
              "transition-all duration-300 transform",
              isHovered ? "scale-100 opacity-100" : "scale-75 opacity-0",
              isPlaying && "scale-100 opacity-100 bg-[var(--accent-cyan)]"
            )}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" fill="currentColor" />
            ) : (
              <Play className="w-6 h-6 ml-1" fill="currentColor" />
            )}
          </button>

          {/* Quick Actions */}
          <div
            className={cn(
              "absolute top-3 right-3 flex flex-col gap-2",
              "transition-all duration-300",
              isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
            )}
          >
            {onAddToCart && (
              <Button
                size="icon"
                variant="secondary"
                className="w-8 h-8 bg-black/60 hover:bg-[var(--accent-purple)]"
                onClick={e => {
                  e.stopPropagation();
                  onAddToCart();
                }}
              >
                <ShoppingCart className="w-4 h-4" />
              </Button>
            )}
            {onAddToPlaylist && (
              <Button
                size="icon"
                variant="secondary"
                className="w-8 h-8 bg-black/60 hover:bg-[var(--accent-cyan)]"
                onClick={e => {
                  e.stopPropagation();
                  onAddToPlaylist();
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Price Badge */}
          <Badge
            className={cn(
              "absolute bottom-3 left-3",
              beat.isFree
                ? "bg-[var(--accent-cyan)] text-black"
                : "bg-[var(--accent-purple)] text-white"
            )}
          >
            {formatPrice(beat.price)}
          </Badge>

          {/* Duration */}
          {beat.duration && (
            <span className="absolute bottom-3 right-3 text-xs text-white/80 bg-black/60 px-2 py-1 rounded">
              {beat.duration}
            </span>
          )}
        </div>

        {/* Info */}
        <div
          className="p-4 cursor-pointer"
          onClick={onSelect}
          onKeyDown={e => e.key === "Enter" && onSelect?.()}
          role="button"
          tabIndex={0}
        >
          <h3 className="font-bold text-white truncate group-hover:text-[var(--accent-purple)] transition-colors">
            {beat.title}
          </h3>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-gray-400">{beat.genre}</span>
            {beat.bpm && <span className="text-xs text-gray-500">{beat.bpm} BPM</span>}
          </div>
          {beat.tags && beat.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {beat.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 bg-[var(--medium-gray)] text-gray-400 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

function LoadingSkeleton({ columns }: Readonly<{ columns: number }>): JSX.Element {
  const skeletonIds = Array.from({ length: columns * 2 }, (_, i) => `skeleton-${Date.now()}-${i}`);
  return (
    <>
      {skeletonIds.map(id => (
        <Card key={id} className="bg-[var(--dark-gray)] border-[var(--medium-gray)] animate-pulse">
          <CardContent className="p-0">
            <div className="aspect-square bg-[var(--medium-gray)]" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-[var(--medium-gray)] rounded w-3/4" />
              <div className="h-3 bg-[var(--medium-gray)] rounded w-1/2" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export const SonaarGridLayout = memo(function SonaarGridLayout({
  beats,
  onBeatSelect,
  onAddToCart,
  onAddToPlaylist,
  columns = 4,
  className,
  isLoading = false,
}: SonaarGridLayoutProps): JSX.Element {
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [audio] = useState<HTMLAudioElement | null>(() =>
    typeof globalThis.window !== "undefined" ? new Audio() : null
  );

  const handlePlay = useCallback(
    (beat: GridBeat) => {
      if (!audio || !beat.audioUrl) return;

      if (playingId === beat.id) {
        audio.pause();
        setPlayingId(null);
      } else {
        audio.src = beat.audioUrl;
        audio.play().catch(console.error);
        setPlayingId(beat.id);
      }
    },
    [audio, playingId]
  );

  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  };

  return (
    <div className={cn("grid gap-4 sm:gap-6", gridCols[columns], className)}>
      {isLoading ? (
        <LoadingSkeleton columns={columns} />
      ) : (
        beats.map(beat => (
          <GridItem
            key={beat.id}
            beat={beat}
            isPlaying={playingId === beat.id}
            onPlay={() => handlePlay(beat)}
            onSelect={() => onBeatSelect?.(beat)}
            onAddToCart={() => onAddToCart?.(beat)}
            onAddToPlaylist={() => onAddToPlaylist?.(beat)}
          />
        ))
      )}
    </div>
  );
});

export default SonaarGridLayout;
