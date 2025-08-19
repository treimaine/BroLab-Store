import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ClerkErrorBoundary } from "./components/ClerkErrorBoundary";
import { initializePerformanceMonitoring } from "./lib/performanceMonitoring";
import { optimizeImageLoading } from "./utils/clsOptimization";
import { optimizeScrolling, preloadCriticalResources } from "./utils/performance";
import { initPerformanceMonitoring } from "./utils/performanceMonitoring";

// Initialize performance optimizations
preloadCriticalResources();
optimizeScrolling();
initPerformanceMonitoring();
initializePerformanceMonitoring(); // PHASE 4 advanced monitoring
optimizeImageLoading();

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
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[var(--accent-purple)]"></div>
  </div>
);

createRoot(document.getElementById("root")!).render(
  <ClerkProvider 
    publishableKey={clerkPublishableKey}
    telemetry={false}
  >
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <App />
    </ConvexProviderWithClerk>
  </ClerkProvider>
);
