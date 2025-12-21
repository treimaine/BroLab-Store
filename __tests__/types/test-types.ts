/**
 * Shared test types for type-safe mocking
 */

// WebSocket mock types
export interface MockWebSocketInstance {
  readyState: number;
  url: string;
  onopen: ((event: Event) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  send: (data: string) => void;
  close: () => void;
}

export type MockWebSocketConstructor = new (url: string) => MockWebSocketInstance;

// Connection status types
export interface ConnectionStatus {
  type: "websocket" | "polling" | "offline";
  connected: boolean;
  latency?: number;
  lastConnected?: number;
}

// Mock Convex client types
export interface MockConvexClient {
  query: jest.Mock;
  mutation: jest.Mock;
}

// Mock fetch response types
export interface MockFetchResponse {
  ok: boolean;
  json: () => Promise<unknown>;
  status?: number;
  statusText?: string;
}

// Performance mock types
export interface MockPerformance {
  now: jest.Mock<number>;
}

// Clerk user mock types
export interface MockClerkUser {
  id: string;
  emailAddresses: Array<{ emailAddress: string }>;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  username?: string;
}

export interface MockUseUserReturn {
  user: MockClerkUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
}

// Dashboard stats types
export interface MockDashboardStats {
  totalFavorites: number;
  totalDownloads: number;
  totalOrders: number;
  totalSpent: number;
  recentActivity: number;
  quotaUsed: number;
  quotaLimit: number;
  monthlyDownloads: number;
  monthlyOrders: number;
  monthlyRevenue: number;
}

// Integrity rule types
export interface IntegrityRule {
  name: string;
  description: string;
  severity: "low" | "medium" | "high";
  validator: (data: Record<string, unknown>) => boolean;
}

// Integrity violation types
export interface IntegrityViolation {
  resourceId: string;
  resourceType: string;
  rule: string;
  description: string;
  severity: "low" | "medium" | "high";
  timestamp: number;
  data: Record<string, unknown>;
}

// Rollback operation types
export interface RollbackOperation {
  id: string;
  operationType: string;
  resourceId: string;
  timestamp: number;
  canRollback: boolean;
  dependencies?: string[];
  metadata: {
    expiresAt: number;
    [key: string]: unknown;
  };
}

// Sync operation types
export interface SyncOperation {
  type: string;
  resourceId: string;
  currentState: Record<string, unknown>;
  newState: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// Consistency metrics types
export interface ConsistencyMetrics {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  passRate: number;
  totalViolations: number;
  resolvedViolations: number;
  pendingViolations: number;
  alertsTriggered: number;
  alertsResolved: number;
}

// Operation with timing types
export interface TimedOperation {
  id: string;
  startTime: number;
  endTime?: number;
}

// Offline manager hook result types
export interface OfflineManagerResult {
  isOnline: boolean;
  isOfflineMode: boolean;
  queueOperation: (operation: unknown) => void;
  applyOptimisticUpdate: (update: unknown) => void;
  confirmUpdate: (id: string) => void;
  rollbackUpdate: (id: string) => void;
  addToCartOffline: (item: unknown) => void;
  removeFromCartOffline: (id: string) => void;
  toggleFavoriteOffline: (id: string) => void;
  startDownloadOffline: (id: string) => void;
  syncNow: () => Promise<void>;
  clearCompleted: () => void;
}

// Helper type for creating mock functions with proper typing
export type TypedMockFn<T extends (...args: unknown[]) => unknown> = jest.Mock<
  ReturnType<T>,
  Parameters<T>
>;

// Helper to create typed mock Convex client
export function createMockConvexClient(): MockConvexClient {
  return {
    query: jest.fn(),
    mutation: jest.fn(),
  };
}

// WebSocket readyState constants as numbers (avoiding type conflicts with WebSocket constants)
const WS_CONNECTING = 0;
const WS_OPEN = 1;
const WS_CLOSED = 3;

// Helper to create mock WebSocket class
export function createMockWebSocketClass(options?: {
  shouldFail?: boolean;
  failDelay?: number;
  connectDelay?: number;
}): MockWebSocketConstructor {
  const { shouldFail = false, failDelay = 5, connectDelay = 10 } = options ?? {};

  return class MockWebSocket implements MockWebSocketInstance {
    public readyState: number = WS_CONNECTING;
    public onopen: ((event: Event) => void) | null = null;
    public onclose: ((event: CloseEvent) => void) | null = null;
    public onmessage: ((event: MessageEvent) => void) | null = null;
    public onerror: ((event: Event) => void) | null = null;

    constructor(public url: string) {
      if (shouldFail) {
        setTimeout(() => {
          if (this.onerror) {
            this.onerror(new Event("error"));
          }
        }, failDelay);
      } else {
        setTimeout(() => {
          this.readyState = WS_OPEN;
          if (this.onopen) {
            this.onopen(new Event("open"));
          }
        }, connectDelay);
      }
    }

    send(data: string): void {
      if (this.readyState !== WS_OPEN) {
        throw new Error("WebSocket is not open");
      }
      // Echo message for testing
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage(new MessageEvent("message", { data }));
        }
      }, 5);
    }

    close(): void {
      this.readyState = WS_CLOSED;
      if (this.onclose) {
        this.onclose(new CloseEvent("close"));
      }
    }
  } as MockWebSocketConstructor;
}

// Helper to create mock performance object
export function createMockPerformance(): MockPerformance {
  return {
    now: jest.fn(() => Date.now()),
  };
}

// Helper to create mock Clerk user
export function createMockClerkUser(overrides?: Partial<MockClerkUser>): MockClerkUser {
  return {
    id: "user_123",
    emailAddresses: [{ emailAddress: "test@example.com" }],
    firstName: "John",
    lastName: "Doe",
    imageUrl: "https://example.com/avatar.jpg",
    username: "john_doe",
    ...overrides,
  };
}
