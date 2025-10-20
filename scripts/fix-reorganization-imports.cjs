#!/usr/bin/env node

/**
 * Script to fix imports after repository reorganization
 * Updates import paths to match new component organization
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Import mapping: old path -> new path
const importMappings = {
  // Store (singular -> plural)
  "@/store/useAudioStore": "@/stores/useAudioStore",
  "@/store/useCartStore": "@/stores/useCartStore",
  "@/store/useDashboardStore": "@/stores/useDashboardStore",
  "@/store/useFilterStore": "@/stores/useFilterStore",

  // Auth components
  "@/components/AuthDebug": "@/components/auth/AuthDebug",
  "@/components/AuthenticatedContent": "@/components/auth/AuthenticatedContent",
  "@/components/ClerkErrorBoundary": "@/components/auth/ClerkErrorBoundary",
  "@/components/ClerkFallback": "@/components/auth/ClerkFallback",
  "@/components/ClerkSyncProvider": "@/components/auth/ClerkSyncProvider",
  "@/components/ClerkWithFallback": "@/components/auth/ClerkWithFallback",
  "@/components/ProtectedRoute": "@/components/auth/ProtectedRoute",
  "@/components/UserProfile": "@/components/auth/UserProfile",

  // Beat components
  "@/components/beat-card": "@/components/beats/beat-card",
  "@/components/BeatCardSkeleton": "@/components/beats/BeatCardSkeleton",
  "@/components/BeatSimilarityRecommendations": "@/components/beats/BeatSimilarityRecommendations",
  "@/components/BeatStemsDelivery": "@/components/beats/BeatStemsDelivery",
  "@/components/ResponsiveBeatCard": "@/components/beats/ResponsiveBeatCard",
  "@/components/TableBeatView": "@/components/beats/TableBeatView",
  "@/components/OptimizedBeatGrid": "@/components/beats/OptimizedBeatGrid",
  "@/components/FeaturedBeatsCarousel": "@/components/beats/FeaturedBeatsCarousel",
  "@/components/FeaturedBeatsSkeleton": "@/components/beats/FeaturedBeatsSkeleton",
  "@/components/RecentlyViewedBeats": "@/components/beats/RecentlyViewedBeats",

  // Cart components
  "@/components/AddToCartButton": "@/components/cart/AddToCartButton",
  "@/components/cart-provider": "@/components/cart/cart-provider",

  // Payment components
  "@/components/EnhancedPaymentForm": "@/components/payments/EnhancedPaymentForm",
  "@/components/ClerkPaymentForm": "@/components/payments/ClerkPaymentForm",
  "@/components/ClerkPaymentTest": "@/components/payments/ClerkPaymentTest",
  "@/components/PayPalButton": "@/components/payments/PayPalButton",

  // Audio components
  "@/components/audio-player": "@/components/audio/audio-player",
  "@/components/EnhancedGlobalAudioPlayer": "@/components/audio/EnhancedGlobalAudioPlayer",
  "@/components/EnhancedWaveformPlayer": "@/components/audio/EnhancedWaveformPlayer",
  "@/components/GlobalAudioPlayer": "@/components/audio/GlobalAudioPlayer",
  "@/components/HoverPlayButton": "@/components/audio/HoverPlayButton",
  "@/components/LazyAudioComponents": "@/components/audio/LazyAudioComponents",
  "@/components/SimpleAudioPlayer": "@/components/audio/SimpleAudioPlayer",
  "@/components/SonaarAudioPlayer": "@/components/audio/SonaarAudioPlayer",
  "@/components/WaveformAudioPlayer": "@/components/audio/WaveformAudioPlayer",
  "@/components/WaveformPlayer": "@/components/audio/WaveformPlayer",

  // Dashboard components
  "@/components/AnalyticsCharts": "@/components/dashboard/AnalyticsCharts",
  "@/components/AnalyticsDashboard": "@/components/dashboard/AnalyticsDashboard",
  "@/components/DashboardSkeleton": "@/components/dashboard/DashboardSkeleton",
  "@/components/DownloadsTable": "@/components/dashboard/DownloadsTable",
  "@/components/OrdersTable": "@/components/dashboard/OrdersTable",
  "@/components/DataExportManager": "@/components/dashboard/DataExportManager",
  "@/components/InteractiveDataTable": "@/components/dashboard/InteractiveDataTable",

  // Filter components
  "@/components/AdvancedBeatFilters": "@/components/filters/AdvancedBeatFilters",
  "@/components/BPMFilter": "@/components/filters/BPMFilter",
  "@/components/UnifiedFilterDemo": "@/components/filters/UnifiedFilterDemo",
  "@/components/UnifiedFilterPanel": "@/components/filters/UnifiedFilterPanel",

  // License components
  "@/components/license-preview": "@/components/licenses/license-preview",
  "@/components/LicensePicker": "@/components/licenses/LicensePicker",
  "@/components/LicensePreviewModal": "@/components/licenses/LicensePreviewModal",

  // Reservation components
  "@/components/ReservationErrorBoundary": "@/components/reservations/ReservationErrorBoundary",
  "@/components/ReservationLoadingStates": "@/components/reservations/ReservationLoadingStates",
  "@/components/CustomBeatRequest": "@/components/reservations/CustomBeatRequest",

  // Subscription components
  "@/components/SubscriptionManager": "@/components/subscriptions/SubscriptionManager",
  "@/components/SubscriberPerksStrip": "@/components/subscriptions/SubscriberPerksStrip",

  // Alert components
  "@/components/AlertBanner": "@/components/alerts/AlertBanner",
  "@/components/DiscountBanner": "@/components/alerts/DiscountBanner",
  "@/components/promotional-banner": "@/components/alerts/promotional-banner",
  "@/components/NotificationCenter": "@/components/alerts/NotificationCenter",

  // Layout components
  "@/components/MobileBottomNav": "@/components/layout/MobileBottomNav",
  "@/components/SearchHero": "@/components/layout/SearchHero",
  "@/components/ServicesStrip": "@/components/layout/ServicesStrip",
  "@/components/SocialProofStrip": "@/components/layout/SocialProofStrip",
  "@/components/ScrollToTop": "@/components/layout/ScrollToTop",

  // Loading components
  "@/components/ComponentPreloader": "@/components/loading/ComponentPreloader",
  "@/components/ComprehensiveLoadingStates": "@/components/loading/ComprehensiveLoadingStates",
  "@/components/IntersectionLazyLoader": "@/components/loading/IntersectionLazyLoader",
  "@/components/LazyComponents": "@/components/loading/LazyComponents",
  "@/components/LoadingFallback": "@/components/loading/LoadingFallback",
  "@/components/LoadingSpinner": "@/components/loading/LoadingSpinner",
  "@/components/OptimizedLoadingFallback": "@/components/loading/OptimizedLoadingFallback",
  "@/components/OfflineIndicator": "@/components/loading/OfflineIndicator",
  "@/components/VirtualScrollList": "@/components/loading/VirtualScrollList",

  // Error components
  "@/components/BroLabErrorHandler": "@/components/errors/BroLabErrorHandler",
  "@/components/EnhancedErrorHandling": "@/components/errors/EnhancedErrorHandling",
  "@/components/ErrorBoundary": "@/components/errors/ErrorBoundary",
  "@/components/MixingMasteringErrorBoundary": "@/components/errors/MixingMasteringErrorBoundary",
  "@/components/SafeMixingMasteringErrorBoundary":
    "@/components/errors/SafeMixingMasteringErrorBoundary",
  "@/components/OptimisticUpdateFeedback": "@/components/errors/OptimisticUpdateFeedback",

  // Monitoring components
  "@/components/CodeSplittingMonitor": "@/components/monitoring/CodeSplittingMonitor",
  "@/components/PerformanceMonitor": "@/components/monitoring/PerformanceMonitor",
  "@/components/ConversionFunnelTracker": "@/components/monitoring/ConversionFunnelTracker",
  "@/components/PerformanceOptimizations": "@/components/monitoring/PerformanceOptimizations",

  // Provider components
  "@/components/CurrencyLanguageProvider": "@/components/providers/CurrencyLanguageProvider",
  "@/components/GeolocationProvider": "@/components/providers/GeolocationProvider",
  "@/components/LoadingStateProvider": "@/components/providers/LoadingStateProvider",
  "@/components/AnalyticsProvider": "@/components/providers/AnalyticsProvider",

  // SEO components
  "@/components/OpenGraphMeta": "@/components/seo/OpenGraphMeta",
  "@/components/SchemaMarkup": "@/components/seo/SchemaMarkup",

  // Newsletter components
  "@/components/newsletter-signup": "@/components/newsletter/newsletter-signup",
  "@/components/NewsletterModal": "@/components/newsletter/NewsletterModal",

  // Relative imports that need fixing
  "../DownloadsTable": "@/components/dashboard/DownloadsTable",
  "../UserProfile": "@/components/auth/UserProfile",
  "../VirtualScrollList": "@/components/loading/VirtualScrollList",
  "./cart-provider": "@/components/cart/cart-provider",
  "../../../components/kokonutui/file-upload": "@/components/ui/file-upload",
  "../../../../components/kokonutui/file-upload": "@/components/ui/file-upload",
  "./components/LoadingStateProvider": "@/components/providers/LoadingStateProvider",
  "./components/OptimizedLoadingFallback": "@/components/loading/OptimizedLoadingFallback",
  "./components/PerformanceMonitor": "@/components/monitoring/PerformanceMonitor",
  "../types/ui": "@/types/ui",
  "./hooks/useRecentlyViewedBeats": "@/hooks/useRecentlyViewedBeats",
  "./ui/badge": "@/components/ui/badge",
  "./ui/button": "@/components/ui/button",
  "../../../shared/types/analytics": "@shared/types/analytics",
  "../hooks/useAnalytics": "@/hooks/useAnalytics",
  "./components/AnalyticsDashboard": "@/components/dashboard/AnalyticsDashboard",
  "./components/AnalyticsProvider": "@/components/providers/AnalyticsProvider",
  "./components/ConversionFunnelTracker": "@/components/monitoring/ConversionFunnelTracker",
  "../hooks/useCache": "@/hooks/useCache",
  "../hooks/useCachingStrategy": "@/hooks/useCachingStrategy",
  "./CustomBeatRequest": "@/components/reservations/CustomBeatRequest",
  "./BeatSimilarityRecommendations": "@/components/beats/BeatSimilarityRecommendations",
  "./BeatStemsDelivery": "@/components/beats/BeatStemsDelivery",
  "../hooks/useOfflineManager": "@/hooks/useOfflineManager",
  "../hooks/useCodeSplittingMonitor": "@/hooks/useCodeSplittingMonitor",
  "./WaveformPlayer": "@/components/audio/WaveformPlayer",
  "./AdvancedBeatFilters": "@/components/filters/AdvancedBeatFilters",
  "../pages/payment-dashboard": "@/pages/payment-dashboard",
  "../../../shared/utils/cache-manager": "@shared/utils/cache-manager",
  "../../../shared/utils/analytics-manager": "@shared/utils/analytics-manager",
  "../hooks/useLoadingState": "@/hooks/useLoadingState",
  "../components/ReservationErrorBoundary": "@/components/reservations/ReservationErrorBoundary",
  "../components/WaveformAudioPlayer": "@/components/audio/WaveformAudioPlayer",
  "../components/AdvancedBeatFilters": "@/components/filters/AdvancedBeatFilters",
  "../components/BeatSimilarityRecommendations": "@/components/beats/BeatSimilarityRecommendations",
  "../components/CustomBeatRequest": "@/components/reservations/CustomBeatRequest",
  "../components/GeolocationProvider": "@/components/providers/GeolocationProvider",
  "../components/CurrencyLanguageProvider": "@/components/providers/CurrencyLanguageProvider",
  "../components/EnhancedWaveformPlayer": "@/components/audio/EnhancedWaveformPlayer",
  "./hooks/useRecentlyViewedBeats": "@/hooks/useRecentlyViewedBeats",
  "./components/AnalyticsDashboard": "@/components/dashboard/AnalyticsDashboard",
  "./components/AnalyticsProvider": "@/components/providers/AnalyticsProvider",
  "./components/ConversionFunnelTracker": "@/components/monitoring/ConversionFunnelTracker",
  "../components/OfflineIndicator": "@/components/loading/OfflineIndicator",
  "./BeatCardSkeleton": "@/components/beats/BeatCardSkeleton",
  "./DashboardSkeleton": "@/components/dashboard/DashboardSkeleton",
  "./EnhancedWaveformPlayer": "@/components/audio/EnhancedWaveformPlayer",
};

function replaceInFile(filePath, replacements) {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    let modified = false;

    for (const [oldPath, newPath] of Object.entries(replacements)) {
      // Match import statements with the old path
      const patterns = [
        new RegExp(`from ['"]${oldPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"]`, "g"),
        new RegExp(`import\\(['"]${oldPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"]\\)`, "g"),
      ];

      for (const pattern of patterns) {
        if (pattern.test(content)) {
          content = content.replace(pattern, match => {
            return match.replace(oldPath, newPath);
          });
          modified = true;
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`✓ Fixed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function findFiles(dir, extensions = [".ts", ".tsx", ".js", ".jsx"]) {
  const files = [];

  function traverse(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules, dist, build, etc.
        if (!["node_modules", "dist", "build", ".git", "coverage"].includes(entry.name)) {
          traverse(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  traverse(dir);
  return files;
}

function main() {
  console.log("🔧 Fixing imports after repository reorganization...\n");

  const clientDir = path.join(process.cwd(), "client", "src");

  if (!fs.existsSync(clientDir)) {
    console.error("❌ client/src directory not found!");
    process.exit(1);
  }

  console.log(`📁 Scanning files in ${clientDir}...\n`);

  const files = findFiles(clientDir);
  console.log(`📄 Found ${files.length} files to process\n`);

  let fixedCount = 0;

  for (const file of files) {
    if (replaceInFile(file, importMappings)) {
      fixedCount++;
    }
  }

  console.log(`\n✅ Fixed ${fixedCount} files`);
  console.log(`📊 Total files scanned: ${files.length}`);

  if (fixedCount > 0) {
    console.log("\n🎉 Import fixes complete!");
    console.log('💡 Run "npm run type-check" to verify all imports are correct');
  } else {
    console.log("\n✨ No imports needed fixing");
  }
}

main();
