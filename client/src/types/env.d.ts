/**
 * Environment Variables Type Definitions
 * Extends Vite's ImportMetaEnv with dashboard-specific environment variables
 */

interface ImportMetaEnv {
  // Existing Vite environment variables
  readonly VITE_CONVEX_URL: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
  readonly VITE_STRIPE_PUBLIC_KEY: string;
  readonly VITE_WC_KEY: string;
  readonly VITE_WC_SECRET: string;
  readonly VITE_DEV_TOOLS: string;

  // Dashboard Feature Flags
  readonly VITE_FEATURE_REALTIME_UPDATES?: string;
  readonly VITE_FEATURE_ANALYTICS_CHARTS?: string;
  readonly VITE_FEATURE_ADVANCED_FILTERS?: string;
  readonly VITE_FEATURE_PERFORMANCE_MONITORING?: string;
  readonly VITE_FEATURE_ERROR_TRACKING?: string;
  readonly VITE_FEATURE_OFFLINE_SUPPORT?: string;

  // Dashboard UI Configuration
  readonly VITE_ANIMATION_DURATION?: string;
  readonly VITE_SKELETON_ITEMS?: string;
  readonly VITE_MAX_ACTIVITY_ITEMS?: string;

  // Dashboard Pagination Configuration
  readonly VITE_ORDERS_PER_PAGE?: string;
  readonly VITE_DOWNLOADS_PER_PAGE?: string;
  readonly VITE_ACTIVITY_PER_PAGE?: string;

  // Performance Configuration
  readonly VITE_CACHE_TTL_USER_STATS?: string;
  readonly VITE_CACHE_TTL_FAVORITES?: string;
  readonly VITE_CACHE_TTL_ORDERS?: string;
  readonly VITE_CACHE_TTL_DOWNLOADS?: string;
  readonly VITE_CACHE_TTL_ACTIVITY?: string;
  readonly VITE_CACHE_TTL_CHART_DATA?: string;

  // Request Configuration
  readonly VITE_REQUEST_TIMEOUT?: string;
  readonly VITE_REQUEST_RETRIES?: string;
  readonly VITE_REQUEST_RETRY_DELAY?: string;
  readonly VITE_MAX_CONCURRENT_REQUESTS?: string;

  // Real-time Configuration
  readonly VITE_REALTIME_RECONNECT_INTERVAL?: string;
  readonly VITE_REALTIME_MAX_RETRIES?: string;
  readonly VITE_REALTIME_HEARTBEAT_INTERVAL?: string;
  readonly VITE_REALTIME_CONNECTION_TIMEOUT?: string;

  // API Configuration
  readonly VITE_API_BASE_URL?: string;

  // Development Configuration
  readonly VITE_LOG_LEVEL?: string;
  readonly VITE_SHOW_PERFORMANCE?: string;
  readonly VITE_USE_MOCK_DATA?: string;
  readonly VITE_PERFORMANCE_PROFILER?: string;

  // Currency Configuration
  readonly VITE_CURRENCY_LOCALE?: string;
  readonly VITE_CURRENCY_PRECISION?: string;
  readonly VITE_CURRENCY_COMPACT_THRESHOLD?: string;

  // Error Handling Configuration
  readonly VITE_ERROR_AUTO_HIDE_DELAY?: string;
  readonly VITE_ERROR_MAX_SHOWN?: string;
  readonly VITE_ERROR_SAMPLE_RATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
