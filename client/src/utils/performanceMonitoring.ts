/**
 * Performance monitoring and optimization utilities
 * Tracks bundle size, loading times, and user experience metrics
 */

// Core Web Vitals monitoring
export const initWebVitalsMonitoring = () => {
  if (typeof window === 'undefined') return;

  // First Contentful Paint (FCP)
  const fcpObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        console.log(`FCP: ${Math.round(entry.startTime)}ms`);
        if (entry.startTime > 1800) {
          console.warn('FCP is slow, consider optimizing critical resources');
        }
      }
    }
  });
  fcpObserver.observe({ entryTypes: ['paint'] });

  // Largest Contentful Paint (LCP)
  const lcpObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log(`LCP: ${Math.round(entry.startTime)}ms`);
      if (entry.startTime > 2500) {
        console.warn('LCP is slow, optimize largest content elements');
      }
    }
  });
  lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

  // Cumulative Layout Shift (CLS)
  let clsValue = 0;
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
      }
    }
    if (clsValue > 0.1) {
      console.warn(`CLS: ${clsValue.toFixed(3)} - Layout shifts detected`);
    }
  });
  clsObserver.observe({ entryTypes: ['layout-shift'] });
};

// Bundle size analysis
export const analyzeBundleLoading = () => {
  if (typeof window === 'undefined') return;

  const resourceObserver = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      const resource = entry as PerformanceResourceTiming;
      
      // Track JavaScript bundles
      if (resource.name.includes('/assets/index-') && resource.name.endsWith('.js')) {
        const loadTime = resource.responseEnd - resource.requestStart;
        const size = resource.encodedBodySize || 0;
        
        console.log(`Bundle loaded: ${Math.round(loadTime)}ms, ${Math.round(size/1024)}KB`);
        
        // Performance alerts
        if (loadTime > 1000) {
          console.warn('Slow bundle loading detected');
        }
        if (size > 500000) { // 500KB
          console.warn(`Large bundle: ${Math.round(size/1024)}KB - Consider code splitting`);
        }
      }
      
      // Track CSS files
      if (resource.name.includes('/assets/') && resource.name.endsWith('.css')) {
        const loadTime = resource.responseEnd - resource.requestStart;
        console.log(`CSS loaded: ${Math.round(loadTime)}ms`);
      }
    });
  });
  
  resourceObserver.observe({ entryTypes: ['resource'] });
};

// Memory usage monitoring
export const monitorMemoryUsage = () => {
  if (typeof window === 'undefined' || !(performance as any).memory) return;

  const memory = (performance as any).memory;
  const usage = {
    used: Math.round(memory.usedJSHeapSize / 1048576), // MB
    total: Math.round(memory.totalJSHeapSize / 1048576), // MB
    limit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
  };

  console.log(`Memory usage: ${usage.used}MB / ${usage.total}MB (limit: ${usage.limit}MB)`);
  
  if (usage.used / usage.total > 0.8) {
    console.warn('High memory usage detected - possible memory leaks');
  }

  return usage;
};

// Network performance monitoring
export const monitorNetworkPerformance = () => {
  if (typeof navigator === 'undefined' || !(navigator as any).connection) return;

  const connection = (navigator as any).connection;
  const networkInfo = {
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData
  };

  console.log('Network info:', networkInfo);

  // Adjust loading strategy based on connection
  if (networkInfo.effectiveType === '2g' || networkInfo.effectiveType === 'slow-2g') {
    console.log('Slow connection detected - enabling optimizations');
    return { slowConnection: true, ...networkInfo };
  }

  return { slowConnection: false, ...networkInfo };
};

// Component render time tracking
export const trackComponentPerformance = (componentName: string) => {
  const startTime = performance.now();
  
  return {
    end: () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (duration > 16) { // 16ms = 60fps threshold
        console.warn(`Slow component render: ${componentName} took ${Math.round(duration)}ms`);
      } else {
        console.log(`${componentName}: ${Math.round(duration)}ms`);
      }
      
      return duration;
    }
  };
};

// Audio loading performance
export const trackAudioLoadingPerformance = (audioUrl: string) => {
  const startTime = performance.now();
  
  return {
    onLoad: () => {
      const loadTime = performance.now() - startTime;
      console.log(`Audio loaded: ${Math.round(loadTime)}ms - ${audioUrl}`);
      
      if (loadTime > 2000) {
        console.warn('Slow audio loading - consider audio optimization');
      }
      
      return loadTime;
    },
    onError: (error: Error) => {
      const errorTime = performance.now() - startTime;
      console.error(`Audio load failed after ${Math.round(errorTime)}ms:`, error);
      return errorTime;
    }
  };
};

// Initialize all monitoring
export const initPerformanceMonitoring = () => {
  if (process.env.NODE_ENV === 'development') {
    initWebVitalsMonitoring();
    analyzeBundleLoading();
    
    // Monitor memory every 30 seconds
    setInterval(monitorMemoryUsage, 30000);
    
    // Check network once
    monitorNetworkPerformance();
  }
};