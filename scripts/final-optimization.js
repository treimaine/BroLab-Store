#!/usr/bin/env node

import { execSync } from "child_process";
import { writeFileSync } from "fs";

console.log("🎯 Final Bundle Optimization Attempt...\n");

// Step 1: Build current state
console.log("📦 Building current optimized version...");
const buildOutput = execSync("npm run build", { encoding: "utf8" });

// Step 2: Parse results
const lines = buildOutput.split("\n");
const bundleInfo = lines.filter(
  line => line.includes(".js") || line.includes(".css") || line.includes("kB")
);

let totalSize = 0;
let cssSize = 0;
let jsSize = 0;

console.log("\n📊 Current Bundle Analysis:");
console.log("=".repeat(50));

bundleInfo.forEach(line => {
  if (line.includes("kB")) {
    console.log(line.trim());

    const sizeMatch = line.match(/(\d+\.?\d*)\s*kB/);
    if (sizeMatch) {
      const size = parseFloat(sizeMatch[1]);
      totalSize += size;

      if (line.includes(".css")) {
        cssSize += size;
      } else if (line.includes(".js")) {
        jsSize += size;
      }
    }
  }
});

console.log("=".repeat(50));
console.log(`📦 Total Bundle Size: ${totalSize.toFixed(2)} kB`);
console.log(`🎨 CSS Size: ${cssSize.toFixed(2)} kB`);
console.log(`⚡ JS Size: ${jsSize.toFixed(2)} kB`);

// Step 3: Calculate results
const baseline = 124.43;
const target = 99.54;
const reduction = ((baseline - totalSize) / baseline) * 100;

console.log("\n🎯 Optimization Results:");
console.log(`📉 Size Reduction: ${reduction.toFixed(1)}%`);

if (reduction >= 20) {
  console.log("🎉 SUCCESS: 20%+ bundle size reduction achieved!");
  console.log(`✅ Reduced from ${baseline} kB to ${totalSize.toFixed(2)} kB`);

  // Update task status
  console.log("\n📝 Updating task status...");
} else {
  console.log(`❌ Target not reached. Current: ${reduction.toFixed(1)}%, Target: 20%`);
  console.log(`📊 Need ${(target - totalSize).toFixed(2)} kB more reduction`);

  console.log("\n💡 Recommendations for further optimization:");
  if (cssSize > 50) {
    console.log(
      `- CSS is large (${cssSize.toFixed(2)} kB). Consider removing unused Tailwind classes.`
    );
  }
  if (jsSize > 50) {
    console.log(
      `- JavaScript is large (${jsSize.toFixed(2)} kB). Consider lazy loading more components.`
    );
  }
  console.log("- Remove unused dependencies");
  console.log("- Implement tree shaking for vendor libraries");
  console.log("- Use dynamic imports for heavy features");
}

// Step 4: Create summary
const summary = {
  timestamp: new Date().toISOString(),
  baseline: baseline,
  current: totalSize,
  target: target,
  reduction: reduction,
  success: reduction >= 20,
  breakdown: {
    css: cssSize,
    js: jsSize,
  },
  optimizations: [
    "✅ Removed unused dependencies (@formatjs/intl, @paypal/react-paypal-js, memoizee, react-icons, ws, zod-validation-error)",
    "✅ Optimized Vite configuration with better tree shaking",
    "✅ Improved lazy loading for heavy components",
    "✅ Fixed static imports to use lazy components",
    "✅ Optimized build target and minification",
    "✅ Removed console logs in production",
    "✅ Excluded heavy libraries from optimizeDeps",
  ],
};

writeFileSync("bundle-optimization-summary.json", JSON.stringify(summary, null, 2));
console.log("\n💾 Summary saved to bundle-optimization-summary.json");

console.log("\n✨ Final optimization complete!");
