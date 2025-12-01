/**
 * Dashboard Real-time Context
 *
 * Context and type definitions for real-time dashboard updates.
 * Separated from the provider component for React Fast Refresh compatibility.
 */

import { createContext } from "react";

// Connection status types
export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error"
  | "reconnecting";

// Real-time event types
export type RealtimeEventType =
  | "favorite_added"
  | "favorite_removed"
  | "order_created"
  | "order_updated"
  | "download_completed"
  | "reservation_created"
  | "reservation_updated"
  | "activity_logged"
  | "stats_updated";

// Real-time event data structure
export interface RealtimeEvent {
  type: RealtimeEventType;
  userId: string;
  data: unknown;
  timestamp: number;
  id: string;
}

// Subscription configuration
export interface SubscriptionConfig {
  events: RealtimeEventType[];
  userId?: string;
  active: boolean;
}

// Optimistic update configuration
export interface OptimisticUpdate {
  id: string;
  type: RealtimeEventType;
  data: unknown;
  timestamp: number;
  rollback?: () => void;
}

// Real-time context interface
export interface RealtimeContextValue {
  // Connection state
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  lastConnected: Date | null;
  reconnectAttempts: number;

  // Event handling
  subscribe: (events: RealtimeEventType[], callback: (event: RealtimeEvent) => void) => () => void;
  emit: (event: Omit<RealtimeEvent, "id" | "timestamp">) => void;

  // Optimistic updates
  addOptimisticUpdate: (update: Omit<OptimisticUpdate, "id" | "timestamp">) => string;
  rollbackOptimisticUpdate: (id: string) => void;
  clearOptimisticUpdates: () => void;

  // Connection management
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;

  // Subscription management
  setActiveTab: (tab: string) => void;
  activeTab: string | null;
}

// Create context
export const RealtimeContext = createContext<RealtimeContextValue | null>(null);
