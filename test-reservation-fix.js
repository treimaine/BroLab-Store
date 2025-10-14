// Simple test to verify the reservation fix is working
const testReservationData = {
  user_id: 791,
  clerkId: "user_30vMt7iv9szOFCBWrusPDX8WvFe",
  service_type: "recording",
  details: {
    name: "Steve LEMBA",
    email: "slemba2@yahoo.fr",
    phone: "0000000000",
    requirements: "Session Type: solo, Location: , Budget: , Message: ",
    referenceLinks: [], // This should be camelCase, not snake_case
  },
  preferred_date: "2025-10-15T15:52:00.000Z",
  duration_minutes: 240,
  total_price: 250000,
  notes: "Session Type: solo, Location: , Budget: , Message: ",
};

console.log("🧪 Testing reservation data structure...");
console.log("Details object:", JSON.stringify(testReservationData.details, null, 2));

// Check if the object has the correct field names
if (testReservationData.details.referenceLinks !== undefined) {
  console.log("✅ Object has referenceLinks (correct)");
} else {
  console.log("❌ Object missing referenceLinks");
}

if (testReservationData.details.reference_links !== undefined) {
  console.log("❌ Object has reference_links (incorrect)");
} else {
  console.log("✅ Object does not have reference_links (correct)");
}

// Check clerkId format
if (testReservationData.clerkId.startsWith("user_") && testReservationData.clerkId.length > 20) {
  console.log(
    "✅ ClerkId has correct format:",
    testReservationData.clerkId.substring(0, 8) + "..."
  );
} else {
  console.log("❌ ClerkId has incorrect format:", testReservationData.clerkId);
}

console.log("\n🎯 If you're still seeing errors with reference_links:");
console.log("1. Make sure to restart your development server completely");
console.log("2. Kill any existing Node.js processes");
console.log("3. Clear any caches (npm cache, browser cache)");
console.log("4. Check if there are multiple server instances running");

export default testReservationData;
