import { CartProvider } from "@/components/cart-provider";
import { EnhancedGlobalAudioPlayer } from "@/components/EnhancedGlobalAudioPlayer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { LoadingFallback } from "@/components/LoadingFallback";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { NewsletterModal, useNewsletterModal } from "@/components/NewsletterModal";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { GlobalLoadingIndicator, LoadingStateProvider } from "./components/LoadingStateProvider";
// AuthLoading removed to fix infinite loading issues
import { lazy, Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Route, Switch } from "wouter";
import { queryClient } from "./lib/queryClient";

// Core pages - loaded immediately for better UX
import Cart from "@/pages/cart";
import Dashboard from "@/pages/dashboard";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Product from "@/pages/product";
import Shop from "@/pages/shop";

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
      {/* PaymentTestComponent removed - using Clerk native interface */}

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { isOpen, closeModal } = useNewsletterModal();

  console.log("🎨 App component rendering...");

  return (
    <QueryClientProvider client={queryClient}>
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

                {/* Offline indicator */}
                <div className="fixed bottom-4 right-4 z-40">
                  <OfflineIndicator showDetails />
                </div>

                {/* Navbar always visible */}
                <Navbar />

                <main id="main-content" role="main">
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback message="Loading page..." />}>
                      <Router />
                    </Suspense>
                  </ErrorBoundary>
                </main>

                <Footer />

                {/* Mobile bottom navigation */}
                <MobileBottomNav />

                {/* Global audio player */}
                <EnhancedGlobalAudioPlayer />

                {/* Newsletter modal */}
                <NewsletterModal isOpen={isOpen} onClose={closeModal} />

                {/* Toaster for notifications */}
                <Toaster />
              </div>
            </CartProvider>
          </LoadingStateProvider>
        </TooltipProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;
