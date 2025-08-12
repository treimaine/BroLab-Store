#!/usr/bin/env node

const { execSync } = require("child_process");
const { existsSync } = require("fs");
const path = require("path");

console.log("🔍 Running pre-commit checks...\n");

let hasErrors = false;

// Fonction pour exécuter une commande et gérer les erreurs
function runCommand(command, description) {
  try {
    console.log(`📋 ${description}...`);
    execSync(command, { stdio: "inherit" });
    console.log(`✅ ${description} passed\n`);
    return true;
  } catch (error) {
    console.log(`❌ ${description} failed\n`);
    hasErrors = true;
    return false;
  }
}

// Vérifier TypeScript
runCommand("npm run type-check", "TypeScript type checking");

// Vérifier ESLint
runCommand("npm run lint", "ESLint code quality check");

// Vérifier les imports React
console.log("🔍 Checking React imports...");
try {
  const { execSync } = require("child_process");
  const result = execSync("npx tsc --noEmit --skipLibCheck", {
    encoding: "utf8",
    stdio: "pipe",
  });
  console.log("✅ React imports check passed\n");
} catch (error) {
  console.log("❌ React imports check failed");
  console.log(error.stdout || error.message);
  console.log("");
  hasErrors = true;
}

// Vérifier la syntaxe JSX spécifiquement
console.log("🔍 Checking JSX syntax...");
try {
  const { execSync } = require("child_process");
  const result = execSync('npx eslint "**/*.{tsx,jsx}" --format=compact', {
    encoding: "utf8",
    stdio: "pipe",
  });
  console.log("✅ JSX syntax check passed\n");
} catch (error) {
  console.log("❌ JSX syntax check failed");
  console.log(error.stdout || error.message);
  console.log("");
  hasErrors = true;
}

if (hasErrors) {
  console.log("❌ Pre-commit checks failed. Please fix the errors above before committing.");
  console.log("\n💡 Quick fixes:");
  console.log('  - Run "npm run lint:fix" to auto-fix some issues');
  console.log('  - Run "npm run type-check" to see TypeScript errors');
  console.log("  - Check JSX syntax in your components");
  process.exit(1);
} else {
  console.log("✅ All pre-commit checks passed!");
  console.log("🚀 Ready to commit!");
}
