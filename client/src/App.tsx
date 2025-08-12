import { CartProvider } from "@/components/cart-provider";
import { ClerkSyncProvider } from "@/components/ClerkSyncProvider";
import { EnhancedGlobalAudioPlayer } from "@/components/EnhancedGlobalAudioPlayer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { LoadingFallback } from "@/components/LoadingFallback";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { NewsletterModal, useNewsletterModal } from "@/components/NewsletterModal";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthLoading } from "convex/react";
import { lazy, Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Route, Switch } from "wouter";
import { queryClient } from "./lib/queryClient";

// Pages
import Cart from "@/pages/cart";
import Home from "@/pages/home";
import OrderConfirmation from "@/pages/order-confirmation";
import Product from "@/pages/product";
import Shop from "@/pages/shop";

import About from "@/pages/about";
import Contact from "@/pages/contact";
import Copyright from "@/pages/copyright";
import Dashboard from "@/pages/dashboard";
import FAQ from "@/pages/faq";
import Licensing from "@/pages/licensing";
import Login from "@/pages/login";
import MembershipPage from "@/pages/MembershipPage";
import Privacy from "@/pages/privacy";
import Refund from "@/pages/refund";
import Terms from "@/pages/terms";
import WishlistPage from "@/pages/wishlist";

import CustomBeats from "@/pages/custom-beats";
import MixingMastering from "@/pages/mixing-mastering";
import PremiumDownloads from "@/pages/premium-downloads";
import ProductionConsultation from "@/pages/production-consultation";
import RecordingSessions from "@/pages/recording-sessions";
import ResetPasswordPage from "@/pages/reset-password";
import VerifyEmailPage from "@/pages/verify-email";

import { PaymentTestComponent } from "@/components/PaymentTestComponent";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/shop" component={Shop} />
      <Route path="/product/:id" component={Product} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={lazy(() => import("./pages/checkout"))} />
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
      <Route path="/premium-downloads" component={PremiumDownloads} />
      <Route path="/recording-sessions" component={RecordingSessions} />
      <Route path="/custom-beats" component={CustomBeats} />
      <Route path="/production-consultation" component={ProductionConsultation} />

      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/admin/files" component={lazy(() => import("./pages/admin/files"))} />
      <Route path="/test-payment" component={PaymentTestComponent} />

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
          <CartProvider>
            <ClerkSyncProvider>
              <ScrollToTop />
              <div className="min-h-screen bg-[var(--deep-black)] text-white">
                <a
                  href="#main-content"
                  className="skip-to-content sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-[var(--color-accent)] text-white px-4 py-2 rounded-lg z-50"
                  aria-label="Skip to main content"
                >
                  Skip to content
                </a>

                {/* Navbar always visible */}
                <Navbar />

                {/* Loading state */}
                <AuthLoading>
                  <LoadingFallback message="Loading BroLab..." />
                </AuthLoading>

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
            </ClerkSyncProvider>
          </CartProvider>
        </TooltipProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;
