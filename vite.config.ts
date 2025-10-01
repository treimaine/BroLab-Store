import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    // Bundle analyzer for production builds
    ...(process.env.ANALYZE
      ? [
          visualizer({
            filename: "dist/bundle-analysis.html",
            open: true,
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      "@convex": path.resolve(import.meta.dirname, "convex"),
    },
  },
  // Remove console logs in production
  esbuild: {
    drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : [],
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: false, // Disable sourcemaps in production for smaller bundle
    // Performance optimizations
    target: "es2020", // Better compatibility and smaller output
    minify: "esbuild",
    cssMinify: true,
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Additional optimizations
    reportCompressedSize: false, // Faster builds
    cssCodeSplit: true, // Split CSS for better caching

    rollupOptions: {
      // Enable aggressive tree shaking
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false,
        preset: "smallest",
      },
      // Remove unused code
      external: id => {
        // Externalize Node.js built-ins that shouldn't be bundled
        return id.startsWith("node:") || ["fs", "path", "crypto"].includes(id);
      },
      output: {
        // Enhanced manual chunking for better code splitting
        manualChunks: id => {
          // Vendor libraries
          if (id.includes("node_modules")) {
            // Chart libraries
            if (id.includes("recharts") || id.includes("d3")) {
              return "charts";
            }
            // Audio libraries
            if (id.includes("wavesurfer") || id.includes("audio")) {
              return "audio";
            }
            // UI libraries
            if (id.includes("@radix-ui") || id.includes("lucide-react")) {
              return "ui";
            }
            // React ecosystem
            if (id.includes("react") || id.includes("react-dom")) {
              return "react";
            }
            // Animation libraries
            if (id.includes("framer-motion")) {
              return "animation";
            }
            // Other vendor libraries
            return "vendor";
          }

          // Application code splitting
          // Dashboard components
          if (id.includes("/dashboard/") || id.includes("Dashboard")) {
            return "dashboard";
          }
          // Audio components
          if (id.includes("Audio") || id.includes("Waveform") || id.includes("Player")) {
            return "audio-components";
          }
          // Chart components
          if (id.includes("Chart") || id.includes("Analytics")) {
            return "chart-components";
          }
          // Page components
          if (id.includes("/pages/")) {
            return "pages";
          }

          // Default return for other modules
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
    port: 3000,
    hmr: {
      port: 3000,
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
    // Force optimization of commonly used packages
    force: true,
  },
});
