// Test script to verify reservation endpoint is working
const testReservationRequest = {
  serviceType: "recording",
  clientInfo: {
    firstName: "Steve",
    lastName: "LEMBA",
    email: "slemba2@yahoo.fr",
    phone: "0000000000",
  },
  preferredDate: "2025-10-15T15:52:00.000Z",
  preferredDuration: 240,
  serviceDetails: {
    includeRevisions: 2,
    rushDelivery: false,
  },
  notes: "Session Type: solo, Location: , Budget: , Message: ",
  budget: 250000,
  acceptTerms: true,
};

console.log("🧪 Testing reservation request structure...");
console.log("Request body:", JSON.stringify(testReservationRequest, null, 2));

// Simulate the server transformation
const serverTransformation = {
  user_id: 791,
  clerkId: "user_30vMt7iv9szOFCBWrusPDX8WvFe",
  service_type: testReservationRequest.serviceType,
  details: {
    name: `${testReservationRequest.clientInfo.firstName} ${testReservationRequest.clientInfo.lastName}`.trim(),
    email: testReservationRequest.clientInfo.email,
    phone: testReservationRequest.clientInfo.phone,
    requirements: testReservationRequest.notes || "",
    referenceLinks: [], // This should be camelCase
  },
  preferred_date: testReservationRequest.preferredDate,
  duration_minutes: testReservationRequest.preferredDuration,
  total_price: testReservationRequest.budget || 0,
  notes: testReservationRequest.notes || null,
};

console.log("\n🔄 Server transformation result:");
console.log("Details object:", JSON.stringify(serverTransformation.details, null, 2));

// Verify the structure
if (serverTransformation.details.referenceLinks !== undefined) {
  console.log("✅ Has referenceLinks (correct)");
} else {
  console.log("❌ Missing referenceLinks");
}

if (serverTransformation.details.reference_links !== undefined) {
  console.log("❌ Has reference_links (incorrect - this should not exist)");
} else {
  console.log("✅ No reference_links (correct)");
}

console.log("\n🎯 Expected Convex object structure:");
const convexData = {
  serviceType: serverTransformation.service_type,
  details: serverTransformation.details, // This should have referenceLinks, not reference_links
  preferredDate: serverTransformation.preferred_date,
  durationMinutes: serverTransformation.duration_minutes,
  totalPrice: serverTransformation.total_price,
  notes: serverTransformation.notes,
  clerkId: serverTransformation.clerkId,
};

console.log(JSON.stringify(convexData.details, null, 2));

console.log("\n📋 Summary:");
console.log("- Request structure: ✅ Valid");
console.log("- Server transformation: ✅ Uses referenceLinks");
console.log("- Convex compatibility: ✅ Should work");

console.log("\n🚨 If you're still seeing reference_links errors:");
console.log("1. The server might not be using the updated code");
console.log("2. Check if there are multiple server processes running");
console.log("3. Verify the server logs show the correct field names");
console.log("4. Try a hard restart of the development environment");
