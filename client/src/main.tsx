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
// FIX: DISABLED - Performance monitoring was causing memory accumulation and freezes
// Uncomment to re-enable for debugging
// if (import.meta.env.DEV) {
//   const { initializePerformanceMonitoring } = await import("./lib/performanceMonitoring");
//   initializePerformanceMonitoring();
// }

// Run i18n translation validation report in dev only
if (import.meta.env.DEV) {
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
        appearance={{
          variables: {
            colorPrimary: "#8b5cf6",
            colorBackground: "#ffffff",
            colorInputBackground: "#f9fafb",
            colorText: "#111827",
            colorTextSecondary: "#4b5563",
            colorInputText: "#111827",
            colorNeutral: "#111827",
            borderRadius: "8px",
          },
          elements: {
            card: "bg-white shadow-xl",
            headerTitle: "!text-gray-900",
            headerSubtitle: "!text-gray-600",
            formFieldHintText: "!hidden",
            // Bouton principal (Continue, Sign in, Sign up, etc.)
            formButtonPrimary:
              "!bg-[#8b5cf6] hover:!bg-[#7c3aed] !text-white !border-none !shadow-md",
            // Boutons sociaux (Google, etc.)
            socialButtonsBlockButton:
              "!bg-white !border !border-gray-300 hover:!bg-gray-50 !text-gray-700",
            socialButtonsBlockButtonText: "!text-gray-700 !font-medium",
            socialButtonsBlockButtonArrow: "!text-gray-500",
            // Labels et inputs
            formFieldLabel: "!text-gray-700",
            formFieldInput: "!bg-gray-50 !border-gray-300 !text-gray-900",
            formFieldInputShowPasswordButton: "!text-gray-500",
            // Identité preview
            identityPreviewText: "!text-gray-900",
            identityPreviewEditButton: "!text-[#8b5cf6]",
            // Actions et liens
            formFieldAction: "!text-[#8b5cf6]",
            footerActionText: "!text-gray-600",
            footerActionLink: "!text-[#8b5cf6] hover:!text-[#7c3aed]",
            // Dividers
            dividerText: "!text-gray-400",
            dividerLine: "!bg-gray-200",
            // OTP
            otpCodeFieldInput: "!text-gray-900 !border-gray-300",
            formResendCodeLink: "!text-[#8b5cf6]",
            // Alerts
            alert: "!text-gray-700",
            alertText: "!text-gray-700",
            // Bouton secondaire / outline
            buttonArrowIcon: "!text-gray-500",
            // Active states
            formButtonPrimaryActive: "!bg-[#7c3aed]",
          },
        }}
      >
        <ConvexProviderWithClerk client={convex!} useAuth={useAuth}>
          <App />
          <SpeedInsights />
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </ClerkErrorBoundary>
  );
}
