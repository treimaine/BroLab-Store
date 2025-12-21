import { ResponsiveBeatCard } from "@/components/beats/ResponsiveBeatCard";
import { BeatCard } from "@/components/beats/beat-card";
import { BeatCardSkeleton } from "@/components/loading/LoadingSpinner";
import { useIntersectionObserver } from "@/components/loading/VirtualScrollList";
import { cn } from "@/lib/utils";
import type { BeatProduct as Beat } from "@shared/schema";
import React, { useCallback, useRef, useState } from "react";

// Utility function to normalize tags (handle both string and {name: string} formats)
const normalizeTag = (tag: string | { name: string }): string => {
  return typeof tag === "string" ? tag : tag.name;
};

// Utility function to normalize tags array
const normalizeTags = (tags?: Array<string | { name: string }> | null): string[] => {
  return tags ? tags.map(normalizeTag) : [];
};

interface OptimizedBeatGridProps {
  readonly beats: Beat[];
  readonly isLoading?: boolean;
  readonly viewMode?: "grid" | "table";
  readonly className?: string;
  readonly onBeatClick?: (beat: Beat) => void;
}

interface LazyBeatCardProps {
  readonly beat: Beat;
  readonly viewMode?: "grid" | "table";
  readonly onBeatClick?: (beat: Beat) => void;
}

// Lazy loaded beat card with intersection observer
function LazyBeatCard({
  beat,
  viewMode = "grid",
  onBeatClick,
}: LazyBeatCardProps): React.JSX.Element {
  const cardRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(cardRef, {
    threshold: 0.1,
    rootMargin: "100px", // Load 100px before entering viewport
  });

  const renderBeatCard = (): React.JSX.Element => {
    if (viewMode === "grid") {
      return (
        <BeatCard
          id={beat.id}
          title={beat.title || beat.name || "Untitled"}
          genre={beat.genre || beat.categories?.[0]?.name || ""}
          bpm={beat.bpm || 0}
          price={beat.price}
          imageUrl={beat.image_url || beat.image || beat.images?.[0]?.src || ""}
          audioUrl={beat.audio_url || ""}
          tags={normalizeTags(beat.tags)}
          featured={beat.featured || false}
          downloads={beat.downloads || 0}
          duration={beat.duration || 0}
          isFree={
            beat.is_free ||
            normalizeTags(beat.tags).some(tag => tag.toLowerCase() === "free") ||
            beat.price === 0 ||
            false
          }
          onViewDetails={() => onBeatClick?.(beat)}
        />
      );
    }

    return (
      <ResponsiveBeatCard
        beat={{
          ...beat,
          id: beat.id,
          title: beat.title || beat.name || "Untitled",
          name: beat.title || beat.name || "Untitled",
          image:
            beat.image_url || beat.image || beat.images?.[0]?.src || "/api/placeholder/400/400",
          image_url:
            beat.image_url || beat.image || beat.images?.[0]?.src || "/api/placeholder/400/400",
          audio_url: beat.audio_url || "",
        }}
      />
    );
  };

  return (
    <div ref={cardRef} className="min-h-[300px]">
      {isVisible ? renderBeatCard() : <BeatCardSkeleton />}
    </div>
  );
}

export function OptimizedBeatGrid({
  beats,
  isLoading = false,
  viewMode = "grid",
  className = "",
  onBeatClick,
}: Readonly<OptimizedBeatGridProps>): React.JSX.Element {
  const [loadedCount, setLoadedCount] = useState(12); // Initial load count

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const shouldLoadMore = useIntersectionObserver(loadMoreRef, {
    threshold: 0.5,
  });

  // Load more beats when intersection observer triggers
  React.useEffect(() => {
    if (shouldLoadMore && loadedCount < beats.length) {
      setLoadedCount(prev => Math.min(prev + 12, beats.length));
    }
  }, [shouldLoadMore, loadedCount, beats.length]);

  const visibleBeats = beats.slice(0, loadedCount);
  const hasMore = loadedCount < beats.length;

  const handleBeatClick = useCallback(
    (beat: Beat) => {
      onBeatClick?.(beat);
    },
    [onBeatClick]
  );

  if (isLoading) {
    return (
      <div
        className={cn(
          "grid gap-6",
          viewMode === "grid"
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "grid-cols-1",
          className
        )}
      >
        {Array.from({ length: 8 }, (_, i) => (
          <BeatCardSkeleton key={`skeleton-loading-${i.toString()}`} />
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Optimized beat grid */}
      <div
        className={cn(
          "grid gap-6",
          viewMode === "grid"
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "grid-cols-1"
        )}
      >
        {visibleBeats.map(beat => (
          <LazyBeatCard
            key={beat.id}
            beat={beat}
            viewMode={viewMode}
            onBeatClick={handleBeatClick}
          />
        ))}
      </div>

      {/* Load more trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
            Loading more beats...
          </div>
        </div>
      )}

      {/* Performance info (development only) */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-4 p-3 bg-muted/20 rounded text-sm text-muted-foreground">
          Performance: Showing {visibleBeats.length} of {beats.length} beats
          {hasMore && ` (${beats.length - loadedCount} remaining)`}
        </div>
      )}
    </div>
  );
}
