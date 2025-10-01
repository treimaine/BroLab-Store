#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";

console.log("🔍 Detailed Bundle Analysis - Identifying Large Dependencies\n");

// Function to analyze package.json dependencies
function analyzeDependencies() {
  console.log("📦 Analyzing package.json dependencies...\n");

  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const dependencies = packageJson.dependencies || {};
  const devDependencies = packageJson.devDependencies || {};

  console.log("🎯 Production Dependencies Analysis:");
  console.log("=".repeat(60));

  // Categorize dependencies by type
  const categories = {
    ui: [],
    state: [],
    auth: [],
    payment: [],
    build: [],
    utils: [],
    other: [],
  };

  Object.entries(dependencies).forEach(([name, version]) => {
    if (name.includes("radix") || name.includes("react") || name.includes("lucide")) {
      categories.ui.push({ name, version });
    } else if (name.includes("zustand") || name.includes("query")) {
      categories.state.push({ name, version });
    } else if (name.includes("clerk") || name.includes("auth")) {
      categories.auth.push({ name, version });
    } else if (name.includes("stripe") || name.includes("paypal")) {
      categories.payment.push({ name, version });
    } else if (name.includes("vite") || name.includes("esbuild")) {
      categories.build.push({ name, version });
    } else if (name.includes("zod") || name.includes("date") || name.includes("uuid")) {
      categories.utils.push({ name, version });
    } else {
      categories.other.push({ name, version });
    }
  });

  // Display categorized dependencies
  Object.entries(categories).forEach(([category, deps]) => {
    if (deps.length > 0) {
      console.log(`\n${category.toUpperCase()} (${deps.length} packages):`);
      deps.forEach(dep => {
        console.log(`  • ${dep.name}@${dep.version}`);
      });
    }
  });

  console.log(`\n📊 Total Production Dependencies: ${Object.keys(dependencies).length}`);
  console.log(`📊 Total Dev Dependencies: ${Object.keys(devDependencies).length}`);

  return { dependencies, devDependencies, categories };
}

// Function to identify potentially large dependencies
function identifyLargeDependencies(categories) {
  console.log("\n🚨 Potentially Large Dependencies Analysis:");
  console.log("=".repeat(60));

  const largeDependencies = [
    // UI Libraries (typically large)
    ...categories.ui.filter(
      dep =>
        dep.name.includes("radix") ||
        dep.name.includes("framer-motion") ||
        dep.name.includes("recharts")
    ),
    // Heavy utilities
    ...categories.other.filter(
      dep =>
        dep.name.includes("wavesurfer") ||
        dep.name.includes("pdfkit") ||
        dep.name.includes("nodemailer")
    ),
    // Authentication (can be large)
    ...categories.auth,
    // Payment libraries
    ...categories.payment,
  ];

  console.log("⚠️  Dependencies likely contributing to bundle size:");
  largeDependencies.forEach(dep => {
    let reason = "";
    if (dep.name.includes("radix")) reason = "(UI components - multiple packages)";
    else if (dep.name.includes("framer-motion")) reason = "(Animation library - large runtime)";
    else if (dep.name.includes("wavesurfer")) reason = "(Audio visualization - WebAudio APIs)";
    else if (dep.name.includes("recharts")) reason = "(Chart library - D3 based)";
    else if (dep.name.includes("clerk")) reason = "(Authentication SDK)";
    else if (dep.name.includes("stripe")) reason = "(Payment processing SDK)";
    else if (dep.name.includes("pdfkit")) reason = "(PDF generation library)";

    console.log(`  🔸 ${dep.name}@${dep.version} ${reason}`);
  });

  return largeDependencies;
}

// Function to analyze build output
function analyzeBuildOutput() {
  console.log("\n🏗️  Build Output Analysis:");
  console.log("=".repeat(60));

  try {
    // Clean build
    console.log("Building for analysis...");
    const buildOutput = execSync("npm run build", { encoding: "utf8" });

    // Parse build output for file sizes
    const lines = buildOutput.split("\n");
    const assetLines = lines.filter(
      line => line.includes(".js") || line.includes(".css") || line.includes("kB")
    );

    console.log("\n📁 Generated Assets:");
    assetLines.forEach(line => {
      if (line.trim()) {
        console.log(`  ${line.trim()}`);
      }
    });

    // Calculate totals
    let totalJS = 0;
    let totalCSS = 0;

    assetLines.forEach(line => {
      const sizeMatch = line.match(/(\d+\.?\d*)\s*kB/);
      if (sizeMatch) {
        const size = parseFloat(sizeMatch[1]);
        if (line.includes(".js")) totalJS += size;
        if (line.includes(".css")) totalCSS += size;
      }
    });

    console.log(`\n📊 Summary:`);
    console.log(`  JavaScript: ${totalJS.toFixed(2)} kB`);
    console.log(`  CSS: ${totalCSS.toFixed(2)} kB`);
    console.log(`  Total: ${(totalJS + totalCSS).toFixed(2)} kB`);

    return { totalJS, totalCSS, total: totalJS + totalCSS };
  } catch (error) {
    console.error("❌ Error during build analysis:", error.message);
    return null;
  }
}

// Function to provide optimization recommendations
function provideRecommendations(largeDependencies, buildStats) {
  console.log("\n💡 Optimization Recommendations:");
  console.log("=".repeat(60));

  console.log("\n1. 🎯 Immediate Actions:");

  // Check for unused Radix components
  const radixDeps = largeDependencies.filter(dep => dep.name.includes("radix"));
  if (radixDeps.length > 5) {
    console.log("  • Audit Radix UI components - you have many packages");
    console.log("    Consider using only the components you actually need");
  }

  // Check for heavy libraries
  const heavyLibs = largeDependencies.filter(
    dep =>
      dep.name.includes("framer-motion") ||
      dep.name.includes("recharts") ||
      dep.name.includes("wavesurfer")
  );

  if (heavyLibs.length > 0) {
    console.log("  • Consider lazy loading for heavy libraries:");
    heavyLibs.forEach(lib => {
      console.log(`    - ${lib.name}: Use React.lazy() for components using this`);
    });
  }

  console.log("\n2. 🔧 Code Splitting Opportunities:");
  console.log("  • Dashboard components (likely heavy with charts)");
  console.log("  • Audio player components (WaveSurfer.js)");
  console.log("  • Payment processing components");
  console.log("  • Admin/management interfaces");

  console.log("\n3. 📦 Dependency Optimization:");
  console.log("  • Use tree-shaking friendly imports");
  console.log("  • Consider replacing heavy libraries with lighter alternatives");
  console.log("  • Implement dynamic imports for non-critical features");

  if (buildStats && buildStats.total > 500) {
    console.log("\n⚠️  Bundle size is above 500kB - consider aggressive optimization");
  } else if (buildStats && buildStats.total > 200) {
    console.log("\n📈 Bundle size is moderate - room for optimization");
  } else {
    console.log("\n✅ Bundle size looks good - maintain current optimizations");
  }
}

// Main execution
async function main() {
  try {
    const { dependencies, devDependencies, categories } = analyzeDependencies();
    const largeDependencies = identifyLargeDependencies(categories);
    const buildStats = analyzeBuildOutput();

    provideRecommendations(largeDependencies, buildStats);

    console.log("\n✅ Bundle analysis complete!");
    console.log("\n📋 Next Steps:");
    console.log("  1. Review the large dependencies identified above");
    console.log("  2. Implement lazy loading for heavy components");
    console.log("  3. Audit unused Radix UI components");
    console.log("  4. Consider code splitting for dashboard features");
  } catch (error) {
    console.error("❌ Analysis failed:", error.message);
    process.exit(1);
  }
}

main();
