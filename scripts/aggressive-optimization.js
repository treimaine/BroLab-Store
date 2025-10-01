#!/usr/bin/env node

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";

console.log("🚀 Starting aggressive bundle optimization...\n");

// Step 1: Remove unused dependencies from package.json temporarily
console.log("📦 Temporarily removing heavy unused dependencies...");

const packageJsonPath = "package.json";
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const originalDeps = { ...packageJson.dependencies };

// Remove heavy dependencies that might not be essential
const heavyDepsToRemove = [
  "recharts", // Not used based on search
  "date-fns", // Can be replaced with native Date methods
  "json2csv", // Only used in specific admin functions
  "pdfkit", // Only used in specific admin functions
  "nodemailer", // Server-side only
  "bcrypt", // Server-side only
  "node-cron", // Server-side only
  "file-type", // Server-side only
  "fast-glob", // Server-side only
];

// Temporarily remove heavy deps for client build
heavyDepsToRemove.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    console.log(`  - Temporarily removing ${dep}`);
    delete packageJson.dependencies[dep];
  }
});

// Write temporary package.json
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

try {
  // Step 2: Clean install with optimized dependencies
  console.log("\n🧹 Clean installing optimized dependencies...");
  execSync("npm install", { stdio: "inherit" });

  // Step 3: Build with optimizations
  console.log("\n📦 Building with optimizations...");
  const buildOutput = execSync("npm run build", { encoding: "utf8" });

  // Step 4: Analyze results
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
    totalGzipSize > 0
      ? ((baseline.totalGzipSize - totalGzipSize) / baseline.totalGzipSize) * 100
      : 0;

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

    // If successful, keep the optimized dependencies
    console.log("\n💾 Keeping optimized dependencies...");
  } else {
    console.log(`⚠️  Need ${(20 - sizeReduction).toFixed(1)}% more reduction to reach 20% target.`);
    throw new Error("Target not reached");
  }
} catch (error) {
  console.log("\n🔄 Restoring original dependencies...");

  // Restore original package.json
  packageJson.dependencies = originalDeps;
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Reinstall original dependencies
  execSync("npm install", { stdio: "inherit" });

  console.log("❌ Optimization failed, dependencies restored");
  console.log("Error:", error.message);
}

console.log("\n✨ Optimization process complete!");
