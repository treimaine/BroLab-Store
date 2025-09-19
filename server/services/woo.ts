// WooCommerce Service Functions
// WooCommerce API Service

export async function fetchWooProducts(
  filters: {
    per_page?: number;
    page?: number;
    search?: string;
    category?: string;
    status?: string;
    [key: string]: unknown;
  } = {}
) {
  try {
    // Utiliser directement les valeurs du fichier .env
    const apiUrl =
      process.env.WOOCOMMERCE_API_URL || "https://brolabentertainment.com/wp-json/wc/v3";
    const apiKey = process.env.VITE_WC_KEY || "ck_50c27e051fee70e12439a74af1777cd73b17607c";
    const apiSecret =
      process.env.WOOCOMMERCE_CONSUMER_SECRET || "cs_2dd861aba9c673a82f0dbcd6e5254b25952de699";

    console.log("🔧 WooCommerce API URL:", apiUrl);
    console.log("🔧 WooCommerce Key:", apiKey);
    console.log("🔧 WooCommerce Secret:", apiSecret);

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });

    const url = `${apiUrl}/products?${params}`;
    console.log("🔧 Fetching URL:", url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    // S'assurer qu'on retourne toujours un tableau
    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.data)) {
      return data.data;
    } else if (data && typeof data === "object") {
      console.error("WooCommerce API returned non-array data:", data);
      return [];
    } else {
      console.error("WooCommerce API returned unexpected data type:", typeof data);
      return [];
    }
  } catch (error) {
    console.error("WooCommerce API Error:", error);
    return [];
  }
}

export async function fetchWooProduct(id: string) {
  try {
    const response = await fetch(`${process.env.WOOCOMMERCE_API_URL}/products/${id}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.VITE_WC_KEY}:${process.env.WOOCOMMERCE_CONSUMER_SECRET}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
    });

    return await response.json();
  } catch (error) {
    console.error("WooCommerce Product API Error:", error);
    return null;
  }
}

export async function fetchWooCategories() {
  try {
    const response = await fetch(`${process.env.WOOCOMMERCE_API_URL}/products/categories`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.VITE_WC_KEY}:${process.env.WOOCOMMERCE_CONSUMER_SECRET}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
    });

    return await response.json();
  } catch (error) {
    console.error("WooCommerce Categories API Error:", error);
    return [];
  }
}

export async function getWooCommerceOrders() {
  try {
    const apiUrl =
      process.env.WOOCOMMERCE_API_URL || "https://brolabentertainment.com/wp-json/wc/v3";
    const apiKey = process.env.VITE_WC_KEY || "ck_50c27e051fee70e12439a74af1777cd73b17607c";
    const apiSecret =
      process.env.WOOCOMMERCE_CONSUMER_SECRET || "cs_2dd861aba9c673a82f0dbcd6e5254b25952de699";

    const url = `${apiUrl}/orders`;
    console.log("🔧 Fetching WooCommerce orders from:", url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.data)) {
      return data.data;
    } else {
      console.error("WooCommerce Orders API returned unexpected data:", data);
      return [];
    }
  } catch (error) {
    console.error("WooCommerce Orders API Error:", error);
    return [];
  }
}
