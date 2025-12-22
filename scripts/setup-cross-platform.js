#!/usr/bin/env node

/**
 * Script setup cross-platform Windows/Linux/macOS
 * Alternative aux scripts .sh/.bat
 */

import { execSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import os from "node:os";

const platform = os.platform();
console.log(`🔧 Setup cross-platform détecté: ${platform}`);

try {
  // Installation dépendances
  console.log("📦 Installation dépendances...");

  if (platform === "win32") {
    // Configuration Windows
    if (existsSync("package.local.json")) {
      copyFileSync("package.local.json", "package.json");
      console.log("✅ Configuration Windows activée");
    }

    if (existsSync("vite.config.local.ts")) {
      copyFileSync("vite.config.local.ts", "vite.config.ts");
      console.log("✅ Vite config locale activée");
    }
  }

  execSync("npm install", { stdio: "inherit" });

  // Vérification TypeScript
  console.log("🔍 Vérification TypeScript...");
  execSync("npm run check", { stdio: "inherit" });

  // Test configuration
  console.log("🧪 Tests de validation...");
  execSync("npm test", { stdio: "inherit" });

  console.log("✅ Setup terminé avec succès");
  console.log("🚀 Commandes disponibles:");
  console.log("   npm run dev      - Développement");
  console.log("   npm run build    - Build production");
  console.log("   npm run test     - Tests");
} catch (error) {
  console.error("❌ Erreur setup:", error.message);
  console.log("💡 Solutions:");
  console.log("   - Vérifier Node.js version ≥24");
  console.log("   - npm cache clean --force");
  console.log("   - Supprimer node_modules et réessayer");
  process.exit(1);
}
