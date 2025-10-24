/**
 * Script de test pour vérifier la synchronisation des prix
 */

const testOrders = [
  {
    id: 12345,
    status: "completed",
    total: "50.00",
    currency: "USD",
    customerId: 1,
    customerEmail: "test@example.com",
    items: [
      {
        productId: 101,
        name: "AURORA Vol.1",
        quantity: 1,
        total: "50.00",
        price: 50.0, // Prix unitaire correct
        license: "premium",
      },
    ],
    createdAt: "2025-01-19T10:00:00Z",
    updatedAt: "2025-01-19T10:00:00Z",
  },
  {
    id: 12346,
    status: "completed",
    total: "0.00",
    currency: "USD",
    customerId: 2,
    customerEmail: "test2@example.com",
    items: [
      {
        productId: 102,
        name: "ELEVATE - Free Beat",
        quantity: 1,
        total: "0.00",
        price: 0.0, // Beat gratuit
        license: "basic",
      },
    ],
    createdAt: "2025-01-19T11:00:00Z",
    updatedAt: "2025-01-19T11:00:00Z",
  },
];

console.log("Test data for price synchronization:");
console.log(JSON.stringify(testOrders, null, 2));

// Vérifier que les prix sont corrects
testOrders.forEach(order => {
  console.log(`\nOrder ${order.id}:`);
  order.items.forEach(item => {
    console.log(`  - ${item.name}: $${item.price} (${item.price === 0 ? "FREE" : "PAID"})`);

    // Vérifier la cohérence
    const expectedTotal = (item.price * item.quantity).toFixed(2);
    if (expectedTotal !== order.total) {
      console.warn(`    ⚠️  Price mismatch: expected ${expectedTotal}, got ${order.total}`);
    } else {
      console.log(`    ✅ Price correct`);
    }
  });
});
