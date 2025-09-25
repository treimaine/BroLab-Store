#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const glob = require("glob");

// Function to fix Express route handlers that don't return on all code paths
function fixExpressRouteHandlers(content) {
  // Pattern to match Express route handlers with early returns
  const routeHandlerPattern =
    /(\w+\.(get|post|put|delete|patch)\s*\(\s*["'][^"']*["']\s*,\s*(?:[^,]+,\s*)*)(async\s*)?\(\s*([^)]+)\s*\)\s*=>\s*\{/g;

  let fixed = content;

  // Add void return type to route handlers
  fixed = fixed.replace(
    /(\w+\.(get|post|put|delete|patch)\s*\(\s*["'][^"']*["']\s*,\s*(?:[^,]+,\s*)*)(async\s*)?\(\s*([^)]+)\s*\)\s*=>\s*\{/g,
    "$1$3($4): void => {"
  );

  // Fix early returns in route handlers
  fixed = fixed.replace(
    /if\s*\([^)]+\)\s*return\s+res\.(status\(\d+\)\.)?json\([^)]+\);/g,
    match => {
      const returnStatement = match.replace("return ", "");
      return match.replace(/return\s+/, "") + "\n      return;";
    }
  );

  return fixed;
}

// Function to fix middleware functions
function fixMiddlewareFunctions(content) {
  let fixed = content;

  // Add void return type to middleware functions
  fixed = fixed.replace(/export\s+const\s+\w+\s*=\s*\(([^)]+)\)\s*=>\s*\{/g, (match, params) => {
    if (params.includes("req") && params.includes("res") && params.includes("next")) {
      return match.replace(") => {", "): void => {");
    }
    return match;
  });

  return fixed;
}

// Function to process a single file
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    let fixed = content;

    // Apply fixes
    fixed = fixExpressRouteHandlers(fixed);
    fixed = fixMiddlewareFunctions(fixed);

    // Only write if content changed
    if (fixed !== content) {
      fs.writeFileSync(filePath, fixed);
      console.log(`Fixed: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
function main() {
  console.log("Fixing TypeScript strict mode issues...");

  // Find all TypeScript files in server directory
  const serverFiles = glob.sync("server/**/*.ts", { ignore: ["node_modules/**", "dist/**"] });

  let fixedCount = 0;

  serverFiles.forEach(file => {
    if (processFile(file)) {
      fixedCount++;
    }
  });

  console.log(`\nFixed ${fixedCount} files.`);
  console.log("Manual review may still be needed for complex cases.");
}

if (require.main === module) {
  main();
}

module.exports = { processFile, fixExpressRouteHandlers, fixMiddlewareFunctions };
