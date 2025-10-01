#!/usr/bin/env node

import fastGlob from "fast-glob";
import fs from "fs";
import path from "path";

console.log("🔍 Analyzing Radix UI Component Usage\n");

// Function to find all UI component files
async function findUIComponents() {
  const uiComponentsPath = "client/src/components/ui/*.tsx";
  const files = await fastGlob(uiComponentsPath);
  return files;
}

// Function to analyze Radix imports in a file
function analyzeRadixImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const radixImports = [];

    // Look for Radix UI imports
    const importRegex = /import.*from\s+["']@radix-ui\/([^"']+)["']/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      radixImports.push(match[1]);
    }

    return radixImports;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return [];
  }
}

// Function to find component usage across the codebase
async function findComponentUsage(componentName) {
  const searchPaths = ["client/src/**/*.tsx", "client/src/**/*.ts"];

  const files = await fastGlob(searchPaths);
  const usages = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, "utf8");

      // Look for component imports and usage
      const importRegex = new RegExp(`import.*${componentName}.*from`, "g");
      const usageRegex = new RegExp(`<${componentName}[\\s>]`, "g");

      if (importRegex.test(content) || usageRegex.test(content)) {
        usages.push(file);
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }

  return usages;
}

// Main analysis function
async function analyzeRadixUsage() {
  console.log("📦 Scanning UI components for Radix usage...\n");

  const uiFiles = await findUIComponents();
  const radixUsage = new Map();
  const componentUsage = new Map();

  // Analyze each UI component file
  for (const file of uiFiles) {
    const componentName = path.basename(file, ".tsx");
    const radixImports = analyzeRadixImports(file);

    if (radixImports.length > 0) {
      radixUsage.set(componentName, radixImports);

      // Find where this component is used
      const usages = await findComponentUsage(componentName);
      componentUsage.set(componentName, usages);
    }
  }

  // Display results
  console.log("🎯 Radix UI Components Analysis:");
  console.log("=".repeat(60));

  let totalRadixPackages = new Set();
  let usedComponents = 0;
  let unusedComponents = 0;

  for (const [component, radixImports] of radixUsage) {
    const usages = componentUsage.get(component) || [];
    const isUsed = usages.length > 0;

    if (isUsed) {
      usedComponents++;
      console.log(`\n✅ ${component} (USED - ${usages.length} files)`);
    } else {
      unusedComponents++;
      console.log(`\n❌ ${component} (UNUSED)`);
    }

    radixImports.forEach(pkg => {
      totalRadixPackages.add(pkg);
      console.log(`   📦 @radix-ui/${pkg}`);
    });

    if (isUsed && usages.length <= 3) {
      console.log(`   📍 Used in: ${usages.slice(0, 3).join(", ")}`);
    } else if (isUsed) {
      console.log(
        `   📍 Used in: ${usages.slice(0, 2).join(", ")} and ${usages.length - 2} more...`
      );
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`📊 Summary:`);
  console.log(`   Used Components: ${usedComponents}`);
  console.log(`   Unused Components: ${unusedComponents}`);
  console.log(`   Total Radix Packages: ${totalRadixPackages.size}`);

  // Check package.json for installed Radix packages
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const installedRadixPackages = Object.keys(packageJson.dependencies || {}).filter(pkg =>
    pkg.startsWith("@radix-ui/")
  );

  console.log(`   Installed Radix Packages: ${installedRadixPackages.length}`);

  // Find potentially unused packages
  const usedPackages = Array.from(totalRadixPackages).map(pkg => `@radix-ui/${pkg}`);
  const unusedPackages = installedRadixPackages.filter(pkg => !usedPackages.includes(pkg));

  if (unusedPackages.length > 0) {
    console.log(`\n⚠️  Potentially Unused Radix Packages:`);
    unusedPackages.forEach(pkg => {
      console.log(`   🗑️  ${pkg}`);
    });
  }

  return {
    usedComponents,
    unusedComponents,
    totalRadixPackages: totalRadixPackages.size,
    installedPackages: installedRadixPackages.length,
    unusedPackages,
  };
}

// Function to analyze other large dependencies
async function analyzeOtherDependencies() {
  console.log("\n🔍 Analyzing Other Large Dependencies Usage...\n");

  const largeDeps = [
    { name: "framer-motion", pattern: "framer-motion" },
    { name: "wavesurfer.js", pattern: "wavesurfer" },
    { name: "recharts", pattern: "recharts" },
    { name: "@clerk/clerk-react", pattern: "@clerk/clerk-react" },
    { name: "stripe", pattern: "stripe" },
    { name: "pdfkit", pattern: "pdfkit" },
  ];

  const searchPaths = ["client/src/**/*.tsx", "client/src/**/*.ts", "server/**/*.ts"];

  const files = await fastGlob(searchPaths);

  for (const dep of largeDeps) {
    let usageCount = 0;
    const usageFiles = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, "utf8");
        if (content.includes(dep.pattern)) {
          usageCount++;
          usageFiles.push(file);
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    if (usageCount > 0) {
      console.log(`✅ ${dep.name}: Used in ${usageCount} files`);
      if (usageFiles.length <= 3) {
        console.log(`   📍 ${usageFiles.join(", ")}`);
      } else {
        console.log(
          `   📍 ${usageFiles.slice(0, 2).join(", ")} and ${usageFiles.length - 2} more...`
        );
      }
    } else {
      console.log(`❌ ${dep.name}: No usage found`);
    }
  }
}

// Main execution
async function main() {
  try {
    const radixAnalysis = await analyzeRadixUsage();
    await analyzeOtherDependencies();

    console.log("\n💡 Optimization Recommendations:");
    console.log("=".repeat(60));

    if (radixAnalysis.unusedPackages.length > 0) {
      console.log(`\n1. 🗑️  Remove ${radixAnalysis.unusedPackages.length} unused Radix packages:`);
      console.log(`   npm uninstall ${radixAnalysis.unusedPackages.join(" ")}`);
    }

    if (radixAnalysis.unusedComponents > 0) {
      console.log(`\n2. 🧹 Clean up ${radixAnalysis.unusedComponents} unused UI components`);
    }

    console.log(`\n3. 🚀 Consider lazy loading for heavy components:`);
    console.log(`   • Dashboard components (charts, analytics)`);
    console.log(`   • Audio player components (WaveSurfer.js)`);
    console.log(`   • Admin interfaces`);

    console.log(`\n4. 📦 Bundle splitting opportunities:`);
    console.log(`   • Separate vendor chunks for large libraries`);
    console.log(`   • Route-based code splitting`);
    console.log(`   • Dynamic imports for non-critical features`);

    console.log("\n✅ Analysis complete!");
  } catch (error) {
    console.error("❌ Analysis failed:", error.message);
    process.exit(1);
  }
}

main();
