/**
 * Cart-specific type definitions for client-side cart management
 */

export interface CartItem {
  beatId: number;
  title: string;
  price: number;
  quantity: number;
  licenseType: string;
  imageUrl?: string;
  audioUrl?: string;
}

export interface OrderDetails {
  id: string;
  status: string;
  total: number;
  items: Array<{
    title: string;
    license: string;
    price: number;
    beatId: number;
  }>;
  customerEmail: string;
}
