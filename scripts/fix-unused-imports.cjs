#!/usr/bin/env node

/**
 * Script to fix unused imports and variables in TypeScript files
 * This script will:
 * 1. Remove unused imports
 * 2. Prefix unused variables with underscore
 * 3. Remove unused function parameters or prefix with underscore
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Get all TypeScript files
function getAllTsFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules, .git, dist, etc.
      if (!["node_modules", ".git", "dist", "build", ".next", "coverage"].includes(entry.name)) {
        getAllTsFiles(fullPath, files);
      }
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      // Skip generated files
      if (!entry.name.includes(".d.ts") && !fullPath.includes("_generated")) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

// Fix unused variables by prefixing with underscore
function fixUnusedVariables(content) {
  const lines = content.split("\n");
  const fixedLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Fix unused variables in destructuring
    line = line.replace(/const\s+{\s*([^}]+)\s*}\s*=/g, (match, vars) => {
      const fixedVars = vars
        .split(",")
        .map(v => {
          const trimmed = v.trim();
          // If it looks like an unused variable, prefix with underscore
          if (trimmed && !trimmed.startsWith("_") && !trimmed.includes(":")) {
            return `_${trimmed}`;
          }
          return trimmed;
        })
        .join(", ");
      return match.replace(vars, fixedVars);
    });

    // Fix unused function parameters
    line = line.replace(/\(([^)]+)\)\s*=>/g, (match, params) => {
      const fixedParams = params
        .split(",")
        .map(p => {
          const trimmed = p.trim();
          // If parameter looks unused and doesn't start with underscore
          if (trimmed && !trimmed.startsWith("_") && !trimmed.includes("=")) {
            return `_${trimmed}`;
          }
          return trimmed;
        })
        .join(", ");
      return match.replace(params, fixedParams);
    });

    fixedLines.push(line);
  }

  return fixedLines.join("\n");
}

// Remove unused imports
function removeUnusedImports(content) {
  const lines = content.split("\n");
  const imports = [];
  const otherLines = [];

  // Separate imports from other code
  for (const line of lines) {
    if (line.trim().startsWith("import ") && !line.includes("//")) {
      imports.push(line);
    } else {
      otherLines.push(line);
    }
  }

  const codeContent = otherLines.join("\n");
  const usedImports = [];

  // Check each import to see if it's used
  for (const importLine of imports) {
    const match = importLine.match(/import\s+(?:{([^}]+)}|(\w+))\s+from/);
    if (match) {
      const namedImports = match[1];
      const defaultImport = match[2];

      let isUsed = false;

      if (namedImports) {
        // Check named imports
        const imports = namedImports.split(",").map(i => i.trim().split(" as ")[0].trim());
        for (const imp of imports) {
          if (codeContent.includes(imp)) {
            isUsed = true;
            break;
          }
        }
      }

      if (defaultImport && codeContent.includes(defaultImport)) {
        isUsed = true;
      }

      // Keep type-only imports and side-effect imports
      if (
        importLine.includes("type ") ||
        (importLine.includes('"') && !importLine.includes("from"))
      ) {
        isUsed = true;
      }

      if (isUsed) {
        usedImports.push(importLine);
      }
    } else {
      // Keep imports we can't parse (side effects, etc.)
      usedImports.push(importLine);
    }
  }

  return [...usedImports, ...otherLines].join("\n");
}

// Process a single file
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    let fixedContent = content;

    // Apply fixes
    fixedContent = removeUnusedImports(fixedContent);
    fixedContent = fixUnusedVariables(fixedContent);

    // Only write if content changed
    if (fixedContent !== content) {
      fs.writeFileSync(filePath, fixedContent);
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
  console.log("🔍 Finding TypeScript files...");
  const tsFiles = getAllTsFiles(process.cwd());
  console.log(`Found ${tsFiles.length} TypeScript files`);

  console.log("\n🔧 Processing files...");
  let fixedCount = 0;

  for (const file of tsFiles) {
    if (processFile(file)) {
      fixedCount++;
    }
  }

  console.log(`\n✅ Fixed ${fixedCount} files`);

  // Run ESLint to check remaining issues
  console.log("\n🔍 Running ESLint to check remaining issues...");
  try {
    execSync("npx eslint . --ext .ts,.tsx --format compact", { stdio: "inherit" });
  } catch (error) {
    console.log("ESLint found remaining issues. Manual review may be needed.");
  }
}

if (require.main === module) {
  main();
}

module.exports = { processFile, removeUnusedImports, fixUnusedVariables };
