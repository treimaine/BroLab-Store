/* eslint-disable react-refresh/only-export-components -- Virtual scroll utilities export both components and hooks by design */
/**
 * Virtual Scrolling Component for Performance Optimization
 *
 * This component implements virtual scrolling to handle large lists efficiently
 * by only rendering visible items and a small buffer around them.
 *
 * Requirements addressed:
 * - 5.4: Virtual scrolling for large lists (orders, downloads, activity feed)
 * - 5.1: 50% faster loading times through performance optimization
 * - 2.1: Eliminate unnecessary lazy loading and optimize rendering
 */

import { cn } from "@/lib/utils";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

interface VirtualScrollListProps<T> {
  readonly items: T[];
  readonly itemHeight: number;
  readonly containerHeight: number;
  readonly renderItem: (item: T, index: number) => React.ReactNode;
  /** Number of items to render outside visible area (buffer) */
  readonly bufferSize?: number;
  readonly className?: string;
  readonly onScroll?: (scrollTop: number) => void;
  readonly getItemKey?: (item: T, index: number) => string | number;
}

function VirtualScrollListInner<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  bufferSize = 5,
  className,
  onScroll,
  getItemKey = (_, index) => index,
}: VirtualScrollListProps<T>): JSX.Element {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    // Add buffer for smoother scrolling
    const start = Math.max(0, visibleStart - bufferSize);
    const end = Math.min(items.length - 1, visibleEnd + bufferSize);

    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length, bufferSize]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange.start, visibleRange.end]);

  // Handle scroll
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);
    },
    [onScroll]
  );

  // Total height of all items
  const totalHeight = items.length * itemHeight;

  // Offset for visible items
  const offsetY = visibleRange.start * itemHeight;

  return (
    <div
      ref={scrollElementRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = visibleRange.start + index;
            return (
              <div
                key={getItemKey(item, actualIndex)}
                style={{ height: itemHeight }}
                className="w-full"
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const VirtualScrollList = memo(VirtualScrollListInner) as <T>(
  props: VirtualScrollListProps<T>
) => JSX.Element;

// Set displayName on the inner component
VirtualScrollListInner.displayName = "VirtualScrollList";

// Hook for managing virtual scroll state
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  bufferSize = 5
): {
  scrollTop: number;
  setScrollTop: React.Dispatch<React.SetStateAction<number>>;
  visibleRange: { start: number; end: number };
  visibleItems: T[];
  totalHeight: number;
  offsetY: number;
} {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    const start = Math.max(0, visibleStart - bufferSize);
    const end = Math.min(items.length - 1, visibleEnd + bufferSize);

    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length, bufferSize]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange.start, visibleRange.end]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return {
    scrollTop,
    setScrollTop,
    visibleRange,
    visibleItems,
    totalHeight,
    offsetY,
  };
}

// Optimized list item wrapper
interface VirtualListItemProps {
  readonly children: React.ReactNode;
  readonly height: number;
  readonly className?: string;
}

export const VirtualListItem = memo<VirtualListItemProps>(
  ({ children, height, className }): JSX.Element => {
    return (
      <div className={cn("w-full flex-shrink-0", className)} style={{ height }}>
        {children}
      </div>
    );
  }
);

VirtualListItem.displayName = "VirtualListItem";

// Hook for intersection observer based lazy loading
export function useIntersectionObserver(
  targetRef: React.RefObject<HTMLElement>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: "50px",
        ...options,
      }
    );

    observer.observe(target);

    return () => {
      observer.unobserve(target);
    };
  }, [targetRef, options]);

  return isIntersecting;
}

export default VirtualScrollList;
