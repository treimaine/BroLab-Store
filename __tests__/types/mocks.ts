/**
 * Mock Type Definitions for Test Files
 *
 * This file provides properly typed mock interfaces to replace `any` types in test files.
 * These types are specifically designed for testing purposes and maintain type safety.
 */

import {
  Currency,
  LicenseType,
  OrderStatus,
  PaymentMethod,
  SubscriptionPlan,
  UserRole,
  UserStatus,
} from "../../shared/types";

// ================================
// PRODUCT MOCK TYPES
// ================================

/**
 * Mock product type for API response testing
 */
export interface MockProduct {
  id: number;
  title: string;
  price: number;
  bpm?: number;
  key?: string;
  mood?: string;
  genre?: string;
  producer?: string;
  instruments?: string[];
  tags?: MockTag[];
  timeSignature?: string;
  duration?: string;
  is_free?: boolean;
  hasVocals?: boolean;
  stems?: boolean;
  [key: string]: unknown; // For additional dynamic properties in tests
}

/**
 * Mock tag type for product testing
 */
export interface MockTag {
  id?: number;
  name: string;
  slug?: string;
}

/**
 * Mock beat product for WooCommerce integration tests
 */
export interface MockBeatProduct extends MockProduct {
  wordpressId: number;
  description: string;
  audioUrl: string;
  imageUrl: string;
  featured: boolean;
  downloads: number;
  views: number;
  isActive: boolean;
  isExclusive: boolean;
  availableLicenses: LicenseType[];
  createdAt: string;
  updatedAt: string;
}

// ================================
// USER MOCK TYPES
// ================================

/**
 * Mock user type for authentication tests
 */
export interface MockUser {
  id: number | string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  status?: UserStatus;
  subscription?: {
    plan: SubscriptionPlan;
    status: string;
  };
  [key: string]: unknown;
}

/**
 * Mock authenticated user for middleware tests
 */
export interface MockAuthenticatedUser extends MockUser {
  clerkId: string;
  isActive: boolean;
  permissions: string[];
}

// ================================
// ORDER MOCK TYPES
// ================================

/**
 * Mock order type for payment processing tests
 */
export interface MockOrder {
  id: number;
  userId?: number;
  email: string;
  total: number;
  subtotal: number;
  currency: Currency;
  status: OrderStatus;
  items: MockOrderItem[];
  payment: MockPaymentInfo;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

/**
 * Mock order item for order tests
 */
export interface MockOrderItem {
  id: number;
  productId: number;
  title: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  licenseType: LicenseType;
  [key: string]: unknown;
}

/**
 * Mock payment info for payment tests
 */
export interface MockPaymentInfo {
  method: PaymentMethod;
  status: string;
  stripePaymentIntentId?: string;
  paypalTransactionId?: string;
  last4?: string;
  brand?: string;
  [key: string]: unknown;
}

// ================================
// API MOCK TYPES
// ================================

/**
 * Mock API response type
 */
export interface MockApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    type: string;
    message: string;
    code?: string;
  };
  message?: string;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Mock request object for Express tests
 */
export interface MockRequest {
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  user?: MockAuthenticatedUser;
  session?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Mock response object for Express tests
 */
export interface MockResponse {
  status: (code: number) => MockResponse;
  json: (data: unknown) => MockResponse;
  send: (data: unknown) => MockResponse;
  end: () => void;
  locals?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Mock next function for Express middleware tests
 */
export type MockNext = (error?: Error) => void;

// ================================
// CONVEX MOCK TYPES
// ================================

/**
 * Mock Convex client for database tests
 */
export interface MockConvexClient {
  query: jest.MockedFunction<(name: string, args?: Record<string, unknown>) => Promise<unknown>>;
  mutation: jest.MockedFunction<(name: string, args?: Record<string, unknown>) => Promise<unknown>>;
  action: jest.MockedFunction<(name: string, args?: Record<string, unknown>) => Promise<unknown>>;
  [key: string]: unknown;
}

/**
 * Mock Convex function arguments
 */
export interface MockConvexArgs {
  [key: string]: unknown;
}

// ================================
// WEBHOOK MOCK TYPES
// ================================

/**
 * Mock webhook payload for security tests
 */
export interface MockWebhookPayload {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Mock Stripe webhook event
 */
export interface MockStripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
  created: number;
  livemode: boolean;
  [key: string]: unknown;
}

// ================================
// VALIDATION MOCK TYPES
// ================================

/**
 * Mock validation rule for data consistency tests
 */
export interface MockValidationRule {
  name: string;
  description: string;
  severity: "low" | "medium" | "high";
  validator: (data: Record<string, unknown>) => boolean;
  [key: string]: unknown;
}

/**
 * Mock data conflict for consistency manager tests
 */
export interface MockDataConflict {
  id: string;
  type: string;
  local: Record<string, unknown>;
  remote: Record<string, unknown>;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Mock conflict resolver function
 */
export type MockConflictResolver = (
  local: Record<string, unknown>,
  remote: Record<string, unknown>
) => Record<string, unknown>;

// ================================
// SCHEMA MARKUP MOCK TYPES
// ================================

/**
 * Mock schema property for structured data tests
 */
export interface MockSchemaProperty {
  "@type": string;
  name: string;
  value?: string | number;
  [key: string]: unknown;
}

/**
 * Mock structured data schema
 */
export interface MockStructuredDataSchema {
  "@context": string;
  "@type": string;
  additionalProperty?: MockSchemaProperty[];
  [key: string]: unknown;
}

// ================================
// UTILITY TYPES
// ================================

/**
 * Generic mock factory function type
 */
export type MockFactory<T> = (overrides?: Partial<T>) => T;

/**
 * Mock test context for setup/teardown
 */
export interface MockTestContext {
  server?: unknown;
  app?: unknown;
  database?: unknown;
  [key: string]: unknown;
}

// ================================
// FACTORY FUNCTIONS
// ================================

/**
 * Create a mock product with default values
 */
export const createMockProduct = (overrides: Partial<MockProduct> = {}): MockProduct => ({
  id: 1,
  title: "Test Beat",
  price: 29.99,
  bpm: 120,
  key: "C Major",
  mood: "Energetic",
  genre: "Hip-Hop",
  producer: "Test Producer",
  is_free: false,
  ...overrides,
});

/**
 * Create a mock user with default values
 */
export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  id: 1,
  username: "testuser",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  role: UserRole.CUSTOMER,
  status: UserStatus.ACTIVE,
  ...overrides,
});

/**
 * Create a mock order with default values
 */
export const createMockOrder = (overrides: Partial<MockOrder> = {}): MockOrder => ({
  id: 1,
  email: "test@example.com",
  total: 2999, // in cents
  subtotal: 2999,
  currency: Currency.USD,
  status: OrderStatus.COMPLETED,
  items: [],
  payment: {
    method: PaymentMethod.STRIPE,
    status: "succeeded",
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

/**
 * Create a mock Convex client for testing
 */
export const createMockConvexClient = (): MockConvexClient => ({
  query: jest.fn(),
  mutation: jest.fn(),
  action: jest.fn(),
});

/**
 * Create mock Express request/response objects
 */
export const createMockExpressObjects = () => {
  const mockRequest: MockRequest = {
    body: {},
    params: {},
    query: {},
    headers: {},
  };

  const mockResponse: MockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn(),
    locals: {},
  };

  const mockNext: MockNext = jest.fn();

  return { mockRequest, mockResponse, mockNext };
};
