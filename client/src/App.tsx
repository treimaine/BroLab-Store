import { CartProvider } from "@/components/cart/cart-provider";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import {
  GlobalLoadingIndicator,
  LoadingStateProvider,
} from "@/components/providers/LoadingStateProvider";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@clerk/clerk-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useEffect, useState } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Route, Switch, useLocation } from "wouter";
import { queryClient, warmCache } from "./lib/queryClient";

// Critical components - loaded immediately for core UX
import { Navbar } from "@/components/layout/navbar";

import { ComponentPreloader } from "@/components/loading/ComponentPreloader";
import { isFeatureEnabled } from "@/config/featureFlags";
import { AdminRoutes, LegalRoutes, ServiceRoutes } from "@/config/routeChunks";
import { useDeferredMountStaggered } from "@/hooks/useDeferredMount";
import { useInteractionPreloader } from "@/hooks/useInteractionPreloader";
import {
  bundleOptimization,
  createLazyComponent,
  createRouteLazyComponent,
} from "@/utils/lazyLoading";

// Layout components - lazy loaded for better performance
const Footer = createLazyComponent(async () => {
  const module = await import("@/components/layout/footer");
  return { default: module.Footer };
});
const MobileBottomNav = createLazyComponent(async () => {
  const module = await import("@/components/layout/MobileBottomNav");
  return { default: module.MobileBottomNav };
});
const OfflineIndicator = createLazyComponent(async () => {
  const module = await import("@/components/loading/OfflineIndicator");
  return { default: module.OfflineIndicator };
});
const NewsletterModal = createLazyComponent(async () => {
  const module = await import("@/components/newsletter/NewsletterModal");
  return { default: module.NewsletterModal };
});

// Audio player - lazy loaded as it's heavy and not immediately needed
const EnhancedGlobalAudioPlayer = createLazyComponent(
  async () => {
    const module = await import("@/components/audio/EnhancedGlobalAudioPlayer");
    return { default: module.EnhancedGlobalAudioPlayer };
  },
  { preloadDelay: 2000 } // Preload after 2 seconds
);

// Sonaar Modern Player (Example 097 style) - lazy loaded
const SonaarModernPlayer = createLazyComponent(
  async () => {
    const module = await import("@/components/audio/SonaarModernPlayer");
    return { default: module.SonaarModernPlayer };
  },
  { preloadDelay: 2000 }
);

// Core pages - only Home loaded immediately, others lazy loaded for better initial load
import Home from "@/pages/home";

// High-priority pages - route-based lazy loading with preloading
const Shop = createRouteLazyComponent(() => import("@/pages/shop"), "/shop");
const Product = createRouteLazyComponent(() => import("@/pages/product"), "/product");
const Cart = createRouteLazyComponent(() => import("@/pages/cart"), "/cart");
const Login = createRouteLazyComponent(() => import("@/pages/login"), "/login");
const Dashboard = createRouteLazyComponent(() => import("@/pages/dashboard"), "/dashboard");

// Secondary pages - route-based lazy loading with error handling
const About = createRouteLazyComponent(() => import("@/pages/about"), "/about");
const Contact = createRouteLazyComponent(() => import("@/pages/contact"), "/contact");
const FAQ = createRouteLazyComponent(() => import("@/pages/faq"), "/faq");
const MembershipPage = createRouteLazyComponent(
  () => import("@/pages/MembershipPageFixed"),
  "/membership"
);
const WishlistPage = createRouteLazyComponent(() => import("@/pages/wishlist"), "/wishlist");

// Legal pages - grouped via feature flags (low-traffic routes)
// Using LegalRoutes from routeChunks for optimized bundling

// Service pages - grouped via feature flags (medium-traffic routes)
// Using ServiceRoutes from routeChunks for optimized bundling

// Auth pages - route-based lazy loading with error handling
const ResetPasswordPage = createRouteLazyComponent(
  () => import("@/pages/reset-password"),
  "/reset-password"
);
const VerifyEmailPage = createRouteLazyComponent(
  () => import("@/pages/verify-email"),
  "/verify-email"
);

// Checkout pages - route-based lazy loading with error handling
const Checkout = createRouteLazyComponent(() => import("@/pages/checkout"), "/checkout");
const OrderConfirmation = createRouteLazyComponent(
  () => import("@/pages/order-confirmation"),
  "/order-confirmation"
);
const ClerkCheckout = createRouteLazyComponent(
  () => import("@/pages/clerk-checkout"),
  "/clerk-checkout"
);
const CheckoutSuccess = createRouteLazyComponent(
  () => import("@/pages/checkout-success"),
  "/checkout-success"
);
const PaymentSuccess = createRouteLazyComponent(
  () => import("@/pages/payment-success"),
  "/payment/success"
);
const PaymentCancel = createRouteLazyComponent(
  () => import("@/pages/payment-cancel"),
  "/payment/cancel"
);

// Admin and test pages - grouped via feature flags (low-traffic routes)
// Using AdminRoutes from routeChunks for optimized bundling

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
  // Feature flags for route groups
  const isLegalEnabled = isFeatureEnabled("enableLegalRoutes");
  const isAdminEnabled = isFeatureEnabled("enableAdminRoutes");
  const isServiceEnabled = isFeatureEnabled("enableServiceRoutes");

  return (
    <Switch>
      {/* Core routes - always enabled */}
      <Route path="/" component={Home} />
      <Route path="/shop" component={Shop} />
      <Route path="/product/:id" component={Product} />
      <Route path="/cart" component={Cart} />
      <Route path="/clerk-checkout" component={ClerkCheckout} />
      <Route path="/order-confirmation" component={OrderConfirmation} />

      {/* Info routes */}
      <Route path="/contact" component={Contact} />
      <Route path="/faq" component={FAQ} />
      <Route path="/about" component={About} />
      <Route path="/membership" component={MembershipPage} />
      <Route path="/wishlist" component={WishlistPage} />

      {/* Legal routes - grouped for low-traffic optimization */}
      {isLegalEnabled && (
        <>
          <Route path="/terms" component={LegalRoutes.Terms} />
          <Route path="/privacy" component={LegalRoutes.Privacy} />
          <Route path="/licensing" component={LegalRoutes.Licensing} />
          <Route path="/refund" component={LegalRoutes.Refund} />
          <Route path="/copyright" component={LegalRoutes.Copyright} />
        </>
      )}

      {/* Auth routes */}
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />

      {/* Service routes - grouped for medium-traffic optimization */}
      {isServiceEnabled && (
        <>
          <Route path="/mixing-mastering" component={ServiceRoutes.MixingMastering} />
          <Route path="/recording-sessions" component={ServiceRoutes.RecordingSessions} />
          <Route path="/custom-beats" component={ServiceRoutes.CustomBeats} />
          <Route path="/production-consultation" component={ServiceRoutes.ProductionConsultation} />
          <Route path="/premium-downloads" component={ServiceRoutes.PremiumDownloads} />
        </>
      )}

      {/* Checkout routes */}
      <Route path="/checkout" component={Checkout} />
      <Route path="/checkout-success" component={CheckoutSuccess} />
      <Route path="/payment/success" component={PaymentSuccess} />
      <Route path="/payment/cancel" component={PaymentCancel} />

      {/* Admin routes - grouped for low-traffic optimization */}
      {isAdminEnabled && (
        <>
          <Route path="/admin/files" component={AdminRoutes.AdminFiles} />
          <Route path="/test-convex" component={AdminRoutes.TestConvex} />
          <Route path="/test-mock-alert" component={AdminRoutes.TestMockAlert} />
        </>
      )}

      <Route component={NotFound} />
    </Switch>
  );
}

// Custom hook for newsletter modal with lazy loading
function useNewsletterModalLazy() {
  const [isOpen, setIsOpen] = useState(false);
  const closeModal = () => setIsOpen(false);
  return { isOpen, closeModal };
}

// Wrapper component for global audio player that checks current route
function GlobalAudioPlayerWrapper(): JSX.Element | null {
  const [location] = useLocation();

  // Hide global audio player on product pages (product page has its own player)
  const isProductPage = location.startsWith("/product/");

  if (isProductPage) {
    return null;
  }

  return (
    <Suspense fallback={<OptimizedLoadingFallback type="audio" />}>
      {isFeatureEnabled("enableSonaarModernPlayer") ? (
        <SonaarModernPlayer />
      ) : (
        <EnhancedGlobalAudioPlayer />
      )}
    </Suspense>
  );
}

function App() {
  const { isOpen, closeModal } = useNewsletterModalLazy();
  const { isSignedIn, isLoaded } = useAuth();

  // Defer non-critical component mounting after main content renders
  // Staggered mounting: OfflineIndicator (0ms), MobileBottomNav (150ms), AudioPlayer (300ms)
  const [mountOffline, mountMobileNav, mountAudioPlayer] = useDeferredMountStaggered(3, 150);

  // Use interaction-based preloading
  useInteractionPreloader();

  // Initialize performance optimizations (non-auth dependent)
  useEffect(() => {
    // Preload critical components after initial render
    bundleOptimization.preloadCriticalComponents();

    // Setup user interaction-based preloading
    bundleOptimization.preloadOnUserInteraction();
  }, []);

  // Warm cache only when authenticated
  useEffect(() => {
    // Wait for auth to be loaded and user to be signed in
    if (!isLoaded || !isSignedIn) {
      return;
    }

    warmCache().catch(error => {
      if (import.meta.env.DEV) {
        console.error("Cache warming failed:", error);
      }
    });
  }, [isLoaded, isSignedIn]);

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

                  {/* Offline indicator - lazy loaded and deferred */}
                  {mountOffline && (
                    <div className="fixed bottom-4 right-4 z-40">
                      <Suspense fallback={null}>
                        <OfflineIndicator showDetails />
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

                      {/* Performance monitoring (development only) */}
                      {process.env.NODE_ENV === "development" && (
                        <>
                          <PerformanceMonitor />
                          <BundleSizeAnalyzer />
                        </>
                      )}
                    </ErrorBoundary>
                  </main>

                  {/* Footer - lazy loaded */}
                  <Suspense fallback={<MinimalLoadingFallback />}>
                    <Footer />
                  </Suspense>

                  {/* Mobile bottom navigation - lazy loaded and deferred */}
                  {mountMobileNav && (
                    <Suspense fallback={null}>
                      <MobileBottomNav />
                    </Suspense>
                  )}

                  {/* Global audio player - lazy loaded, deferred as it's heavy */}
                  {/* Hidden on product pages where ProductArtworkPlayer handles playback */}
                  {mountAudioPlayer && <GlobalAudioPlayerWrapper />}

                  {/* Newsletter modal - lazy loaded */}
                  {isOpen && (
                    <Suspense fallback={null}>
                      <NewsletterModal isOpen={isOpen} onClose={closeModal} />
                    </Suspense>
                  )}

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
