import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializePerformanceMonitoring } from "./lib/performanceMonitoring";
import "./styles/z-index.css";
import { optimizeScrolling, preloadCriticalResources } from "./utils/performance";

// Initialize performance optimizations
preloadCriticalResources();
optimizeScrolling();
initializePerformanceMonitoring(); // PHASE 4 advanced monitoring

// Register service worker for offline functionality
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(registration => {
        console.log("✅ Service Worker registered successfully:", registration.scope);

        // Listen for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New service worker is available
                console.log("🔄 New service worker available, will activate on next page load");
              }
            });
          }
        });
      })
      .catch(error => {
        console.error("❌ Service Worker registration failed:", error);
      });
  });
}

// Simple Convex initialization
import { ConvexReactClient } from "convex/react";
const convexUrl = import.meta.env.VITE_CONVEX_URL!;
if (!convexUrl) {
  throw new Error("Missing Convex URL");
}
const convex = new ConvexReactClient(convexUrl);

// Clerk configuration simplifiée
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY!;
if (!clerkPublishableKey) {
  throw new Error("Missing Clerk Publishable Key");
}

console.log("🚀 Starting React application...");
console.log("📡 Convex URL:", convexUrl);
console.log("🔐 Clerk configured with native PricingTable");

// Loading component for Suspense boundaries
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-[var(--deep-black)]">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[var(--accent-purple)]" />
  </div>
);

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={clerkPublishableKey} telemetry={false}>
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <App />
    </ConvexProviderWithClerk>
  </ClerkProvider>
);
