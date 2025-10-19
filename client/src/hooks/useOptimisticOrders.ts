/**
 * Optimistic Orders Hook
 *
 * Provides optimistic updates for orders with rollback capability.
 *
 * Requirements addressed:
 * - 4.2: Optimistic updates for orders with rollback capability
 * - 4.1: Real-time updates without full page refreshes
 */

import { useOptimisticUpdates, useRealtimeContext } from "@/providers/DashboardRealtimeProvider";
import type { Order, OrderItem, OrderStatus } from "@shared/types/dashboard";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

export interface OptimisticOrdersHook {
  // Actions
  createOrder: (orderData: Partial<Order>) => Promise<string>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;

  // State
  pendingOperations: Set<string>;
  isOptimistic: (orderId: string) => boolean;

  // Error handling
  rollbackOrder: (orderId: string) => void;
  clearPendingOperations: () => void;
}

export function useOptimisticOrders(): OptimisticOrdersHook {
  const queryClient = useQueryClient();
  const { addOptimisticUpdate, rollbackOptimisticUpdate } = useOptimisticUpdates();
  const { emit } = useRealtimeContext();
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());
  const [optimisticIds, setOptimisticIds] = useState<Set<string>>(new Set());

  // Create order with optimistic update
  const createOrder = useCallback(
    async (orderData: Partial<Order>): Promise<string> => {
      const tempId = `temp-order-${Date.now()}`;
      const now = new Date().toISOString();

      const optimisticOrder: Order = {
        id: tempId,
        orderNumber: `ORD-${Date.now()}`,
        items: orderData.items || [],
        total: orderData.total || 0,
        currency: orderData.currency || "USD",
        status: "pending",
        paymentMethod: orderData.paymentMethod,
        paymentStatus: "pending",
        createdAt: now,
        updatedAt: now,
        invoiceUrl: orderData.invoiceUrl,
        ...orderData,
      };

      // Add to pending operations
      setPendingOperations(prev => new Set(prev).add(tempId));
      setOptimisticIds(prev => new Set(prev).add(tempId));

      // Apply optimistic update
      const updateId = addOptimisticUpdate({
        type: "order_created",
        data: optimisticOrder,
        rollback: () => {
          // Remove from query cache
          queryClient.setQueryData(["convex", "dashboard.getDashboardData"], (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              orders: oldData.orders.filter((order: Order) => order.id !== tempId),
              stats: {
                ...oldData.stats,
                totalOrders: Math.max(0, oldData.stats.totalOrders - 1),
                totalSpent: Math.max(0, oldData.stats.totalSpent - optimisticOrder.total),
              },
            };
          });
        },
      });

      try {
        // Emit real-time event
        emit({
          type: "order_created",
          userId: "current-user", // This would come from useUser()
          data: optimisticOrder,
        });

        // In a real implementation, this would call a Convex mutation
        // For now, we'll simulate the API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Success - remove from pending operations
        setPendingOperations(prev => {
          const newSet = new Set(prev);
          newSet.delete(tempId);
          return newSet;
        });

        // Invalidate queries to get the real data
        await queryClient.invalidateQueries({
          queryKey: ["convex", "orders"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["convex", "dashboard.getDashboardData"],
        });

        return tempId; // In real implementation, this would be the actual order ID
      } catch (error) {
        console.error("Failed to create order:", error);

        // Rollback optimistic update
        rollbackOptimisticUpdate(updateId);

        // Remove from pending operations
        setPendingOperations(prev => {
          const newSet = new Set(prev);
          newSet.delete(tempId);
          return newSet;
        });
        setOptimisticIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(tempId);
          return newSet;
        });

        throw error;
      }
    },
    [addOptimisticUpdate, rollbackOptimisticUpdate, emit, queryClient]
  );

  // Update order status with optimistic update
  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      // Get current order data for rollback
      const currentData = queryClient.getQueryData(["convex", "dashboard.getDashboardData"]) as any;
      const orderToUpdate = currentData?.orders?.find((order: Order) => order.id === orderId);

      if (!orderToUpdate) {
        console.warn("Order not found for status update:", orderId);
        return;
      }

      const previousStatus = orderToUpdate.status;

      // Add to pending operations
      setPendingOperations(prev => new Set(prev).add(orderId));

      // Apply optimistic update
      const updateId = addOptimisticUpdate({
        type: "order_updated",
        data: { id: orderId, status, updatedAt: new Date().toISOString() },
        rollback: () => {
          // Restore previous status in query cache
          queryClient.setQueryData(["convex", "dashboard.getDashboardData"], (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              orders: oldData.orders.map((order: Order) =>
                order.id === orderId ? { ...order, status: previousStatus } : order
              ),
            };
          });
        },
      });

      // Update order status in cache immediately
      queryClient.setQueryData(["convex", "dashboard.getDashboardData"], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          orders: oldData.orders.map((order: Order) =>
            order.id === orderId ? { ...order, status, updatedAt: new Date().toISOString() } : order
          ),
        };
      });

      try {
        // Emit real-time event
        emit({
          type: "order_updated",
          userId: "current-user", // This would come from useUser()
          data: { id: orderId, status, previousStatus },
        });

        // In a real implementation, this would call a Convex mutation
        // For now, we'll simulate the API call
        await new Promise(resolve => setTimeout(resolve, 800));

        // Success - remove from pending operations
        setPendingOperations(prev => {
          const newSet = new Set(prev);
          newSet.delete(orderId);
          return newSet;
        });

        // Invalidate queries to get the real data
        await queryClient.invalidateQueries({
          queryKey: ["convex", "orders"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["convex", "dashboard.getDashboardData"],
        });
      } catch (error) {
        console.error("Failed to update order status:", error);

        // Rollback optimistic update
        rollbackOptimisticUpdate(updateId);

        // Remove from pending operations
        setPendingOperations(prev => {
          const newSet = new Set(prev);
          newSet.delete(orderId);
          return newSet;
        });

        throw error;
      }
    },
    [addOptimisticUpdate, rollbackOptimisticUpdate, emit, queryClient]
  );

  // Check if an order is optimistic (temporary)
  const isOptimistic = useCallback(
    (orderId: string) => {
      return optimisticIds.has(orderId);
    },
    [optimisticIds]
  );

  // Rollback a specific order
  const rollbackOrder = useCallback((orderId: string) => {
    // This would rollback the specific order update
    // For now, we'll just remove it from pending operations
    setPendingOperations(prev => {
      const newSet = new Set(prev);
      newSet.delete(orderId);
      return newSet;
    });
    setOptimisticIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(orderId);
      return newSet;
    });
  }, []);

  // Clear all pending operations
  const clearPendingOperations = useCallback(() => {
    setPendingOperations(new Set());
    setOptimisticIds(new Set());
  }, []);

  return {
    createOrder,
    updateOrderStatus,
    pendingOperations,
    isOptimistic,
    rollbackOrder,
    clearPendingOperations,
  };
}

// Hook for checking if any order operations are pending
export function useOrdersPendingState() {
  const { pendingOperations } = useOptimisticOrders();

  return {
    hasPendingOperations: pendingOperations.size > 0,
    pendingCount: pendingOperations.size,
    isPending: (orderId: string) => pendingOperations.has(orderId),
  };
}

// Hook for order creation with cart integration
export function useOrderCreation() {
  const { createOrder } = useOptimisticOrders();

  const createOrderFromCart = useCallback(
    async (cartItems: any[], paymentData: any) => {
      const orderItems: OrderItem[] = cartItems.map(item => ({
        productId: item.beatId,
        title: item.beatTitle || `Beat ${item.beatId}`,
        price: item.price,
        quantity: item.quantity || 1,
        license: item.licenseType,
        type: "beat",
        sku: `beat-${item.beatId}-${item.licenseType}`,
        metadata: {
          beatGenre: item.beatGenre,
          beatBpm: item.beatBpm,
          beatKey: item.beatKey,
          downloadFormat: item.downloadFormat || "mp3",
          licenseTerms: item.licenseTerms,
        },
      }));

      const total = orderItems.reduce((sum, item) => sum + (item.price || 0), 0);

      const orderData: Partial<Order> = {
        items: orderItems,
        total,
        currency: "USD",
        paymentMethod: paymentData.method,
        paymentStatus: "pending",
      };

      return await createOrder(orderData);
    },
    [createOrder]
  );

  return {
    createOrder,
    createOrderFromCart,
  };
}
