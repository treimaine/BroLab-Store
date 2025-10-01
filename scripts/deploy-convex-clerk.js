#!/usr/bin/env node

/**
 * Deployment script for Convex and Clerk integration
 * Handles the complete deployment process
 */

import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("🚀 Starting Convex and Clerk deployment...");

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n📋 Running: ${command} ${args.join(" ")}`);

    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: "inherit",
      shell: true,
      ...options,
    });

    child.on("close", code => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on("error", error => {
      reject(error);
    });
  });
}

async function checkEnvironment() {
  console.log("\n🔍 Checking environment...");

  const envPath = path.join(rootDir, ".env");
  const envContent = await fs.readFile(envPath, "utf-8");

  const requiredVars = [
    "VITE_CONVEX_URL",
    "CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "CLERK_WEBHOOK_SECRET",
  ];

  const missingVars = [];

  requiredVars.forEach(varName => {
    const regex = new RegExp(`^${varName}=(.+)$`, "m");
    const match = envContent.match(regex);
    if (!match || !match[1] || match[1].trim() === "") {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.log("❌ Missing environment variables:");
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    throw new Error("Please set all required environment variables");
  }

  console.log("✅ Environment variables configured");
}

async function installDependencies() {
  console.log("\n📦 Installing dependencies...");
  try {
    await runCommand("npm", ["install"]);
    console.log("✅ Dependencies installed");
  } catch (error) {
    console.error("❌ Failed to install dependencies:", error.message);
    throw error;
  }
}

async function deployConvex() {
  console.log("\n🔧 Deploying Convex functions...");
  try {
    await runCommand("npx", ["convex", "deploy"]);
    console.log("✅ Convex functions deployed");
  } catch (error) {
    console.error("❌ Failed to deploy Convex functions:", error.message);
    console.log("\n💡 Try running manually:");
    console.log("   npx convex dev");
    console.log("   npx convex deploy");
    throw error;
  }
}

async function testBuild() {
  console.log("\n🏗️  Testing build...");
  try {
    await runCommand("npm", ["run", "build"]);
    console.log("✅ Build successful");
  } catch (error) {
    console.error("❌ Build failed:", error.message);
    console.log("\n💡 Try fixing TypeScript errors first:");
    console.log("   npm run type-check");
    throw error;
  }
}

async function generateDeploymentReport() {
  console.log("\n📊 Generating deployment report...");

  const report = `# Deployment Report

## Status: ✅ DEPLOYED

**Deployment Date**: ${new Date().toISOString()}

## What was deployed:

### Convex Functions
- ✅ User management with Clerk integration
- ✅ WooCommerce synchronization
- ✅ Webhook handlers
- ✅ Database schema

### Server Updates
- ✅ WooCommerce service integration
- ✅ Sync endpoints
- ✅ Cleaned up redundant routes

### Client Updates
- ✅ Convex hooks
- ✅ Clerk integration
- ✅ TypeScript improvements

## Next Steps:

1. **Update Clerk Webhook URL**:
   - Go to Clerk Dashboard → Webhooks
   - Update URL to: \`https://your-convex-url.convex.cloud/clerk-webhook\`

2. **Test the Integration**:
   \`\`\`bash
   # Test WooCommerce sync
   curl -X POST http://localhost:5000/api/woo/sync/products
   
   # Test user authentication
   # Sign up/sign in through your app
   \`\`\`

3. **Monitor**:
   - Check Convex dashboard for function logs
   - Monitor Clerk webhook events
   - Watch for any runtime errors

## Support:
- Convex docs: https://docs.convex.dev
- Clerk docs: https://clerk.com/docs
- Integration guide: CONVEX_CLERK_INTEGRATION_SUMMARY.md
`;

  const reportPath = path.join(rootDir, "DEPLOYMENT_REPORT.md");
  await fs.writeFile(reportPath, report);
  console.log("✅ Deployment report created: DEPLOYMENT_REPORT.md");
}

async function main() {
  try {
    await checkEnvironment();
    await installDependencies();
    await deployConvex();
    await testBuild();
    await generateDeploymentReport();

    console.log("\n🎉 Deployment completed successfully!");
    console.log("\n📋 Next steps:");
    console.log("1. Update Clerk webhook URL in dashboard");
    console.log("2. Test the integration");
    console.log("3. Monitor logs for any issues");
    console.log("\n📖 See DEPLOYMENT_REPORT.md for detailed instructions");
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    console.log("\n🛠️  Manual steps to try:");
    console.log("1. Check environment variables in .env");
    console.log("2. Run: npm install");
    console.log("3. Run: npx convex dev");
    console.log("4. Run: npx convex deploy");
    console.log("5. Run: npm run build");

    process.exit(1);
  }
}

main();
