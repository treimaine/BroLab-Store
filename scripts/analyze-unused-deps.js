#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";

console.log("🔍 Analyzing package.json for unused dependencies...\n");

// Read package.json
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

// Dependencies that are used but might not show up in import statements
const implicitlyUsed = new Set([
  // Build tools and CLI tools
  "vite",
  "esbuild",
  "tsx",
  "cross-env",
  "typescript",
  "eslint",
  "jest",
  "ts-jest",
  "tailwindcss",
  "autoprefixer",
  "postcss",

  // Vite plugins
  "@vitejs/plugin-react",
  "rollup-plugin-visualizer",

  // ESLint plugins and configs
  "@eslint/js",
  "eslint-plugin-react",
  "eslint-plugin-react-hooks",
  "eslint-plugin-react-refresh",
  "typescript-eslint",
  "globals",

  // Testing utilities
  "@testing-library/jest-dom",
  "@testing-library/dom",
  "@testing-library/react",
  "supertest",

  // Tailwind plugins
  "@tailwindcss/typography",
  "tailwindcss-animate",

  // Type definitions (always needed for TypeScript)
  "@types/node",
  "@types/react",
  "@types/react-dom",
  "@types/express",
  "@types/jest",
  "@types/supertest",
  "@types/bcrypt",
  "@types/multer",
  "@types/nodemailer",
  "@types/pg",
  "@types/uuid",
  "@types/cookie-parser",
  "@types/express-session",
  "@types/passport",
  "@types/passport-local",
  "@types/pdfkit",
  "@types/ws",

  // Runtime dependencies that might not show in imports
  "dotenv", // Used via -r flag in scripts
  "bufferutil", // Optional dependency for ws performance
]);

// Check for actual usage in codebase
function checkDependencyUsage(depName) {
  try {
    // Check for direct imports
    const importResult = execSync(
      `npx rg "from ['\"]${depName}['\"]" --type ts --type tsx --type js --type jsx . || echo "not found"`,
      { encoding: "utf8", stdio: "pipe" }
    );

    if (!importResult.includes("not found") && importResult.trim()) {
      return true;
    }

    // Check for require statements
    const requireResult = execSync(
      `npx rg "require\\(['\"]${depName}['\"]\\)" --type ts --type tsx --type js --type jsx . || echo "not found"`,
      { encoding: "utf8", stdio: "pipe" }
    );

    if (!requireResult.includes("not found") && requireResult.trim()) {
      return true;
    }

    // Check for scoped packages (e.g., @radix-ui/react-button)
    if (depName.startsWith("@")) {
      const scopedResult = execSync(
        `npx rg "from ['\"]${depName}" --type ts --type tsx --type js --type jsx . || echo "not found"`,
        { encoding: "utf8", stdio: "pipe" }
      );

      if (!scopedResult.includes("not found") && scopedResult.trim()) {
        return true;
      }
    }

    return false;
  } catch (error) {
    // If rg is not available, fall back to grep
    try {
      const grepResult = execSync(
        `grep -r "from ['\"]${depName}['\"]" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . || echo "not found"`,
        { encoding: "utf8", stdio: "pipe" }
      );
      return !grepResult.includes("not found") && grepResult.trim();
    } catch {
      console.warn(`⚠️  Could not check usage for ${depName} - assuming used`);
      return true;
    }
  }
}

const unusedDeps = [];
const usedDeps = [];

console.log("Checking dependencies...\n");

for (const [depName, version] of Object.entries(dependencies)) {
  if (implicitlyUsed.has(depName)) {
    console.log(`✅ ${depName} - implicitly used (build tool/types)`);
    usedDeps.push(depName);
    continue;
  }

  const isUsed = checkDependencyUsage(depName);

  if (isUsed) {
    console.log(`✅ ${depName} - found in codebase`);
    usedDeps.push(depName);
  } else {
    console.log(`❌ ${depName} - potentially unused`);
    unusedDeps.push(depName);
  }
}

console.log("\n📊 ANALYSIS RESULTS:");
console.log(`✅ Used dependencies: ${usedDeps.length}`);
console.log(`❌ Potentially unused: ${unusedDeps.length}`);

if (unusedDeps.length > 0) {
  console.log("\n🗑️  POTENTIALLY UNUSED DEPENDENCIES:");
  unusedDeps.forEach(dep => {
    console.log(`  - ${dep}`);
  });

  console.log("\n💡 To remove unused dependencies, run:");
  console.log(`npm uninstall ${unusedDeps.join(" ")}`);

  // Calculate potential size savings
  console.log("\n📦 Checking package sizes...");
  try {
    const sizeResult = execSync(`npm list --depth=0 --json`, { encoding: "utf8" });
    const listData = JSON.parse(sizeResult);
    console.log("✅ Package analysis complete");
  } catch (error) {
    console.log("⚠️  Could not analyze package sizes");
  }
} else {
  console.log("\n🎉 No unused dependencies found!");
}

console.log("\n⚠️  MANUAL VERIFICATION NEEDED:");
console.log("Please manually verify these results before removing any dependencies.");
console.log("Some dependencies might be used in ways not detected by this script.");
