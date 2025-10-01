#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";

console.log("🔍 Detailed analysis of potentially unused dependencies...\n");

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

// Check for specific potentially unused type definitions
const typeDefsToCheck = ["@types/passport", "@types/passport-local", "@types/pg", "@types/ws"];

console.log("🔍 Checking type definitions that might be unused:\n");

const unusedTypeDefs = [];

for (const typeDef of typeDefsToCheck) {
  const basePackage = typeDef.replace("@types/", "");

  console.log(`Checking ${typeDef} (for ${basePackage})...`);

  // Check if the base package is used
  try {
    const result = execSync(
      `grep -r "from ['\"]${basePackage}['\"]" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . || echo "not found"`,
      { encoding: "utf8", stdio: "pipe" }
    );

    if (result.includes("not found") || !result.trim()) {
      // Also check for require statements
      const requireResult = execSync(
        `grep -r "require(['\"]${basePackage}['\"])" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . || echo "not found"`,
        { encoding: "utf8", stdio: "pipe" }
      );

      if (requireResult.includes("not found") || !requireResult.trim()) {
        console.log(`❌ ${typeDef} - base package '${basePackage}' not found in codebase`);
        unusedTypeDefs.push(typeDef);
      } else {
        console.log(`✅ ${typeDef} - base package '${basePackage}' found via require`);
      }
    } else {
      console.log(`✅ ${typeDef} - base package '${basePackage}' found in codebase`);
    }
  } catch (error) {
    console.log(`⚠️  Could not check ${typeDef}`);
  }
}

// Check for missing dependencies that are used in scripts
console.log("\n🔍 Checking for missing dependencies used in package.json scripts:\n");

const scripts = packageJson.scripts;
const missingDeps = [];

// Check for rimraf usage
if (JSON.stringify(scripts).includes("rimraf")) {
  if (!packageJson.dependencies?.rimraf && !packageJson.devDependencies?.rimraf) {
    console.log("❌ rimraf is used in scripts but not in dependencies");
    missingDeps.push("rimraf");
  } else {
    console.log("✅ rimraf is properly listed in dependencies");
  }
}

// Check for other commonly missing CLI tools
const cliTools = ["concurrently", "npm-run-all", "wait-on", "nodemon"];
for (const tool of cliTools) {
  if (JSON.stringify(scripts).includes(tool)) {
    if (!packageJson.dependencies?.[tool] && !packageJson.devDependencies?.[tool]) {
      console.log(`❌ ${tool} is used in scripts but not in dependencies`);
      missingDeps.push(tool);
    }
  }
}

console.log("\n📊 FINAL RESULTS:");

if (unusedTypeDefs.length > 0) {
  console.log(`\n🗑️  UNUSED TYPE DEFINITIONS (${unusedTypeDefs.length}):`);
  unusedTypeDefs.forEach(dep => {
    console.log(`  - ${dep}`);
  });

  console.log("\n💡 To remove unused type definitions:");
  console.log(`npm uninstall ${unusedTypeDefs.join(" ")}`);
} else {
  console.log("\n✅ All type definitions appear to be used");
}

if (missingDeps.length > 0) {
  console.log(`\n➕ MISSING DEPENDENCIES (${missingDeps.length}):`);
  missingDeps.forEach(dep => {
    console.log(`  - ${dep}`);
  });

  console.log("\n💡 To add missing dependencies:");
  console.log(`npm install --save-dev ${missingDeps.join(" ")}`);
} else {
  console.log("\n✅ No missing dependencies detected");
}

// Calculate potential savings
if (unusedTypeDefs.length > 0) {
  console.log("\n💾 Potential benefits of cleanup:");
  console.log(`  - Remove ${unusedTypeDefs.length} unused type definition packages`);
  console.log("  - Reduce node_modules size");
  console.log("  - Faster npm install times");
  console.log("  - Cleaner dependency tree");
}

console.log("\n⚠️  IMPORTANT:");
console.log("Always test thoroughly after removing dependencies to ensure nothing breaks.");
