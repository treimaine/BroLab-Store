// Quick test to verify pages load without errors
const http = require("http");

const testUrls = ["http://localhost:5000/custom-beats", "http://localhost:5000/mixing-mastering"];

async function testPage(url) {
  return new Promise(resolve => {
    const req = http.get(url, res => {
      let data = "";
      res.on("data", chunk => {
        data += chunk;
      });
      res.on("end", () => {
        const hasError =
          data.includes("Temporary Glitch") || data.includes("error") || res.statusCode >= 400;
        resolve({
          url,
          status: res.statusCode,
          hasError,
          success: !hasError && res.statusCode === 200,
        });
      });
    });

    req.on("error", err => {
      resolve({
        url,
        status: "ERROR",
        hasError: true,
        success: false,
        error: err.message,
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        url,
        status: "TIMEOUT",
        hasError: true,
        success: false,
        error: "Request timeout",
      });
    });
  });
}

async function runTests() {
  console.log("🧪 Testing pages...\n");

  for (const url of testUrls) {
    const result = await testPage(url);
    const status = result.success ? "✅" : "❌";
    console.log(`${status} ${url}`);
    console.log(`   Status: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.hasError && !result.error) {
      console.log(`   Warning: Page may contain error content`);
    }
    console.log("");
  }
}

runTests().catch(console.error);
