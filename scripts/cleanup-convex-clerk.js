#!/usr/bin/env node

/**
 * Cleanup script for Convex and Clerk integration
 * Removes redundant code and fixes TypeScript issues
 */

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("🧹 Starting Convex and Clerk cleanup...");

// Files to check and potentially clean up
const filesToCleanup = [
  // Remove redundant auth files
  "server/routes/clerk.ts",
  "server/middleware/clerkAuth.ts",

  // Remove old Supabase files if they exist
  "server/lib/supabase.ts",
  "server/services/supabase.ts",

  // Remove redundant subscription files (using Clerk Billing)
  "server/routes/subscription.ts",
  "server/routes/stripeWebhook.ts",
];

// Directories to check for cleanup
const directoriesToCheck = [
  "server/routes",
  "server/services",
  "server/middleware",
  "convex",
  "client/src/hooks",
  "client/src/lib",
];

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function cleanupRedundantFiles() {
  console.log("📁 Cleaning up redundant files...");

  for (const file of filesToCleanup) {
    const filePath = path.join(rootDir, file);
    if (await fileExists(filePath)) {
      try {
        const content = await fs.readFile(filePath, "utf-8");

        // Check if file contains important logic before deleting
        if (content.includes("// KEEP") || content.includes("// IMPORTANT")) {
          console.log(`⚠️  Skipping ${file} - contains important markers`);
          continue;
        }

        // Create backup before deletion
        const backupPath = `${filePath}.backup`;
        await fs.writeFile(backupPath, content);

        await fs.unlink(filePath);
        console.log(`✅ Removed redundant file: ${file}`);
        console.log(`📦 Backup created: ${file}.backup`);
      } catch (error) {
        console.error(`❌ Error removing ${file}:`, error.message);
      }
    }
  }
}

async function updateImports() {
  console.log("🔄 Updating imports...");

  const filesToUpdate = ["server/app.ts", "client/src/main.tsx", "client/src/hooks/useAuth.tsx"];

  for (const file of filesToUpdate) {
    const filePath = path.join(rootDir, file);
    if (await fileExists(filePath)) {
      try {
        let content = await fs.readFile(filePath, "utf-8");
        let updated = false;

        // Remove imports for deleted files
        const oldImports = [
          /import.*from.*["']\.\.\/routes\/clerk["'];?\n/g,
          /import.*from.*["']\.\.\/routes\/subscription["'];?\n/g,
          /import.*from.*["']\.\.\/middleware\/clerkAuth["'];?\n/g,
          /import.*from.*["']\.\.\/lib\/supabase["'];?\n/g,
        ];

        oldImports.forEach(regex => {
          if (regex.test(content)) {
            content = content.replace(regex, "");
            updated = true;
          }
        });

        // Remove route usage for deleted routes
        const oldRoutes = [
          /app\.use\(["']\/api\/clerk["'], clerkRouter\);?\n/g,
          /app\.use\(["']\/api\/subscription["'], subscriptionRouter\);?\n/g,
        ];

        oldRoutes.forEach(regex => {
          if (regex.test(content)) {
            content = content.replace(regex, "");
            updated = true;
          }
        });

        if (updated) {
          await fs.writeFile(filePath, content);
          console.log(`✅ Updated imports in: ${file}`);
        }
      } catch (error) {
        console.error(`❌ Error updating ${file}:`, error.message);
      }
    }
  }
}

async function validateTypeScript() {
  console.log("🔍 Validating TypeScript configuration...");

  const tsconfigPath = path.join(rootDir, "tsconfig.json");
  if (await fileExists(tsconfigPath)) {
    try {
      const content = await fs.readFile(tsconfigPath, "utf-8");
      const tsconfig = JSON.parse(content);

      // Ensure strict mode is enabled
      if (!tsconfig.compilerOptions) {
        tsconfig.compilerOptions = {};
      }

      const requiredOptions = {
        strict: true,
        noImplicitAny: true,
        noImplicitReturns: true,
        noUnusedLocals: false, // Can be noisy in development
        noUnusedParameters: false, // Can be noisy in development
      };

      let updated = false;
      Object.entries(requiredOptions).forEach(([key, value]) => {
        if (tsconfig.compilerOptions[key] !== value) {
          tsconfig.compilerOptions[key] = value;
          updated = true;
        }
      });

      if (updated) {
        await fs.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));
        console.log("✅ Updated TypeScript configuration");
      } else {
        console.log("✅ TypeScript configuration is already optimal");
      }
    } catch (error) {
      console.error("❌ Error validating TypeScript config:", error.message);
    }
  }
}

async function createMigrationGuide() {
  console.log("📝 Creating migration guide...");

  const guideContent = `# Convex and Clerk Integration Migration Guide

## What was changed:

### ✅ Added:
- \`convex/clerk/webhooks.ts\` - Proper Clerk webhook handler
- \`convex/sync/woocommerce.ts\` - WooCommerce to Convex sync
- \`server/services/WooCommerceService.ts\` - Clean WooCommerce integration
- \`client/src/hooks/useConvex.ts\` - TypeScript-safe Convex hooks
- \`client/src/lib/convex.ts\` - Centralized Convex configuration

### 🔄 Updated:
- \`convex/users.ts\` - Added internal mutations for Clerk webhooks
- \`convex/http.ts\` - Proper webhook routing
- \`convex/auth.config.ts\` - Environment-aware configuration
- \`server/routes/woo.ts\` - Added sync endpoints
- \`client/src/main.tsx\` - Cleaner Convex/Clerk setup

### ❌ Removed:
- Redundant Clerk route handlers
- Old Supabase integration files
- Duplicate subscription management (using Clerk Billing)

## Next Steps:

1. **Update your Clerk webhook URL** to point to:
   - Development: \`https://your-convex-url.convex.cloud/clerk-webhook\`
   - Production: \`https://your-convex-url.convex.cloud/clerk-webhook\`

2. **Test the integration**:
   \`\`\`bash
   # Sync products from WooCommerce to Convex
   curl -X POST http://localhost:5000/api/woo/sync/products \\
     -H "Content-Type: application/json" \\
     -d '{"page": 1, "perPage": 10}'
   \`\`\`

3. **Update your environment variables**:
   - Ensure \`CLERK_WEBHOOK_SECRET\` is set
   - Verify \`VITE_CONVEX_URL\` points to correct deployment
   - Check WooCommerce API credentials

4. **Deploy Convex functions**:
   \`\`\`bash
   npx convex deploy
   \`\`\`

## Benefits:

- ✅ Proper TypeScript support throughout
- ✅ Real-time data synchronization with Convex
- ✅ Clean separation of concerns
- ✅ Maintained WooCommerce compatibility
- ✅ Reduced code duplication
- ✅ Better error handling and logging

## Troubleshooting:

If you encounter issues:
1. Check Convex deployment status: \`npx convex dev\`
2. Verify Clerk webhook configuration
3. Test WooCommerce API connectivity
4. Check browser console for client-side errors
`;

  const guidePath = path.join(rootDir, "CONVEX_CLERK_MIGRATION.md");
  await fs.writeFile(guidePath, guideContent);
  console.log("✅ Created migration guide: CONVEX_CLERK_MIGRATION.md");
}

async function main() {
  try {
    await cleanupRedundantFiles();
    await updateImports();
    await validateTypeScript();
    await createMigrationGuide();

    console.log("\n🎉 Cleanup completed successfully!");
    console.log("\n📋 Next steps:");
    console.log("1. Review CONVEX_CLERK_MIGRATION.md");
    console.log("2. Update Clerk webhook URL");
    console.log("3. Deploy Convex functions: npx convex deploy");
    console.log("4. Test the integration");
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  }
}

main();
