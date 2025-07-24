/**
 * Performance utilities for optimal loading and user experience
 */

// Preload critical resources
export const preloadCriticalResources = () => {
  // Preload key images
  const criticalImages = [
    '/assets/logo.png',
    '/assets/hero-bg.jpg'
  ];

  criticalImages.forEach(src => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  });
};

// Lazy load images with intersection observer
export const lazyLoadImages = () => {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            observer.unobserve(img);
          }
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
};

// Debounce function for search and scroll events
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      timeout = null;
      if (!immediate) func(...args);
    }, wait);
    
    if (callNow) func(...args);
  };
}

// Throttle function for resize and scroll events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Check if user prefers reduced motion
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Optimize scroll performance
export const optimizeScrolling = () => {
  let ticking = false;
  
  const updateScrolling = () => {
    // Scroll-based logic here
    ticking = false;
  };
  
  const requestScrollUpdate = () => {
    if (!ticking) {
      requestAnimationFrame(updateScrolling);
      ticking = true;
    }
  };
  
  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
};

// Web Vitals monitoring
export const measureWebVitals = () => {
  // Measure First Contentful Paint (FCP)
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        console.log(`FCP: ${entry.startTime}ms`);
      }
    }
  });
  
  observer.observe({ entryTypes: ['paint'] });
  
  // Measure Largest Contentful Paint (LCP)
  const lcpObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log(`LCP: ${entry.startTime}ms`);
    }
  });
  
  lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
};

// Memory management for audio players
export const cleanupAudioResources = () => {
  // Clean up any active audio instances
  const audioElements = document.querySelectorAll('audio');
  audioElements.forEach(audio => {
    if (!audio.paused) {
      audio.pause();
    }
    audio.src = '';
    audio.load();
  });
};

// Network-aware loading
export const isSlowConnection = (): boolean => {
  const connection = (navigator as any).connection;
  if (connection) {
    return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
  }
  return false;
};

// Bundle size analysis helper
export const logBundleAnalysis = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Bundle optimization tips:');
    console.log('- Use React.lazy() for heavy components');
    console.log('- Implement code splitting for routes');
    console.log('- Optimize images with WebP format');
    console.log('- Remove unused dependencies');
  }
};