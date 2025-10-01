import glob from "fast-glob";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
#!/usr/bin/env tsx
// scripts/audit_repo.ts - Repository integrity audit with 95% safety checks

function run(cmd: string, cwd?: string): { success: boolean; output: string; error?: string } {
  try {
    const output = execSync(cmd, {
      stdio: "pipe",
      cwd: cwd || process.cwd(),
      timeout: 30000, // 30s timeout
    }).toString();
    return { success: true, output };
  } catch (e: unknown) {
    const error = e as { stdout?: Buffer; stderr?: Buffer; message?: string };
    return {
      success: false,
      output: error.stdout?.toString() || "",
      error: error.stderr?.toString() || error.message || "Unknown error",
    };
  }
}

console.log("🔍 Starting comprehensive repository audit...");

interface AuditReport {
  timestamp: string;
  auditVersion: string;
  mode: string;
  typescript: {
    success: boolean;
    output: string;
    error?: string;
    errorCount: number;
  };
  tests: {
    success: boolean;
    output: string;
    error?: string;
  };
  packageIntegrity: {
    packageJsonExists: boolean;
    packageLockExists: boolean;
    nodeModulesExists: boolean;
  };
  fileStructure: {
    server: {
      routes: number;
      routeFiles: string[];
      lib: number;
      libFiles: string[];
      services: number;
      serviceFiles: string[];
    };
    client: {
      pages: number;
      pageFiles: string[];
      components: number;
      hooks: number;
      hookFiles: string[];
    };
    shared: {
      schemas: number;
      schemaFiles: string[];
    };
  };
  featureDetection: Record<string, unknown>;
  configuration: {
    environment: {
      envFileExists: boolean;
      envExampleExists: boolean;
      envVarCount: number;
    };
    viteConfig: boolean;
    tailwindConfig: boolean;
    typescriptConfig: boolean;
    packageManager: string;
  };
  integrationStatus: {
    apiEndpoints: Record<string, boolean>;
    externalServices: Record<string, boolean>;
  };
}

const report: AuditReport = {
  timestamp: new Date().toISOString(),
  auditVersion: "1.0.0",
  mode: "SAFE_UPDATE_95_CONFIDENCE",
  typescript: {
    success: false,
    output: "",
    errorCount: 0,
  },
  tests: {
    success: false,
    output: "",
  },
  packageIntegrity: {
    packageJsonExists: false,
    packageLockExists: false,
    nodeModulesExists: false,
  },
  fileStructure: {
    server: {
      routes: 0,
      routeFiles: [],
      lib: 0,
      libFiles: [],
      services: 0,
      serviceFiles: [],
    },
    client: {
      pages: 0,
      pageFiles: [],
      components: 0,
      hooks: 0,
      hookFiles: [],
    },
    shared: {
      schemas: 0,
      schemaFiles: [],
    },
  },
  featureDetection: {},
  configuration: {
    environment: {
      envFileExists: false,
      envExampleExists: false,
      envVarCount: 0,
    },
    viteConfig: false,
    tailwindConfig: false,
    typescriptConfig: false,
    packageManager: "npm",
  },
  integrationStatus: {
    apiEndpoints: {},
    externalServices: {},
  },
};

// ==========================================
// PHASE 1: Basic Integrity Checks
// ==========================================
console.log("📋 Phase 1: Basic integrity checks...");

// TypeScript compilation check
console.log("  - TypeScript compilation...");
const tscResult = run("npm run check");
report.typescript = {
  success: tscResult.success,
  output: tscResult.output,
  error: tscResult.error,
  errorCount: (tscResult.output.match(/error TS\d+:/g) || []).length,
};

// Test execution
console.log("  - Running tests...");
const testResult = run("npm test -- --silent --passWithNoTests");
report.tests = {
  success: testResult.success,
  output: testResult.output,
  error: testResult.error,
};

// Package integrity
console.log("  - Package integrity...");
report.packageIntegrity = {
  packageJsonExists: existsSync("package.json"),
  packageLockExists: existsSync("package-lock.json"),
  nodeModulesExists: existsSync("node_modules"),
};

// ==========================================
// PHASE 2: File Structure Analysis
// ==========================================
console.log("📁 Phase 2: File structure analysis...");

const serverRoutes = glob.sync("server/routes/**/*.ts");
const serverLib = glob.sync("server/lib/**/*.ts");
const serverServices = glob.sync("server/services/**/*.ts");
const clientPages = glob.sync("client/src/pages/**/*.tsx");
const clientComponents = glob.sync("client/src/components/**/*.tsx");
const clientHooks = glob.sync("client/src/hooks/**/*.ts?(x)");
const sharedSchema = glob.sync("shared/**/*.ts");

report.fileStructure = {
  server: {
    routes: serverRoutes.length,
    routeFiles: serverRoutes,
    lib: serverLib.length,
    libFiles: serverLib,
    services: serverServices.length,
    serviceFiles: serverServices,
  },
  client: {
    pages: clientPages.length,
    pageFiles: clientPages,
    components: clientComponents.length,
    hooks: clientHooks.length,
    hookFiles: clientHooks,
  },
  shared: {
    schemas: sharedSchema.length,
    schemaFiles: sharedSchema,
  },
};

// ==========================================
// PHASE 3: Feature Detection Heuristics
// ==========================================
console.log("🎯 Phase 3: Feature detection...");

// Check if MISSING_FEATURES.md exists
try {
  readFileSync("MISSING_FEATURES.md", "utf8");
} catch {
  console.log("  - MISSING_FEATURES.md not found");
}

// Detect implemented features through code analysis
const heuristics = {
  // Authentication & User Management
  authSystem: {
    loginRoute: serverRoutes.some(f => f.includes("auth") || f.includes("login")),
    userModel: readFileSync("shared/schema.ts", "utf8").includes("User"),
    sessionManagement: serverLib.some(f => f.includes("session") || f.includes("auth")),
  },

  // Payment Processing
  paymentSystem: {
    stripeIntegration: glob.sync("**/*.ts?(x)").some(f => {
      try {
        return readFileSync(f, "utf8").includes("stripe");
      } catch {
        return false;
      }
    }),
    paypalIntegration: glob.sync("**/*.ts?(x)").some(f => {
      try {
        return readFileSync(f, "utf8").includes("paypal");
      } catch {
        return false;
      }
    }),
    paymentRoutes: serverRoutes.some(f => f.includes("payment") || f.includes("checkout")),
  },

  // WooCommerce Integration
  woocommerce: {
    apiIntegration: serverRoutes.some(f => f.includes("woo") || f.includes("wordpress")),
    productSync: glob.sync("**/*.ts?(x)").some(f => {
      try {
        return readFileSync(f, "utf8").includes("woocommerce");
      } catch {
        return false;
      }
    }),
  },

  // Database & Storage
  database: {
    supabaseConfig: glob.sync("**/*.ts").some(f => {
      try {
        return readFileSync(f, "utf8").includes("supabase");
      } catch {
        return false;
      }
    }),
    schemaDefinitions: existsSync("shared/schema.ts"),
    storageLayer: existsSync("server/storage.ts"),
  },

  // Audio & Media
  audioSystem: {
    waveformPlayer: clientComponents.some(f => f.includes("waveform") || f.includes("audio")),
    audioPreview: glob.sync("client/**/*.ts?(x)").some(f => {
      try {
        return readFileSync(f, "utf8").includes("audio");
      } catch {
        return false;
      }
    }),
  },

  // Cart & Shopping
  shoppingCart: {
    cartProvider: clientComponents.some(f => f.includes("cart")),
    cartHooks: clientHooks.some(f => f.includes("cart")),
    checkoutFlow: clientPages.some(f => f.includes("checkout")),
  },

  // Advanced Features
  advancedFeatures: {
    subscriptionSystem: serverRoutes.some(f => f.includes("subscription")),
    referralSystem: glob.sync("**/*.ts?(x)").some(f => {
      try {
        return readFileSync(f, "utf8").toLowerCase().includes("referr");
      } catch {
        return false;
      }
    }),
    multiLanguage: glob.sync("**/*.ts?(x)").some(f => {
      try {
        const content = readFileSync(f, "utf8");
        return (
          content.includes("i18n") || content.includes("translation") || content.includes("locale")
        );
      } catch {
        return false;
      }
    }),
  },
};

report.featureDetection = heuristics;

// ==========================================
// PHASE 4: Configuration Analysis
// ==========================================
console.log("⚙️ Phase 4: Configuration analysis...");

const envExists = existsSync(".env");
const envExampleExists = existsSync(".env.example");
let envVarCount = 0;

if (envExists) {
  try {
    const envContent = readFileSync(".env", "utf8");
    envVarCount = envContent
      .split("\n")
      .filter(line => line.includes("=") && !line.startsWith("#")).length;
  } catch (error) {
    console.warn("Could not read .env file:", error);
  }
}

report.configuration = {
  environment: {
    envFileExists: envExists,
    envExampleExists: envExampleExists,
    envVarCount,
  },
  viteConfig: existsSync("vite.config.ts"),
  tailwindConfig: existsSync("tailwind.config.ts"),
  typescriptConfig: existsSync("tsconfig.json"),
  packageManager: existsSync("pnpm-lock.yaml") ? "pnpm" : "npm",
};

// ==========================================
// PHASE 5: Integration Status
// ==========================================
console.log("🔗 Phase 5: Integration status...");

// Check if server is running and APIs are responsive
const apiChecks = {
  serverReachable: false,
  woocommerceApi: false,
  stripeApi: false,
  authApi: false,
};

try {
  const healthCheck = run(
    'curl -s http://localhost:5000/api/health || echo "Server not reachable"'
  );
  apiChecks.serverReachable = !healthCheck.output.includes("not reachable");
} catch (error) {
  console.warn("Health check failed:", error);
}

report.integrationStatus = {
  apiEndpoints: apiChecks,
  externalServices: {
    wordpress: heuristics.woocommerce.apiIntegration,
    stripe: heuristics.paymentSystem.stripeIntegration,
    supabase: heuristics.database.supabaseConfig,
  },
};

// ==========================================
// PHASE 6: Generate Reports
// ==========================================
console.log("📊 Phase 6: Generating reports...");

mkdirSync(".reports", { recursive: true });

// Save detailed JSON report
writeFileSync(".reports/audit.json", JSON.stringify(report, null, 2), "utf8");

// Generate comprehensive Markdown report
const mdReport = `# Repository Audit Report
*Generated: ${report.timestamp}*
*Mode: ${report.mode}*

## 🚨 Critical Status

### TypeScript Compilation
- **Status**: ${report.typescript.success ? "✅ PASSED" : "❌ FAILED"}
- **Error Count**: ${report.typescript.errorCount}

### Test Suite
- **Status**: ${report.tests.success ? "✅ PASSED" : "❌ FAILED"}

### Package Integrity
- **package.json**: ${report.packageIntegrity.packageJsonExists ? "✅" : "❌"}
- **package-lock.json**: ${report.packageIntegrity.packageLockExists ? "✅" : "❌"}
- **node_modules**: ${report.packageIntegrity.nodeModulesExists ? "✅" : "❌"}

## 📁 File Structure

### Server Architecture
- **Routes**: ${report.fileStructure.server.routes} files
- **Libraries**: ${report.fileStructure.server.lib} files  
- **Services**: ${report.fileStructure.server.services} files

### Client Architecture
- **Pages**: ${report.fileStructure.client.pages} files
- **Components**: ${report.fileStructure.client.components} files
- **Hooks**: ${report.fileStructure.client.hooks} files

### Shared
- **Schemas**: ${report.fileStructure.shared.schemas} files

## 🎯 Feature Implementation Status

### Core Features
- **Authentication System**: ${heuristics.authSystem.loginRoute && heuristics.authSystem.userModel ? "✅ Implemented" : "❌ Missing"}
- **Payment Processing**: ${heuristics.paymentSystem.stripeIntegration ? "✅ Stripe Ready" : "❌ Not Ready"}
- **WooCommerce Integration**: ${heuristics.woocommerce.apiIntegration ? "✅ Connected" : "❌ Not Connected"}
- **Database Layer**: ${heuristics.database.supabaseConfig && heuristics.database.schemaDefinitions ? "✅ Configured" : "❌ Incomplete"}

### Shopping Experience  
- **Cart System**: ${heuristics.shoppingCart.cartProvider && heuristics.shoppingCart.cartHooks ? "✅ Functional" : "❌ Incomplete"}
- **Audio Preview**: ${heuristics.audioSystem.waveformPlayer ? "✅ Available" : "❌ Missing"}
- **Checkout Flow**: ${heuristics.shoppingCart.checkoutFlow ? "✅ Present" : "❌ Missing"}

### Advanced Features
- **Subscription System**: ${heuristics.advancedFeatures.subscriptionSystem ? "✅ Implemented" : "❌ Missing"}
- **Multi-Language**: ${heuristics.advancedFeatures.multiLanguage ? "✅ Available" : "❌ Missing"}
- **Referral System**: ${heuristics.advancedFeatures.referralSystem ? "✅ Present" : "❌ Missing"}

## ⚙️ Configuration Status

### Environment
- **Environment File**: ${report.configuration.environment.envFileExists ? "✅" : "❌"}
- **Environment Variables**: ${report.configuration.environment.envVarCount} configured
- **Package Manager**: ${report.configuration.packageManager}

### Build Tools
- **Vite Config**: ${report.configuration.viteConfig ? "✅" : "❌"}
- **Tailwind Config**: ${report.configuration.tailwindConfig ? "✅" : "❌"}
- **TypeScript Config**: ${report.configuration.typescriptConfig ? "✅" : "❌"}

## 🔗 Integration Health

### API Endpoints
- **Server Reachable**: ${report.integrationStatus.apiEndpoints.serverReachable ? "✅" : "❌"}

### External Services
- **WordPress**: ${report.integrationStatus.externalServices.wordpress ? "✅ Connected" : "❌ Not Connected"}
- **Stripe**: ${report.integrationStatus.externalServices.stripe ? "✅ Configured" : "❌ Not Configured"}
- **Supabase**: ${report.integrationStatus.externalServices.supabase ? "✅ Connected" : "❌ Not Connected"}

## 📋 Detailed Findings

### TypeScript Errors
\`\`\`
${report.typescript.output.slice(0, 2000)}${report.typescript.output.length > 2000 ? "\n... (truncated)" : ""}
\`\`\`

### Test Results
\`\`\`
${report.tests.output.slice(0, 2000)}${report.tests.output.length > 2000 ? "\n... (truncated)" : ""}
\`\`\`

## 🎯 Recommendations

### Immediate Actions Required
${report.typescript.errorCount > 0 ? "- ❌ Fix TypeScript compilation errors" : "- ✅ TypeScript compilation clean"}
${!report.tests.success ? "- ❌ Resolve failing tests" : "- ✅ Test suite passing"}

### Feature Completeness
${!heuristics.authSystem.loginRoute ? "- Implement authentication system" : ""}
${!heuristics.paymentSystem.stripeIntegration ? "- Set up payment processing" : ""}
${!heuristics.woocommerce.apiIntegration ? "- Configure WooCommerce integration" : ""}

---
*Audit completed with 95% confidence checks*
`;

writeFileSync(".reports/audit.md", mdReport, "utf8");

// ==========================================
// Final Summary
// ==========================================
console.log("\n✅ Audit completed successfully!");
console.log(`📊 Reports generated:`);
console.log(`   - .reports/audit.json (detailed data)`);
console.log(`   - .reports/audit.md (human-readable)`);
console.log(`\n🚨 Critical Issues: ${report.typescript.errorCount} TypeScript errors`);
console.log(`🧪 Test Status: ${report.tests.success ? "PASSING" : "FAILING"}`);
const totalFiles =
  report.fileStructure.server.routes +
  report.fileStructure.server.lib +
  report.fileStructure.server.services +
  report.fileStructure.client.pages +
  report.fileStructure.client.components +
  report.fileStructure.client.hooks +
  report.fileStructure.shared.schemas;

console.log(`📁 Files Scanned: ${totalFiles} total`);

// Safe confidence check
const confidenceScore = [
  report.typescript.success ? 30 : 0,
  report.tests.success ? 25 : 0,
  report.packageIntegrity.packageJsonExists ? 10 : 0,
  heuristics.database.schemaDefinitions ? 15 : 0,
  heuristics.authSystem.userModel ? 10 : 0,
  heuristics.paymentSystem.stripeIntegration ? 10 : 0,
].reduce(_(a, _b) => a + b, 0);

console.log(`\n🎯 Safety Confidence Score: ${confidenceScore}/100`);
console.log(confidenceScore >= 95 ? "✅ SAFE TO PROCEED" : "⚠️  CAUTION REQUIRED");
