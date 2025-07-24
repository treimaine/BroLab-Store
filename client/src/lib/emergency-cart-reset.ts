// Emergency cart reset utility
export const emergencyCartReset = () => {
  // Clear all possible cart storage
  localStorage.removeItem('brolab_cart');
  localStorage.removeItem('cart');
  localStorage.removeItem('shopping_cart');
  
  // Clear any other cart-related keys
  Object.keys(localStorage).forEach(key => {
    if (key.includes('cart') || key.includes('brolab')) {
      localStorage.removeItem(key);
    }
  });
  
  console.log('🚨 Emergency cart reset completed');
  
  // Reload the page to ensure clean state
  window.location.reload();
};

// Test current cart pricing
export const validateCartPricing = () => {
  const storedCart = localStorage.getItem('brolab_cart');
  if (storedCart) {
    try {
      const cartData = JSON.parse(storedCart);
      console.log('Current cart data:', cartData);
      
      cartData.forEach((item: any, index: number) => {
        console.log(`Item ${index}: ${item.title} - $${item.price} (${item.licenseType})`);
        if (item.price < 29.99) {
          console.error(`❌ INVALID PRICING: $${item.price} for ${item.licenseType}`);
          return false;
        }
      });
      return true;
    } catch (e) {
      console.error('Cart data corrupted:', e);
      return false;
    }
  }
  return true;
};

// Make these available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).emergencyCartReset = emergencyCartReset;
  (window as any).validateCartPricing = validateCartPricing;
}