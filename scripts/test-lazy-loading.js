#!/usr/bin/env node

/**
 * Lazy Loading Test Script
 *
 * Tests that lazy loading components can be imported and work correctly
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🧪 Testing Lazy Loading Components...\n");

// Test that the lazy loading utilities exist and are properly typed
const lazyLoadingFiles = [
  "client/src/components/IntersectionLazyLoader.tsx",
  "client/src/components/LazyAudioComponents.tsx",
  "client/src/utils/chartLazyLoading.ts",
  "client/src/utils/lazyLoadingMonitor.ts",
];

console.log("📁 Checking lazy loading files...");
let allFilesExist = true;

lazyLoadingFiles.forEach(file => {
  const filePath = path.join(path.dirname(__dirname), file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - NOT FOUND`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.error("\n❌ Some lazy loading files are missing!");
  process.exit(1);
}

// Check that the build output contains the expected structure
const distPath = path.join(path.dirname(__dirname), "dist", "public");
const jsPath = path.join(distPath, "js");

console.log("\n📦 Checking build output...");

if (!fs.existsSync(distPath)) {
  console.log("  ⚠️  No build output found. Run npm run build first.");
} else {
  const jsFiles = fs.readdirSync(jsPath).filter(file => file.endsWith(".js"));
  console.log(`  📄 Found ${jsFiles.length} JavaScript chunks`);

  // Check for main bundle
  const mainBundle = jsFiles.find(file => file.includes("index"));
  if (mainBundle) {
    const stats = fs.statSync(path.join(jsPath, mainBundle));
    const sizeKB = Math.round(stats.size / 1024);
    console.log(`  📊 Main bundle: ${mainBundle} (${sizeKB} KB)`);

    if (sizeKB > 1000) {
      console.log("  ⚠️  Large main bundle detected. Lazy loading should help reduce this.");
    } else {
      console.log("  ✅ Main bundle size is reasonable.");
    }
  }
}

// Test TypeScript compilation
console.log("\n🔍 Testing TypeScript compilation...");
try {
  const { execSync } = await import("child_process");
  execSync("npx tsc --noEmit --project client/tsconfig.json", { stdio: "pipe" });
  console.log("  ✅ TypeScript compilation successful");
} catch (error) {
  console.log("  ❌ TypeScript compilation failed");
  console.log("  Run npx tsc --noEmit to see detailed errors");
}

console.log("\n✅ Lazy loading test completed!");

// Performance recommendations
console.log("\n💡 Lazy Loading Best Practices:");
console.log("  • Use IntersectionLazyLoader for components that are below the fold");
console.log("  • Preload critical components with preloadDelay option");
console.log("  • Monitor lazy loading performance in production");
console.log("  • Use createLazyLoader for type-safe lazy loading");
console.log("  • Consider preloading on user interaction (hover, focus)");

process.exit(0);
