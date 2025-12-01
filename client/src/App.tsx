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
import { Suspense, useEffect, useState } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Route, Switch } from "wouter";
import { queryClient, warmCache } from "./lib/queryClient";

// Critical components - loaded immediately for core UX
import { Navbar } from "@/components/layout/navbar";

import { ComponentPreloader } from "@/components/loading/ComponentPreloader";
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
const Copyright = createRouteLazyComponent(() => import("@/pages/copyright"), "/copyright");
const FAQ = createRouteLazyComponent(() => import("@/pages/faq"), "/faq");
const Licensing = createRouteLazyComponent(() => import("@/pages/licensing"), "/licensing");
const MembershipPage = createRouteLazyComponent(
  () => import("@/pages/MembershipPageFixed"),
  "/membership"
);
const Privacy = createRouteLazyComponent(() => import("@/pages/privacy"), "/privacy");
const Refund = createRouteLazyComponent(() => import("@/pages/refund"), "/refund");
const Terms = createRouteLazyComponent(() => import("@/pages/terms"), "/terms");
const WishlistPage = createRouteLazyComponent(() => import("@/pages/wishlist"), "/wishlist");

// Service pages - route-based lazy loading with error handling
const CustomBeats = createRouteLazyComponent(() => import("@/pages/custom-beats"), "/custom-beats");
const MixingMastering = createRouteLazyComponent(
  () => import("@/pages/mixing-mastering"),
  "/mixing-mastering"
);
const PremiumDownloads = createRouteLazyComponent(
  () => import("@/pages/premium-downloads"),
  "/premium-downloads"
);
const ProductionConsultation = createRouteLazyComponent(
  () => import("@/pages/production-consultation"),
  "/production-consultation"
);
const RecordingSessions = createRouteLazyComponent(
  () => import("@/pages/recording-sessions"),
  "/recording-sessions"
);

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

// Admin and test pages - route-based lazy loading with error handling
const AdminFiles = createRouteLazyComponent(() => import("@/pages/admin/files"), "/admin/files");
const TestConvex = createRouteLazyComponent(() => import("@/pages/test-convex"), "/test-convex");
const TestMockAlert = createRouteLazyComponent(
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

      <Route path="/mixing-mastering" component={MixingMastering} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/checkout-success" component={CheckoutSuccess} />
      <Route path="/payment/success" component={PaymentSuccess} />
      <Route path="/payment/cancel" component={PaymentCancel} />
      <Route path="/premium-downloads" component={PremiumDownloads} />
      <Route path="/recording-sessions" component={RecordingSessions} />
      <Route path="/custom-beats" component={CustomBeats} />
      <Route path="/production-consultation" component={ProductionConsultation} />

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

// Custom hook for newsletter modal with lazy loading
function useNewsletterModalLazy() {
  const [isOpen, setIsOpen] = useState(false);
  const closeModal = () => setIsOpen(false);
  return { isOpen, closeModal };
}

function App() {
  const { isOpen, closeModal } = useNewsletterModalLazy();

  // Use interaction-based preloading
  useInteractionPreloader();

  // Initialize performance optimizations
  useEffect(() => {
    // Preload critical components after initial render
    bundleOptimization.preloadCriticalComponents();

    // Setup user interaction-based preloading
    bundleOptimization.preloadOnUserInteraction();

    // Warm cache with critical data
    warmCache().catch(error => {
      if (import.meta.env.DEV) {
        console.error("Cache warming failed:", error);
      }
    });
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
