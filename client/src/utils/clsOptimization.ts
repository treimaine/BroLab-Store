/**
 * Cumulative Layout Shift (CLS) optimization utilities
 * Prevents layout shifts for better user experience
 */

// CSS-in-JS utilities for preventing layout shifts
export const preventLayoutShift = {
  // Reserve space for images before loading
  imageContainer: (aspectRatio: number = 1) => ({
    position: 'relative' as const,
    width: '100%',
    height: 0,
    paddingBottom: `${(1 / aspectRatio) * 100}%`,
    overflow: 'hidden' as const
  }),

  // Absolute positioned image within container
  absoluteImage: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const
  },

  // Skeleton loader dimensions
  skeleton: (height: string = '200px') => ({
    width: '100%',
    height,
    backgroundColor: 'var(--skeleton-bg, #1a1a1a)',
    borderRadius: '8px',
    overflow: 'hidden' as const
  })
};

// Hook for preventing CLS in dynamic content
export function useCLSPrevention() {
  const reserveSpace = (width: number, height: number) => ({
    minWidth: `${width}px`,
    minHeight: `${height}px`
  });

  const aspectRatioBox = (ratio: number) => ({
    aspectRatio: ratio.toString(),
    width: '100%'
  });

  return {
    reserveSpace,
    aspectRatioBox,
    preventLayoutShift
  };
}

// CSS classes for CLS prevention
export const clsPreventionClasses = {
  beatCard: 'min-h-[400px] w-full', // Reserve minimum space
  beatImage: 'aspect-square w-full', // Maintain aspect ratio
  waveformContainer: 'h-16 w-full', // Fixed height for audio player
  buttonContainer: 'min-h-[44px] flex items-center', // Minimum touch target
  textContainer: 'min-h-[1.5rem] leading-6' // Prevent text reflow
};

// Preload critical images to prevent layout shifts
export function preloadBeatImages(imageUrls: string[], priority: number = 5) {
  if (typeof window === 'undefined') return;

  imageUrls.slice(0, priority).forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}

// Optimize image loading to prevent CLS
export function optimizeImageLoading() {
  // Add CSS for image loading states
  const style = document.createElement('style');
  style.textContent = `
    .beat-image-container {
      position: relative;
      overflow: hidden;
      background: linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
    }
    
    .beat-image-container img {
      transition: opacity 0.3s ease;
    }
    
    .beat-image-container img[data-loaded="false"] {
      opacity: 0;
    }
    
    .beat-image-container img[data-loaded="true"] {
      opacity: 1;
    }
    
    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  
  if (!document.querySelector('[data-cls-styles]')) {
    style.setAttribute('data-cls-styles', 'true');
    document.head.appendChild(style);
  }
}