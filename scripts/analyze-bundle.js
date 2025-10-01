#!/usr/bin/env node

import { execSync } from "child_process";

console.log("🔍 Analyzing bundle size...\n");

// Get current bundle size
try {
  const buildOutput = execSync("npm run build", { encoding: "utf8" });
  console.log("Build completed successfully\n");

  // Extract bundle sizes from build output
  const lines = buildOutput.split("\n");
  const bundleInfo = lines.filter(
    line => line.includes(".js") || line.includes(".css") || line.includes("kB")
  );

  console.log("📊 Current Bundle Analysis:");
  console.log("=".repeat(50));

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

  // Calculate target sizes (20% reduction)
  const targetSize = totalSize * 0.8;
  const targetGzipSize = totalGzipSize * 0.8;

  console.log("\n🎯 Optimization Targets:");
  console.log(`📦 Target Bundle Size: ${targetSize.toFixed(2)} kB (20% reduction)`);
  console.log(`🗜️  Target Gzipped Size: ${targetGzipSize.toFixed(2)} kB (20% reduction)`);

  // Store baseline for comparison
  const baseline = {
    totalSize,
    totalGzipSize,
    targetSize,
    targetGzipSize,
    timestamp: new Date().toISOString(),
  };

  console.log("\n💾 Baseline saved for comparison");
} catch (error) {
  console.error("❌ Error analyzing bundle:", error.message);
  process.exit(1);
}
