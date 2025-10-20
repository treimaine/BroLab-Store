// Example component demonstrating analytics usage

import AnalyticsDashboard from "@/components/dashboard/AnalyticsDashboard";
import ConversionFunnelTracker from "@/components/monitoring/ConversionFunnelTracker";
import AnalyticsProvider from "@/components/providers/AnalyticsProvider";
import { useAnalytics } from "@/hooks/useAnalytics";
import React, { useEffect, useState } from "react";
import "../styles/analytics-dashboard.css";
import "../styles/privacy-banner.css";

// Example product page component with analytics
const ProductPage: React.FC = () => {
  const { trackInteraction, trackPageView, trackClick, trackConversion, isTrackingEnabled } =
    useAnalytics();

  const [product] = useState({
    id: "beat-123",
    name: "Trap Beat - Fire",
    price: 29.99,
    category: "trap",
  });

  useEffect(() => {
    // Track page view when component mounts
    trackPageView("/product/beat-123", {
      productId: product.id,
      productName: product.name,
      category: product.category,
      price: product.price,
    });
  }, [trackPageView, product]);

  const handleAddToCart = async () => {
    // Track add to cart interaction
    await trackInteraction("add_to_cart", "product", "add_to_cart", {
      productId: product.id,
      productName: product.name,
      price: product.price,
    });

    // Track funnel step
    await trackConversion("ecommerce_default", "add_to_cart", product.price);

    // Dispatch custom event for funnel tracker
    window.dispatchEvent(
      new CustomEvent("analytics-interaction", {
        detail: {
          action: "add_to_cart",
          component: "product",
          value: product.price,
        },
      })
    );

    alert("Added to cart! (Analytics tracked)");
  };

  const handlePlayPreview = async () => {
    await trackClick("play-preview", {
      productId: product.id,
      duration: 30, // 30 second preview
    });
  };

  const handleShare = async () => {
    await trackInteraction("share", "product", "share", {
      productId: product.id,
      shareMethod: "copy-link",
    });
  };

  return (
    <div className="product-page" style={{ padding: "2rem", maxWidth: "600px" }}>
      <h1>{product.name}</h1>
      <p>Price: ${product.price}</p>
      <p>Category: {product.category}</p>

      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        <button onClick={handlePlayPreview} className="preview-btn">
          🎵 Play Preview
        </button>
        <button onClick={handleAddToCart} className="add-to-cart-btn">
          🛒 Add to Cart
        </button>
        <button onClick={handleShare} className="share-btn">
          📤 Share
        </button>
      </div>

      {isTrackingEnabled && (
        <p style={{ marginTop: "1rem", fontSize: "0.875rem", color: "#666" }}>
          ✅ Analytics tracking is enabled
        </p>
      )}
    </div>
  );
};

// Example checkout page
const CheckoutPage: React.FC = () => {
  const { trackPageView, trackConversion } = useAnalytics();
  const [step, setStep] = useState(1);

  useEffect(() => {
    trackPageView("/checkout", { checkoutStep: step });

    if (step === 1) {
      // Track checkout start
      trackConversion("ecommerce_default", "checkout_start");

      window.dispatchEvent(
        new CustomEvent("analytics-interaction", {
          detail: {
            action: "checkout_start",
            component: "checkout",
          },
        })
      );
    }
  }, [trackPageView, trackConversion, step]);

  const handlePurchase = async () => {
    // Track purchase completion
    await trackConversion("ecommerce_default", "purchase_complete", 29.99);

    window.dispatchEvent(
      new CustomEvent("analytics-interaction", {
        detail: {
          action: "purchase",
          component: "checkout",
          value: 29.99,
        },
      })
    );

    alert("Purchase completed! (Analytics tracked)");
  };

  return (
    <div className="checkout-page" style={{ padding: "2rem", maxWidth: "600px" }}>
      <h1>Checkout</h1>
      <div style={{ marginBottom: "2rem" }}>
        <div>Step {step} of 3</div>
        <div style={{ background: "#f0f0f0", height: "8px", borderRadius: "4px" }}>
          <div
            style={{
              background: "#3b82f6",
              height: "100%",
              width: `${(step / 3) * 100}%`,
              borderRadius: "4px",
              transition: "width 0.3s",
            }}
          />
        </div>
      </div>

      {step === 1 && (
        <div>
          <h2>Billing Information</h2>
          <button onClick={() => setStep(2)}>Continue to Payment</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2>Payment Method</h2>
          <button onClick={() => setStep(3)}>Continue to Review</button>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2>Review Order</h2>
          <p>Trap Beat - Fire: $29.99</p>
          <button onClick={handlePurchase} style={{ background: "#10b981", color: "white" }}>
            Complete Purchase
          </button>
        </div>
      )}
    </div>
  );
};

// Main example component
const AnalyticsExample: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<"product" | "checkout" | "dashboard">("product");

  return (
    <AnalyticsProvider requireConsent={true} showBanner={true}>
      <div className="analytics-example">
        <nav style={{ padding: "1rem", borderBottom: "1px solid #ccc" }}>
          <h1>Analytics System Demo</h1>
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <button
              onClick={() => setCurrentPage("product")}
              style={{
                background: currentPage === "product" ? "#3b82f6" : "#f3f4f6",
                color: currentPage === "product" ? "white" : "black",
              }}
            >
              Product Page
            </button>
            <button
              onClick={() => setCurrentPage("checkout")}
              style={{
                background: currentPage === "checkout" ? "#3b82f6" : "#f3f4f6",
                color: currentPage === "checkout" ? "white" : "black",
              }}
            >
              Checkout
            </button>
            <button
              onClick={() => setCurrentPage("dashboard")}
              style={{
                background: currentPage === "dashboard" ? "#3b82f6" : "#f3f4f6",
                color: currentPage === "dashboard" ? "white" : "black",
              }}
            >
              Analytics Dashboard
            </button>
          </div>
        </nav>

        <main>
          {currentPage === "product" && <ProductPage />}
          {currentPage === "checkout" && <CheckoutPage />}
          {currentPage === "dashboard" && <AnalyticsDashboard />}
        </main>

        {/* Conversion funnel tracker (hidden component) */}
        <ConversionFunnelTracker
          funnelId="ecommerce_default"
          autoTrack={true}
          onStepComplete={(stepId, funnelId) => {
            console.log(`Funnel step completed: ${stepId} in ${funnelId}`);
          }}
          onFunnelComplete={funnelId => {
            console.log(`Funnel completed: ${funnelId}`);
          }}
        />
      </div>
    </AnalyticsProvider>
  );
};

export default AnalyticsExample;
