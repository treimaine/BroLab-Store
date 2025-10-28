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
        // Let Vite handle automatic code splitting
        chunkFileNames: "js/[name]-[hash].js",
        entryFileNames: "js/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
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
    // Force optimization of commonly used packages
    force: true,
  },
});
