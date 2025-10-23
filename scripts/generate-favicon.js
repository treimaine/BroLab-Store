#!/usr/bin/env node

/**
 * Favicon Generator Script
 *
 * This script generates favicon files in multiple sizes from the logo.
 * Run: npm install sharp --save-dev
 * Then: node scripts/generate-favicon.js
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_LOGO = path.join(__dirname, "../client/public/logo.png");
const OUTPUT_DIR = path.join(__dirname, "../client/public");

const sizes = [
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "favicon-48x48.png", size: 48 },
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

async function generateFavicons() {
  console.log("🎨 Generating favicons from logo...\n");

  if (!fs.existsSync(INPUT_LOGO)) {
    console.error("❌ Logo file not found at:", INPUT_LOGO);
    console.error("Please ensure logo.png exists in client/public/");
    process.exit(1);
  }

  try {
    // Generate PNG files
    for (const { name, size } of sizes) {
      const outputPath = path.join(OUTPUT_DIR, name);
      await sharp(INPUT_LOGO)
        .resize(size, size, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toFile(outputPath);
      console.log(`✅ Generated ${name} (${size}x${size})`);
    }

    // Generate ICO file (requires multiple sizes)
    console.log("\n📦 Generating favicon.ico...");
    const icoPath = path.join(OUTPUT_DIR, "favicon.ico");

    // Create 32x32 for ICO (most common size)
    await sharp(INPUT_LOGO)
      .resize(32, 32, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(icoPath.replace(".ico", "-temp.png"));

    // Rename to .ico (basic approach - for better ICO support, use ico-endec package)
    fs.renameSync(icoPath.replace(".ico", "-temp.png"), icoPath);
    console.log("✅ Generated favicon.ico");

    console.log("\n✨ All favicons generated successfully!");
    console.log("\n📝 Next steps:");
    console.log("1. Check client/public/ for generated files");
    console.log("2. The HTML has been updated with favicon links");
    console.log("3. Test in browser by visiting http://localhost:5000");
  } catch (error) {
    console.error("❌ Error generating favicons:", error);
    process.exit(1);
  }
}

await generateFavicons();
