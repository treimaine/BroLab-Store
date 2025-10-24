#!/usr/bin/env node

/**
 * Analyze Unused Code
 *
 * This script scans the codebase to identify unused components, hooks, and services
 * by checking if they are imported anywhere in the application.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Categories to analyze
const categories = {
  examples: "client/src/components/examples",
  debug: "client/src/components/debug",
  diagnostics: "client/src/components/dashboard",
  monitoring: "client/src/components/monitoring",
  hooks: "client/src/hooks",
  services: "client/src/services",
};

// Files to analyze for diagnostics
const diagnosticFiles = ["ActivitySyncDiagnostic.tsx", "SimpleActivityDiagnostic.tsx"];

// Known used components (from manual verification)
const knownUsed = ["PerformanceMonitor", "BundleSizeAnalyzer"];

function getAllFiles(dir, extension) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, extension));
    } else if (item.endsWith(extension)) {
      files.push(fullPath);
    }
  }

  return files;
}

function getComponentName(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

function isComponentUsed(componentName, searchPaths) {
  // Skip if it's a known used component
  if (knownUsed.includes(componentName)) {
    return true;
  }

  try {
    // Search for imports of this component
    const grepCommand = `grep -r "${componentName}" ${searchPaths.join(" ")} --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist 2>/dev/null || true`;
    const result = execSync(grepCommand, { encoding: "utf-8" });

    // Filter out self-references
    const lines = result.split("\n").filter(line => {
      if (!line) return false;
      // Exclude the file itself
      if (line.includes(componentName + ".tsx") || line.includes(componentName + ".ts")) {
        return false;
      }
      return true;
    });

    return lines.length > 0;
  } catch (error) {
    return false;
  }
}

function analyzeCategory(categoryName, categoryPath, searchPaths) {
  console.log(`\n## ${categoryName.toUpperCase()}`);
  console.log(`Path: ${categoryPath}\n`);

  const files = getAllFiles(categoryPath, ".tsx").concat(getAllFiles(categoryPath, ".ts"));

  if (files.length === 0) {
    console.log("No files found in this category.\n");
    return { used: [], unused: [] };
  }

  const used = [];
  const unused = [];

  for (const file of files) {
    const componentName = getComponentName(file);
    const isUsed = isComponentUsed(componentName, searchPaths);

    if (isUsed) {
      used.push({ file, componentName });
      console.log(`✅ USED: ${componentName}`);
    } else {
      unused.push({ file, componentName });
      console.log(`❌ UNUSED: ${componentName}`);
    }
  }

  console.log(`\nSummary: ${used.length} used, ${unused.length} unused\n`);

  return { used, unused };
}

function main() {
  console.log("# Codebase Unused Code Analysis\n");
  console.log("Analyzing components, hooks, and services for unused code...\n");

  const searchPaths = ["client/src", "server", "convex"];

  const results = {};

  // Analyze examples
  results.examples = analyzeCategory("Examples", categories.examples, searchPaths);

  // Analyze debug components
  results.debug = analyzeCategory("Debug Components", categories.debug, searchPaths);

  // Analyze diagnostic components (specific files)
  console.log("\n## DIAGNOSTIC COMPONENTS");
  console.log("Path: client/src/components/dashboard\n");
  results.diagnostics = { used: [], unused: [] };

  for (const fileName of diagnosticFiles) {
    const filePath = path.join(categories.diagnostics, fileName);
    if (fs.existsSync(filePath)) {
      const componentName = getComponentName(filePath);
      const isUsed = isComponentUsed(componentName, searchPaths);

      if (isUsed) {
        results.diagnostics.used.push({ file: filePath, componentName });
        console.log(`✅ USED: ${componentName}`);
      } else {
        results.diagnostics.unused.push({ file: filePath, componentName });
        console.log(`❌ UNUSED: ${componentName}`);
      }
    }
  }
  console.log(
    `\nSummary: ${results.diagnostics.used.length} used, ${results.diagnostics.unused.length} unused\n`
  );

  // Analyze monitoring components
  results.monitoring = analyzeCategory("Monitoring Components", categories.monitoring, searchPaths);

  // Generate summary
  console.log("\n# OVERALL SUMMARY\n");

  let totalUsed = 0;
  let totalUnused = 0;

  for (const [category, data] of Object.entries(results)) {
    totalUsed += data.used.length;
    totalUnused += data.unused.length;
    console.log(`${category}: ${data.used.length} used, ${data.unused.length} unused`);
  }

  console.log(`\n**Total: ${totalUsed} used, ${totalUnused} unused**`);
  console.log(`\n**Potential for removal: ${totalUnused} files**`);

  // Save detailed results to JSON
  const outputPath = "docs/unused-code-analysis.json";
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nDetailed results saved to: ${outputPath}`);
}

main();
