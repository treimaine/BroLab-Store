import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ClerkErrorBoundary } from "./components/auth/ClerkErrorBoundary";
import "./index.css";
import { initializePerformanceMonitoring } from "./lib/performanceMonitoring";
import "./styles/z-index.css";
import { optimizeScrolling, preloadCriticalResources } from "./utils/performance";

// Initialize performance optimizations with post-interaction trigger
// Defer eager performance hooks to avoid blocking initial mount
const initializePerformanceOptimizations = () => {
  preloadCriticalResources();
  optimizeScrolling();
  initializePerformanceMonitoring();
};

// Trigger after first user interaction or after idle callback
const triggerPerformanceInit = () => {
  if ("requestIdleCallback" in globalThis) {
    requestIdleCallback(() => initializePerformanceOptimizations(), { timeout: 2000 });
  } else {
    setTimeout(initializePerformanceOptimizations, 100);
  }
};

// Listen for first interaction
for (const event of ["click", "scroll", "keydown", "touchstart"]) {
  globalThis.addEventListener(event, triggerPerformanceInit, { once: true, passive: true });
}

// Fallback: initialize after 3 seconds if no interaction
setTimeout(triggerPerformanceInit, 3000);

// Register service worker with improved update flow
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  globalThis.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(registration => {
        if (import.meta.env.DEV) {
          console.log("✅ Service Worker registered:", registration.scope);
        }

        // Listen for updates and auto-activate
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // Auto-activate new service worker without user prompt
                newWorker.postMessage({ type: "SKIP_WAITING" });
                // Reload will happen automatically via controllerchange event
              }
            });
          }
        });

        // Check for updates periodically (every 60 minutes)
        setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000
        );
      })
      .catch(error => {
        if (import.meta.env.DEV) {
          console.error("❌ Service Worker registration failed:", error);
        }
      });

    // Handle controller change (new service worker activated)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      globalThis.location.reload();
    });
  });
}

// Simple Convex initialization
import { ConvexReactClient } from "convex/react";
const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) {
  throw new Error("Missing Convex URL");
}
const convex = new ConvexReactClient(convexUrl);

// Clerk configuration with graceful error handling
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Graceful error boundary for missing env vars
if (!clerkPublishableKey) {
  // Render maintenance/error boundary instead of throwing
  const errorMessage = "Missing VITE_CLERK_PUBLISHABLE_KEY environment variable";

  createRoot(document.getElementById("root")!).render(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        padding: "2rem",
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ color: "#ef4444", marginBottom: "1rem" }}>Configuration Error</h1>
      <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
        The application is missing required environment configuration.
      </p>
      <code
        style={{
          background: "#f3f4f6",
          padding: "0.5rem 1rem",
          borderRadius: "0.375rem",
          fontSize: "0.875rem",
        }}
      >
        {errorMessage}
      </code>
      <p style={{ color: "#6b7280", marginTop: "1rem", fontSize: "0.875rem" }}>
        Please check your .env.local file and ensure VITE_CLERK_PUBLISHABLE_KEY is set.
      </p>
    </div>
  );
  throw new Error(errorMessage); // Still throw for logging purposes
}

// Verify Clerk publishable key format (pk_test_* or pk_live_*)
const isValidClerkKey = /^pk_(test|live)_/.test(clerkPublishableKey);
if (!isValidClerkKey) {
  const errorMessage = "Invalid Clerk Publishable Key format. Expected pk_test_* or pk_live_*";

  createRoot(document.getElementById("root")!).render(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        padding: "2rem",
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ color: "#ef4444", marginBottom: "1rem" }}>Configuration Error</h1>
      <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
        Invalid Clerk Publishable Key format detected.
      </p>
      <code
        style={{
          background: "#f3f4f6",
          padding: "0.5rem 1rem",
          borderRadius: "0.375rem",
          fontSize: "0.875rem",
        }}
      >
        Expected: pk_test_* or pk_live_*
      </code>
      <p style={{ color: "#6b7280", marginTop: "1rem", fontSize: "0.875rem" }}>
        Please verify your VITE_CLERK_PUBLISHABLE_KEY in .env.local
      </p>
    </div>
  );
  throw new Error(errorMessage);
}

// Remove or gate startup logs behind feature flag
if (import.meta.env.DEV) {
  console.log("🚀 Starting React application...");
  console.log("📡 Convex URL:", convexUrl);
  console.log("🔐 Clerk configured with native PricingTable");
}

createRoot(document.getElementById("root")!).render(
  <ClerkErrorBoundary>
    <ClerkProvider publishableKey={clerkPublishableKey} telemetry={false}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <App />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </ClerkErrorBoundary>
);
