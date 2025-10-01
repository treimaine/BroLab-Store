import { useEffect, useState } from 'react';
/**
 * Layout Shift Prevention Utilities
 * 
 * Prevents Cumulative Layout Shift (CLS) issues by providing
 * consistent sizing and loading states for dynamic content.
 */


/**
 * Hook to prevent layout shifts during image loading
 */
export function useImageDimensions(src: string, fallbackWidth = 300, fallbackHeight = 200) {
  const [dimensions, setDimensions] = useState({
    width: fallbackWidth,
    height: fallbackHeight,
    loaded: false
  });

  useEffect_(() => {
    if (!src) return;

    const img = new Image();
    img.onload = () => {
      setDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
        loaded: true
      });
    };
    img.onerror = () => {
      setDimensions(prev => ({ ...prev, loaded: true }));
    };
    img.src = src;
  }, [src]);

  return dimensions;
}

/**
 * Component wrapper to prevent layout shifts
 */
export function LayoutStableContainer({
  children,
  minHeight = 200,
  className = '',
  loading = false
}: {
  children: React.ReactNode;
  minHeight?: number;
  className?: string;
  loading?: boolean;
}) {
  return (
    <div 
      className={`${className} ${loading ? 'animate-pulse' : ''}`}
      style={{ minHeight: `${minHeight}px` }}
    >
      {loading ? (
        <div className="bg-gray-200 rounded animate-pulse" style={{ height: `${minHeight}px` }} />
      ) : (
        children
      )}
    </div>
  );
}

/**
 * Skeleton loader for consistent sizing
 */
export function SkeletonLoader({
  width = '100%',
  height = 20,
  className = '',
  count = 1
}: {
  width?: string | number;
  height?: number;
  className?: string;
  count?: number;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-gray-200 rounded animate-pulse"
          style={{
            width: typeof width === 'number' ? `${width}px` : width,
            height: `${height}px`
          }}
        />
      ))}
    </div>
  );
}

/**
 * Aspect ratio container to prevent layout shifts
 */
export function AspectRatioContainer({
  children,
  ratio = 16 / 9,
  className = ''
}: {
  children: React.ReactNode;
  ratio?: number;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`} style={{ aspectRatio: ratio }}>
      <div className="absolute inset-0">
        {children}
      </div>
    </div>
  );
}

/**
 * Hook to measure and reserve space for dynamic content
 */
export function useContentDimensions(ref: React.RefObject<HTMLElement>) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect_(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return dimensions;
}

/**
 * Prevent layout shifts during font loading
 */
export function FontLoadingOptimizer() {
  useEffect_(() => {
    // Add font-display: swap to existing fonts
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'Inter';
        font-display: swap;
      }
      
      /* Prevent invisible text during font swap period */
      .font-loading {
        font-display: swap;
        visibility: visible;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return null;
}

/**
 * Utility to add consistent spacing and prevent layout shifts
 */
export const layoutClasses = {
  // Consistent spacing
  section: 'py-8 px-4 sm:px-6 lg:px-8',
  container: 'max-w-7xl mx-auto',
  
  // Prevent layout shifts
  imageContainer: 'relative overflow-hidden',
  loadingState: 'animate-pulse bg-gray-200 rounded',
  
  // Consistent grid layouts
  grid: {
    beats: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
    services: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8',
    dashboard: 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6'
  }
};