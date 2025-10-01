#!/usr/bin/env node

import { execSync } from "child_process";

console.log("🚀 Starting aggressive bundle optimization...\n");

// Step 1: Clean build directory
console.log("🧹 Cleaning build directory...");
try {
  execSync("rimraf dist", { stdio: "inherit" });
} catch (error) {
  console.log("Build directory already clean");
}

// Step 2: Build with optimizations
console.log("📦 Building with optimizations...");
const buildOutput = execSync("npm run build", { encoding: "utf8" });

// Step 3: Analyze results
console.log("\n📊 Bundle Analysis Results:");
console.log("=".repeat(50));

const lines = buildOutput.split("\n");
const bundleInfo = lines.filter(
  line => line.includes(".js") || line.includes(".css") || line.includes("kB")
);

let totalSize = 0;
let totalGzipSize = 0;

bundleInfo.forEach(line => {
  if (line.includes("kB")) {
    console.log(line.trim());

    // Extract sizes
    const sizeMatch = line.match(/(\d+\.?\d*)\s*kB/g);
    if (sizeMatch && sizeMatch.length >= 1) {
      const size = parseFloat(sizeMatch[0].replace(" kB", ""));
      totalSize += size;

      if (sizeMatch.length >= 2) {
        const gzipSize = parseFloat(sizeMatch[1].replace(" kB", ""));
        totalGzipSize += gzipSize;
      }
    }
  }
});

console.log("=".repeat(50));
console.log(`📦 Total Bundle Size: ${totalSize.toFixed(2)} kB`);
console.log(`🗜️  Total Gzipped Size: ${totalGzipSize.toFixed(2)} kB`);

// Compare with baseline
const baseline = {
  totalSize: 124.43,
  totalGzipSize: 21.15,
  targetSize: 99.54,
  targetGzipSize: 16.92,
};

const sizeReduction = ((baseline.totalSize - totalSize) / baseline.totalSize) * 100;
const gzipReduction =
  totalGzipSize > 0 ? ((baseline.totalGzipSize - totalGzipSize) / baseline.totalGzipSize) * 100 : 0;

console.log("\n🎯 Optimization Results:");
console.log(`📉 Size Reduction: ${sizeReduction.toFixed(1)}%`);
if (totalGzipSize > 0) {
  console.log(`📉 Gzip Reduction: ${gzipReduction.toFixed(1)}%`);
}

if (totalSize <= baseline.targetSize) {
  console.log("✅ Target bundle size achieved!");
} else {
  console.log(
    `❌ Target not reached. Need ${(totalSize - baseline.targetSize).toFixed(2)} kB more reduction.`
  );
}

if (sizeReduction >= 20) {
  console.log("🎉 SUCCESS: 20%+ bundle size reduction achieved!");
} else {
  console.log(`⚠️  Need ${(20 - sizeReduction).toFixed(1)}% more reduction to reach 20% target.`);
}

// Step 4: Provide recommendations
console.log("\n💡 Optimization Recommendations:");
if (sizeReduction < 20) {
  console.log("- Consider removing more unused dependencies");
  console.log("- Implement more aggressive tree shaking");
  console.log("- Use dynamic imports for heavy components");
  console.log("- Optimize CSS bundle size");
}

console.log("\n✨ Optimization complete!");
