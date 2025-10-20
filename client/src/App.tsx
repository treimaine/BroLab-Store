import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { CartProvider } from "@/components/cart/cart-provider";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import React, { Suspense, lazy, useState } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Route, Switch } from "wouter";
import { GlobalLoadingIndicator, LoadingStateProvider } from "@/components/providers/LoadingStateProvider";
import { queryClient, warmCache } from "./lib/queryClient";

// Critical components - loaded immediately for core UX
import { Navbar } from "@/components/layout/navbar";

import { ComponentPreloader, useInteractionPreloader } from "@/components/loading/ComponentPreloader";
import {
  bundleOptimization,
  createLazyComponent,
  createRouteLazyComponent,
} from "@/utils/lazyLoading";

// Layout components - lazy loaded for better performance
const Footer = createLazyComponent(() =>
  import("@/components/layout/footer").then(module => ({ default: module.Footer }))
);
const MobileBottomNav = createLazyComponent(() =>
  import("@/components/layout/MobileBottomNav").then(module => ({ default: module.MobileBottomNav }))
);
const OfflineIndicator = createLazyComponent(() =>
  import("@/components/loading/OfflineIndicator").then(module => ({ default: module.OfflineIndicator }))
);
const NewsletterModal = createLazyComponent(() =>
  import("@/components/newsletter/NewsletterModal").then(module => ({ default: module.NewsletterModal }))
);

// Audio player - lazy loaded as it's heavy and not immediately needed
const EnhancedGlobalAudioPlayer = createLazyComponent(
  () =>
    import("@/components/audio/EnhancedGlobalAudioPlayer").then(module => ({
      default: module.EnhancedGlobalAudioPlayer,
    })),
  { preloadDelay: 2000 } // Preload after 2 seconds
);

// Core pages - only Home loaded immediately, others lazy loaded for better initial load
import Home from "@/pages/home";

// High-priority pages - route-based lazy loading with preloading
const Shop = createRouteLazyComponent(() => import("@/pages/shop"), "/shop");
const Product = createRouteLazyComponent(() => import("@/pages/product"), "/product");
const Cart = createRouteLazyComponent(() => import("@/pages/cart"), "/cart");
const Login = createRouteLazyComponent(() => import("@/pages/login"), "/login");
const Dashboard = createRouteLazyComponent(() => import("@/pages/dashboard"), "/dashboard");

// Secondary pages - lazy loaded for better bundle splitting
const About = lazy(() => import("@/pages/about"));
const Contact = lazy(() => import("@/pages/contact"));
const Copyright = lazy(() => import("@/pages/copyright"));
const FAQ = lazy(() => import("@/pages/faq"));
const Licensing = lazy(() => import("@/pages/licensing"));
const MembershipPage = lazy(() => import("@/pages/MembershipPageFixed"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Refund = lazy(() => import("@/pages/refund"));
const Terms = lazy(() => import("@/pages/terms"));
const WishlistPage = lazy(() => import("@/pages/wishlist"));

// Service pages - lazy loaded
const CustomBeats = lazy(() => import("@/pages/custom-beats"));
const MixingMastering = lazy(() => import("@/pages/mixing-mastering"));
const PremiumDownloads = lazy(() => import("@/pages/premium-downloads"));
const ProductionConsultation = lazy(() => import("@/pages/production-consultation"));
const RecordingSessions = lazy(() => import("@/pages/recording-sessions"));

// Auth pages - lazy loaded
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const VerifyEmailPage = lazy(() => import("@/pages/verify-email"));

// Checkout pages - lazy loaded as they're less frequently accessed
const Checkout = lazy(() => import("@/pages/checkout"));
const OrderConfirmation = lazy(() => import("@/pages/order-confirmation"));

// PaymentTestComponent removed - using Clerk native interface
import NotFound from "@/pages/not-found";
import {
  MinimalLoadingFallback,
  OptimizedLoadingFallback,
  RouteLoadingFallback,
} from "@/components/loading/OptimizedLoadingFallback";
import { BundleSizeAnalyzer, PerformanceMonitor } from "@/components/monitoring/PerformanceMonitor";
import { CacheProvider } from "./providers/CacheProvider";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/shop" component={Shop} />
      <Route path="/product/:id" component={Product} />
      <Route path="/cart" component={Cart} />
      <Route path="/clerk-checkout" component={lazy(() => import("./pages/clerk-checkout"))} />
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

      <Route path="/mixing-mastering" component={MixingMastering} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/checkout-success" component={lazy(() => import("./pages/checkout-success"))} />
      <Route path="/payment/success" component={lazy(() => import("./pages/payment-success"))} />
      <Route path="/payment/cancel" component={lazy(() => import("./pages/payment-cancel"))} />
      <Route path="/premium-downloads" component={PremiumDownloads} />
      <Route path="/recording-sessions" component={RecordingSessions} />
      <Route path="/custom-beats" component={CustomBeats} />
      <Route path="/production-consultation" component={ProductionConsultation} />

      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/admin/files" component={lazy(() => import("./pages/admin/files"))} />
      <Route path="/test-convex" component={lazy(() => import("./pages/test-convex"))} />
      <Route path="/test-mock-alert" component={lazy(() => import("./pages/test-mock-alert"))} />
      {/* PaymentTestComponent removed - using Clerk native interface */}

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

function App() {
  const { isOpen, closeModal } = useNewsletterModalLazy();

  console.log("🎨 App component rendering...");

  // Use interaction-based preloading
  useInteractionPreloader();

  // Initialize performance optimizations
  React.useEffect(() => {
    // Preload critical components after initial render
    bundleOptimization.preloadCriticalComponents();

    // Setup user interaction-based preloading
    bundleOptimization.preloadOnUserInteraction();

    // Warm cache with critical data
    warmCache().catch(console.error);
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

                  {/* Offline indicator - lazy loaded */}
                  <div className="fixed bottom-4 right-4 z-40">
                    <Suspense fallback={null}>
                      <OfflineIndicator showDetails />
                    </Suspense>
                  </div>

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

                  {/* Mobile bottom navigation - lazy loaded */}
                  <Suspense fallback={null}>
                    <MobileBottomNav />
                  </Suspense>

                  {/* Global audio player - lazy loaded as it's heavy */}
                  <Suspense fallback={<OptimizedLoadingFallback type="audio" />}>
                    <EnhancedGlobalAudioPlayer />
                  </Suspense>

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
