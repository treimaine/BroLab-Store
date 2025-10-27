import {
  useConvexAuth,
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react";
import { api } from "../../../convex/_generated/api";

export interface OrderItem {
  productId: number;
  name: string;
  price: number;
  license: string;
  quantity: number;
}

export interface CreateOrderData {
  items: OrderItem[];
  total: number;
  email: string;
  status?: string;
}

export function useOrders() {
  const { isAuthenticated } = useConvexAuth();

  // Lister les commandes avec Convex
  // @ts-ignore - Type instantiation depth issue with Convex API
  const ordersResult = useConvexQuery(api.orders.listOrders, isAuthenticated ? {} : "skip");
  const orders = ordersResult?.items || [];

  // Créer une commande avec Convex
  const createOrderMutation = useConvexMutation(api.orders.createOrder);

  const createOrder = async (orderData: CreateOrderData) => {
    if (!isAuthenticated) {
      throw new Error("Vous devez être connecté pour créer une commande");
    }

    try {
      const result = await createOrderMutation(orderData);
      return result;
    } catch (error) {
      console.error("Erreur lors de la création de la commande:", error);
      throw error;
    }
  };

  return {
    orders,
    isLoading: ordersResult === undefined,
    createOrder,
    isAuthenticated,
  };
}
