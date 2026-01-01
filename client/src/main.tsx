import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ClerkErrorBoundary } from "./components/auth/ClerkErrorBoundary";
import { EnvConfigError } from "./components/errors/EnvConfigError";
import { validateClerkKeyFormat, validateEnvConfig } from "./components/errors/envConfigUtils";
import "./index.css";
import "./styles/z-index.css";
import { optimizeScrolling, preloadCriticalResources } from "./utils/performance";

// Initialize performance optimizations
preloadCriticalResources();
optimizeScrolling();

// Lazy load performance monitoring only in development (top-level await)
if (import.meta.env.DEV) {
  const { initializePerformanceMonitoring } = await import("./lib/performanceMonitoring");
  initializePerformanceMonitoring();

  // Run i18n translation validation report
  const { runValidationReport } = await import("./i18n/translationValidator");
  runValidationReport();
}

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

// Validate environment configuration gracefully
const envValidation = validateEnvConfig();
const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

// Check for invalid Clerk key format
const missingVars = [...envValidation.missingVars];
if (clerkPublishableKey && !validateClerkKeyFormat(clerkPublishableKey)) {
  missingVars.push("VITE_CLERK_PUBLISHABLE_KEY (invalid format: expected pk_test_* or pk_live_*)");
}

const hasConfigError = missingVars.length > 0;

// Only initialize clients if config is valid
const convex = !hasConfigError && convexUrl ? new ConvexReactClient(convexUrl) : null;

if (import.meta.env.DEV && !hasConfigError) {
  console.log("🚀 Starting React application...");
  console.log("📡 Convex URL:", convexUrl);
  console.log("🔐 Clerk configured with native PricingTable");
}

// Render error page or app based on config validity
const rootElement = document.getElementById("root")!;

if (hasConfigError) {
  // Render graceful error page instead of crashing
  createRoot(rootElement).render(
    <EnvConfigError missingVars={missingVars} isDev={import.meta.env.DEV} />
  );
} else {
  // Normal app rendering with all providers
  createRoot(rootElement).render(
    <ClerkErrorBoundary>
      <ClerkProvider
        publishableKey={clerkPublishableKey!}
        telemetry={false}
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
        signInUrl="/login"
        signUpUrl="/login"
      >
        <ConvexProviderWithClerk client={convex!} useAuth={useAuth}>
          <App />
          <SpeedInsights />
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </ClerkErrorBoundary>
  );
}
