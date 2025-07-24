/**
 * Code optimization utilities for bundle size reduction and performance
 */

// Tree-shakable utility functions
export const optimizeImports = () => {
  // Analyze import statements for optimization opportunities
  console.log('Import optimization tips:');
  console.log('1. Use named imports instead of default imports when possible');
  console.log('2. Import only specific functions from large libraries');
  console.log('3. Use dynamic imports for conditional features');
};

// Bundle analysis
export const analyzeBundleSize = () => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const totalSize = scripts.reduce((acc, script) => {
      const src = (script as HTMLScriptElement).src;
      if (src.includes('assets/index-')) {
        console.log(`Main bundle detected: ${src}`);
      }
      return acc;
    }, 0);
  }
};

// Remove unused CSS classes
export const optimizeCSS = () => {
  // This would typically be handled by PurgeCSS or similar tools
  console.log('CSS optimization suggestions:');
  console.log('- Remove unused Tailwind classes');
  console.log('- Optimize custom CSS');
  console.log('- Use CSS containment where appropriate');
};

// Memory leak prevention
export const preventMemoryLeaks = () => {
  // Clean up event listeners
  const cleanup = () => {
    // Remove global event listeners when components unmount
    window.removeEventListener('resize', cleanup);
    window.removeEventListener('scroll', cleanup);
  };
  
  return cleanup;
};

// Optimize image loading
export const optimizeImages = () => {
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    // Add loading="lazy" to images below the fold
    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
    }
    
    // Add decoding="async" for better performance
    if (!img.hasAttribute('decoding')) {
      img.setAttribute('decoding', 'async');
    }
  });
};

// Reduce JavaScript bundle size
export const optimizeJavaScript = () => {
  const tips = [
    'Use React.memo() for expensive components',
    'Implement useMemo() for expensive calculations',
    'Use useCallback() for event handlers',
    'Split code with React.lazy() and Suspense',
    'Remove console.log statements in production',
    'Use tree-shaking compatible imports'
  ];
  
  if (process.env.NODE_ENV === 'development') {
    console.log('JavaScript optimization tips:', tips);
  }
};

// Performance monitoring
export const monitorPerformance = () => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    // Monitor bundle loading times
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const nav = entry as PerformanceNavigationTiming;
          console.log(`Page load time: ${nav.loadEventEnd - nav.fetchStart}ms`);
        }
      });
    });
    
    observer.observe({ entryTypes: ['navigation'] });
  }
};