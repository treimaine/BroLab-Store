// Cart utilities and types
import { LicensePricing } from "@/../../shared/schema";
export interface CartItem {
  beatId: number;
  title: string;
  genre: string;
  imageUrl?: string;
  licenseType: "basic" | "premium" | "unlimited";
  quantity: number;
  price?: number;
  isFree?: boolean; // Nouveau champ pour détecter les produits gratuits
}

export interface License {
  type: "basic" | "premium" | "unlimited";
  name: string;
  price: number;
  features: string[];
  downloads: number;
  streams: number | string;
  sales: number | string;
  stems: boolean;
  exclusive: boolean;
}

export const LICENSES: License[] = [
  {
    type: "basic",
    name: "Basic License (MP3)",
    price: LicensePricing.basic,
    features: [
      "MP3 included",
      "Up to 50,000 audio streams",
      "Distribute up to 2,500 copies",
      "Producer credit required",
    ],
    downloads: 2500,
    streams: 50000,
    sales: 2500,
    stems: false,
    exclusive: false,
  },
  {
    type: "premium",
    name: "Premium License (WAV)",
    price: LicensePricing.premium,
    features: [
      "MP3 + WAV included",
      "Up to 150,000 audio streams",
      "Distribute up to 2,500 copies",
      "Radio play permitted",
    ],
    downloads: 2500,
    streams: 150000,
    sales: 2500,
    stems: false,
    exclusive: false,
  },
  {
    type: "unlimited",
    name: "Unlimited License",
    price: LicensePricing.unlimited,
    features: [
      "MP3 + WAV + stems included",
      "Unlimited audio streams",
      "Unlimited copies distribution",
      "Paid performances allowed",
    ],
    downloads: 999999,
    streams: "Unlimited",
    sales: "Unlimited",
    stems: true,
    exclusive: false,
  },
];

// Ligne 53 - S'assurer que le prix est un nombre
export const getLicensePrice = (licenseType: string): number => {
  const license = LICENSES.find(l => l.type === licenseType);
  return license ? Number(license.price) : 0; // Conversion explicite en nombre
};

export const formatPrice = (price: number): string => {
  return `$${price.toFixed(2)}`;
};

export const calculateCartTotal = (items: CartItem[]): number => {
  return items.reduce((total, item) => {
    const price = item.price || getLicensePrice(item.licenseType);
    return total + price * item.quantity;
  }, 0);
};

// Cart interface for the shopping cart
export interface Cart {
  items: CartItem[];
  total: number;
  subtotal: number; // Alias pour total (compatibilité)
  itemCount: number;
}

// Cart manager for localStorage persistence
class CartManager {
  private static STORAGE_KEY = "brolab_cart";

  getCart(): Cart {
    try {
      const stored = localStorage.getItem(CartManager.STORAGE_KEY);
      const items: CartItem[] = stored ? JSON.parse(stored) : [];
      const total = calculateCartTotal(items);
      return {
        items,
        total,
        subtotal: total, // Alias pour compatibilité
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      };
    } catch {
      return { items: [], total: 0, subtotal: 0, itemCount: 0 };
    }
  }

  private saveCart(items: CartItem[]): void {
    localStorage.setItem(CartManager.STORAGE_KEY, JSON.stringify(items));
  }

  addItem(newItem: Omit<CartItem, "price">) {
    const cart = this.getCart();
    const price = getLicensePrice(newItem.licenseType);

    // Empêcher l'ajout de produits gratuits au panier
    if (newItem.isFree || price === 0) {
      console.warn("🚨 Tentative d'ajout d'un produit gratuit au panier:", newItem.title);
      throw new Error(
        'Les produits gratuits ne peuvent pas être ajoutés au panier. Utilisez le bouton "Download" directement.'
      );
    }

    // CRITICAL: Validate pricing before adding to cart
    if (price < 29.99) {
      console.error("🚨 INVALID PRICING DETECTED:", price, "for license:", newItem.licenseType);
      console.error("Expected: Basic=$29.99, Premium=$49.99, Unlimited=$149.99");
      throw new Error(
        `Invalid pricing: ${newItem.licenseType} license should be at least $29.99, got $${price}`
      );
    }

    console.log("✅ Adding item with correct price:", price, "for license:", newItem.licenseType);

    // Check if item already exists
    const existingIndex = cart.items.findIndex(
      item => item.beatId === newItem.beatId && item.licenseType === newItem.licenseType
    );

    if (existingIndex >= 0) {
      // Update quantity and ensure correct pricing
      cart.items[existingIndex].quantity += newItem.quantity;
      cart.items[existingIndex].price = price; // Force correct price
    } else {
      // Add new item
      cart.items.push({
        ...newItem,
        price,
      });
    }

    this.saveCart(cart.items);
  }

  updateQuantity(beatId: number, licenseType: string, quantity: number): void {
    const cart = this.getCart();
    const itemIndex = cart.items.findIndex(
      item => item.beatId === beatId && item.licenseType === licenseType
    );

    if (itemIndex >= 0) {
      if (quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = quantity;
      }
      this.saveCart(cart.items);
    }
  }

  removeItem(beatId: number, licenseType: string): void {
    const cart = this.getCart();
    const updatedItems = cart.items.filter(
      item => !(item.beatId === beatId && item.licenseType === licenseType)
    );
    this.saveCart(updatedItems);
  }

  updateLicense(beatId: number, oldLicense: string, newLicense: string): void {
    const cart = this.getCart();
    const itemIndex = cart.items.findIndex(
      item => item.beatId === beatId && item.licenseType === oldLicense
    );

    if (itemIndex >= 0) {
      cart.items[itemIndex].licenseType = newLicense as CartItem["licenseType"];
      cart.items[itemIndex].price = getLicensePrice(newLicense);
      this.saveCart(cart.items);
    }
  }

  clearCart(): void {
    this.saveCart([]);
  }

  // Force refresh cart with updated pricing
  refreshCartPricing(): void {
    const cart = this.getCart();
    const updatedItems = cart.items.map(item => ({
      ...item,
      price: getLicensePrice(item.licenseType), // Update to new pricing
    }));
    this.saveCart(updatedItems);
  }

  getItemCount(): number {
    return this.getCart().itemCount;
  }
}

export const cartManager = new CartManager();

// Export for backward compatibility
export { cartManager as default };
