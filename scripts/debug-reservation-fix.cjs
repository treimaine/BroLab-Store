#!/usr/bin/env node

/**
 * Debug script to verify reservation system fix
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 Debugging Reservation System Fix...\n");

// Check if the server files have the correct field names
const filesToCheck = ["server/routes/reservations.ts", "shared/schema.ts", "server/lib/db.ts"];

let allFilesCorrect = true;

filesToCheck.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf8");

    console.log(`📁 Checking ${filePath}:`);

    // Check for correct field name (referenceLinks)
    const hasCorrectField = content.includes("referenceLinks");
    const hasIncorrectField = content.includes("reference_links");

    if (hasCorrectField && !hasIncorrectField) {
      console.log("  ✅ Uses correct field name: referenceLinks");
    } else if (hasIncorrectField) {
      console.log("  ❌ Still contains incorrect field name: reference_links");
      allFilesCorrect = false;
    } else {
      console.log("  ⚠️  No field name found (might be OK)");
    }

    console.log("");
  } else {
    console.log(`❌ File not found: ${filePath}\n`);
    allFilesCorrect = false;
  }
});

if (allFilesCorrect) {
  console.log("✅ All files have correct field names!");
  console.log("\n🔄 If you're still seeing errors, please:");
  console.log("1. Restart the development server (npm run dev)");
  console.log("2. Clear any browser cache");
  console.log("3. Check if there are multiple server instances running");
} else {
  console.log("❌ Some files still have incorrect field names.");
  console.log("Please check the files marked with ❌ above.");
}

console.log("\n🧪 Running a quick test...");

// Create a test reservation object to verify the structure
const testReservationData = {
  user_id: 123,
  clerkId: "user_test123",
  service_type: "mixing",
  details: {
    name: "Test User",
    email: "test@example.com",
    phone: "1234567890",
    requirements: "Test requirements",
    referenceLinks: [], // This should be camelCase
  },
  preferred_date: "2025-10-15T09:00:00.000Z",
  duration_minutes: 180,
  total_price: 15000,
  notes: "Test notes",
};

console.log("📋 Test reservation object structure:");
console.log(JSON.stringify(testReservationData.details, null, 2));

if (
  testReservationData.details.referenceLinks !== undefined &&
  testReservationData.details.reference_links === undefined
) {
  console.log("✅ Test object has correct field name structure");
} else {
  console.log("❌ Test object has incorrect field name structure");
}

console.log("\n🎯 Next steps:");
console.log("1. Restart your development server");
console.log("2. Try creating a reservation again");
console.log("3. If the error persists, check the server logs for any cached code");
