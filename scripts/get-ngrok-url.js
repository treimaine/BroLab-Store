#!/usr/bin/env node

/**
 * Get ngrok Public URL
 * Fetches the current ngrok tunnel URL from the local API
 */

import http from "http";

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

function getNgrokUrl() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 4040,
      path: "/api/tunnels",
      method: "GET",
    };

    const req = http.request(options, res => {
      let data = "";

      res.on("data", chunk => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const tunnels = JSON.parse(data);
          resolve(tunnels);
        } catch (error) {
          reject(new Error("Failed to parse ngrok API response"));
        }
      });
    });

    req.on("error", error => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    req.end();
  });
}

async function main() {
  log("\n🔍 Checking for ngrok tunnel...\n", colors.bright);

  try {
    const data = await getNgrokUrl();

    if (!data.tunnels || data.tunnels.length === 0) {
      log("❌ No active ngrok tunnels found", colors.red);
      log("\nStart ngrok with: ngrok http 5000\n", colors.yellow);
      process.exit(1);
    }

    const httpsTunnel = data.tunnels.find(t => t.proto === "https");

    if (!httpsTunnel) {
      log("❌ No HTTPS tunnel found", colors.red);
      process.exit(1);
    }

    const publicUrl = httpsTunnel.public_url;
    const webhookUrl = `${publicUrl}/api/webhooks/clerk-billing`;

    log("✅ ngrok tunnel is active!\n", colors.green);
    log(`${colors.bright}Public URL:${colors.reset}`);
    log(`  ${publicUrl}`, colors.cyan);
    log(`\n${colors.bright}Webhook URL for Clerk Dashboard:${colors.reset}`);
    log(`  ${webhookUrl}`, colors.cyan);
    log(`\n${colors.bright}Next Steps:${colors.reset}`);
    log("1. Copy the webhook URL above");
    log("2. Go to https://dashboard.clerk.com");
    log("3. Navigate to Webhooks section");
    log("4. Update your endpoint URL");
    log("5. Enable the endpoint");
    log("6. Test with 'Send Test Event'\n");
  } catch (error) {
    log("❌ Failed to connect to ngrok API", colors.red);
    log("\nMake sure ngrok is running: ngrok http 5000", colors.yellow);
    log("ngrok API runs on http://localhost:4040\n");
    process.exit(1);
  }
}

main();
