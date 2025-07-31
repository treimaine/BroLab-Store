import { BeatCard } from "@/components/beat-card";
import { BeatCardSkeleton } from "@/components/LoadingSpinner";
import { ResponsiveBeatCard } from "@/components/ResponsiveBeatCard";
import { useIsMobile } from "@/hooks/useBreakpoint";
import { cn } from "@/lib/utils";
import { useIntersectionObserver } from "@/utils/virtualScrolling";
import type { BeatProduct as Beat } from "@shared/schema";
import React, { useCallback, useRef, useState } from "react";

interface OptimizedBeatGridProps {
  beats: Beat[];
  isLoading?: boolean;
  viewMode?: "grid" | "table";
  className?: string;
  onBeatClick?: (beat: Beat) => void;
}

// Lazy loaded beat card with intersection observer
function LazyBeatCard({
  beat,
  index,
  viewMode = "grid",
  onBeatClick,
}: {
  beat: Beat;
  index: number;
  viewMode?: "grid" | "table";
  onBeatClick?: (beat: Beat) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(cardRef, {
    threshold: 0.1,
    rootMargin: "100px", // Load 100px before entering viewport
  });

  return (
    <div ref={cardRef} className="min-h-[300px]">
      {isVisible ? (
        viewMode === "grid" ? (
          <BeatCard
            id={beat.id}
            title={beat.title}
            genre={beat.genre || "Unknown"}
            bpm={beat.bpm || 0}
            price={beat.price}
            imageUrl={beat.image_url || beat.image || undefined}
            audioUrl={beat.audio_url || undefined}
            tags={beat.tags || []}
            featured={beat.featured || false}
            downloads={beat.downloads || 0}
            duration={beat.duration || 0}
            isFree={
              beat.is_free ||
              beat.tags?.some((tag: string) => tag.toLowerCase() === "free") ||
              beat.price === 0 ||
              false
            }
            onViewDetails={() => onBeatClick?.(beat)}
          />
        ) : (
          <ResponsiveBeatCard
            beat={{
              ...beat,
              id: beat.id,
              name: beat.title || "Untitled",
              image: beat.image_url || beat.image || "/api/placeholder/400/400",
            }}
          />
        )
      ) : (
        <BeatCardSkeleton />
      )}
    </div>
  );
}

export function OptimizedBeatGrid({
  beats,
  isLoading = false,
  viewMode = "grid",
  className = "",
  onBeatClick,
}: OptimizedBeatGridProps) {
  const isMobile = useIsMobile();
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
        {Array.from({ length: 8 }).map((_, i) => (
          <BeatCardSkeleton key={i} />
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
        {visibleBeats.map((beat, index) => (
          <LazyBeatCard
            key={beat.id}
            beat={beat}
            index={index}
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
