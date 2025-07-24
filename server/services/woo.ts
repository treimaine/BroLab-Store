// WooCommerce Service Functions
// WooCommerce API Service

export async function fetchWooProducts(filters: any = {}) {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    
    const response = await fetch(`${process.env.VITE_WC_URL}/products?${params}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.VITE_WC_KEY}:${process.env.VITE_WC_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/json',
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('WooCommerce API Error:', error);
    return [];
  }
}

export async function fetchWooProduct(id: string) {
  try {
    const response = await fetch(`${process.env.VITE_WC_URL}/products/${id}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.VITE_WC_KEY}:${process.env.VITE_WC_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/json',
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('WooCommerce Product API Error:', error);
    return null;
  }
}

export async function fetchWooCategories() {
  try {
    const response = await fetch(`${process.env.VITE_WC_URL}/products/categories`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.VITE_WC_KEY}:${process.env.VITE_WC_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/json',
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('WooCommerce Categories API Error:', error);
    return [];
  }
}