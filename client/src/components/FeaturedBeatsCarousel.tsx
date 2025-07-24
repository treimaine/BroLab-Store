import { CarouselBeatSkeleton } from "@/components/FeaturedBeatsSkeleton";
import { Button } from "@/components/ui/button";
import { useBreakpoint, useIsMobile, useIsTablet } from "@/hooks/useBreakpoint";
import { useOrientation } from "@/hooks/useOrientation";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { UIBeat } from "../types/ui";
import { BeatCard } from "./beat-card";

interface FeaturedBeatsCarouselProps {
  beats: UIBeat[];
  title?: string;
  isLoading?: boolean;
}

export function FeaturedBeatsCarousel({
  beats,
  title = "Featured Beats",
  isLoading = false,
}: FeaturedBeatsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const { sm, md, lg, xl } = useBreakpoint();
  const orientation = useOrientation();
  const prefersReducedMotion = usePrefersReducedMotion();

  // Calculate visible items based on screen size and orientation
  const getVisibleItems = () => {
    if (isMobile) {
      return orientation === "landscape" ? 2 : 1;
    }
    if (isTablet) {
      return orientation === "landscape" ? 3 : 2;
    }
    if (lg) return 4;
    if (xl) return 5;
    return 3; // default
  };

  const visibleItems = getVisibleItems();
  const filteredBeats = (beats ?? []).filter(Boolean);
  const maxIndex = Math.max(0, filteredBeats.length - visibleItems);

  // Auto-scroll functionality (disabled on reduced motion)
  useEffect(() => {
    if (prefersReducedMotion || isMobile) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 5000);

    return () => clearInterval(interval);
  }, [maxIndex, prefersReducedMotion, isMobile]);

  const scrollToIndex = (index: number) => {
    const container = scrollContainerRef.current;
    if (!container || !isMobile) return;

    const itemWidth = container.scrollWidth / filteredBeats.length;
    container.scrollTo({
      left: index * itemWidth,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  const handlePrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : maxIndex;
    setCurrentIndex(newIndex);
    scrollToIndex(newIndex);
  };

  const handleNext = () => {
    const newIndex = currentIndex < maxIndex ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    scrollToIndex(newIndex);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentIndex, maxIndex]);

  if (!filteredBeats.length && !isLoading) return null;

  if (isLoading) {
    return (
      <section className="py-8 md:py-12" aria-label={title}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div className="h-8 md:h-10 lg:h-12 w-48 bg-gray-700/50 rounded animate-pulse"></div>
            {!isMobile && (
              <div className="flex gap-2">
                <div className="w-10 h-10 bg-gray-700/50 rounded animate-pulse"></div>
                <div className="w-10 h-10 bg-gray-700/50 rounded animate-pulse"></div>
              </div>
            )}
          </div>
          <CarouselBeatSkeleton />
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 md:py-12" aria-label={title}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
            {title}
          </h2>

          {/* Desktop Navigation Controls */}
          {!isMobile && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="w-10 h-10 border-[var(--medium-gray)] text-white hover:bg-[var(--accent-purple)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-purple)]"
                aria-label="Previous beats"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                disabled={currentIndex === maxIndex}
                className="w-10 h-10 border-[var(--medium-gray)] text-white hover:bg-[var(--accent-purple)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-purple)]"
                aria-label="Next beats"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Mobile: Horizontal Scroll with Snap */}
        {isMobile ? (
          <div className="relative">
            <div
              ref={scrollContainerRef}
              className={cn(
                "flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4",
                "scroll-smooth" // Only add if reduced motion is not preferred
              )}
              style={{
                scrollSnapType: "x mandatory",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {/* Gradient fade overlay - left */}
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[var(--deep-black)] to-transparent z-10 pointer-events-none" />

              {filteredBeats.map((beat, index) => (
                <div
                  key={beat.id}
                  className="flex-none w-64 sm:w-72 snap-start"
                  style={{ scrollSnapAlign: "start" }}
                >
                  <BeatCard 
                    id={beat.id}
                    title={beat.title}
                    genre={beat.genre}
                    bpm={beat.bpm}
                    price={beat.price}
                    imageUrl={beat.imageUrl}
                    audioUrl={beat.audioUrl}
                    tags={beat.tags}
                    featured={beat.featured}
                    downloads={beat.downloads}
                    duration={beat.duration || 0}
                    className="h-full"
                  />
                </div>
              ))}

              {/* Gradient fade overlay - right */}
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--deep-black)] to-transparent z-10 pointer-events-none" />
            </div>

            {/* Mobile Dots Indicator */}
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({
                length: Math.ceil(filteredBeats.length / visibleItems),
              }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentIndex(index * visibleItems);
                    scrollToIndex(index * visibleItems);
                  }}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-purple)]",
                    index === Math.floor(currentIndex / visibleItems)
                      ? "bg-[var(--accent-purple)]"
                      : "bg-gray-600"
                  )}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Desktop: Grid Layout */
          <div
            className={cn(
              "grid gap-6 transition-all duration-300",
              sm ? "grid-cols-2" : "grid-cols-1",
              md ? "grid-cols-3" : "",
              lg ? "grid-cols-4" : "",
              xl ? "grid-cols-5" : ""
            )}
          >
            {filteredBeats
              .slice(currentIndex, currentIndex + visibleItems)
              .map((beat) => (
                <BeatCard
                  key={beat.id}
                  id={beat.id}
                  title={beat.title}
                  genre={beat.genre}
                  bpm={beat.bpm}
                  price={beat.price}
                  imageUrl={beat.imageUrl}
                  audioUrl={beat.audioUrl}
                  tags={beat.tags}
                  featured={beat.featured}
                  downloads={beat.downloads}
                  duration={beat.duration || 0}
                  className={cn(
                    "transform transition-transform duration-200",
                    !prefersReducedMotion && "hover:scale-105"
                  )}
                />
              ))}
          </div>
        )}

        {/* Progress Indicator for Desktop */}
        {!isMobile && maxIndex > 0 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: maxIndex + 1 }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "w-3 h-3 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-purple)]",
                  index === currentIndex
                    ? "bg-[var(--accent-purple)]"
                    : "bg-gray-600 hover:bg-gray-500"
                )}
                aria-label={`Go to page ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
