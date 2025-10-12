# Component Usage Patterns and Best Practices

## Overview

This document provides comprehensive guidance on using the optimized components and patterns implemented in the BroLab Entertainment platform. It covers lazy loading strategies, performance optimization patterns, error handling approaches, and best practices for maintainable code.

## Lazy Loading Patterns

### 1. Basic Lazy Loading

Use the `createLazyLoader` utility for standard component lazy loading:

```typescript
import { createLazyLoader } from '@/utils/lazyLoading';

// Basic lazy loading
const LazyBeatCard = createLazyLoader(
  () => import('@/components/beats/BeatCard'),
  {
    minHeight: '200px',
    rootMargin: '50px'
  }
);

// Usage in component
const BeatsList = ({ beats }) => {
  return (
    <div className="beats-grid">
      {beats.map(beat => (
        <LazyBeatCard key={beat.id} beat={beat} />
      ))}
    </div>
  );
};
```

### 2. Named Export Lazy Loading

For components with named exports:

```typescript
import { createNamedLazyLoader } from '@/utils/lazyLoading';

// Named export lazy loading
const LazyAudioAnalyzer = createNamedLazyLoader(
  () => import('@/components/audio/AudioUtils'),
  'AudioAnalyzer',
  {
    rootMargin: '100px',
    preloadDelay: 2000
  }
);

// Usage
<LazyAudioAnalyzer audioFile={audioFile} onAnalysisComplete={handleAnalysis} />
```

### 3. Intersection Observer Lazy Loading

For more control over loading behavior:

```typescript
import { IntersectionLazyLoader } from '@/components/IntersectionLazyLoader';

// Advanced lazy loading with custom configuration
<IntersectionLazyLoader
  component={() => import('@/components/charts/AnalyticsChart')}
  componentProps={{ data: chartData, type: 'line' }}
  minHeight="400px"
  rootMargin="200px"
  threshold={0.1}
  onLoadStart={() => console.log('Chart loading started')}
  onLoadComplete={() => console.log('Chart loaded successfully')}
  onLoadError={(error) => console.error('Chart loading failed:', error)}
  retryOnError={true}
  maxRetries={3}
/>
```

### 4. Preloading Strategies

#### Hover Preloading

```typescript
import { usePreloadOnHover } from '@/hooks/usePreloadOnHover';

const BeatCard = ({ beat }) => {
  const preloadRef = usePreloadOnHover(
    () => import('@/components/audio/WaveformPlayer')
  );

  return (
    <div ref={preloadRef} className="beat-card">
      <h3>{beat.title}</h3>
      <p>{beat.artist}</p>
      {/* Player will be preloaded on hover */}
    </div>
  );
};
```

#### Time-based Preloading

```typescript
import { usePreloadAfterDelay } from '@/hooks/usePreloadAfterDelay';

const Dashboard = () => {
  // Preload analytics components after 3 seconds
  usePreloadAfterDelay([
    () => import('@/components/analytics/UserStats'),
    () => import('@/components/analytics/SalesChart'),
    () => import('@/components/analytics/ConversionFunnel')
  ], 3000);

  return (
    <div className="dashboard">
      {/* Dashboard content */}
    </div>
  );
};
```

#### User Interaction Preloading

```typescript
import { usePreloadOnInteraction } from '@/hooks/usePreloadOnInteraction';

const App = () => {
  // Preload components on first user interaction
  usePreloadOnInteraction([
    () => import('@/components/modals/CheckoutModal'),
    () => import('@/components/forms/ContactForm'),
    () => import('@/components/user/ProfileEditor')
  ]);

  return <AppContent />;
};
```

## Performance Optimization Patterns

### 1. Sync Manager Usage

```typescript
import { SyncManager } from '@/services/SyncManager';
import { useSyncManager } from '@/hooks/useSyncManager';

// Hook-based usage (recommended)
const UserPreferences = () => {
  const { scheduleSync, getSyncStatus } = useSyncManager();

  const handlePreferenceChange = async (key: string, value: any) => {
    // Optimistic update
    setPreferences(prev => ({ ...prev, [key]: value }));

    // Schedule sync with debouncing
    await scheduleSync({
      id: `user-preference-${key}`,
      type: 'user',
      payload: { [key]: value },
      priority: 'medium'
    });
  };

  return (
    <div className="preferences">
      {/* Preference controls */}
    </div>
  );
};

// Direct usage
const syncManager = new SyncManager({
  debounceDelay: 1000,
  maxRetries: 3,
  batchSize: 5
});

// Batch multiple operations
await syncManager.batchSync([
  { id: 'pref1', type: 'user', payload: { theme: 'dark' } },
  { id: 'pref2', type: 'user', payload: { language: 'en' } },
  { id: 'pref3', type: 'user', payload: { notifications: true } }
]);
```

### 2. Cache Manager Usage

```typescript
import { CacheManager } from '@/services/CacheManager';
import { useCache } from '@/hooks/useCache';

// Hook-based caching (recommended)
const BeatsList = () => {
  const { getCached, setCached, invalidateCache } = useCache();

  const loadBeats = async (filters: BeatFilters) => {
    const cacheKey = `beats-${JSON.stringify(filters)}`;

    // Try cache first
    const cachedBeats = await getCached(cacheKey);
    if (cachedBeats) {
      return cachedBeats;
    }

    // Fetch and cache
    const beats = await api.getBeats(filters);
    await setCached(cacheKey, beats, 300000); // 5 minutes TTL

    return beats;
  };

  const handleFilterChange = (newFilters: BeatFilters) => {
    // Invalidate related cache entries
    invalidateCache('beats-*');
    setFilters(newFilters);
  };

  return (
    <div className="beats-list">
      {/* Beats content */}
    </div>
  );
};

// Direct cache usage
const cache = new CacheManager({
  defaultTTL: 300000, // 5 minutes
  maxSize: 100,
  strategy: 'LRU'
});

// Cache with custom TTL
await cache.set('user-profile', userProfile, 600000); // 10 minutes

// Cache with tags for bulk invalidation
await cache.setWithTags('beat-123', beatData, ['beats', 'user-beats'], 300000);
await cache.invalidateByTag('beats'); // Invalidate all beat-related cache
```

### 3. Memory Management Patterns

```typescript
import { useMemoryOptimization } from '@/hooks/useMemoryOptimization';
import { MemoryMonitor } from '@/services/MemoryMonitor';

// Component-level memory optimization
const HeavyComponent = ({ data }) => {
  const { trackMemoryUsage, cleanupMemory } = useMemoryOptimization();

  useEffect(() => {
    // Track memory usage
    const memoryTracker = trackMemoryUsage('HeavyComponent');

    // Setup heavy operations
    const heavyData = processLargeDataset(data);

    return () => {
      // Cleanup memory
      cleanupMemory();
      memoryTracker.stop();
    };
  }, [data]);

  return <div>{/* Component content */}</div>;
};

// Global memory monitoring
const memoryMonitor = new MemoryMonitor({
  alertThreshold: 0.8, // Alert at 80% memory usage
  cleanupThreshold: 0.9, // Force cleanup at 90%
  monitoringInterval: 30000 // Check every 30 seconds
});

memoryMonitor.start();
```

## Error Handling Patterns

### 1. Error Boundary Usage

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useErrorHandler } from '@/hooks/useErrorHandler';

// Component-level error boundary
const BeatPlayer = ({ beat }) => {
  return (
    <ErrorBoundary
      fallback={<AudioPlayerError />}
      onError={(error, errorInfo) => {
        console.error('Audio player error:', error);
        // Report to error tracking
      }}
    >
      <WaveformAudioPlayer beat={beat} />
    </ErrorBoundary>
  );
};

// Hook-based error handling
const UserDashboard = () => {
  const { handleError, clearError, error } = useErrorHandler();

  const loadUserData = async () => {
    try {
      const userData = await api.getUserData();
      setUserData(userData);
    } catch (error) {
      handleError(error, {
        component: 'UserDashboard',
        action: 'loadUserData',
        fallback: 'default-user-data'
      });
    }
  };

  if (error) {
    return <ErrorFallback error={error} onRetry={clearError} />;
  }

  return <div>{/* Dashboard content */}</div>;
};
```

### 2. Retry Logic Patterns

```typescript
import { RetryManager } from '@shared/utils/RetryManager';
import { useRetry } from '@/hooks/useRetry';

// Hook-based retry
const DataFetcher = () => {
  const { executeWithRetry, isRetrying, retryCount } = useRetry();

  const fetchData = () => executeWithRetry(
    () => api.fetchCriticalData(),
    {
      maxRetries: 3,
      baseDelay: 1000,
      backoffFactor: 2,
      retryCondition: (error) => error.status >= 500
    }
  );

  return (
    <div>
      {isRetrying && <div>Retrying... (Attempt {retryCount})</div>}
      <button onClick={fetchData}>Fetch Data</button>
    </div>
  );
};

// Direct retry usage
const retryManager = new RetryManager();

const robustApiCall = async () => {
  return await retryManager.executeWithRetry(
    async () => {
      const response = await fetch('/api/critical-endpoint');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    },
    {
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      jitter: true,
      retryCondition: (error) => {
        // Retry on network errors and 5xx status codes
        return error.message.includes('HTTP 5') ||
               error.message.includes('network');
      }
    }
  );
};
```

### 3. Graceful Degradation Patterns

```typescript
import { useFallback } from '@/hooks/useFallback';
import { FeatureFlag } from '@/components/FeatureFlag';

// Feature-based fallback
const AdvancedAudioPlayer = ({ beat }) => {
  const { fallback, isUsingFallback } = useFallback();

  return (
    <FeatureFlag feature="advanced-audio-player">
      {({ enabled, loading }) => {
        if (loading) return <AudioPlayerSkeleton />;

        if (!enabled || isUsingFallback) {
          return fallback(<BasicAudioPlayer beat={beat} />);
        }

        return (
          <ErrorBoundary
            fallback={fallback(<BasicAudioPlayer beat={beat} />)}
          >
            <WaveformAudioPlayer beat={beat} />
          </ErrorBoundary>
        );
      }}
    </FeatureFlag>
  );
};

// Progressive enhancement pattern
const EnhancedBeatCard = ({ beat }) => {
  const [enhancementsLoaded, setEnhancementsLoaded] = useState(false);

  useEffect(() => {
    // Load enhancements progressively
    const loadEnhancements = async () => {
      try {
        await Promise.all([
          import('@/components/audio/WaveformPreview'),
          import('@/components/beats/BeatAnalytics'),
          import('@/components/social/ShareButtons')
        ]);
        setEnhancementsLoaded(true);
      } catch (error) {
        console.warn('Failed to load enhancements:', error);
        // Continue with basic functionality
      }
    };

    loadEnhancements();
  }, []);

  return (
    <div className="beat-card">
      {/* Basic beat information - always available */}
      <BeatInfo beat={beat} />

      {/* Enhanced features - loaded progressively */}
      {enhancementsLoaded && (
        <Suspense fallback={<EnhancementsSkeleton />}>
          <BeatEnhancements beat={beat} />
        </Suspense>
      )}
    </div>
  );
};
```

## State Management Patterns

### 1. Zustand Store Patterns

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Optimized store with persistence
interface BeatStore {
  beats: Beat[];
  filters: BeatFilters;
  loading: boolean;
  error: string | null;

  // Actions
  setBeats: (beats: Beat[]) => void;
  updateFilters: (filters: Partial<BeatFilters>) => void;
  addBeat: (beat: Beat) => void;
  removeBeat: (beatId: string) => void;
  clearError: () => void;
}

export const useBeatStore = create<BeatStore>()(
  persist(
    (set, get) => ({
      beats: [],
      filters: {},
      loading: false,
      error: null,

      setBeats: (beats) => set({ beats, loading: false, error: null }),

      updateFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters }
      })),

      addBeat: (beat) => set((state) => ({
        beats: [...state.beats, beat]
      })),

      removeBeat: (beatId) => set((state) => ({
        beats: state.beats.filter(b => b.id !== beatId)
      })),

      clearError: () => set({ error: null })
    }),
    {
      name: 'beat-store',
      partialize: (state) => ({
        filters: state.filters // Only persist filters
      })
    }
  )
);

// Usage in component
const BeatsList = () => {
  const { beats, filters, loading, updateFilters } = useBeatStore();

  const handleFilterChange = (newFilters: Partial<BeatFilters>) => {
    updateFilters(newFilters);
    // Trigger data refetch
    refetchBeats();
  };

  return (
    <div>
      <BeatFilters filters={filters} onChange={handleFilterChange} />
      {loading ? <BeatsListSkeleton /> : <BeatsGrid beats={beats} />}
    </div>
  );
};
```

### 2. TanStack Query Patterns

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Optimized data fetching with caching
const useBeats = (filters: BeatFilters) => {
  return useQuery({
    queryKey: ["beats", filters],
    queryFn: () => api.getBeats(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: error => {
      console.error("Failed to fetch beats:", error);
      // Report to error tracking
    },
  });
};

// Optimistic updates with mutations
const useAddToCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (beat: Beat) => api.addToCart(beat.id),
    onMutate: async beat => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["cart"] });

      // Snapshot previous value
      const previousCart = queryClient.getQueryData(["cart"]);

      // Optimistically update
      queryClient.setQueryData(["cart"], (old: Beat[]) => [...old, beat]);

      return { previousCart };
    },
    onError: (err, beat, context) => {
      // Rollback on error
      queryClient.setQueryData(["cart"], context?.previousCart);
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
};
```

## Security Patterns

### 1. Input Validation Patterns

```typescript
import { z } from 'zod';
import { sanitizeInput } from '@shared/utils/sanitization';

// Schema-based validation
const BeatUploadSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  genre: z.enum(['hip-hop', 'trap', 'r&b', 'pop']),
  bpm: z.number().min(60).max(200),
  price: z.number().min(0).max(1000),
  tags: z.array(z.string()).max(10)
});

// Component with validation
const BeatUploadForm = () => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  const handleSubmit = async (data: any) => {
    try {
      // Validate schema
      const validatedData = BeatUploadSchema.parse(data);

      // Sanitize inputs
      const sanitizedData = {
        ...validatedData,
        title: sanitizeInput(validatedData.title),
        description: validatedData.description ?
          sanitizeInput(validatedData.description) : undefined
      };

      await api.uploadBeat(sanitizedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(error.flatten().fieldErrors);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields with error display */}
    </form>
  );
};
```

### 2. Authentication Patterns

```typescript
import { useAuth } from '@clerk/nextjs';
import { useAuthGuard } from '@/hooks/useAuthGuard';

// Protected component pattern
const ProtectedDashboard = () => {
  const { isAuthenticated, user } = useAuthGuard({
    redirectTo: '/login',
    requiredRole: 'user'
  });

  if (!isAuthenticated) {
    return <AuthenticationRequired />;
  }

  return (
    <div className="dashboard">
      <h1>Welcome, {user.firstName}!</h1>
      {/* Dashboard content */}
    </div>
  );
};

// Role-based access control
const AdminPanel = () => {
  const { hasPermission } = useAuth();

  return (
    <div>
      {hasPermission('admin:read') && (
        <AdminStats />
      )}

      {hasPermission('admin:write') && (
        <AdminControls />
      )}

      {hasPermission('admin:delete') && (
        <DangerZone />
      )}
    </div>
  );
};
```

## Testing Patterns

### 1. Component Testing

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BeatCard } from '@/components/beats/BeatCard';

// Mock lazy loading for tests
vi.mock('@/utils/lazyLoading', () => ({
  createLazyLoader: (importFn: any, options: any) => {
    const Component = vi.fn(() => <div data-testid="lazy-component">Lazy Component</div>);
    return Component;
  }
}));

describe('BeatCard', () => {
  const mockBeat = {
    id: '1',
    title: 'Test Beat',
    artist: 'Test Artist',
    genre: 'hip-hop',
    bpm: 120,
    price: 29.99
  };

  it('renders beat information correctly', () => {
    render(<BeatCard beat={mockBeat} />);

    expect(screen.getByText('Test Beat')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
    expect(screen.getByText('$29.99')).toBeInTheDocument();
  });

  it('loads lazy components on interaction', async () => {
    render(<BeatCard beat={mockBeat} />);

    // Simulate intersection observer trigger
    const lazyComponent = screen.getByTestId('lazy-component');
    expect(lazyComponent).toBeInTheDocument();
  });
});
```

### 2. Performance Testing

```typescript
import { performance } from "perf_hooks";
import { lazyLoadingMonitor } from "@/utils/lazyLoadingMonitor";

describe("Performance Tests", () => {
  it("should load components within performance budget", async () => {
    const startTime = performance.now();

    // Simulate component loading
    const LazyComponent = await import("@/components/HeavyComponent");

    const loadTime = performance.now() - startTime;

    expect(loadTime).toBeLessThan(1000); // Should load within 1 second
  });

  it("should track lazy loading metrics", () => {
    const stats = lazyLoadingMonitor.getStats();

    expect(stats.averageLoadTime).toBeLessThan(2000);
    expect(stats.successRate).toBeGreaterThan(0.95);
    expect(stats.errorRate).toBeLessThan(0.05);
  });
});
```

## Best Practices Summary

### 1. Performance Best Practices

- **Lazy Load Strategically**: Only lazy load components that are below the fold or rarely used
- **Implement Preloading**: Use hover, interaction, or time-based preloading for better UX
- **Cache Intelligently**: Cache frequently accessed data with appropriate TTL
- **Monitor Performance**: Track Web Vitals and lazy loading metrics
- **Optimize Bundle Size**: Use code splitting and tree shaking effectively

### 2. Error Handling Best Practices

- **Use Error Boundaries**: Wrap components that might fail with error boundaries
- **Implement Retry Logic**: Use exponential backoff for transient failures
- **Provide Fallbacks**: Always have a fallback UI for failed components
- **Log Errors Properly**: Include context and metadata for debugging
- **Monitor Error Rates**: Set up alerts for error rate thresholds

### 3. Security Best Practices

- **Validate All Inputs**: Use schema validation for all user inputs
- **Sanitize Data**: Clean user-generated content before display
- **Implement RBAC**: Use role-based access control for sensitive features
- **Rate Limit APIs**: Protect against abuse with rate limiting
- **Audit Security Events**: Log and monitor security-related events

### 4. Code Organization Best Practices

- **Follow Naming Conventions**: Use consistent naming for files and components
- **Separate Concerns**: Keep business logic separate from UI components
- **Use TypeScript Strictly**: Avoid 'any' types and use proper interfaces
- **Write Tests**: Include unit and integration tests for critical functionality
- **Document APIs**: Provide clear documentation for all public APIs

This comprehensive guide provides the foundation for building maintainable, performant, and secure components in the BroLab Entertainment platform.
