// PHASE 4 - Advanced Performance Monitoring & Memory Optimization

// Memory leak detection with optimized thresholds
let memoryCheckInterval: NodeJS.Timeout;

export const startMemoryMonitoring = () => {
  if (memoryCheckInterval) clearInterval(memoryCheckInterval);
  
  memoryCheckInterval = setInterval(() => {
    const memory = (performance as any).memory;
    if (memory) {
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
      const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
      
      console.log(`Memory usage: ${usedMB}MB / ${totalMB}MB (limit: ${limitMB}MB)`);
      
      // PHASE 4 optimized thresholds
      if (usedMB > 35) { // Reduced threshold for earlier intervention
        console.warn('Memory optimization triggered - cleaning unused resources');
        
        // Cleanup strategies
        cleanupUnusedComponents();
        
        // Trigger garbage collection if available
        if ('gc' in window) {
          (window as any).gc();
        }
      }
    }
  }, 60000); // Optimized to 60 seconds
};

// Component cleanup for memory optimization
export const cleanupUnusedComponents = () => {
  // Clear unused audio players
  const audioPlayers = document.querySelectorAll('audio');
  audioPlayers.forEach(player => {
    if (player.paused && !player.currentTime) {
      player.src = '';
      player.load();
    }
  });
  
  // Clear unused images from cache
  const images = document.querySelectorAll('img[data-cleanup="true"]');
  images.forEach(img => {
    if (!img.getBoundingClientRect().width) {
      (img as HTMLImageElement).src = '';
    }
  });
};

// Advanced performance metrics
export const trackPerformanceMetrics = () => {
  // Core Web Vitals tracking
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      switch (entry.entryType) {
        case 'paint':
          if (entry.name === 'first-contentful-paint') {
            console.log(`FCP: ${entry.startTime}ms`);
            if (entry.startTime > 2500) {
              console.warn('FCP is slow, consider optimizing critical resources');
            }
          }
          break;
        case 'largest-contentful-paint':
          console.log(`LCP: ${entry.startTime}ms`);
          if (entry.startTime > 2500) {
            console.warn('LCP is slow, optimize largest content elements');
          }
          break;
        case 'layout-shift':
          const cls = (entry as any).value;
          if (cls > 0.1) {
            console.warn(`CLS: ${cls.toFixed(3)} - Layout shifts detected`);
          }
          break;
      }
    });
  });

  observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift'] });
};

// Network performance monitoring
export const monitorNetworkPerformance = () => {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    console.log('Network info:', {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    });
    
    // Adapt performance based on network
    if (connection.effectiveType === 'slow-2g' || connection.saveData) {
      // Enable data saving mode
      enableDataSavingMode();
    }
  }
};

const enableDataSavingMode = () => {
  // Reduce image quality
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    if (img.src && !img.dataset.optimized) {
      img.dataset.optimized = 'true';
      // Could implement image compression here
    }
  });
};

// Initialize all performance monitoring
export const initializePerformanceMonitoring = () => {
  startMemoryMonitoring();
  trackPerformanceMetrics();
  monitorNetworkPerformance();
  
  console.log('PHASE 4 Performance Monitoring Initialized');
};