# Lazy Loading Strategy Guide

## Overview

This guide documents the lazy loading implementation in the BroLab Entertainment platform, designed to optimize performance by loading components only when needed.

## Architecture

### Core Components

#### 1. IntersectionLazyLoader

The main lazy loading component that uses Intersection Observer API to load components when they come into view.

```typescript
import { IntersectionLazyLoader } from '@/components/IntersectionLazyLoader';

// Basic usage
<IntersectionLazyLoader
  component={() => import('@/components/HeavyComponent')}
  componentProps={{ data: myData }}
  minHeight="400px"
  rootMargin="100px"
/>
```

**Key Features:**

- Intersection Observer-based loading
- Configurable root margin and threshold
- Error handling with retry functionality
- Loading states and fallbacks
- Performance monitoring integration

#### 2. LazyAudioComponents

Specialized lazy loading for audio-related components that contain heavy libraries like WaveSurfer.js.

```typescript
import { LazyWaveformPlayer } from '@/components/LazyAudioComponents';

// Usage
<LazyWaveformPlayer
  src="/audio/beat.mp3"
  title="My Beat"
  artist="Producer"
/>
```

#### 3. Chart Lazy Loading

Optimized lazy loading for chart components with heavy charting libraries.

```typescript
import { createChartLazyComponent } from "@/utils/chartLazyLoading";

const LazyChart = createChartLazyComponent(() => import("@/components/MyChart"), {
  preloadOnHover: true,
});
```

## Usage Patterns

### 1. Basic Lazy Loading

```typescript
// For simple components
const LazyComponent = createLazyLoader(
  () => import('@/components/MyComponent'),
  { minHeight: '200px' }
);

// Usage in JSX
<LazyComponent data={myData} />
```

### 2. Named Export Lazy Loading

```typescript
// For components with named exports
const LazyNamedComponent = createNamedLazyLoader(
  () => import("@/components/MyModule"),
  "MyComponent",
  { rootMargin: "50px" }
);
```

### 3. Preloading Strategies

```typescript
// Preload on hover
<IntersectionLazyLoader
  component={() => import('@/components/HeavyComponent')}
  rootMargin="200px" // Start loading before visible
  loadImmediately={false}
/>

// Preload on user interaction
useEffect(() => {
  const preload = () => import('@/components/HeavyComponent');

  document.addEventListener('mousedown', preload, { once: true });
  document.addEventListener('touchstart', preload, { once: true });
}, []);
```

## Performance Monitoring

### Production Monitoring

The lazy loading system includes built-in performance monitoring:

```typescript
import { lazyLoadingMonitor } from "@/utils/lazyLoadingMonitor";

// Get performance stats
const stats = lazyLoadingMonitor.getStats();
console.log("Lazy loading performance:", stats);

// Generate report
const report = lazyLoadingMonitor.generateReport();
console.log(report);
```

### Monitoring Metrics

- **Load Time**: Time taken to load each component
- **Success Rate**: Percentage of successful loads
- **Chunk Size**: Size of loaded chunks
- **Error Rate**: Failed load attempts
- **Retry Count**: Number of retries for failed loads

## Best Practices

### 1. Component Selection

**Good candidates for lazy loading:**

- Components below the fold
- Heavy components with large dependencies
- Components with expensive computations
- Rarely used features

**Avoid lazy loading for:**

- Critical above-the-fold content
- Small, lightweight components
- Components needed for initial page render

### 2. Loading States

Always provide meaningful loading states:

```typescript
const AudioLoadingFallback = () => (
  <div className="flex items-center justify-center p-4">
    <Loader2 className="w-5 h-5 animate-spin" />
    <span>Loading audio player...</span>
  </div>
);

<Suspense fallback={<AudioLoadingFallback />}>
  <LazyAudioComponent />
</Suspense>
```

### 3. Error Handling

Implement proper error boundaries:

```typescript
<IntersectionLazyLoader
  component={() => import('@/components/MyComponent')}
  onLoadError={(error) => {
    console.error('Failed to load component:', error);
    // Report to error tracking service
  }}
/>
```

### 4. Preloading Strategy

Use progressive preloading:

```typescript
// Immediate: Critical components
// 2s delay: Important but not critical
// 5s delay: Nice-to-have components
// On interaction: Rarely used features

const preloadSchedule = {
  immediate: ["CriticalComponent"],
  delayed: ["ImportantComponent"],
  onInteraction: ["RarelyUsedComponent"],
};
```

## Bundle Optimization

### Code Splitting Configuration

The Vite configuration includes optimized code splitting:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          audio: ["wavesurfer.js"],
          charts: ["recharts", "d3"],
          ui: ["@radix-ui", "lucide-react"],
        },
      },
    },
  },
});
```

### Chunk Analysis

Use the bundle analyzer to monitor chunk sizes:

```bash
# Build with analysis
ANALYZE=true npm run build

# Check chunk sizes
node scripts/test-production-build.js
```

## Troubleshooting

### Common Issues

1. **Empty Chunks**: Components not being used trigger empty chunks
   - Solution: Only lazy load components that are actually used

2. **Type Errors**: Generic type constraints too restrictive
   - Solution: Use `Record<string, any>` for maximum flexibility

3. **Import Errors**: Named vs default exports confusion
   - Solution: Use `createNamedLazyLoader` for named exports

4. **Performance Issues**: Components loading too slowly
   - Solution: Implement preloading strategies

### Debug Tools

```typescript
// Enable debug mode
if (process.env.NODE_ENV === "development") {
  window.__lazyLoadingMonitor = lazyLoadingMonitor;
}

// Check performance in console
lazyLoadingMonitor.generateReport();
```

## Migration Guide

### From Static Imports

```typescript
// Before
import HeavyComponent from "@/components/HeavyComponent";

// After
const LazyHeavyComponent = createLazyLoader(() => import("@/components/HeavyComponent"), {
  minHeight: "300px",
});
```

### From React.lazy

```typescript
// Before
const LazyComponent = React.lazy(() => import("@/components/MyComponent"));

// After
const LazyComponent = createLazyLoader(() => import("@/components/MyComponent"), {
  rootMargin: "100px",
  onLoadStart: () => console.log("Loading started"),
  onLoadComplete: () => console.log("Loading completed"),
});
```

## Performance Targets

### Recommended Metrics

- **Initial Bundle Size**: < 500KB
- **Lazy Load Time**: < 1000ms
- **Success Rate**: > 99%
- **Chunk Size**: < 200KB per chunk

### Monitoring Thresholds

- **Slow Load Warning**: > 2000ms
- **Error Rate Alert**: > 1%
- **Large Chunk Warning**: > 500KB

## Future Enhancements

1. **Service Worker Integration**: Cache lazy-loaded chunks
2. **Predictive Loading**: ML-based preloading
3. **Network-Aware Loading**: Adjust strategy based on connection
4. **Component Prioritization**: Load order based on user behavior
