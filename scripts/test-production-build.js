#!/usr/bin/env node

/**
 * Production Build Test Script
 *
 * This script tests the production build to ensure:
 * 1. Bundle splitting is working correctly
 * 2. Lazy loaded components generate proper chunks
 * 3. Code splitting optimization is effective
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🚀 Testing Production Build and Code Splitting...\n");

// Clean previous build
console.log("📦 Cleaning previous build...");
try {
  execSync("npm run clean", { stdio: "inherit" });
} catch (error) {
  console.warn("⚠️  Clean command failed, continuing...");
}

// Build for production with analysis
console.log("🔨 Building for production with bundle analysis...");
try {
  execSync("cross-env ANALYZE=true npm run build", { stdio: "inherit" });
} catch (error) {
  console.error("❌ Production build failed:", error.message);
  process.exit(1);
}

// Analyze build output
console.log("\n📊 Analyzing build output...");

const distPath = path.join(path.dirname(__dirname), "dist", "public");
const jsPath = path.join(distPath, "js");

if (!fs.existsSync(distPath)) {
  console.error("❌ Build output directory not found");
  process.exit(1);
}

// Get all JS files
const jsFiles = fs.readdirSync(jsPath).filter(file => file.endsWith(".js"));

console.log(`\n📁 Found ${jsFiles.length} JavaScript chunks:`);

const chunkAnalysis = {
  vendor: [],
  audio: [],
  charts: [],
  dashboard: [],
  pages: [],
  other: [],
};

let totalSize = 0;

jsFiles.forEach(file => {
  const filePath = path.join(jsPath, file);
  const stats = fs.statSync(filePath);
  const sizeKB = Math.round(stats.size / 1024);
  totalSize += sizeKB;

  console.log(`  📄 ${file} (${sizeKB} KB)`);

  // Categorize chunks
  if (file.includes("vendor") || file.includes("react")) {
    chunkAnalysis.vendor.push({ file, size: sizeKB });
  } else if (file.includes("audio")) {
    chunkAnalysis.audio.push({ file, size: sizeKB });
  } else if (file.includes("chart")) {
    chunkAnalysis.charts.push({ file, size: sizeKB });
  } else if (file.includes("dashboard")) {
    chunkAnalysis.dashboard.push({ file, size: sizeKB });
  } else if (file.includes("pages")) {
    chunkAnalysis.pages.push({ file, size: sizeKB });
  } else {
    chunkAnalysis.other.push({ file, size: sizeKB });
  }
});

console.log(`\n📊 Total bundle size: ${totalSize} KB`);

// Analyze chunk distribution
console.log("\n🎯 Chunk Analysis:");
Object.entries(chunkAnalysis).forEach(([category, chunks]) => {
  if (chunks.length > 0) {
    const categorySize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    console.log(`  ${category.toUpperCase()}: ${chunks.length} chunks, ${categorySize} KB`);
  }
});

// Check for lazy loading indicators
console.log("\n🔍 Checking for lazy loading optimization...");

const hasAudioChunks = chunkAnalysis.audio.length > 0;
const hasChartChunks = chunkAnalysis.charts.length > 0;
const hasDashboardChunks = chunkAnalysis.dashboard.length > 0;

console.log(`  Audio components lazy loading: ${hasAudioChunks ? "✅" : "❌"}`);
console.log(`  Chart components lazy loading: ${hasChartChunks ? "✅" : "❌"}`);
console.log(`  Dashboard components lazy loading: ${hasDashboardChunks ? "✅" : "❌"}`);

// Performance recommendations
console.log("\n💡 Performance Analysis:");

if (totalSize > 2000) {
  console.log("  ⚠️  Large bundle size detected. Consider more aggressive code splitting.");
}

const largeChunks = jsFiles.filter(file => {
  const stats = fs.statSync(path.join(jsPath, file));
  return stats.size / 1024 > 500;
});

if (largeChunks.length > 0) {
  console.log(`  ⚠️  Large chunks detected: ${largeChunks.join(", ")}`);
  console.log("     Consider splitting these further.");
}

// Check if bundle analysis HTML was generated
const analysisPath = path.join(distPath, "bundle-analysis.html");
if (fs.existsSync(analysisPath)) {
  console.log(`\n📈 Bundle analysis report generated: ${analysisPath}`);
} else {
  console.log("\n⚠️  Bundle analysis report not found");
}

console.log("\n✅ Production build test completed!");

// Exit with appropriate code
const hasIssues = totalSize > 3000 || largeChunks.length > 2;
process.exit(hasIssues ? 1 : 0);
