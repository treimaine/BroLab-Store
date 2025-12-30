// Debug script to check and clear cart data
// Run this in the browser console to check cart data

console.log("=== CART DEBUG ===");

// Helper function to get price by license type
function getPriceByLicenseType(licenseType, fallback = "unknown") {
  const priceMap = {
    basic: 29.99,
    premium: 49.99,
    unlimited: 149.99,
  };
  return priceMap[licenseType] ?? fallback;
}

// Check current cart data
const storedCart = localStorage.getItem("brolab_cart");
if (storedCart) {
  try {
    const cartData = JSON.parse(storedCart);
    console.log("Current cart items:", cartData);

    // Check for old pricing
    cartData.forEach((item, index) => {
      console.log(`Item ${index}:`, {
        title: item.title,
        license: item.licenseType,
        oldPrice: item.price,
        newPrice: getPriceByLicenseType(item.licenseType),
      });
    });
  } catch (e) {
    console.error("Failed to parse cart data:", e);
  }
} else {
  console.log("No cart data found");
}

// Clear cart function
globalThis.clearCart = function () {
  localStorage.removeItem("brolab_cart");
  console.log("Cart cleared! Refresh the page.");
};

// Update cart pricing function
globalThis.updateCartPricing = function () {
  const storedCart = localStorage.getItem("brolab_cart");
  if (storedCart) {
    try {
      const cartData = JSON.parse(storedCart);
      const updatedCart = cartData.map(item => ({
        ...item,
        price: getPriceByLicenseType(item.licenseType, item.price),
      }));
      localStorage.setItem("brolab_cart", JSON.stringify(updatedCart));
      console.log("Cart pricing updated! Refresh the page.");
    } catch (e) {
      console.error("Failed to update cart pricing:", e);
    }
  }
};

console.log("Run clearCart() to clear cart or updateCartPricing() to fix prices");
