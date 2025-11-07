#!/usr/bin/env node

/**
 * Image Optimization Script
 *
 * This script helps optimize images for web performance:
 * - Converts images to WebP format
 * - Generates responsive image sizes (320w, 640w, 1024w, 1920w)
 * - Compresses images for faster loading
 *
 * Usage:
 *   npm install --save-dev sharp
 *   node scripts/optimize-images.js
 */

const fs = require("fs");
const path = require("path");

// Check if sharp is installed
let sharp;
try {
  sharp = require("sharp");
} catch (error) {
  console.error("❌ Error: sharp is not installed");
  console.log("\n📦 Please install sharp first:");
  console.log("   npm install --save-dev sharp\n");
  process.exit(1);
}

const PUBLIC_DIR = path.join(__dirname, "../client/public");
const ASSETS_DIR = path.join(PUBLIC_DIR, "assets");

// Ensure assets directory exists
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// Responsive image sizes
const SIZES = [320, 640, 1024, 1920];

/**
 * Convert image to WebP format with compression
 */
async function convertToWebP(inputPath, outputPath, quality = 80) {
  try {
    await sharp(inputPath).webp({ quality }).toFile(outputPath);

    const inputStats = fs.statSync(inputPath);
    const outputStats = fs.statSync(outputPath);
    const savings = ((1 - outputStats.size / inputStats.size) * 100).toFixed(1);

    console.log(`✅ Converted: ${path.basename(inputPath)} → ${path.basename(outputPath)}`);
    console.log(
      `   Size: ${(inputStats.size / 1024).toFixed(1)}KB → ${(outputStats.size / 1024).toFixed(1)}KB (${savings}% smaller)`
    );

    return true;
  } catch (error) {
    console.error(`❌ Error converting ${inputPath}:`, error.message);
    return false;
  }
}

/**
 * Generate responsive image sizes
 */
async function generateResponsiveSizes(inputPath, baseName) {
  const results = [];

  for (const width of SIZES) {
    const outputPath = path.join(ASSETS_DIR, `${baseName}-${width}w.webp`);

    try {
      await sharp(inputPath)
        .resize(width, null, { withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(outputPath);

      const stats = fs.statSync(outputPath);
      console.log(`   ✓ ${width}w: ${(stats.size / 1024).toFixed(1)}KB`);
      results.push({ width, path: outputPath });
    } catch (error) {
      console.error(`   ✗ ${width}w: ${error.message}`);
    }
  }

  return results;
}

/**
 * Main optimization function
 */
async function optimizeImages() {
  console.log("🖼️  Image Optimization Script\n");
  console.log("📁 Public directory:", PUBLIC_DIR);
  console.log("📁 Assets directory:", ASSETS_DIR);
  console.log("");

  // Find images to optimize
  const imagesToOptimize = [];

  // Check for logo.png
  const logoPath = path.join(PUBLIC_DIR, "logo.png");
  if (fs.existsSync(logoPath)) {
    imagesToOptimize.push({ path: logoPath, name: "logo" });
  }

  // Check for hero-bg.jpg
  const heroBgJpg = path.join(ASSETS_DIR, "hero-bg.jpg");
  if (fs.existsSync(heroBgJpg)) {
    imagesToOptimize.push({ path: heroBgJpg, name: "hero-bg" });
  }

  // Check for hero-bg.png
  const heroBgPng = path.join(ASSETS_DIR, "hero-bg.png");
  if (fs.existsSync(heroBgPng)) {
    imagesToOptimize.push({ path: heroBgPng, name: "hero-bg" });
  }

  if (imagesToOptimize.length === 0) {
    console.log("⚠️  No images found to optimize");
    console.log("\nExpected images:");
    console.log("  - client/public/logo.png");
    console.log("  - client/public/assets/hero-bg.jpg (or .png)");
    console.log("\nNote: logo.png exists but will be optimized when needed.");
    return;
  }

  console.log(`Found ${imagesToOptimize.length} image(s) to optimize:\n`);

  // Process each image
  for (const image of imagesToOptimize) {
    console.log(`\n📸 Processing: ${path.basename(image.path)}`);

    // Convert to WebP
    const webpPath = path.join(ASSETS_DIR, `${image.name}.webp`);
    await convertToWebP(image.path, webpPath);

    // Generate responsive sizes
    console.log(`\n📐 Generating responsive sizes for ${image.name}:`);
    await generateResponsiveSizes(image.path, image.name);
  }

  console.log("\n✨ Optimization complete!\n");
  console.log("📝 Next steps:");
  console.log("  1. Update image references in your code to use WebP format");
  console.log("  2. Use the OptimizedImage component for responsive images");
  console.log("  3. Add preload tags in index.html for critical images");
  console.log("");
}

// Run the script
optimizeImages().catch(error => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
