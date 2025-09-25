import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      "@convex": path.resolve(import.meta.dirname, "convex"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: false, // Disable sourcemaps in production for smaller bundle
    // Performance optimizations
    target: "esnext",
    minify: "esbuild",
    cssMinify: true,
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      // Enable tree shaking
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false,
      },
      output: {
        manualChunks: (id: string): string | undefined => {
          // Vendor chunks for better caching
          if (id.includes("node_modules")) {
            // React core
            if (id.includes("react") || id.includes("react-dom")) {
              return "react-vendor";
            }
            // Radix UI components
            if (id.includes("@radix-ui")) {
              return "radix-vendor";
            }
            // Clerk authentication
            if (id.includes("@clerk")) {
              return "clerk-vendor";
            }
            // Audio libraries
            if (id.includes("wavesurfer") || id.includes("framer-motion")) {
              return "audio-vendor";
            }
            // Icons and UI utilities
            if (
              id.includes("lucide-react") ||
              id.includes("class-variance-authority") ||
              id.includes("clsx")
            ) {
              return "ui-vendor";
            }
            // Query and state management
            if (id.includes("@tanstack/react-query") || id.includes("zustand")) {
              return "state-vendor";
            }
            // Payment libraries
            if (id.includes("stripe") || id.includes("@paypal")) {
              return "payment-vendor";
            }
            // Other vendor libraries
            return "vendor";
          }

          // Dashboard components
          if (id.includes("/dashboard/") || id.includes("Dashboard")) {
            return "dashboard";
          }

          // Audio components
          if (id.includes("Audio") || id.includes("Waveform") || id.includes("Player")) {
            return "audio";
          }

          // Payment components
          if (id.includes("payment") || id.includes("checkout") || id.includes("cart")) {
            return "payment";
          }

          return undefined;
        },
        chunkFileNames: chunkInfo => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split("/").pop()?.replace(".tsx", "").replace(".ts", "")
            : "chunk";
          return `js/${facadeModuleId}-[hash].js`;
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    hmr: {
      port: 5000,
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "framer-motion",
      "lucide-react",
      "@tanstack/react-query",
      "wavesurfer.js",
      "zustand",
      "@clerk/clerk-react",
    ],
    exclude: ["@convex-dev/react"],
  },
});
