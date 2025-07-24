import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { preloadCriticalResources, optimizeScrolling } from "./utils/performance";
import { initPerformanceMonitoring } from "./utils/performanceMonitoring";
import { initializePerformanceMonitoring } from "./lib/performanceMonitoring";
import { optimizeImageLoading } from "./utils/clsOptimization";

// Initialize performance optimizations
preloadCriticalResources();
optimizeScrolling();
initPerformanceMonitoring();
initializePerformanceMonitoring(); // PHASE 4 advanced monitoring
optimizeImageLoading();

createRoot(document.getElementById("root")!).render(<App />);
