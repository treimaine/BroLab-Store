#!/usr/bin/env node

/**
 * Test Clerk Billing Webhook Locally
 * Tests the webhook endpoint without needing ngrok
 */

import http from "node:http";

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

function testWebhook(eventType = "subscription.created") {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      type: eventType,
      data: {
        id: "sub_test123",
        user_id: "user_test456",
        plan_id: "basic",
        status: "active",
      },
    });

    const options = {
      hostname: "localhost",
      port: 5000,
      path: "/api/webhooks/clerk-billing",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        "svix-id": "msg_test",
        "svix-timestamp": Math.floor(Date.now() / 1000).toString(),
        "svix-signature": "v1,test_signature",
      },
    };

    const req = http.request(options, res => {
      let data = "";

      res.on("data", chunk => {
        data += chunk;
      });

      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on("error", error => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    req.write(payload);
    req.end();
  });
}

async function main() {
  log("\n🧪 Testing Clerk Billing Webhook Locally\n", colors.bright);

  try {
    log("📡 Sending test webhook to http://localhost:5000/api/webhooks/clerk-billing");
    log("📋 Event type: subscription.created\n");

    const response = await testWebhook("subscription.created");

    log(`${colors.bright}Response:${colors.reset}`);
    log(`Status: ${response.statusCode}`, response.statusCode === 200 ? colors.green : colors.red);

    try {
      const body = JSON.parse(response.body);
      log("\nBody:", colors.cyan);
      console.log(JSON.stringify(body, null, 2));

      if (response.statusCode === 200) {
        log("\n✅ Webhook endpoint is working!", colors.green);
        log("\n📝 Next steps:");
        log("1. Check your Express server logs for webhook processing details");
        log("2. Update Clerk Dashboard with your ngrok URL");
        log("3. Test from Clerk Dashboard with 'Send Test Event'\n");
      } else if (response.statusCode === 404) {
        log("\n❌ 404 Not Found - Route not registered", colors.red);
        log("\n🔧 Solutions:");
        log("1. Restart your Express server: npm run dev");
        log("2. Verify route in server/routes/index.ts");
        log("3. Check for TypeScript errors: npm run type-check\n");
      } else {
        log("\n⚠️ Unexpected response", colors.yellow);
        log("Check your Express server logs for details\n");
      }
    } catch (e) {
      log("\nRaw response:", colors.yellow);
      console.log(response.body);
    }
  } catch (error) {
    log("\n❌ Failed to connect to server", colors.red);
    log("\n🔧 Make sure your Express server is running:");
    log("   npm run dev", colors.cyan);
    log("\nError:", colors.yellow);
    console.log(error.message);
    log("");
    process.exit(1);
  }
}

main();
