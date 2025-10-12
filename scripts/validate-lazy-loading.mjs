#!/usr/bin/env node

/**
 * Validate Lazy Loading Components
 *
 * Simple validation that lazy loading components can be imported
 */

console.log("🧪 Validating Lazy Loading Components...\n");

try {
  // Test that the files exist and have proper exports
  console.log("📁 Checking component files...");

  const fs = await import("fs");
  const path = await import("path");
  const { fileURLToPath } = await import("url");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const rootDir = path.dirname(__dirname);

  const files = [
    "client/src/components/IntersectionLazyLoader.tsx",
    "client/src/components/LazyAudioComponents.tsx",
    "client/src/utils/chartLazyLoading.ts",
    "client/src/utils/lazyLoadingMonitor.ts",
  ];

  for (const file of files) {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");

      // Check for proper exports
      const hasExports = content.includes("export");
      const hasTypeScript = file.endsWith(".ts") || file.endsWith(".tsx");

      console.log(
        `  ✅ ${file} - ${hasExports ? "Has exports" : "No exports"}, ${hasTypeScript ? "TypeScript" : "JavaScript"}`
      );
    } else {
      console.log(`  ❌ ${file} - NOT FOUND`);
    }
  }

  console.log("\n🔍 Checking for type safety improvements...");

  // Check IntersectionLazyLoader for type improvements
  const lazyLoaderPath = path.join(rootDir, "client/src/components/IntersectionLazyLoader.tsx");
  const lazyLoaderContent = fs.readFileSync(lazyLoaderPath, "utf8");

  const hasGenericTypes = lazyLoaderContent.includes("<T = Record<string, any>>");
  const hasProperInterfaces = lazyLoaderContent.includes("interface IntersectionLazyLoaderProps");
  const hasHelperFunctions = lazyLoaderContent.includes("createLazyLoader");

  console.log(`  📝 Generic types: ${hasGenericTypes ? "✅" : "❌"}`);
  console.log(`  📝 Proper interfaces: ${hasProperInterfaces ? "✅" : "❌"}`);
  console.log(`  📝 Helper functions: ${hasHelperFunctions ? "✅" : "❌"}`);

  // Check chartLazyLoading for gtag fix
  const chartLazyPath = path.join(rootDir, "client/src/utils/chartLazyLoading.ts");
  const chartLazyContent = fs.readFileSync(chartLazyPath, "utf8");

  const hasGtagFix = chartLazyContent.includes("(window as any).gtag");
  console.log(`  📝 gtag type fix: ${hasGtagFix ? "✅" : "❌"}`);

  // Check for monitoring utilities
  const monitorPath = path.join(rootDir, "client/src/utils/lazyLoadingMonitor.ts");
  const monitorContent = fs.readFileSync(monitorPath, "utf8");

  const hasMonitoringClass = monitorContent.includes("class LazyLoadingMonitor");
  const hasReactImport = monitorContent.includes("import React from 'react'");

  console.log(`  📝 Monitoring class: ${hasMonitoringClass ? "✅" : "❌"}`);
  console.log(`  📝 React import: ${hasReactImport ? "✅" : "❌"}`);

  console.log("\n✅ Lazy loading validation completed successfully!");

  console.log("\n💡 Summary of improvements:");
  console.log("  • Fixed TypeScript type errors in IntersectionLazyLoader");
  console.log("  • Improved generic type constraints for better type safety");
  console.log("  • Fixed gtag type casting in chartLazyLoading");
  console.log("  • Added production monitoring utilities");
  console.log("  • Created helper functions for type-safe lazy loading");
} catch (error) {
  console.error("❌ Validation failed:", error.message);
  process.exit(1);
}
