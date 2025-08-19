import { AddToCartButton } from "@/components/AddToCartButton";
import { LazyWaveformAudioPlayer } from "@/components/LazyComponents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/useBreakpoint";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";
import { Heart, Music, Clock, Hash, User } from "lucide-react";
import { useState } from "react";

import type { BeatProduct as Beat } from "@shared/schema";

interface ResponsiveBeatCardProps {
  beat: Beat;
  className?: string;
  productId?: string;
  productName?: string;
}

export function ResponsiveBeatCard({
  beat,
  className = "",
  productId,
  productName,
}: ResponsiveBeatCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  return (
    <div
      className={cn(
        "group relative bg-[var(--dark-gray)] rounded-xl overflow-hidden border border-[var(--medium-gray)] transition-all duration-200",
        !prefersReducedMotion &&
          !isMobile &&
          "hover:scale-105 hover:shadow-xl hover:border-[var(--accent-purple)]/50",
        className
      )}
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={beat.image || beat.image_url || "/api/placeholder/400/400"}
          alt={beat.title || beat.name}
          className={cn(
            "w-full h-full object-cover transition-transform duration-300",
            !prefersReducedMotion && !isMobile && "group-hover:scale-110"
          )}
          loading="lazy"
        />

        {/* Overlay */}
        <div
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity duration-200",
            isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        />

        {/* Audio Preview Overlay */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
            isMobile ? "opacity-100" : isHovered ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="w-full h-full flex items-center justify-center p-4">
            <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4 w-full max-w-xs">
              <LazyWaveformAudioPlayer
                src={beat.audio_url || "/api/placeholder/audio.mp3"}
                title={beat.title || beat.name}
                artist="BroLab"
                showControls={false}
                showWaveform={true}
                previewOnly={true}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {beat.categories?.[0]?.name && (
            <Badge variant="secondary" className="bg-black/70 text-white border-0 text-xs">
              {beat.categories[0].name}
            </Badge>
          )}
        </div>

        {/* Like button */}
        <button
          onClick={handleLike}
          className={cn(
            "absolute top-3 right-3 p-2 rounded-full transition-all duration-200 z-30",
            "bg-black/70 hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-[var(--accent-purple)]",
            "min-w-[44px] min-h-[44px] flex items-center justify-center"
          )}
          aria-label={isLiked ? "Unlike beat" : "Like beat"}
        >
          <Heart
            className={cn(
              "w-4 h-4 transition-colors",
              isLiked ? "text-red-500 fill-current" : "text-white"
            )}
          />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Mobile: Vertical layout */}
        {isMobile ? (
          <>
            {/* Title and BPM */}
            <div className="space-y-3">
              <h3 className="font-semibold text-white text-lg leading-tight line-clamp-2">
                {beat.title}
              </h3>
              {beat.categories?.[0]?.name && (
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Music className="w-4 h-4" />
                    <span>{beat.categories[0].name}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Price and Cart */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-700">
              <div className="text-xl font-bold text-[var(--accent-purple)]">
                {(() => {
                  const isFree =
                    beat.is_free ||
                    beat.tags?.some((tag: string) => tag.toLowerCase() === "free") ||
                    beat.price === 0 ||
                    false;
                  return isFree ? (
                    <span className="text-[var(--accent-cyan)]">FREE</span>
                  ) : (
                    `$${(beat.price / 100).toFixed(2)}`
                  );
                })()}
              </div>
              <AddToCartButton
                product={{
                    beatId: beat.id,
                    title: beat.title || beat.name || "Untitled",
                    genre: beat.genre || "Unknown",
                    imageUrl: beat.image || beat.image_url || "",
                    price: beat.price || 0,
                  }}
                size="sm"
                className="px-3 ml-[6px] mr-[6px] pl-[12px] pr-[12px] pt-[0px] pb-[0px]"
              />
            </div>
          </>
        ) : (
          /* Desktop: Expand on hover */
          <>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-white text-lg leading-tight line-clamp-2">
                  {beat.title}
                </h3>
                {beat.categories?.[0]?.name && (
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Music className="w-4 h-4" />
                      <span>{beat.categories[0].name}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-right">
                <div className="text-xl font-bold text-[var(--accent-purple)]">
                  {(() => {
                    const isFree =
                      beat.is_free ||
                      beat.tags?.some((tag: string) => tag.toLowerCase() === "free") ||
                      beat.price === 0 ||
                      false;
                    return isFree ? (
                      <span className="text-[var(--accent-cyan)]">FREE</span>
                    ) : (
                      `$${(beat.price / 100).toFixed(2)}`
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* License Quick Actions (show on hover) */}
            <div
              className={cn(
                "transition-all duration-200 overflow-hidden",
                isHovered ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
              )}
            >
              <div className="flex gap-2 pt-2">
                <AddToCartButton
                  product={{
                    beatId: beat.id,
                    title: beat.title || beat.name || "Untitled",
                    genre: beat.genre || "Unknown",
                    imageUrl: beat.image || beat.image_url || "",
                    price: beat.price || 0,
                  }}
                  size="sm"
                  className="flex-1 text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="px-3 text-xs border-[var(--medium-gray)] text-gray-300 hover:text-white hover:border-[var(--accent-purple)]"
                >
                  Preview
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}