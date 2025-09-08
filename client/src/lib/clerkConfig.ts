// Configuration Clerk optimisée pour l'environnement Replit
export const clerkConfig = {
  publishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY!,
  // Configuration spéciale pour éviter les erreurs réseau en dev
  appearance: {
    baseTheme: "dark" as const,
    variables: {
      colorPrimary: "#8B5CF6",
      colorBackground: "#1a1a1a",
      colorText: "#ffffff",
    },
  },
  // Désactiver certaines fonctionnalités qui causent des erreurs réseau
  telemetry: false,
  isSatellite: false,
  domain: undefined, // Laisser Clerk détecter automatiquement
  proxyUrl: undefined,
};

// Vérifier si Clerk peut s'initialiser correctement
export const isClerkAvailable = (): boolean => {
  try {
    // Check if Clerk is available on window object or if we have a publishable key
    return !!(window as any).Clerk || !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  } catch {
    return false;
  }
};
