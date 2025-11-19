import { CartProvider } from "@/components/cart/cart-provider";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import {
  GlobalLoadingIndicator,
  LoadingStateProvider,
} from "@/components/providers/LoadingStateProvider";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Route, Switch } from "wouter";
import { queryClient, warmCache } from "./lib/queryClient";

// Critical components - loaded immediately for core UX
import { Navbar } from "@/components/layout/navbar";

import { ComponentPreloader } from "@/components/loading/ComponentPreloader";
import { useInteractionPreloader } from "@/hooks/useInteractionPreloader";
import { bundleOptimization, createLazyComponent } from "@/utils/lazyLoading";

// Layout components - lazy loaded for better performance
// Defer non-critical components to mount after main content
const Footer = createLazyComponent(
  () => import("@/components/layout/footer").then(m => ({ default: m.Footer })),
  { preloadDelay: 3000 } // Preload after 3 seconds
);
const MobileBottomNav = createLazyComponent(
  () => import("@/components/layout/MobileBottomNav").then(m => ({ default: m.MobileBottomNav })),
  { preloadDelay: 2000 } // Preload after 2 seconds
);
const OfflineIndicator = createLazyComponent(
  () => import("@/components/loading/OfflineIndicator"),
  { preloadDelay: 5000 } // Preload after 5 seconds - low priority
);

// Audio player - lazy loaded as it's heavy and not immediately needed
const EnhancedGlobalAudioPlayer = createLazyComponent(
  () =>
    import("@/components/audio/EnhancedGlobalAudioPlayer").then(m => ({
      default: m.EnhancedGlobalAudioPlayer,
    })),
  { preloadDelay: 2000 } // Preload after 2 seconds
);

// Core pages - only Home loaded immediately, others lazy loaded for better initial load
import Home from "@/pages/home";

// Import route chunking utilities
import { featureFlags } from "@/config/featureFlags";
import { createChunkedRoute } from "@/config/routeChunks";

// High-priority pages - route-based lazy loading with chunking
const Shop = createChunkedRoute(() => import("@/pages/shop"), "/shop");
const Product = createChunkedRoute(() => import("@/pages/product"), "/product/:id");
const Cart = createChunkedRoute(() => import("@/pages/cart"), "/cart");
const Login = createChunkedRoute(() => import("@/pages/login"), "/login");
const Dashboard = createChunkedRoute(() => import("@/pages/dashboard"), "/dashboard");

// Info pages - grouped in low-traffic chunk
const About = createChunkedRoute(() => import("@/pages/about"), "/about");
const Contact = createChunkedRoute(() => import("@/pages/contact"), "/contact");
const FAQ = createChunkedRoute(() => import("@/pages/faq"), "/faq");
const MembershipPage = createChunkedRoute(
  () => import("@/pages/MembershipPageFixed"),
  "/membership"
);
const WishlistPage = createChunkedRoute(() => import("@/pages/wishlist"), "/wishlist");

// Legal pages - grouped in low-traffic chunk
const Copyright = createChunkedRoute(() => import("@/pages/copyright"), "/copyright");
const Licensing = createChunkedRoute(() => import("@/pages/licensing"), "/licensing");
const Privacy = createChunkedRoute(() => import("@/pages/privacy"), "/privacy");
const Refund = createChunkedRoute(() => import("@/pages/refund"), "/refund");
const Terms = createChunkedRoute(() => import("@/pages/terms"), "/terms");

// Service pages - grouped in medium-traffic chunk, gated by feature flags
const CustomBeats = featureFlags.enableCustomBeats
  ? createChunkedRoute(() => import("@/pages/custom-beats"), "/custom-beats")
  : null;
const MixingMastering = featureFlags.enableMixingMastering
  ? createChunkedRoute(() => import("@/pages/mixing-mastering"), "/mixing-mastering")
  : null;
const PremiumDownloads = createChunkedRoute(
  () => import("@/pages/premium-downloads"),
  "/premium-downloads"
);
const ProductionConsultation = featureFlags.enableProductionConsultation
  ? createChunkedRoute(() => import("@/pages/production-consultation"), "/production-consultation")
  : null;
const RecordingSessions = featureFlags.enableRecordingSessions
  ? createChunkedRoute(() => import("@/pages/recording-sessions"), "/recording-sessions")
  : null;

// Auth pages - grouped in auth chunk
const ResetPasswordPage = createChunkedRoute(
  () => import("@/pages/reset-password"),
  "/reset-password"
);
const VerifyEmailPage = createChunkedRoute(() => import("@/pages/verify-email"), "/verify-email");

// Checkout pages - grouped in commerce chunk
const Checkout = createChunkedRoute(() => import("@/pages/checkout"), "/checkout");
const OrderConfirmation = createChunkedRoute(
  () => import("@/pages/order-confirmation"),
  "/order-confirmation"
);
const ClerkCheckout = createChunkedRoute(() => import("@/pages/clerk-checkout"), "/clerk-checkout");
const CheckoutSuccess = createChunkedRoute(
  () => import("@/pages/checkout-success"),
  "/checkout-success"
);
const PaymentSuccess = createChunkedRoute(
  () => import("@/pages/payment-success"),
  "/payment/success"
);
const PaymentCancel = createChunkedRoute(() => import("@/pages/payment-cancel"), "/payment/cancel");

// Admin and test pages - grouped in low-traffic admin chunk
const AdminFiles = createChunkedRoute(() => import("@/pages/admin/files"), "/admin/files");
const TestConvex = createChunkedRoute(() => import("@/pages/test-convex"), "/test-convex");
const TestMockAlert = createChunkedRoute(
  () => import("@/pages/test-mock-alert"),
  "/test-mock-alert"
);

// PaymentTestComponent removed - using Clerk native interface
import {
  MinimalLoadingFallback,
  OptimizedLoadingFallback,
  RouteLoadingFallback,
} from "@/components/loading/OptimizedLoadingFallback";
import { BundleSizeAnalyzer, PerformanceMonitor } from "@/components/monitoring/PerformanceMonitor";
import NotFound from "@/pages/not-found";
import { CacheProvider } from "./providers/CacheProvider";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/shop" component={Shop} />
      <Route path="/product/:id" component={Product} />
      <Route path="/cart" component={Cart} />
      <Route path="/clerk-checkout" component={ClerkCheckout} />
      <Route path="/order-confirmation" component={OrderConfirmation} />

      <Route path="/contact" component={Contact} />
      <Route path="/faq" component={FAQ} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/licensing" component={Licensing} />
      <Route path="/refund" component={Refund} />
      <Route path="/copyright" component={Copyright} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Login} />
      <Route path="/about" component={About} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/membership" component={MembershipPage} />
      <Route path="/wishlist" component={WishlistPage} />

      {/* Service routes - gated by feature flags */}
      {featureFlags.enableMixingMastering && MixingMastering && (
        <Route path="/mixing-mastering" component={MixingMastering} />
      )}
      {featureFlags.enableRecordingSessions && RecordingSessions && (
        <Route path="/recording-sessions" component={RecordingSessions} />
      )}
      {featureFlags.enableCustomBeats && CustomBeats && (
        <Route path="/custom-beats" component={CustomBeats} />
      )}
      {featureFlags.enableProductionConsultation && ProductionConsultation && (
        <Route path="/production-consultation" component={ProductionConsultation} />
      )}

      <Route path="/checkout" component={Checkout} />
      <Route path="/checkout-success" component={CheckoutSuccess} />
      <Route path="/payment/success" component={PaymentSuccess} />
      <Route path="/payment/cancel" component={PaymentCancel} />
      <Route path="/premium-downloads" component={PremiumDownloads} />

      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/admin/files" component={AdminFiles} />
      <Route path="/test-convex" component={TestConvex} />
      <Route path="/test-mock-alert" component={TestMockAlert} />
      {/* PaymentTestComponent removed - using Clerk native interface */}

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Remove production render logging - only log in development
  if (process.env.NODE_ENV === "development") {
    console.log("🎨 App component rendering...");
  }

  // Use interaction-based preloading
  useInteractionPreloader();

  // Initialize performance optimizations
  useEffect(() => {
    // Gate preloading and cache warming by checking if user is likely authenticated
    // This prevents unnecessary preloads for anonymous users
    const initializeOptimizations = async () => {
      // Check if user has session indicators (Clerk session, tokens, etc.)
      const hasSession =
        document.cookie.includes("__session") ||
        document.cookie.includes("__clerk") ||
        localStorage.getItem("clerk-db-jwt");

      if (hasSession) {
        // Only preload authenticated user features if session exists
        bundleOptimization.preloadCriticalComponents();
        bundleOptimization.preloadOnUserInteraction();

        // Warm cache with critical data only for authenticated users
        await warmCache().catch(error => {
          if (process.env.NODE_ENV === "development") {
            console.error("Cache warming failed:", error);
          }
        });
      } else {
        // For anonymous users, only preload public pages
        bundleOptimization.preloadPublicPages();
      }
    };

    initializeOptimizations();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <CacheProvider>
        <HelmetProvider>
          <TooltipProvider>
            <LoadingStateProvider>
              <CartProvider>
                <ScrollToTop />
                <div className="min-h-screen bg-[var(--deep-black)] text-white">
                  <a
                    href="#main-content"
                    className="skip-to-content sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-[var(--color-accent)] text-white px-4 py-2 rounded-lg z-50"
                    aria-label="Skip to main content"
                  >
                    Skip to content
                  </a>

                  {/* Global loading indicator */}
                  <GlobalLoadingIndicator />

                  {/* Offline indicator - lazy loaded and gated by feature flag */}
                  {featureFlags.enableOfflineMode && (
                    <div className="fixed bottom-4 right-4 z-40">
                      <Suspense fallback={null}>
                        <OfflineIndicator />
                      </Suspense>
                    </div>
                  )}

                  {/* Navbar always visible for navigation */}
                  <Navbar />

                  <main id="main-content" role="main">
                    <ErrorBoundary>
                      <Suspense fallback={<RouteLoadingFallback />}>
                        <Router />
                      </Suspense>
                      {/* Component preloader for route-based optimization */}
                      <ComponentPreloader />

                      {/* Performance monitoring - gated by feature flags */}
                      {featureFlags.enablePerformanceMonitoring && <PerformanceMonitor />}
                      {featureFlags.enableBundleAnalyzer && <BundleSizeAnalyzer />}
                    </ErrorBoundary>
                  </main>

                  {/* Footer - lazy loaded */}
                  <Suspense fallback={<MinimalLoadingFallback />}>
                    <Footer />
                  </Suspense>

                  {/* Mobile bottom navigation - lazy loaded */}
                  <Suspense fallback={null}>
                    <MobileBottomNav />
                  </Suspense>

                  {/* Global audio player - lazy loaded as it's heavy */}
                  <Suspense fallback={<OptimizedLoadingFallback type="audio" />}>
                    <EnhancedGlobalAudioPlayer />
                  </Suspense>

                  {/* Newsletter modal - lazy loaded and gated by feature flag */}
                  {/* Disabled for now - modal state management needs refactoring */}

                  {/* Toaster for notifications */}
                  <Toaster />
                </div>
              </CartProvider>
            </LoadingStateProvider>
          </TooltipProvider>
        </HelmetProvider>
      </CacheProvider>
    </QueryClientProvider>
  );
}

export default App;
