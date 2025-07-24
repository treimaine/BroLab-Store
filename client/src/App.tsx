import { Switch, Route } from "wouter";
import { lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/components/cart-provider";
import { AuthProvider } from "@/hooks/useAuth";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { NewsletterModal, useNewsletterModal } from "@/components/NewsletterModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EnhancedGlobalAudioPlayer } from "@/components/EnhancedGlobalAudioPlayer";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { SkipLink } from "@/components/ui/skip-link";
import { ScrollToTop } from "@/components/ScrollToTop";

// Pages
import Home from "@/pages/home";
import Shop from "@/pages/shop";
import Product from "@/pages/product";
import Cart from "@/pages/cart";
import EnhancedCheckout from "@/pages/enhanced-checkout";
import OrderConfirmation from "@/pages/order-confirmation";

import Contact from "@/pages/contact";
import FAQ from "@/pages/faq";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import Licensing from "@/pages/licensing";
import Refund from "@/pages/refund";
import Copyright from "@/pages/copyright";
import Login from "@/pages/login";
import About from "@/pages/about";
import Dashboard from "@/pages/dashboard";
import MembershipPage from "@/pages/MembershipPage";

import MixingMastering from "@/pages/mixing-mastering";
import RecordingSessions from "@/pages/recording-sessions";
import CustomBeats from "@/pages/custom-beats";
import ProductionConsultation from "@/pages/production-consultation";
import VerifyEmailPage from "@/pages/verify-email";
import ResetPasswordPage from "@/pages/reset-password";


import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/shop" component={Shop} />
      <Route path="/product/:id" component={Product} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={EnhancedCheckout} />
      <Route path="/enhanced-checkout" component={EnhancedCheckout} />
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

      <Route path="/mixing-mastering" component={MixingMastering} />
      <Route path="/recording-sessions" component={RecordingSessions} />
      <Route path="/custom-beats" component={CustomBeats} />
      <Route path="/production-consultation" component={ProductionConsultation} />
      
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/admin/files" component={lazy(() => import('./pages/admin/files'))} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { isOpen, closeModal } = useNewsletterModal();

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <TooltipProvider>
          <AuthProvider>
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
            <Navbar />
            <main id="main-content" role="main">
              <ErrorBoundary>
                <Router />
              </ErrorBoundary>
            </main>
            <Footer />
            
            <EnhancedGlobalAudioPlayer />
            <MobileBottomNav />
            <NewsletterModal isOpen={isOpen} onClose={closeModal} />
            <Toaster />
          </div>
            </CartProvider>
          </AuthProvider>
        </TooltipProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;
