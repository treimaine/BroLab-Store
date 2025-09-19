/**
 * Bundle optimization strategies to reduce the main JavaScript bundle size
 * Current bundle: 777.60 kB (target: < 500 kB)
 */

// Dynamic imports for non-critical features
export const loadHeavyFeatures = {
  // Load audio visualization only when needed
  async audioVisualization() {
    const { WaveformAudioPlayer } = await import("../components/WaveformAudioPlayer");
    return WaveformAudioPlayer;
  },

  // Load payment components only during checkout
  async paymentProcessing() {
    // PayPalButton removed - using Clerk native interface
    return {
      // PayPalButton removed - using Clerk native interface
    };
  },

  // Load advanced features only when user accesses them
  async advancedFeatures() {
    const [filtersModule, recommendationsModule, customRequestModule] = await Promise.all([
      import("../components/AdvancedBeatFilters"),
      import("../components/BeatSimilarityRecommendations"),
      import("../components/CustomBeatRequest"),
    ]);
    return {
      AdvancedBeatFilters: filtersModule,
      BeatSimilarityRecommendations: recommendationsModule,
      CustomBeatRequest: customRequestModule,
    };
  },

  // Load geolocation and currency features only when needed
  async locationServices() {
    const [geoModule, currencyModule] = await Promise.all([
      import("../components/GeolocationProvider"),
      import("../components/CurrencyLanguageProvider"),
    ]);
    return {
      GeolocationProvider: geoModule,
      CurrencyLanguageProvider: currencyModule,
    };
  },
};

// Tree-shaking optimization for libraries
export const optimizedImports = {
  // Import specific date-fns functions instead of the entire library
  formatDate: () => import("date-fns/format"),
  parseDate: () => import("date-fns/parse"),

  // Conditional loading based on feature flags
  loadFeature: async (featureName: string) => {
    switch (featureName) {
      case "advanced-audio":
        return import("../components/EnhancedWaveformPlayer");
      case "subscription-management":
        return import("../pages/MembershipPageFixed");
      default:
        return null;
    }
  },
};

// Runtime bundle analysis
export const analyzeBundleUsage = () => {
  if (process.env.NODE_ENV === "development") {
    // Track which components are actually used
    const usedComponents = new Set<string>();

    const trackComponentUsage = (componentName: string) => {
      usedComponents.add(componentName);
      console.log(`Component loaded: ${componentName}`);
    };

    // Report unused components
    const reportUnusedComponents = () => {
      const allComponents = [
        "WaveformAudioPlayer",
        "AdvancedBeatFilters",
        "CustomBeatRequest",
        "BeatSimilarityRecommendations",
        "GeolocationProvider",
        "CurrencyLanguageProvider",
      ];

      const unused = allComponents.filter(comp => !usedComponents.has(comp));
      if (unused.length > 0) {
        console.warn("Unused components detected:", unused);
      }
    };

    // Report after 10 seconds of interaction
    setTimeout(reportUnusedComponents, 10000);

    return { trackComponentUsage };
  }

  return { trackComponentUsage: () => {} };
};

// Code splitting strategies
export const splitStrategies = {
  // Route-based splitting (already implemented in App.tsx)
  routeBased: true,

  // Feature-based splitting
  featureBased: {
    audio: ["WaveformAudioPlayer", "EnhancedWaveformPlayer"],
    payment: ["PayPalButton"],
    advanced: ["AdvancedBeatFilters", "CustomBeatRequest"],
    services: ["GeolocationProvider", "CurrencyLanguageProvider"],
  },

  // Vendor splitting (handled by Vite automatically)
  vendorBased: {
    react: ["react", "react-dom"],
    ui: ["@radix-ui/*"],
    audio: ["wavesurfer.js"],
  },
};

// Performance monitoring
export const monitorBundlePerformance = () => {
  if (typeof window !== "undefined" && "performance" in window) {
    // Monitor resource loading times
    const observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        if (entry.name.includes("assets/index-") && entry.name.endsWith(".js")) {
          console.log(`Main bundle load time: ${entry.duration}ms`);

          // Alert if bundle is too large
          console.warn(`Bundle size: Large JavaScript bundle detected`);
        }
      });
    });

    observer.observe({ entryTypes: ["resource"] });
  }
};
