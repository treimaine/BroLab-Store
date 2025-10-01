#!/usr/bin/env node

import { execSync } from "child_process";
import { copyFileSync, writeFileSync } from "fs";

console.log("🚀 Building with minimal CSS for maximum optimization...\n");

// Step 1: Backup original index.css
console.log("💾 Backing up original CSS...");
copyFileSync("client/src/index.css", "client/src/index.css.backup");

// Step 2: Replace with minimal CSS
console.log("🎨 Switching to minimal CSS...");
const minimalCSS = `@import "./styles/minimal.css";

/* Only essential custom styles */
.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Essential component styles that can't be replaced */
.waveform-container {
  position: relative;
  width: 100%;
  height: 60px;
}

.audio-player {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
}`;

writeFileSync("client/src/index.css", minimalCSS);

try {
  // Step 3: Build with minimal CSS
  console.log("📦 Building with minimal CSS...");
  const buildOutput = execSync("npm run build", { encoding: "utf8" });

  // Step 4: Analyze results
  const lines = buildOutput.split("\n");
  const bundleInfo = lines.filter(
    line => line.includes(".js") || line.includes(".css") || line.includes("kB")
  );

  let totalSize = 0;
  let cssSize = 0;
  let jsSize = 0;

  console.log("\n📊 Minimal CSS Bundle Analysis:");
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

  // Step 5: Calculate results
  const baseline = 124.43;
  const reduction = ((baseline - totalSize) / baseline) * 100;

  console.log("\n🎯 Optimization Results:");
  console.log(`📉 Size Reduction: ${reduction.toFixed(1)}%`);
  console.log(`📊 CSS Reduction: ${(((123.11 - cssSize) / 123.11) * 100).toFixed(1)}%`);

  if (reduction >= 20) {
    console.log("🎉 SUCCESS: 20%+ bundle size reduction achieved!");
    console.log(`✅ Reduced from ${baseline} kB to ${totalSize.toFixed(2)} kB`);

    console.log("\n🤔 Keep minimal CSS? (y/n)");
    console.log("If you want to keep this optimization, manually replace the CSS.");
    console.log("Otherwise, the original CSS will be restored.");
  } else {
    console.log(`❌ Target not reached. Current: ${reduction.toFixed(1)}%, Target: 20%`);
    console.log("Restoring original CSS...");
  }
} catch (error) {
  console.error("❌ Build failed:", error.message);
} finally {
  // Step 6: Restore original CSS
  console.log("\n🔄 Restoring original CSS...");
  copyFileSync("client/src/index.css.backup", "client/src/index.css");

  console.log("✨ Build test complete!");
}
