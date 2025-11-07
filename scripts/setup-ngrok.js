#!/usr/bin/env node

/**
 * ngrok Setup Helper Script
 * Checks if ngrok is installed and provides setup instructions
 */

import { execSync } from "child_process";
import { platform } from "os";

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkNgrokInstalled() {
  try {
    const version = execSync("ngrok version", { encoding: "utf-8" });
    return version.trim();
  } catch (error) {
    return null;
  }
}

function getInstallInstructions() {
  const os = platform();

  if (os === "win32") {
    return `
${colors.bright}Windows Installation Options:${colors.reset}

${colors.cyan}Option 1: Chocolatey (Recommended)${colors.reset}
  choco install ngrok

${colors.cyan}Option 2: Manual Download${colors.reset}
  1. Download from: https://ngrok.com/download
  2. Extract ngrok.exe to C:\\ngrok
  3. Add C:\\ngrok to your PATH environment variable
  4. Restart your terminal

${colors.cyan}Option 3: Scoop${colors.reset}
  scoop install ngrok
`;
  } else if (os === "darwin") {
    return `
${colors.bright}macOS Installation:${colors.reset}

${colors.cyan}Homebrew:${colors.reset}
  brew install ngrok/ngrok/ngrok
`;
  } else {
    return `
${colors.bright}Linux Installation:${colors.reset}

${colors.cyan}Download and Install:${colors.reset}
  curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
  echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
  sudo apt update && sudo apt install ngrok
`;
  }
}

function main() {
  log("\n🔧 ngrok Setup Helper\n", colors.bright);

  const version = checkNgrokInstalled();

  if (version) {
    log(`✅ ngrok is installed: ${version}`, colors.green);
    log("\n📋 Next Steps:\n", colors.bright);
    log("1. Create a free ngrok account: https://dashboard.ngrok.com/signup");
    log("2. Get your authtoken: https://dashboard.ngrok.com/get-started/your-authtoken");
    log("3. Configure ngrok:");
    log("   ngrok config add-authtoken YOUR_AUTH_TOKEN", colors.cyan);
    log("\n4. Start your Express server:");
    log("   npm run dev", colors.cyan);
    log("\n5. In a new terminal, start ngrok:");
    log("   ngrok http 5000", colors.cyan);
    log("\n6. Copy the HTTPS forwarding URL (e.g., https://abc123.ngrok.io)");
    log("\n7. Update Clerk Dashboard webhook URL:");
    log("   https://YOUR-NGROK-URL.ngrok.io/api/webhooks/clerk-billing", colors.cyan);
    log("\n📚 Full guide: docs/NGROK_SETUP_GUIDE.md\n");
  } else {
    log("❌ ngrok is not installed\n", colors.red);
    log(getInstallInstructions());
    log(`\n${colors.bright}After Installation:${colors.reset}`);
    log("1. Restart your terminal");
    log("2. Run this script again: npm run setup:ngrok");
    log("3. Follow the setup steps\n");
  }
}

main();
