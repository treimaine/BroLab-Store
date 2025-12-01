// Extend globalThis interface for Clerk
declare global {
  var Clerk: unknown;
}

// Clerk configuration optimized for the environment
export const clerkConfig = {
  publishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
  // Special configuration to avoid network errors in dev
  appearance: {
    baseTheme: "dark" as const,
    variables: {
      colorPrimary: "#8B5CF6",
      colorBackground: "#1a1a1a",
      colorText: "#ffffff",
    },
  },
  // Disable features that cause network errors
  telemetry: false,
  isSatellite: false,
  domain: undefined, // Let Clerk detect automatically
  proxyUrl: undefined,
};

// Check if Clerk can initialize correctly
export const isClerkAvailable = (): boolean => {
  try {
    // Check if Clerk is available on globalThis or if we have a publishable key
    return !!globalThis.Clerk || !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  } catch {
    return false;
  }
};
