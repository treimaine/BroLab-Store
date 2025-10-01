#!/usr/bin/env node

/**
 * Integration test script for Convex and Clerk setup
 */

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("🧪 Testing Convex and Clerk integration...");

async function testEnvironmentVariables() {
  console.log("\n📋 Checking environment variables...");

  const envPath = path.join(rootDir, ".env");
  const envContent = await fs.readFile(envPath, "utf-8");

  const requiredVars = [
    "VITE_CONVEX_URL",
    "CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "CLERK_WEBHOOK_SECRET",
    "WOOCOMMERCE_API_URL",
    "WOOCOMMERCE_CONSUMER_KEY",
    "WOOCOMMERCE_CONSUMER_SECRET",
  ];

  const missingVars = [];

  requiredVars.forEach(varName => {
    if (!envContent.includes(varName) || envContent.includes(`${varName}=`)) {
      const regex = new RegExp(`^${varName}=(.+)$`, "m");
      const match = envContent.match(regex);
      if (!match || !match[1] || match[1].trim() === "") {
        missingVars.push(varName);
      } else {
        console.log(`✅ ${varName}: configured`);
      }
    } else {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.log("❌ Missing or empty environment variables:");
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    return false;
  }

  return true;
}

async function testConvexFiles() {
  console.log("\n📁 Checking Convex files...");

  const requiredFiles = [
    "convex/schema.ts",
    "convex/users.ts",
    "convex/http.ts",
    "convex/auth.config.ts",
    "convex/clerk/webhooks.ts",
    "convex/sync/woocommerce.ts",
    "convex/sync/internal.ts",
  ];

  let allFilesExist = true;

  for (const file of requiredFiles) {
    const filePath = path.join(rootDir, file);
    try {
      await fs.access(filePath);
      console.log(`✅ ${file}: exists`);
    } catch {
      console.log(`❌ ${file}: missing`);
      allFilesExist = false;
    }
  }

  return allFilesExist;
}

async function testClientFiles() {
  console.log("\n🖥️  Checking client files...");

  const requiredFiles = [
    "client/src/lib/convex.ts",
    "client/src/hooks/useConvex.ts",
    "client/src/main.tsx",
  ];

  let allFilesExist = true;

  for (const file of requiredFiles) {
    const filePath = path.join(rootDir, file);
    try {
      await fs.access(filePath);
      console.log(`✅ ${file}: exists`);
    } catch {
      console.log(`❌ ${file}: missing`);
      allFilesExist = false;
    }
  }

  return allFilesExist;
}

async function testServerFiles() {
  console.log("\n🖧  Checking server files...");

  const requiredFiles = [
    "server/services/WooCommerceService.ts",
    "server/routes/woo.ts",
    "server/app.ts",
  ];

  let allFilesExist = true;

  for (const file of requiredFiles) {
    const filePath = path.join(rootDir, file);
    try {
      await fs.access(filePath);
      console.log(`✅ ${file}: exists`);
    } catch {
      console.log(`❌ ${file}: missing`);
      allFilesExist = false;
    }
  }

  return allFilesExist;
}

async function testTypeScriptCompilation() {
  console.log("\n🔧 Testing TypeScript compilation...");

  try {
    const { spawn } = await import("child_process");

    return new Promise(resolve => {
      const tsc = spawn("npx", ["tsc", "--noEmit"], {
        cwd: rootDir,
        stdio: "pipe",
      });

      let output = "";
      let errorOutput = "";

      tsc.stdout.on("data", data => {
        output += data.toString();
      });

      tsc.stderr.on("data", data => {
        errorOutput += data.toString();
      });

      tsc.on("close", code => {
        if (code === 0) {
          console.log("✅ TypeScript compilation: passed");
          resolve(true);
        } else {
          console.log("❌ TypeScript compilation: failed");
          if (errorOutput) {
            console.log("Errors:", errorOutput);
          }
          if (output) {
            console.log("Output:", output);
          }
          resolve(false);
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        tsc.kill();
        console.log("⏰ TypeScript compilation: timed out");
        resolve(false);
      }, 30000);
    });
  } catch (error) {
    console.log("❌ TypeScript compilation: error running tsc");
    console.log("Error:", error.message);
    return false;
  }
}

async function generateReport() {
  console.log("\n📊 Running integration tests...");

  const results = {
    environment: await testEnvironmentVariables(),
    convexFiles: await testConvexFiles(),
    clientFiles: await testClientFiles(),
    serverFiles: await testServerFiles(),
    typeScript: await testTypeScriptCompilation(),
  };

  const allPassed = Object.values(results).every(result => result === true);

  console.log("\n📋 Test Results:");
  console.log("================");

  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? "✅ PASS" : "❌ FAIL";
    const testName = test.charAt(0).toUpperCase() + test.slice(1);
    console.log(`${status} ${testName}`);
  });

  console.log("\n" + "=".repeat(50));

  if (allPassed) {
    console.log("🎉 All tests passed! Integration is ready.");
    console.log("\n📋 Next steps:");
    console.log("1. Deploy Convex functions: npx convex deploy");
    console.log("2. Update Clerk webhook URL in dashboard");
    console.log("3. Test WooCommerce sync: POST /api/woo/sync/products");
  } else {
    console.log("❌ Some tests failed. Please fix the issues above.");
    console.log("\n📋 Common fixes:");
    console.log("1. Set missing environment variables in .env");
    console.log("2. Run: npm install");
    console.log("3. Check file paths and imports");
  }

  return allPassed;
}

async function main() {
  try {
    const success = await generateReport();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

main();
