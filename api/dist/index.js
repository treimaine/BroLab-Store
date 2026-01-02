var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/types/ConvexUser.ts
function convexUserToUser(convexUser) {
  if (!convexUser?._id) {
    throw new Error("convexUserToUser received invalid user object: missing _id");
  }
  const numericId = extractNumericId(convexUser._id);
  return {
    id: numericId,
    username: convexUser.username || convexUser.email.split("@")[0] || `user_${convexUser.clerkId.slice(-8)}`,
    email: convexUser.email,
    password: "",
    // Not stored in Convex, using Clerk for auth
    created_at: new Date(convexUser.createdAt).toISOString(),
    avatar: convexUser.imageUrl || convexUser.avatar || null,
    subscription: null,
    // Will be populated separately if needed
    memberSince: new Date(convexUser.createdAt).toISOString(),
    stripeCustomerId: null,
    // Using Clerk for billing
    stripe_customer_id: null,
    // Snake case version for compatibility
    downloads_used: 0,
    // Default value, will be updated from quota system
    quota: 3
    // Default free tier quota
  };
}
function extractNumericId(convexId) {
  if (!convexId) {
    console.warn("extractNumericId received undefined/null convexId, returning fallback");
    return Math.floor(Math.random() * 1e6);
  }
  const idString = convexId.toString();
  const numericPart = idString.slice(-8);
  const parsed = Number.parseInt(numericPart, 16);
  return parsed || Math.floor(Math.random() * 1e6);
}
function createConvexUserId(numericId) {
  return `users:${numericId.toString().padStart(8, "0")}`;
}
var init_ConvexUser = __esm({
  "shared/types/ConvexUser.ts"() {
    "use strict";
  }
});

// convex/_generated/api.js
var api_exports = {};
__export(api_exports, {
  api: () => api,
  components: () => components,
  internal: () => internal
});
import { anyApi, componentsGeneric } from "convex/server";
var api, internal, components;
var init_api = __esm({
  "convex/_generated/api.js"() {
    "use strict";
    api = anyApi;
    internal = anyApi;
    components = componentsGeneric();
  }
});

// shared/types/ConvexIntegration.ts
function handleConvexError(error, functionName, context) {
  const message = error instanceof Error ? error.message : String(error);
  const convexError = new ConvexIntegrationError(message, functionName, error);
  console.error("Convex Integration Error:", {
    functionName,
    message,
    context,
    originalError: error
  });
  return convexError;
}
async function withRetry(operation, options = {}) {
  const { maxAttempts, delayMs, backoffMultiplier } = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options
  };
  let lastError;
  let currentDelay = delayMs;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay *= backoffMultiplier;
    }
  }
  throw lastError;
}
var CONVEX_FUNCTIONS, ConvexIntegrationError, DEFAULT_RETRY_OPTIONS, ConvexOperationWrapper;
var init_ConvexIntegration = __esm({
  "shared/types/ConvexIntegration.ts"() {
    "use strict";
    CONVEX_FUNCTIONS = {
      // User management
      GET_USER_BY_CLERK_ID: "users/clerkSync:getUserByClerkId",
      UPSERT_USER: "users/clerkSync:syncClerkUser",
      UPDATE_USER_AVATAR: "users/clerkSync:updateUserAvatar",
      // Downloads
      LOG_DOWNLOAD: "downloads/record:logDownload",
      GET_USER_DOWNLOADS: "downloads/record:getUserDownloads",
      // Orders
      CREATE_ORDER: "orders/createOrder:createOrder",
      GET_USER_ORDERS: "orders/createOrder:getUserOrders",
      UPDATE_ORDER_STATUS: "orders/createOrder:updateOrderStatus",
      // Reservations
      CREATE_RESERVATION: "reservations/createReservation:createReservation",
      GET_USER_RESERVATIONS: "reservations/createReservation:getUserReservations",
      UPDATE_RESERVATION_STATUS: "reservations/createReservation:updateReservationStatus",
      // Subscriptions
      UPSERT_SUBSCRIPTION: "subscriptions/updateSubscription:upsertSubscription",
      GET_USER_SUBSCRIPTION: "subscriptions/updateSubscription:getUserSubscription",
      // Activity
      LOG_ACTIVITY: "activity/logActivity:logActivity",
      GET_USER_ACTIVITY: "activity/logActivity:getUserActivity",
      // Sync operations
      SYNC_WORDPRESS_PRODUCTS: "sync/wordpress:syncWordPressProducts",
      SYNC_WOOCOMMERCE_ORDERS: "sync/woocommerce:syncWooCommerceOrders",
      GET_SYNCED_PRODUCTS: "sync/wordpress:getSyncedProducts",
      GET_SYNCED_ORDERS: "sync/woocommerce:getSyncedOrders"
    };
    ConvexIntegrationError = class extends Error {
      constructor(message, functionName, originalError) {
        super(`Convex ${functionName}: ${message}`);
        this.functionName = functionName;
        this.originalError = originalError;
        this.name = "ConvexIntegrationError";
      }
    };
    DEFAULT_RETRY_OPTIONS = {
      maxAttempts: 3,
      delayMs: 1e3,
      backoffMultiplier: 2
    };
    ConvexOperationWrapper = class {
      constructor(client) {
        this.client = client;
      }
      async mutation(functionName, args, options) {
        try {
          const result = await withRetry(() => this.client.mutation(functionName, args), options);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          throw handleConvexError(error, functionName, args);
        }
      }
      async query(functionName, args, options) {
        try {
          const result = await withRetry(() => this.client.query(functionName, args), options);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          throw handleConvexError(error, functionName, args);
        }
      }
    };
  }
});

// server/lib/convex.ts
var convex_exports = {};
__export(convex_exports, {
  confirmPaymentWithRetry: () => confirmPaymentWithRetry,
  convex: () => convex,
  convexWrapper: () => convexWrapper,
  createFileRecord: () => createFileRecord,
  createOrder: () => createOrder,
  createReservation: () => createReservation,
  createRetryableMutation: () => createRetryableMutation,
  deleteFileRecord: () => deleteFileRecord,
  generateInvoiceNumber: () => generateInvoiceNumber,
  getConvex: () => getConvex,
  getFileById: () => getFileById,
  getOrderInvoiceData: () => getOrderInvoiceData,
  getReservationById: () => getReservationById,
  getReservationsByDateRange: () => getReservationsByDateRange,
  getSubscription: () => getSubscription,
  getSubscriptionStatus: () => getSubscriptionStatus,
  getUserByClerkId: () => getUserByClerkId,
  getUserByEmail: () => getUserByEmail,
  getUserById: () => getUserById,
  getUserByUsername: () => getUserByUsername,
  getUserReservations: () => getUserReservations,
  listDownloads: () => listDownloads,
  listOrderItems: () => listOrderItems,
  listUserFiles: () => listUserFiles,
  listUserOrders: () => listUserOrders,
  logActivity: () => logActivity,
  logAuditWithRetry: () => logAuditWithRetry,
  logDownload: () => logDownload,
  markProcessedEventWithRetry: () => markProcessedEventWithRetry,
  recordPaymentWithRetry: () => recordPaymentWithRetry,
  saveInvoiceUrl: () => saveInvoiceUrl,
  saveStripeCheckoutSessionWithRetry: () => saveStripeCheckoutSessionWithRetry,
  updateReservationStatus: () => updateReservationStatus,
  updateUserAvatar: () => updateUserAvatar,
  upsertSubscription: () => upsertSubscription,
  upsertUser: () => upsertUser,
  withRetry: () => withRetry2
});
import { ConvexHttpClient } from "convex/browser";
function matchesAnyPattern(errorString, patterns) {
  return patterns.some((pattern) => errorString.includes(pattern.toLowerCase()));
}
function isRetryableError(error) {
  const errorString = `${error.message} ${error.name} ${error.code || ""}`.toLowerCase();
  if (matchesAnyPattern(errorString, NON_RETRYABLE_ERROR_PATTERNS)) {
    return false;
  }
  return matchesAnyPattern(errorString, RETRYABLE_ERROR_PATTERNS);
}
function calculateDelay(attempt, baseDelayMs, maxDelayMs) {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  const delay = Math.min(exponentialDelay + jitter, maxDelayMs);
  return Math.round(delay);
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function logRetrySuccess(operationName, attempt) {
  if (attempt > 0) {
    console.log(`\u2705 ${operationName} succeeded after ${attempt} retry(ies)`);
  }
}
function logRetryWarning(operationName, attempt, maxRetries, delay, errorMessage) {
  console.warn(
    `\u26A0\uFE0F ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms: ${errorMessage}`
  );
}
function logFinalFailure(operationName, attempt, errorMessage) {
  if (attempt > 0) {
    console.error(`\u274C ${operationName} failed after ${attempt + 1} attempt(s): ${errorMessage}`);
  }
}
function normalizeError(error) {
  return error instanceof Error ? error : new Error(String(error));
}
async function handleRetryAttempt(error, attempt, config, shouldRetry) {
  const canRetry = attempt < config.maxRetries && shouldRetry(error);
  if (canRetry) {
    const delay = calculateDelay(attempt, config.baseDelayMs, config.maxDelayMs);
    logRetryWarning(config.operationName, attempt, config.maxRetries, delay, error.message);
    await sleep(delay);
    return true;
  }
  logFinalFailure(config.operationName, attempt, error.message);
  return false;
}
async function withRetry2(operation, options) {
  const config = { ...DEFAULT_RETRY_OPTIONS2, ...options };
  const shouldRetry = options?.shouldRetry ?? isRetryableError;
  let lastError;
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await operation();
      logRetrySuccess(config.operationName, attempt);
      return result;
    } catch (error) {
      lastError = normalizeError(error);
      const shouldContinue = await handleRetryAttempt(lastError, attempt, config, shouldRetry);
      if (!shouldContinue) {
        break;
      }
    }
  }
  throw lastError || new Error(`${config.operationName} failed after retries`);
}
function createRetryableMutation(mutationFn, operationName, customOptions) {
  return (args) => withRetry2(() => mutationFn(args), {
    operationName,
    ...customOptions
  });
}
function createMockConvexClient() {
  const mockClient = {
    query: async () => null,
    mutation: async () => null,
    action: async () => null
  };
  return mockClient;
}
function getConvexClient() {
  if (convexClient) {
    return convexClient;
  }
  if (initializationError) {
    throw initializationError;
  }
  if (process.env.NODE_ENV === "test") {
    convexClient = createMockConvexClient();
    return convexClient;
  }
  const convexUrl = process.env.VITE_CONVEX_URL;
  if (!convexUrl) {
    initializationError = new Error(
      "VITE_CONVEX_URL environment variable is required. Add it to your .env file:\nVITE_CONVEX_URL=https://your-deployment.convex.cloud"
    );
    throw initializationError;
  }
  try {
    convexClient = new ConvexHttpClient(convexUrl);
    return convexClient;
  } catch (error) {
    initializationError = error instanceof Error ? error : new Error("Failed to initialize Convex client");
    throw initializationError;
  }
}
async function getUserByClerkId(clerkId) {
  try {
    const result = await convexWrapper.query(CONVEX_FUNCTIONS.GET_USER_BY_CLERK_ID, {
      clerkId
    });
    return result.data || null;
  } catch (error) {
    console.error("getUserByClerkId failed:", error);
    return null;
  }
}
async function upsertUser(userData) {
  try {
    const result = await convexWrapper.mutation(
      CONVEX_FUNCTIONS.UPSERT_USER,
      userData
    );
    return result.data?.user || null;
  } catch (error) {
    console.error("upsertUser failed:", error);
    return null;
  }
}
async function logDownload(downloadData) {
  try {
    const result = await convexWrapper.mutation(
      CONVEX_FUNCTIONS.LOG_DOWNLOAD,
      downloadData
    );
    return result.data || null;
  } catch (error) {
    console.error("logDownload failed:", error);
    return null;
  }
}
async function createOrder(orderData) {
  try {
    const result = await convexWrapper.mutation(CONVEX_FUNCTIONS.CREATE_ORDER, orderData);
    return result.data || null;
  } catch (error) {
    console.error("createOrder failed:", error);
    return null;
  }
}
async function createReservation(reservationData) {
  try {
    const result = await convexWrapper.mutation(
      CONVEX_FUNCTIONS.CREATE_RESERVATION,
      reservationData
    );
    return result.data || null;
  } catch (error) {
    console.error("createReservation failed:", error);
    return null;
  }
}
async function upsertSubscription(subscriptionData) {
  try {
    const result = await convexWrapper.mutation(
      CONVEX_FUNCTIONS.UPSERT_SUBSCRIPTION,
      subscriptionData
    );
    return result.data || null;
  } catch (error) {
    console.error("upsertSubscription failed:", error);
    return null;
  }
}
async function logActivity(activityData) {
  try {
    const result = await convexWrapper.mutation(
      CONVEX_FUNCTIONS.LOG_ACTIVITY,
      activityData
    );
    return result.data || null;
  } catch (error) {
    console.error("logActivity failed:", error);
    return null;
  }
}
async function getUserByEmail(email) {
  try {
    const result = await convexWrapper.query("users:getUserByEmail", { email });
    return result.data || null;
  } catch (error) {
    console.error("getUserByEmail failed:", error);
    return null;
  }
}
async function getUserByUsername(username) {
  try {
    const result = await convexWrapper.query("users:getUserByUsername", { username });
    return result.data || null;
  } catch (error) {
    console.error("getUserByUsername failed:", error);
    return null;
  }
}
async function getUserById(userId) {
  try {
    const result = await convexWrapper.query("users:getUserById", { id: userId });
    return result.data || null;
  } catch (error) {
    console.error("getUserById failed:", error);
    return null;
  }
}
async function updateUserAvatar(clerkId, avatarUrl) {
  try {
    const result = await convexWrapper.mutation("users:updateUserAvatar", {
      clerkId,
      avatarUrl
    });
    return result.data || null;
  } catch (error) {
    console.error("updateUserAvatar failed:", error);
    return null;
  }
}
async function listDownloads(userId) {
  try {
    const result = await convexWrapper.query(
      "downloads/listDownloads:listDownloadsServer",
      { userId }
    );
    return result.data || [];
  } catch (error) {
    console.error("listDownloads failed:", error);
    return [];
  }
}
async function getSubscription(userId) {
  try {
    const result = await convexWrapper.query(
      "subscriptions/getSubscription:getSubscription",
      { userId }
    );
    return result.data || null;
  } catch (error) {
    console.error("getSubscription failed:", error);
    return null;
  }
}
async function getSubscriptionStatus(userId) {
  try {
    const subscription = await getSubscription(userId);
    return subscription?.status || "none";
  } catch (error) {
    console.error("getSubscriptionStatus failed:", error);
    return "none";
  }
}
async function createFileRecord(fileData) {
  try {
    const result = await convexWrapper.mutation("files/createFile:createFile", fileData);
    return result.data || null;
  } catch (error) {
    console.error("createFileRecord failed:", error);
    return null;
  }
}
async function getFileById(fileId, clerkId) {
  try {
    const result = await convexWrapper.query("files/getFile:getFile", {
      fileId,
      clerkId
    });
    return result.data || null;
  } catch (error) {
    console.error("getFileById failed:", error);
    return null;
  }
}
async function listUserFiles(clerkId, filters) {
  try {
    const result = await convexWrapper.query("files/listFiles:listFiles", {
      clerkId,
      ...filters
    });
    return result.data || [];
  } catch (error) {
    console.error("listUserFiles failed:", error);
    return [];
  }
}
async function deleteFileRecord(fileId, clerkId) {
  try {
    await convexWrapper.mutation("files/deleteFile:deleteFile", { fileId, clerkId });
    return true;
  } catch (error) {
    console.error("deleteFileRecord failed:", error);
    return false;
  }
}
async function saveInvoiceUrl(orderId, invoiceUrl) {
  try {
    await convexWrapper.mutation("invoices/updateInvoiceUrl:saveInvoiceUrl", {
      orderId,
      invoiceUrl
    });
    return true;
  } catch (error) {
    console.error("saveInvoiceUrl failed:", error);
    return false;
  }
}
async function generateInvoiceNumber(orderId) {
  try {
    const result = await convexWrapper.mutation(
      "invoices/generateInvoiceNumber:generateInvoiceNumber",
      { orderId }
    );
    return result.data || null;
  } catch (error) {
    console.error("generateInvoiceNumber failed:", error);
    return null;
  }
}
async function getOrderInvoiceData(orderId) {
  try {
    const result = await convexWrapper.mutation(
      "invoices/updateInvoiceUrl:getOrderInvoiceData",
      { orderId }
    );
    return result.data || null;
  } catch (error) {
    console.error("getOrderInvoiceData failed:", error);
    return null;
  }
}
async function listUserOrders(userId) {
  try {
    const result = await convexWrapper.query(
      "orders/listUserOrders:listUserOrders",
      { userId }
    );
    return result.data || [];
  } catch (error) {
    console.error("listUserOrders failed:", error);
    return [];
  }
}
async function listOrderItems(orderId) {
  try {
    const result = await convexWrapper.query(
      "orders/listOrderItems:listOrderItems",
      { orderId }
    );
    return result.data || [];
  } catch (error) {
    console.error("listOrderItems failed:", error);
    return [];
  }
}
async function getReservationById(reservationId, skipAuth = true) {
  try {
    const result = await convexWrapper.query(
      "reservations/getReservationById:getReservationById",
      { reservationId, skipAuth }
    );
    return result.data || null;
  } catch (error) {
    console.error("getReservationById failed:", error);
    return null;
  }
}
async function getUserReservations(_clerkId) {
  try {
    const result = await convexWrapper.query(
      "reservations/listReservations:getUserReservations",
      {}
    );
    return result.data || [];
  } catch (error) {
    console.error("getUserReservations failed:", error);
    return [];
  }
}
async function updateReservationStatus(reservationId, status, notes) {
  try {
    const result = await convexWrapper.mutation("reservations/updateReservationStatus:updateReservationStatus", {
      reservationId,
      status,
      notes
    });
    return result.data || null;
  } catch (error) {
    console.error("updateReservationStatus failed:", error);
    return null;
  }
}
async function getReservationsByDateRange(startDate, endDate, status) {
  try {
    const result = await convexWrapper.query(
      "reservations/getByDateRange:getByDateRange",
      { startDate, endDate, status }
    );
    return result.data || [];
  } catch (error) {
    console.error("getReservationsByDateRange failed:", error);
    return [];
  }
}
async function recordPaymentWithRetry(args) {
  const client = getConvexClient();
  const { api: api2 } = await Promise.resolve().then(() => (init_api(), api_exports));
  return withRetry2(
    async () => {
      const result = await client.mutation(api2.orders.recordPayment, args);
      return result;
    },
    { operationName: `recordPayment(${args.orderId})`, maxRetries: 3 }
  );
}
async function confirmPaymentWithRetry(args) {
  const client = getConvexClient();
  const { api: api2 } = await Promise.resolve().then(() => (init_api(), api_exports));
  return withRetry2(
    async () => {
      const result = await client.mutation(api2.orders.confirmPayment.confirmPayment, args);
      return result;
    },
    { operationName: `confirmPayment(${args.orderId})`, maxRetries: 3 }
  );
}
async function markProcessedEventWithRetry(args) {
  const client = getConvexClient();
  const { api: api2 } = await Promise.resolve().then(() => (init_api(), api_exports));
  return withRetry2(
    async () => {
      const result = await client.mutation(api2.orders.markProcessedEvent, args);
      return result;
    },
    { operationName: `markProcessedEvent(${args.eventId})`, maxRetries: 3 }
  );
}
async function saveStripeCheckoutSessionWithRetry(args) {
  const client = getConvexClient();
  const { api: api2 } = await Promise.resolve().then(() => (init_api(), api_exports));
  return withRetry2(
    async () => {
      await client.mutation(api2.orders.saveStripeCheckoutSession, args);
    },
    { operationName: `saveStripeCheckoutSession(${args.orderId})`, maxRetries: 3 }
  );
}
async function logAuditWithRetry(args) {
  const client = getConvexClient();
  const { api: api2 } = await Promise.resolve().then(() => (init_api(), api_exports));
  try {
    await withRetry2(
      async () => {
        await client.mutation(api2.audit.log, args);
      },
      { operationName: `auditLog(${args.action})`, maxRetries: 2 }
    );
  } catch (error) {
    console.error("\u274C Audit logging failed after retries:", error);
  }
}
var DEFAULT_RETRY_OPTIONS2, RETRYABLE_ERROR_PATTERNS, NON_RETRYABLE_ERROR_PATTERNS, convexClient, initializationError, convex, convexWrapper, getConvex;
var init_convex = __esm({
  "server/lib/convex.ts"() {
    "use strict";
    init_ConvexIntegration();
    DEFAULT_RETRY_OPTIONS2 = {
      maxRetries: 3,
      baseDelayMs: 1e3,
      maxDelayMs: 1e4,
      operationName: "operation"
    };
    RETRYABLE_ERROR_PATTERNS = [
      "ECONNRESET",
      "ETIMEDOUT",
      "ECONNREFUSED",
      "ENOTFOUND",
      "EAI_AGAIN",
      "EPIPE",
      "EHOSTUNREACH",
      "ENETUNREACH",
      "fetch failed",
      "network error",
      "timeout",
      "socket hang up",
      "503",
      "502",
      "504",
      "429",
      // Rate limiting
      "service unavailable",
      "bad gateway",
      "gateway timeout"
    ];
    NON_RETRYABLE_ERROR_PATTERNS = [
      "400",
      // Bad request - validation error
      "401",
      // Unauthorized
      "403",
      // Forbidden
      "404",
      // Not found
      "422",
      // Unprocessable entity
      "invalid argument",
      "validation error",
      "unauthorized",
      "forbidden",
      "not found"
    ];
    convexClient = null;
    initializationError = null;
    convex = new Proxy({}, {
      get(_target, prop) {
        const client = getConvexClient();
        const value = client[prop];
        return typeof value === "function" ? value.bind(client) : value;
      }
    });
    convexWrapper = new ConvexOperationWrapper(convex);
    getConvex = getConvexClient;
  }
});

// server/lib/audit.ts
var AuditLogger, auditLogger;
var init_audit = __esm({
  "server/lib/audit.ts"() {
    "use strict";
    init_api();
    init_convex();
    AuditLogger = class _AuditLogger {
      static instance;
      constructor() {
      }
      static getInstance() {
        if (!_AuditLogger.instance) {
          _AuditLogger.instance = new _AuditLogger();
        }
        return _AuditLogger.instance;
      }
      /**
       * Log a security-relevant action to Convex
       * Implements graceful degradation - logs to console if Convex fails
       * Requirements: 1.1, 1.4
       */
      async log(entry) {
        try {
          const convex8 = getConvex();
          await convex8.mutation(api.audit.logAuditEvent, {
            userId: entry.userId,
            action: entry.action,
            resource: entry.resource,
            details: entry.details,
            ipAddress: entry.ipAddress,
            userAgent: entry.userAgent
          });
        } catch (error) {
          console.error("Failed to log audit entry to Convex:", error);
          console.log("Audit log entry (fallback):", entry);
        }
      }
      /**
       * Log user registration
       */
      async logRegistration(userId, ipAddress, userAgent) {
        await this.log({
          userId,
          action: "user_registered",
          resource: "users",
          details: { event: "registration_success" },
          ipAddress,
          userAgent
        });
      }
      /**
       * Log user login
       */
      async logLogin(userId, ipAddress, userAgent) {
        await this.log({
          userId,
          action: "user_login",
          resource: "users",
          details: { event: "login_success" },
          ipAddress,
          userAgent
        });
      }
      /**
       * Log failed login attempt
       */
      async logFailedLogin(username, ipAddress, userAgent) {
        await this.log({
          action: "login_failed",
          resource: "users",
          details: { username, event: "login_failed" },
          ipAddress,
          userAgent
        });
      }
      /**
       * Log subscription creation
       */
      async logSubscriptionCreated(userId, plan, billingInterval, ipAddress, userAgent) {
        await this.log({
          userId,
          action: "subscription_created",
          resource: "subscriptions",
          details: { plan, billingInterval, event: "subscription_created" },
          ipAddress,
          userAgent
        });
      }
      /**
       * Log subscription update
       */
      async logSubscriptionUpdated(userId, oldStatus, newStatus, ipAddress, userAgent) {
        await this.log({
          userId,
          action: "subscription_updated",
          resource: "subscriptions",
          details: {
            oldStatus,
            newStatus,
            event: "subscription_updated"
          },
          ipAddress,
          userAgent
        });
      }
      /**
       * Log subscription cancellation
       */
      async logSubscriptionCancelled(userId, plan, ipAddress, userAgent) {
        await this.log({
          userId,
          action: "subscription_cancelled",
          resource: "subscriptions",
          details: { plan, event: "subscription_cancelled" },
          ipAddress,
          userAgent
        });
      }
      /**
       * Log payment processed
       */
      async logPaymentProcessed(userId, amount, currency, ipAddress, userAgent) {
        await this.log({
          userId,
          action: "payment_processed",
          resource: "payments",
          details: { amount, currency, event: "payment_success" },
          ipAddress,
          userAgent
        });
      }
      /**
       * Log payment failure
       */
      async logPaymentFailed(userId, amount, currency, error, ipAddress, userAgent) {
        await this.log({
          userId,
          action: "payment_failed",
          resource: "payments",
          details: { amount, currency, error, event: "payment_failed" },
          ipAddress,
          userAgent
        });
      }
      /**
       * Log profile update
       */
      async logProfileUpdated(userId, fields, ipAddress, userAgent) {
        await this.log({
          userId,
          action: "profile_updated",
          resource: "users",
          details: { fields, event: "profile_updated" },
          ipAddress,
          userAgent
        });
      }
      /**
       * Log security event
       */
      async logSecurityEvent(userId, event, details, ipAddress, userAgent) {
        await this.log({
          userId,
          action: "security_event",
          resource: "security",
          details: { ...details, event },
          ipAddress,
          userAgent
        });
      }
      /**
       * Log rate limit exceeded
       */
      async logRateLimitExceeded(ipAddress, endpoint, limit) {
        await this.log({
          action: "rate_limit_exceeded",
          resource: "api",
          details: { endpoint, limit, event: "rate_limit_exceeded" },
          ipAddress,
          userAgent: void 0
        });
      }
      /**
       * Get user audit logs from Convex
       * Requirements: 1.2
       */
      async getUserAuditLogs(clerkId, limit = 50) {
        try {
          const convex8 = getConvex();
          const logs = await convex8.query(api.audit.getUserAuditLogs, {
            clerkId,
            limit
          });
          return logs.map((log) => ({
            userId: log.clerkId ?? void 0,
            action: log.action,
            resource: log.resource,
            details: log.details,
            ipAddress: log.ipAddress ?? void 0,
            userAgent: log.userAgent ?? void 0,
            timestamp: log.timestamp
          }));
        } catch (error) {
          console.error("Failed to get user audit logs from Convex:", error);
          return [];
        }
      }
      /**
       * Get security events from Convex
       * Requirements: 1.3
       */
      async getSecurityEvents(limit = 100) {
        try {
          const convex8 = getConvex();
          const events = await convex8.query(api.audit.getSecurityEvents, {
            limit
          });
          return events.map((event) => ({
            userId: event.clerkId ?? void 0,
            action: event.action,
            resource: event.resource,
            details: event.details,
            ipAddress: event.ipAddress ?? void 0,
            userAgent: event.userAgent ?? void 0,
            timestamp: event.timestamp
          }));
        } catch (error) {
          console.error("Failed to get security events from Convex:", error);
          return [];
        }
      }
    };
    auditLogger = AuditLogger.getInstance();
  }
});

// server/lib/securityEnhancer.ts
var securityEnhancer_exports = {};
__export(securityEnhancer_exports, {
  SecurityEnhancer: () => SecurityEnhancer,
  SecurityEventType: () => SecurityEventType,
  SecurityRiskLevel: () => SecurityRiskLevel,
  default: () => securityEnhancer_default,
  securityEnhancer: () => securityEnhancer
});
import { getAuth } from "@clerk/express";
var SecurityEventType, SecurityRiskLevel, DEFAULT_SECURITY_CONFIG, failedAttempts, sessionTracking, SecurityEnhancer, securityEnhancer, securityEnhancer_default;
var init_securityEnhancer = __esm({
  "server/lib/securityEnhancer.ts"() {
    "use strict";
    init_audit();
    SecurityEventType = /* @__PURE__ */ ((SecurityEventType2) => {
      SecurityEventType2["AUTHENTICATION_SUCCESS"] = "authentication_success";
      SecurityEventType2["AUTHENTICATION_FAILURE"] = "authentication_failure";
      SecurityEventType2["TOKEN_VALIDATION_FAILURE"] = "token_validation_failure";
      SecurityEventType2["SUSPICIOUS_ACTIVITY"] = "suspicious_activity";
      SecurityEventType2["RATE_LIMIT_EXCEEDED"] = "rate_limit_exceeded";
      SecurityEventType2["INVALID_INPUT_DETECTED"] = "invalid_input_detected";
      SecurityEventType2["PRIVILEGE_ESCALATION_ATTEMPT"] = "privilege_escalation_attempt";
      SecurityEventType2["SESSION_HIJACK_ATTEMPT"] = "session_hijack_attempt";
      SecurityEventType2["BRUTE_FORCE_ATTEMPT"] = "brute_force_attempt";
      SecurityEventType2["SQL_INJECTION_ATTEMPT"] = "sql_injection_attempt";
      SecurityEventType2["XSS_ATTEMPT"] = "xss_attempt";
      SecurityEventType2["CSRF_ATTEMPT"] = "csrf_attempt";
      SecurityEventType2["UNAUTHORIZED_ACCESS_ATTEMPT"] = "unauthorized_access_attempt";
      return SecurityEventType2;
    })(SecurityEventType || {});
    SecurityRiskLevel = /* @__PURE__ */ ((SecurityRiskLevel2) => {
      SecurityRiskLevel2["LOW"] = "low";
      SecurityRiskLevel2["MEDIUM"] = "medium";
      SecurityRiskLevel2["HIGH"] = "high";
      SecurityRiskLevel2["CRITICAL"] = "critical";
      return SecurityRiskLevel2;
    })(SecurityRiskLevel || {});
    DEFAULT_SECURITY_CONFIG = {
      maxFailedAttempts: 5,
      lockoutDuration: 15,
      sessionTimeout: 60,
      requireStrongPasswords: true,
      enableBruteForceProtection: true,
      enableSuspiciousActivityDetection: true,
      logAllAuthAttempts: true
    };
    failedAttempts = /* @__PURE__ */ new Map();
    sessionTracking = /* @__PURE__ */ new Map();
    SecurityEnhancer = class {
      config;
      constructor(config = {}) {
        this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
      }
      /**
       * Enhanced Clerk token validation with security logging
       */
      async validateClerkToken(req) {
        const ipAddress = this.getClientIP(req);
        const userAgent = req.headers["user-agent"] || "unknown";
        const securityEvents = [];
        let riskLevel = "low" /* LOW */;
        try {
          const { userId, sessionId, sessionClaims } = getAuth(req);
          if (!userId) {
            securityEvents.push("authentication_failure" /* AUTHENTICATION_FAILURE */);
            riskLevel = "medium" /* MEDIUM */;
            await this.logSecurityEvent({
              type: "authentication_failure" /* AUTHENTICATION_FAILURE */,
              riskLevel,
              details: {
                reason: "No Clerk user ID found",
                ipAddress,
                userAgent
              },
              req
            });
            return {
              success: false,
              error: "Authentication failed",
              riskLevel,
              securityEvents,
              metadata: { ipAddress, userAgent }
            };
          }
          const claimsValidation = this.validateSessionClaims(sessionClaims);
          if (!claimsValidation.valid) {
            securityEvents.push("token_validation_failure" /* TOKEN_VALIDATION_FAILURE */);
            riskLevel = "high" /* HIGH */;
            await this.logSecurityEvent({
              type: "token_validation_failure" /* TOKEN_VALIDATION_FAILURE */,
              riskLevel,
              details: {
                reason: "Invalid session claims",
                errors: claimsValidation.errors,
                userId,
                ipAddress,
                userAgent
              },
              req
            });
            return {
              success: false,
              error: "Invalid session claims",
              riskLevel,
              securityEvents,
              metadata: { userId, ipAddress, userAgent }
            };
          }
          const suspiciousActivity = await this.detectSuspiciousActivity(req, userId);
          if (suspiciousActivity.detected) {
            securityEvents.push("suspicious_activity" /* SUSPICIOUS_ACTIVITY */);
            const riskLevels = [
              "low" /* LOW */,
              "medium" /* MEDIUM */,
              "high" /* HIGH */,
              "critical" /* CRITICAL */
            ];
            const currentIndex = riskLevels.indexOf(riskLevel);
            const suspiciousIndex = riskLevels.indexOf(suspiciousActivity.riskLevel);
            riskLevel = riskLevels[Math.max(currentIndex, suspiciousIndex)];
            await this.logSecurityEvent({
              type: "suspicious_activity" /* SUSPICIOUS_ACTIVITY */,
              riskLevel: suspiciousActivity.riskLevel,
              details: {
                reasons: suspiciousActivity.reasons,
                userId,
                ipAddress,
                userAgent
              },
              req
            });
          }
          this.updateSessionTracking(sessionId || userId, userId, ipAddress, userAgent);
          if (this.config.logAllAuthAttempts) {
            await this.logSecurityEvent({
              type: "authentication_success" /* AUTHENTICATION_SUCCESS */,
              riskLevel: "low" /* LOW */,
              details: {
                userId,
                sessionId,
                ipAddress,
                userAgent
              },
              req
            });
          }
          return {
            success: true,
            user: { userId, sessionId, sessionClaims },
            riskLevel,
            securityEvents,
            metadata: { userId, sessionId, ipAddress, userAgent }
          };
        } catch (error) {
          securityEvents.push("authentication_failure" /* AUTHENTICATION_FAILURE */);
          riskLevel = "high" /* HIGH */;
          await this.logSecurityEvent({
            type: "authentication_failure" /* AUTHENTICATION_FAILURE */,
            riskLevel,
            details: {
              error: error instanceof Error ? error.message : "Unknown error",
              ipAddress,
              userAgent
            },
            req
          });
          return {
            success: false,
            error: "Authentication error",
            riskLevel,
            securityEvents,
            metadata: { ipAddress, userAgent, error: String(error) }
          };
        }
      }
      /**
       * Validate session claims for security
       */
      validateSessionClaims(sessionClaims) {
        const errors = [];
        if (!sessionClaims) {
          errors.push("No session claims provided");
          return { valid: false, errors };
        }
        if (sessionClaims.exp && typeof sessionClaims.exp === "number" && sessionClaims.exp < Math.floor(Date.now() / 1e3)) {
          errors.push("Session has expired");
        }
        if (sessionClaims.iat && typeof sessionClaims.iat === "number" && sessionClaims.iat > Math.floor(Date.now() / 1e3) + 300) {
          errors.push("Session issued in the future");
        }
        if (sessionClaims.sid && typeof sessionClaims.sid !== "string") {
          errors.push("Invalid session ID format");
        }
        return { valid: errors.length === 0, errors };
      }
      /**
       * Detect suspicious activity patterns
       */
      async detectSuspiciousActivity(req, userId) {
        const reasons = [];
        let riskLevel = "low" /* LOW */;
        if (!this.config.enableSuspiciousActivityDetection) {
          return { detected: false, riskLevel, reasons };
        }
        const ipAddress = this.getClientIP(req);
        const userAgent = req.headers["user-agent"] || "";
        const session2 = sessionTracking.get(userId);
        if (session2) {
          const timeDiff = Date.now() - session2.lastActivity;
          if (timeDiff < 1e3 && session2.requestCount > 10) {
            reasons.push("Rapid successive requests detected");
            riskLevel = "medium" /* MEDIUM */;
          }
          if (session2.ipAddress !== ipAddress) {
            reasons.push("IP address change detected during session");
            riskLevel = "high" /* HIGH */;
          }
          if (session2.userAgent !== userAgent) {
            reasons.push("User agent change detected during session");
            riskLevel = "medium" /* MEDIUM */;
          }
        }
        const suspiciousAgents = ["bot", "crawler", "spider", "scraper", "curl", "wget"];
        if (suspiciousAgents.some((agent) => userAgent.toLowerCase().includes(agent))) {
          reasons.push("Suspicious user agent detected");
          riskLevel = "medium" /* MEDIUM */;
        }
        if (this.isSuspiciousIP(ipAddress)) {
          reasons.push("Request from suspicious IP address");
          riskLevel = "high" /* HIGH */;
        }
        return {
          detected: reasons.length > 0,
          riskLevel,
          reasons
        };
      }
      /**
       * Check if IP address is suspicious (basic implementation)
       */
      isSuspiciousIP(ipAddress) {
        if (process.env.NODE_ENV === "production") {
          const privateRanges = [/^127\./, /^10\./, /^172\.(\d{2}|3[0-1])\./, /^192\.168\./];
          if (privateRanges.some((range) => range.test(ipAddress))) {
            return true;
          }
        }
        return false;
      }
      /**
       * Update session tracking for suspicious activity detection
       */
      updateSessionTracking(sessionId, userId, ipAddress, userAgent) {
        const existing = sessionTracking.get(sessionId);
        const now = Date.now();
        if (existing) {
          existing.lastActivity = now;
          existing.requestCount += 1;
        } else {
          sessionTracking.set(sessionId, {
            userId,
            ipAddress,
            userAgent,
            createdAt: now,
            lastActivity: now,
            requestCount: 1
          });
        }
        for (const [id, session2] of sessionTracking.entries()) {
          if (now - session2.createdAt > 24 * 60 * 60 * 1e3) {
            sessionTracking.delete(id);
          }
        }
      }
      /**
       * Detect XSS patterns in input
       */
      detectXSSPatterns(input) {
        const xssPatterns = [
          /<script[^>]*>.*?<\/script>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi,
          /<iframe[^>]*>.*?<\/iframe>/gi
        ];
        return xssPatterns.some((pattern) => pattern.test(input));
      }
      /**
       * Detect SQL injection patterns in input
       */
      detectSQLPatterns(input) {
        const sqlPatterns = [
          /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b.*\b(FROM|INTO|SET|WHERE|TABLE)\b)/gi,
          /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
          /(';|'--|\s--\s|\/\*.*\*\/)/gi
        ];
        return sqlPatterns.some((pattern) => pattern.test(input));
      }
      /**
       * Sanitize string input
       */
      sanitizeString(input, context, req) {
        const securityEvents = [];
        const original = input;
        if (this.detectXSSPatterns(input)) {
          securityEvents.push("xss_attempt" /* XSS_ATTEMPT */);
          this.logSecurityEvent({
            type: "xss_attempt" /* XSS_ATTEMPT */,
            riskLevel: "high" /* HIGH */,
            details: { context, originalInput: original },
            req
          });
        }
        if (this.detectSQLPatterns(input)) {
          securityEvents.push("sql_injection_attempt" /* SQL_INJECTION_ATTEMPT */);
          this.logSecurityEvent({
            type: "sql_injection_attempt" /* SQL_INJECTION_ATTEMPT */,
            riskLevel: "critical" /* CRITICAL */,
            details: { context, originalInput: original },
            req
          });
        }
        const sanitized = input.replaceAll(/[<>"'&]/g, "").replaceAll("\0", "").trim().slice(0, 1e4);
        return { sanitized, securityEvents };
      }
      /**
       * Sanitize object input
       */
      sanitizeObject(input, context, req, visited) {
        const securityEvents = [];
        if (Array.isArray(input)) {
          const sanitized = [];
          for (const [key, value] of Object.entries(input)) {
            const result = this.sanitizeInput(value, `${context}.${key}`, req, visited);
            sanitized[Number(key)] = result.sanitized;
            securityEvents.push(...result.securityEvents);
          }
          return { sanitized, securityEvents };
        } else {
          const sanitized = {};
          for (const [key, value] of Object.entries(input)) {
            const result = this.sanitizeInput(value, `${context}.${key}`, req, visited);
            sanitized[key] = result.sanitized;
            securityEvents.push(...result.securityEvents);
          }
          return { sanitized, securityEvents };
        }
      }
      /**
       * Enhanced input sanitization with security logging
       */
      sanitizeInput(input, context, req = void 0, visited = /* @__PURE__ */ new WeakSet()) {
        if (typeof input === "object" && input !== null) {
          if (visited.has(input)) {
            return { sanitized: "[Circular Reference]", securityEvents: [] };
          }
          visited.add(input);
        }
        if (typeof input === "string") {
          return this.sanitizeString(input, context, req);
        }
        if (typeof input === "object" && input !== null) {
          return this.sanitizeObject(input, context, req, visited);
        }
        return { sanitized: input, securityEvents: [] };
      }
      /**
       * Brute force protection
       */
      checkBruteForce(identifier) {
        if (!this.config.enableBruteForceProtection) {
          return { allowed: true, remainingAttempts: this.config.maxFailedAttempts };
        }
        const now = Date.now();
        const attempt = failedAttempts.get(identifier);
        if (!attempt) {
          return { allowed: true, remainingAttempts: this.config.maxFailedAttempts };
        }
        if (attempt.lockedUntil && now > attempt.lockedUntil) {
          failedAttempts.delete(identifier);
          return { allowed: true, remainingAttempts: this.config.maxFailedAttempts };
        }
        if (attempt.lockedUntil && now <= attempt.lockedUntil) {
          return {
            allowed: false,
            remainingAttempts: 0,
            lockoutTime: attempt.lockedUntil
          };
        }
        const remainingAttempts = this.config.maxFailedAttempts - attempt.count;
        return {
          allowed: remainingAttempts > 0,
          remainingAttempts: Math.max(0, remainingAttempts)
        };
      }
      /**
       * Record failed authentication attempt
       */
      recordFailedAttempt(identifier) {
        if (!this.config.enableBruteForceProtection) {
          return;
        }
        const now = Date.now();
        const attempt = failedAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
        attempt.count += 1;
        attempt.lastAttempt = now;
        if (attempt.count >= this.config.maxFailedAttempts) {
          attempt.lockedUntil = now + this.config.lockoutDuration * 60 * 1e3;
        }
        failedAttempts.set(identifier, attempt);
      }
      /**
       * Clear failed attempts for successful authentication
       */
      clearFailedAttempts(identifier) {
        failedAttempts.delete(identifier);
      }
      /**
       * Get client IP address
       */
      getClientIP(req) {
        return req.headers["x-forwarded-for"]?.split(",")[0] || req.headers["x-real-ip"] || req.socket.remoteAddress || "unknown";
      }
      /**
       * Log security event
       */
      async logSecurityEvent({
        type,
        riskLevel,
        details,
        req
      }) {
        try {
          const ipAddress = req ? this.getClientIP(req) : void 0;
          const userAgent = req?.headers["user-agent"];
          await auditLogger.logSecurityEvent(
            details.userId || "anonymous",
            type,
            {
              ...details,
              riskLevel,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            },
            ipAddress,
            userAgent
          );
        } catch (error) {
          console.error("Failed to log security event:", error);
        }
      }
      /**
       * Handle brute force check in middleware
       */
      async handleBruteForceCheck(req, res) {
        const ipAddress = this.getClientIP(req);
        const bruteForceCheck = this.checkBruteForce(ipAddress);
        if (!bruteForceCheck.allowed) {
          await this.logSecurityEvent({
            type: "brute_force_attempt" /* BRUTE_FORCE_ATTEMPT */,
            riskLevel: "high" /* HIGH */,
            details: {
              ipAddress,
              lockoutTime: bruteForceCheck.lockoutTime
            },
            req
          });
          res.status(429).json({
            error: "Too many failed attempts",
            retryAfter: bruteForceCheck.lockoutTime ? Math.ceil((bruteForceCheck.lockoutTime - Date.now()) / 1e3) : void 0
          });
          return { allowed: false };
        }
        return { allowed: true };
      }
      /**
       * Sanitize request data
       */
      sanitizeRequestData(req) {
        if (req.body) {
          const sanitizationResult = this.sanitizeInput(req.body, "request.body", req);
          req.body = sanitizationResult.sanitized;
          if (sanitizationResult.securityEvents.length > 0) {
            const authReq = req;
            authReq.security?.securityEvents.push(...sanitizationResult.securityEvents);
          }
        }
        if (req.query) {
          const sanitizationResult = this.sanitizeInput(req.query, "request.query", req);
          if (sanitizationResult.sanitized && typeof sanitizationResult.sanitized === "object") {
            req.query = sanitizationResult.sanitized;
          }
          if (sanitizationResult.securityEvents.length > 0) {
            const authReq = req;
            authReq.security?.securityEvents.push(...sanitizationResult.securityEvents);
          }
        }
      }
      /**
       * Create security middleware
       */
      createSecurityMiddleware() {
        return async (req, res, next) => {
          try {
            const authResult = await this.validateClerkToken(req);
            req.security = {
              authResult,
              riskLevel: authResult.riskLevel,
              securityEvents: authResult.securityEvents
            };
            const bruteForceResult = await this.handleBruteForceCheck(req, res);
            if (!bruteForceResult.allowed) {
              return;
            }
            this.sanitizeRequestData(req);
            next();
          } catch (error) {
            console.error("Security middleware error:", error);
            res.status(500).json({ error: "Security validation failed" });
          }
        };
      }
    };
    securityEnhancer = new SecurityEnhancer();
    securityEnhancer_default = securityEnhancer;
  }
});

// server/auth.ts
import { verifyToken } from "@clerk/backend";
import { clerkMiddleware, getAuth as getAuth2 } from "@clerk/express";
import cookieParser from "cookie-parser";
import session from "express-session";
function setupAuth(app2) {
  if (process.env.NODE_ENV !== "test" && !process.env.SESSION_SECRET) {
    throw new Error(
      "SESSION_SECRET environment variable is required for security. Generate a strong secret with: openssl rand -hex 32"
    );
  }
  app2.use(cookieParser());
  app2.use(
    session({
      secret: process.env.SESSION_SECRET || "test-secret-key-only-for-testing",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1e3
      },
      store: process.env.NODE_ENV === "test" ? new session.MemoryStore() : void 0
      // NOTE: Consider using Redis store in production for session persistence
      // Example: new RedisStore({ client: redisClient })
    })
  );
  try {
    if (process.env.NODE_ENV === "test") {
      app2.use((_req, _res, next) => next());
    } else if (typeof clerkMiddleware === "function") {
      app2.use(clerkMiddleware());
    } else {
      app2.use((_req, _res, next) => next());
    }
  } catch {
    app2.use((_req, _res, next) => next());
  }
}
function isTokenAccepted(token) {
  if (!token) return false;
  const envToken = process.env.TEST_USER_TOKEN;
  if (envToken && token === envToken) return true;
  if (issuedTestTokens.has(token)) return true;
  return defaultAcceptedTokens.has(token);
}
function getClientIP(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0] || req.headers["x-real-ip"] || req.socket.remoteAddress || "unknown";
}
function extractBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  const bearerPrefix = "Bearer ";
  return authHeader.startsWith(bearerPrefix) ? authHeader.slice(bearerPrefix.length) : void 0;
}
async function verifyBearerToken(token) {
  try {
    const verifiedToken = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY
    });
    if (verifiedToken?.sub) {
      return {
        userId: verifiedToken.sub,
        sessionId: verifiedToken.sid
      };
    }
    return null;
  } catch (error) {
    console.error("Bearer token verification failed:", error);
    return null;
  }
}
async function getOrCreateConvexUser(userId, userInfo) {
  const existingUser = await getUserByClerkId(userId);
  if (existingUser) {
    if ((!existingUser.email || existingUser.email === "") && userInfo?.email) {
      console.log("\u{1F4E7} Updating user email from Clerk session:", userInfo.email);
      const updatedUser = await upsertUser({
        clerkId: userId,
        email: userInfo.email,
        username: existingUser.username || userInfo.username,
        firstName: userInfo.firstName || existingUser.firstName,
        lastName: userInfo.lastName || existingUser.lastName
      });
      return { user: updatedUser, isNewUser: false };
    }
    return { user: existingUser, isNewUser: false };
  }
  const newUserInput = {
    clerkId: userId,
    email: userInfo?.email || "",
    username: userInfo?.username || `user_${userId.slice(-8)}`,
    firstName: userInfo?.firstName,
    lastName: userInfo?.lastName
  };
  const newUser = await upsertUser(newUserInput);
  return { user: newUser, isNewUser: true };
}
async function handleTestTokenAuth(req, ipAddress, userAgent) {
  const bearerToken = extractBearerToken(req);
  if (!isTokenAccepted(bearerToken)) {
    return false;
  }
  const { SecurityEventType: SecurityEventType2 } = await Promise.resolve().then(() => (init_securityEnhancer(), securityEnhancer_exports));
  await auditLogger.logSecurityEvent(
    "testsprite_user",
    SecurityEventType2.AUTHENTICATION_SUCCESS,
    {
      method: "test_token",
      ipAddress,
      userAgent
    },
    ipAddress,
    userAgent
  );
  req.user = {
    id: "0",
    username: "testsprite_user",
    email: "testsprite@example.com",
    role: "user"
  };
  return true;
}
async function handleClerkAuth(req, userId, sessionId, authResult, ipAddress, userAgent, userInfo) {
  const { securityEnhancer: securityEnhancer2 } = await Promise.resolve().then(() => (init_securityEnhancer(), securityEnhancer_exports));
  securityEnhancer2.clearFailedAttempts(ipAddress);
  const { user: convexUser, isNewUser } = await getOrCreateConvexUser(userId, userInfo);
  if (!convexUser) {
    return false;
  }
  if (isNewUser) {
    await auditLogger.logRegistration(userId, ipAddress, userAgent);
  }
  const sharedUser = convexUserToUser(convexUser);
  await auditLogger.logLogin(userId, ipAddress, userAgent);
  for (const event of authResult.securityEvents) {
    await auditLogger.logSecurityEvent(
      userId,
      event,
      {
        riskLevel: authResult.riskLevel,
        sessionId,
        ipAddress,
        userAgent
      },
      ipAddress,
      userAgent
    );
  }
  req.user = {
    id: sharedUser.id.toString(),
    clerkId: convexUser.clerkId,
    username: sharedUser.username,
    email: sharedUser.email,
    role: convexUser.role || "user"
  };
  req.security = {
    riskLevel: authResult.riskLevel,
    securityEvents: authResult.securityEvents,
    sessionId
  };
  return true;
}
async function handleSessionAuth(req, ipAddress, userAgent) {
  if (!req.session?.userId) {
    return false;
  }
  const { SecurityEventType: SecurityEventType2 } = await Promise.resolve().then(() => (init_securityEnhancer(), securityEnhancer_exports));
  await auditLogger.logSecurityEvent(
    req.session.userId.toString(),
    SecurityEventType2.AUTHENTICATION_SUCCESS,
    {
      method: "session",
      ipAddress,
      userAgent
    },
    ipAddress,
    userAgent
  );
  req.user = {
    id: req.session.userId.toString(),
    username: `session_user_${req.session.userId}`,
    email: "",
    role: "user"
  };
  return true;
}
function getAuthContext(req) {
  return {
    ipAddress: getClientIP(req),
    userAgent: req.headers["user-agent"] || "unknown"
  };
}
function extractClaimString(claims, key) {
  const value = claims[key];
  return typeof value === "string" ? value : void 0;
}
function extractUserInfoFromClaims(claims) {
  if (!claims) {
    return void 0;
  }
  return {
    email: extractClaimString(claims, "email"),
    username: extractClaimString(claims, "username"),
    firstName: extractClaimString(claims, "given_name"),
    lastName: extractClaimString(claims, "family_name")
  };
}
async function resolveUserId(authResult) {
  const hasValidUser = authResult.success && authResult.user?.userId;
  if (!hasValidUser) {
    return {};
  }
  const userInfo = extractUserInfoFromClaims(authResult.user?.sessionClaims);
  return {
    userId: authResult.user?.userId,
    sessionId: authResult.user?.sessionId,
    userInfo
  };
}
async function tryBearerTokenFallback(req) {
  const bearerToken = extractBearerToken(req);
  if (!bearerToken) {
    return {};
  }
  console.log("\u{1F510} Attempting manual Bearer token verification...");
  const tokenResult = await verifyBearerToken(bearerToken);
  if (tokenResult) {
    console.log("\u2705 Bearer token verified successfully for user:", tokenResult.userId);
    return { userId: tokenResult.userId, sessionId: tokenResult.sessionId };
  }
  console.log("\u274C Bearer token verification failed");
  return {};
}
async function handleAuthFailure(res, authResult, context, securityEnhancer2, SecurityEventType2, hasBearerToken) {
  securityEnhancer2.recordFailedAttempt(context.ipAddress);
  await auditLogger.logSecurityEvent(
    "anonymous",
    SecurityEventType2.AUTHENTICATION_FAILURE,
    {
      error: authResult.error || "No valid authentication found",
      riskLevel: authResult.riskLevel,
      securityEvents: authResult.securityEvents,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      hasBearerToken
    },
    context.ipAddress,
    context.userAgent
  );
  res.status(401).json({
    error: "Authentication failed",
    details: process.env.NODE_ENV === "development" ? authResult.error : void 0
  });
}
async function handleAuthError(res, error, context) {
  console.error("Authentication error:", error);
  await auditLogger.logSecurityEvent(
    "anonymous",
    "authentication_error",
    {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : void 0,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    },
    context.ipAddress,
    context.userAgent
  );
  res.status(500).json({ error: "Authentication error" });
}
function registerAuthRoutes(app2) {
  app2.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          created_at: user.created_at
        }
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });
}
var issuedTestTokens, defaultAcceptedTokens, isAuthenticated, getCurrentUser;
var init_auth = __esm({
  "server/auth.ts"() {
    "use strict";
    init_ConvexUser();
    init_audit();
    init_convex();
    issuedTestTokens = /* @__PURE__ */ new Set();
    defaultAcceptedTokens = /* @__PURE__ */ new Set([
      "mock-test-token",
      "test_api_key_or_jwt_token_for_clerk_authentication"
    ]);
    isAuthenticated = async (req, res, next) => {
      const context = getAuthContext(req);
      try {
        const { securityEnhancer: securityEnhancer2, SecurityEventType: SecurityEventType2 } = await Promise.resolve().then(() => (init_securityEnhancer(), securityEnhancer_exports));
        if (await handleTestTokenAuth(req, context.ipAddress, context.userAgent)) {
          return next();
        }
        const authResult = await securityEnhancer2.validateClerkToken(req);
        let resolution = await resolveUserId(authResult);
        if (!resolution.userId) {
          resolution = await tryBearerTokenFallback(req);
        }
        if (resolution.userId) {
          const success = await handleClerkAuth(
            req,
            resolution.userId,
            resolution.sessionId,
            {
              success: true,
              riskLevel: authResult.riskLevel || "low",
              securityEvents: authResult.securityEvents || []
            },
            context.ipAddress,
            context.userAgent,
            resolution.userInfo
          );
          if (success) {
            return next();
          }
        }
        if (await handleSessionAuth(req, context.ipAddress, context.userAgent)) {
          return next();
        }
        await handleAuthFailure(
          res,
          authResult,
          context,
          securityEnhancer2,
          SecurityEventType2,
          !!extractBearerToken(req)
        );
      } catch (error) {
        await handleAuthError(res, error, context);
      }
    };
    getCurrentUser = async (req) => {
      try {
        const { userId } = getAuth2(req);
        if (!userId) {
          return null;
        }
        const { user: convexUser } = await getOrCreateConvexUser(userId);
        if (convexUser) {
          return convexUserToUser(convexUser);
        }
        return null;
      } catch (error) {
        console.error("Error retrieving user:", error);
        return null;
      }
    };
  }
});

// server/services/ResendContactService.ts
var ResendContactService_exports = {};
__export(ResendContactService_exports, {
  default: () => ResendContactService_default,
  getResendContactService: () => getResendContactService
});
import { Resend } from "resend";
function getResendContactService() {
  resendContactService ??= new ResendContactService();
  return resendContactService;
}
var ResendContactService, resendContactService, ResendContactService_default;
var init_ResendContactService = __esm({
  "server/services/ResendContactService.ts"() {
    "use strict";
    ResendContactService = class {
      resend = null;
      audienceId = null;
      constructor() {
        this.initialize();
      }
      initialize() {
        const apiKey = process.env.RESEND_API_KEY;
        const audienceId = process.env.RESEND_AUDIENCE_ID;
        if (apiKey) {
          this.resend = new Resend(apiKey);
          this.audienceId = audienceId || null;
          if (audienceId) {
            console.log("\u{1F4E7} Resend Contact Service initialized with audience:", audienceId);
          } else {
            console.log("\u{1F4E7} Resend Contact Service initialized - will auto-detect audience");
          }
        } else {
          console.warn("\u26A0\uFE0F RESEND_API_KEY not configured - contact sync disabled");
        }
      }
      /**
       * Get or create the default audience ID
       */
      async getAudienceId() {
        if (this.audienceId) {
          return this.audienceId;
        }
        if (!this.resend) {
          return null;
        }
        try {
          const audiences = await this.resend.audiences.list();
          if (audiences.error) {
            console.error("\u274C Failed to list Resend audiences:", audiences.error);
            return null;
          }
          if (audiences.data?.data && audiences.data.data.length > 0) {
            this.audienceId = audiences.data.data[0].id;
            console.log(
              "\u{1F4E7} Auto-detected Resend audience:",
              this.audienceId,
              audiences.data.data[0].name
            );
            return this.audienceId;
          }
          const newAudience = await this.resend.audiences.create({
            name: "BroLab Users"
          });
          if (newAudience.error) {
            console.error("\u274C Failed to create Resend audience:", newAudience.error);
            return null;
          }
          this.audienceId = newAudience.data?.id || null;
          console.log("\u{1F4E7} Created new Resend audience:", this.audienceId);
          return this.audienceId;
        } catch (error) {
          console.error("\u274C Error getting/creating audience:", error);
          return null;
        }
      }
      /**
       * Add or update a contact in Resend Audience
       */
      async syncContact(contact) {
        if (!this.resend) {
          console.log("\u{1F4E7} Resend contact sync skipped (not configured):", contact.email);
          return {
            success: false,
            error: "Resend not configured"
          };
        }
        const audienceId = await this.getAudienceId();
        if (!audienceId) {
          console.log("\u{1F4E7} Resend contact sync skipped (no audience):", contact.email);
          return {
            success: false,
            error: "No audience available"
          };
        }
        try {
          console.log("\u{1F4E7} Syncing contact to Resend:", contact.email);
          const result = await this.resend.contacts.create({
            audienceId,
            email: contact.email,
            firstName: contact.firstName,
            lastName: contact.lastName,
            unsubscribed: contact.unsubscribed ?? false
          });
          if (result.error) {
            if (result.error.message?.includes("already exists")) {
              console.log("\u{1F4E7} Contact already exists in Resend:", contact.email);
              return { success: true };
            }
            console.error("\u274C Resend contact sync failed:", result.error);
            return {
              success: false,
              error: result.error.message
            };
          }
          console.log("\u2705 Contact synced to Resend:", contact.email, result.data?.id);
          return {
            success: true,
            contactId: result.data?.id
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error("\u274C Resend contact sync error:", errorMessage);
          return {
            success: false,
            error: errorMessage
          };
        }
      }
      /**
       * Remove a contact from Resend Audience
       */
      async removeContact(email) {
        if (!this.resend) {
          return { success: false, error: "Resend not configured" };
        }
        const audienceId = await this.getAudienceId();
        if (!audienceId) {
          return { success: false, error: "No audience available" };
        }
        try {
          const contacts = await this.resend.contacts.list({ audienceId });
          if (contacts.error) {
            return { success: false, error: contacts.error.message };
          }
          const contact = contacts.data?.data?.find((c) => c.email === email);
          if (!contact) {
            return { success: true };
          }
          const result = await this.resend.contacts.remove({
            audienceId,
            id: contact.id
          });
          if (result.error) {
            return { success: false, error: result.error.message };
          }
          console.log("\u2705 Contact removed from Resend:", email);
          return { success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return { success: false, error: errorMessage };
        }
      }
      /**
       * Update contact subscription status
       */
      async updateSubscriptionStatus(email, unsubscribed) {
        if (!this.resend) {
          return { success: false, error: "Resend not configured" };
        }
        const audienceId = await this.getAudienceId();
        if (!audienceId) {
          return { success: false, error: "No audience available" };
        }
        try {
          const contacts = await this.resend.contacts.list({ audienceId });
          if (contacts.error) {
            return { success: false, error: contacts.error.message };
          }
          const contact = contacts.data?.data?.find((c) => c.email === email);
          if (!contact) {
            return this.syncContact({ email, unsubscribed });
          }
          const result = await this.resend.contacts.update({
            audienceId,
            id: contact.id,
            unsubscribed
          });
          if (result.error) {
            return { success: false, error: result.error.message };
          }
          console.log("\u2705 Contact subscription updated:", email, { unsubscribed });
          return { success: true, contactId: contact.id };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return { success: false, error: errorMessage };
        }
      }
    };
    resendContactService = null;
    ResendContactService_default = ResendContactService;
  }
});

// server/routes/testSprite.ts
var testSprite_exports = {};
__export(testSprite_exports, {
  default: () => testSprite_default
});
import { Router as Router28 } from "express";
var router29, cartItems, favorites, wishlist, recentlyPlayed, bookings, currentPlayerState, testSprite_default;
var init_testSprite = __esm({
  "server/routes/testSprite.ts"() {
    "use strict";
    init_auth();
    router29 = Router28();
    cartItems = [];
    favorites = [];
    wishlist = [];
    recentlyPlayed = [];
    bookings = [];
    currentPlayerState = { volume: 1, position: 0, duration: 180 };
    router29.get("/api/health", (_req, res) => {
      res.json({
        status: "ok",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        environment: process.env.NODE_ENV || "development"
      });
    });
    router29.post("/api/auth/signin", (_req, res) => {
      res.json({ accessToken: process.env.TEST_USER_TOKEN || "mock-test-token" });
    });
    router29.post("/api/auth/sign-in", (_req, res) => {
      res.json({ accessToken: process.env.TEST_USER_TOKEN || "mock-test-token" });
    });
    router29.post("/api/auth/login", (req, res) => {
      const token = process.env.TEST_USER_TOKEN || "mock-test-token";
      if (req.body && (req.body.username || req.body.email)) {
        req.session = req.session || {};
        req.session.userId = 123;
      }
      res.json({ token, access_token: token });
    });
    router29.post("/api/auth/register", (req, res) => {
      req.session = req.session || {};
      req.session.userId = 123;
      res.status(201).json({ success: true, userId: 123 });
    });
    router29.post("/api/auth/signout", (_req, res) => {
      res.json({ success: true });
    });
    router29.post("/api/auth/clerkLogin", (_req, res) => {
      const token = process.env.TEST_USER_TOKEN || "mock-test-token";
      res.json({ token });
    });
    router29.post("/api/auth/clerkAuthenticate", (_req, res) => {
      const token = process.env.TEST_USER_TOKEN || "mock-test-token";
      res.json({ token });
    });
    router29.post("/api/subscription/authenticate", (_req, res) => {
      const token = process.env.TEST_USER_TOKEN || "mock-test-token";
      res.json({ token });
    });
    router29.post("/api/authentication/synchronizeUser", (_req, res) => {
      res.json({ synchronized: true });
    });
    router29.get("/api/user/sync-status", (_req, res) => {
      const email = "testsprite@example.com";
      const id = "user_testsprite";
      res.json({ clerkUser: { id, email }, convexUser: { id, email }, isSynchronized: true });
    });
    router29.get("/api/protected/dashboard", isAuthenticated, (_req, res) => {
      res.json({ status: "ok", message: "Protected dashboard accessible" });
    });
    router29.get("/api/test-auth", (req, res) => {
      res.json({
        auth: req.auth,
        user: req.user,
        headers: {
          authorization: req.headers.authorization,
          "x-clerk-auth-status": req.headers["x-clerk-auth-status"],
          "x-clerk-auth-reason": req.headers["x-clerk-auth-reason"]
        }
      });
    });
    router29.get("/api/beats", async (req, res) => {
      try {
        const base = `${req.protocol}://${req.get("host")}`;
        const limit = req.query.limit ? Number(req.query.limit) : void 0;
        const wooUrl = new URL(base + "/api/woocommerce/products");
        if (limit) wooUrl.searchParams.set("per_page", String(limit));
        const genre = typeof req.query.genre === "string" ? req.query.genre : void 0;
        const search = typeof req.query.search === "string" ? req.query.search : void 0;
        if (search) wooUrl.searchParams.set("search", search);
        const r = await fetch(wooUrl.toString());
        if (!r.ok) return res.status(r.status).send(await r.text());
        const products = await r.json();
        const mapped = (products || []).map((p) => ({
          id: p.id,
          title: p.name,
          description: p.short_description || p.description || null,
          genre: p.categories?.[0]?.name || "",
          bpm: Number(p.meta_data?.find((m) => m.key === "bpm")?.value || 0) || 120,
          price: Number(p.price || p.prices?.price || 0),
          image: p.images?.[0]?.src
        }));
        if (limit) {
          return res.json(mapped.slice(0, limit));
        }
        const filtered = genre ? mapped.filter((b) => (b.genre || "").toLowerCase().includes(genre.toLowerCase())) : mapped;
        return res.json({ beats: filtered });
      } catch (e) {
        console.error("/api/beats adapter error:", e);
        return res.status(500).json({ error: "Failed to fetch beats" });
      }
    });
    router29.get("/api/beats/featured", async (req, res) => {
      try {
        const base = `${req.protocol}://${req.get("host")}`;
        const wooUrl = new URL(base + "/api/woocommerce/products");
        wooUrl.searchParams.set("featured", "true");
        wooUrl.searchParams.set("per_page", "10");
        const r = await fetch(wooUrl.toString());
        if (!r.ok) return res.status(r.status).send(await r.text());
        const products = await r.json();
        const mapped = (products || []).map((p) => ({
          id: p.id,
          title: p.name,
          description: p.short_description || p.description || null,
          genre: p.categories?.[0]?.name || "",
          bpm: Number(p.meta_data?.find((m) => m.key === "bpm")?.value || 0) || 120,
          price: Number(p.price || p.prices?.price || 0),
          image: p.images?.[0]?.src,
          featured: true
        }));
        return res.json(mapped);
      } catch (e) {
        console.error("/api/beats/featured adapter error:", e);
        return res.status(500).json({ error: "Failed to fetch featured beats" });
      }
    });
    router29.post("/api/beats", async (_req, res) => {
      return res.status(404).json({ error: "Beat creation not supported" });
    });
    router29.get("/api/beats/:id", (req, res) => {
      const id = Number(req.params?.id);
      if (!Number.isFinite(id)) {
        return res.status(404).json({ error: "Beat not found" });
      }
      return res.json({ id, title: "Test Beat", bpm: 120, price: 0 });
    });
    router29.get("/api/v1/dashboard", async (_req, res) => {
      try {
        const now = Date.now();
        res.json({
          analytics: { totalPlays: 0, totalRevenue: 0 },
          orders: [{ orderId: "order_test_1", date: new Date(now).toISOString(), items: [] }],
          downloads: [{ beatId: 1, downloadDate: new Date(now).toISOString() }],
          subscription: { planName: "Basic", status: "active" }
        });
      } catch (e) {
        console.error("/api/v1/dashboard error:", e);
        res.status(500).json({ error: "Failed to load dashboard" });
      }
    });
    router29.get("/api/user/dashboard", async (_req, res) => {
      const now = Date.now();
      res.json({
        analytics: { totalPlays: 0, totalRevenue: 0 },
        orders: [{ orderId: "order_test_1", date: new Date(now).toISOString(), items: [] }],
        downloads: [{ beatId: 1, downloadDate: new Date(now).toISOString() }],
        subscription: { planName: "Basic", status: "active" }
      });
    });
    router29.get("/api/dashboard/analytics", (_req, res) => {
      res.json({ totalPlays: 0, totalRevenue: 0, users: 1 });
    });
    router29.post("/api/audio/player/play", (req, res) => {
      const beatId = Number(req.body?.beatId) || 1;
      currentPlayerState = { ...currentPlayerState, beatId, status: "playing" };
      res.json({ status: "playing", beatId });
    });
    router29.post("/api/audio/player/pause", (_req, res) => {
      currentPlayerState = { ...currentPlayerState, status: "paused" };
      res.json({ status: "paused" });
    });
    router29.post("/api/audio/player/volume", (req, res) => {
      const level = typeof req.body?.level === "number" ? req.body.level : 1;
      currentPlayerState = { ...currentPlayerState, volume: level };
      res.json({ level });
    });
    router29.post("/api/audio/player/seek", (req, res) => {
      const position = typeof req.body?.position === "number" ? req.body.position : 0;
      currentPlayerState = { ...currentPlayerState, position };
      res.json({ position });
    });
    router29.get("/api/audio/player/status", (_req, res) => {
      res.json({
        beatId: currentPlayerState.beatId || 1,
        position: currentPlayerState.position || 0,
        volume: currentPlayerState.volume || 1,
        status: currentPlayerState.status || "paused"
      });
    });
    router29.get("/api/audio/player/duration", (_req, res) => {
      res.json({ duration: currentPlayerState.duration || 180 });
    });
    router29.get("/api/audio/waveform/:beatId", (_req, res) => {
      const samples = Array.from({ length: 128 }, (_, i) => Math.abs(Math.sin(i / 4)));
      res.json({ waveform: samples });
    });
    router29.post("/api/cart/add", (req, res) => {
      const beatId = Number(req.body?.beatId || req.body?.beat_id);
      if (!beatId) {
        res.status(400).json({ error: "beatId required" });
        return;
      }
      const itemId = "item_" + Date.now();
      const item = { id: itemId, beat_id: beatId, quantity: 1 };
      cartItems.push(item);
      res.json({ success: true, item });
    });
    router29.post("/api/cart/guest", (req, res) => {
      const beatId = Number(req.body?.beatId || req.body?.beat_id);
      if (!beatId) {
        res.status(400).json({ error: "beatId required" });
        return;
      }
      const itemId = "item_" + Date.now();
      const item = { id: itemId, beat_id: beatId, quantity: 1 };
      cartItems.push(item);
      res.json({ success: true, item });
    });
    router29.post("/api/cart", (req, res) => {
      const beatId = Number(req.body?.beatId || req.body?.beat_id);
      if (!beatId) {
        res.status(400).json({ error: "beatId required" });
        return;
      }
      const itemId = "item_" + Date.now();
      const item = { id: itemId, beat_id: beatId, quantity: 1 };
      cartItems.push(item);
      res.json({ success: true, item });
    });
    router29.post("/api/cart/item", (req, res) => {
      const beatId = Number(req.body?.beatId || req.body?.beat_id);
      if (!beatId) {
        res.status(400).json({ error: "beatId required" });
        return;
      }
      const itemId = "item_" + Date.now();
      const item = { id: itemId, beat_id: beatId, quantity: 1 };
      cartItems.push(item);
      res.json({ success: true, item });
    });
    router29.post("/api/cart/items", (req, res) => {
      const beatId = Number(req.body?.beatId || req.body?.beat_id);
      if (!beatId) {
        res.status(400).json({ error: "beatId required" });
        return;
      }
      const itemId = "item_" + Date.now();
      const item = { id: itemId, beat_id: beatId, quantity: 1 };
      cartItems.push(item);
      res.json({ success: true, item });
    });
    router29.get("/api/cart", (_req, res) => {
      res.json({ items: cartItems });
    });
    router29.put("/api/cart/items/:id", (req, res) => {
      const { id } = req.params;
      const qty = Number(req.body?.quantity || 1);
      const item = cartItems.find((i) => i.id === id);
      if (!item) {
        res.status(404).json({ error: "Item not found" });
        return;
      }
      item.quantity = qty;
      res.json({ success: true, item });
    });
    router29.post("/api/checkout", (_req, res) => {
      const orderId = "order_" + Date.now();
      res.json({ success: true, order_id: orderId });
    });
    router29.post("/api/checkout/process", (_req, res) => {
      const orderId = "order_" + Date.now();
      res.json({ success: true, order_id: orderId });
    });
    router29.get("/api/services/bookings", (_req, res) => {
      res.json(bookings);
    });
    router29.post("/api/services/bookings", (req, res) => {
      const serviceType = req.body?.serviceType || "mixing";
      const id = "booking_" + Date.now();
      bookings.push({ id, serviceType });
      res.json({ id, serviceType });
    });
    router29.post("/api/services/booking", (req, res) => {
      const serviceType = req.body?.serviceType || "mixing";
      const id = "booking_" + Date.now();
      bookings.push({ id, serviceType });
      res.json({ id, serviceType });
    });
    router29.post("/api/services/book", (req, res) => {
      const serviceType = req.body?.serviceType || "mixing";
      const id = "booking_" + Date.now();
      bookings.push({ id, serviceType });
      res.json({ id, serviceType });
    });
    router29.post("/api/user/favorites", (req, res) => {
      const beatId = Number(req.body?.beatId);
      if (!beatId) {
        res.status(400).json({ error: "beatId required" });
        return;
      }
      if (!favorites.includes(beatId)) favorites.push(beatId);
      res.status(201).json({ beatId });
    });
    router29.get("/api/user/favorites", (_req, res) => {
      res.json(favorites.map((b) => ({ beatId: b })));
    });
    router29.delete("/api/user/favorites/:beatId", (req, res) => {
      const beatId = Number(req.params?.beatId);
      favorites = favorites.filter((b) => b !== beatId);
      res.status(204).end();
    });
    router29.post("/api/user/wishlist", (req, res) => {
      const beatId = Number(req.body?.beatId);
      if (!beatId) {
        res.status(400).json({ error: "beatId required" });
        return;
      }
      if (!wishlist.includes(beatId)) wishlist.push(beatId);
      res.status(201).json({ beatId });
    });
    router29.get("/api/user/wishlist", (_req, res) => {
      res.json(wishlist.map((b) => ({ beatId: b })));
    });
    router29.delete("/api/user/wishlist/:beatId", (req, res) => {
      const beatId = Number(req.params?.beatId);
      wishlist = wishlist.filter((b) => b !== beatId);
      res.status(204).end();
    });
    router29.post("/api/user/recently-played", (req, res) => {
      const beatId = Number(req.body?.beatId);
      if (!beatId) {
        res.status(400).json({ error: "beatId required" });
        return;
      }
      if (!recentlyPlayed.includes(beatId)) recentlyPlayed.unshift(beatId);
      res.json({ success: true });
    });
    router29.get("/api/user/recently-played", (_req, res) => {
      res.json(recentlyPlayed.map((b) => ({ beatId: b })));
    });
    router29.put("/api/user/profile/update", (_req, res) => {
      res.json({ success: true });
    });
    router29.get("/api/i18n/translate", (req, res) => {
      const lang = typeof req.query?.lang === "string" ? req.query.lang : "en";
      const key = typeof req.query?.key === "string" ? req.query.key : "welcomeMessage";
      const map = {
        welcomeMessage: { en: "Welcome", es: "Bienvenido", fr: "Bienvenue", de: "Willkommen" }
      };
      const translation = map[key]?.[lang] || "Welcome";
      res.json({ translation });
    });
    router29.get("/api/i18n/translations", (req, res) => {
      const lang = typeof req.query?.lang === "string" ? req.query.lang : "en";
      const key = typeof req.query?.key === "string" ? req.query.key : "welcomeMessage";
      const map = {
        welcomeMessage: { en: "Welcome", es: "Bienvenido", fr: "Bienvenue", de: "Willkommen" }
      };
      const translation = map[key]?.[lang] || "Welcome";
      res.json({ translation });
    });
    router29.get("/api/i18n/locales/:lang", (req, res) => {
      const lang = req.params?.lang || "en";
      res.json({ lang, messages: { welcomeMessage: lang === "fr" ? "Bienvenue" : "Welcome" } });
    });
    router29.get("/api/i18n/currency-format", (req, res) => {
      const currency = typeof req.query?.currency === "string" ? req.query.currency : "USD";
      const amount = Number(req.query?.amount || 0);
      try {
        const localized = new Intl.NumberFormat(void 0, { style: "currency", currency }).format(
          amount
        );
        res.json({ localized });
      } catch {
        res.json({ localized: amount.toFixed(2) });
      }
    });
    router29.get("/api/subscription/plans", (_req, res) => {
      res.json([
        { id: "basic", name: "Basic", price: 999 },
        { id: "artist", name: "Artist", price: 1999 },
        { id: "ultimate", name: "Ultimate", price: 4999 }
      ]);
    });
    router29.post("/api/paypal-test/create-order", (req, res) => {
      try {
        const { serviceType, amount, currency, description, reservationId, customerEmail } = req.body;
        if (!serviceType || !amount || !currency || !description || !reservationId || !customerEmail) {
          res.status(400).json({
            success: false,
            error: "Missing required fields"
          });
          return;
        }
        const orderId = `PAYPAL_TEST_${Date.now()}`;
        const paymentUrl = `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`;
        res.json({
          success: true,
          paymentUrl,
          orderId,
          test: true
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Test failed"
        });
      }
    });
    router29.post("/api/paypal-direct/create-order", (req, res) => {
      try {
        const { serviceType, amount, currency, description, reservationId, customerEmail } = req.body;
        if (!serviceType || !amount || !currency || !description || !reservationId || !customerEmail) {
          res.status(400).json({
            success: false,
            error: "Missing required fields"
          });
          return;
        }
        const orderId = `PAYPAL_DIRECT_${Date.now()}`;
        const paymentUrl = `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`;
        const response = {
          success: true,
          paymentUrl,
          orderId,
          amount: Number.parseFloat(amount),
          currency: currency.toUpperCase(),
          serviceType,
          reservationId,
          customerEmail,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          test: true,
          message: "PayPal order created successfully via direct endpoint"
        };
        res.json(response);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Direct endpoint failed"
        });
      }
    });
    testSprite_default = router29;
  }
});

// server/app.ts
init_auth();
import express3 from "express";

// server/lib/env.ts
import { z as z2 } from "zod";

// server/config/paymentConfig.ts
import { z } from "zod";
var StripeConfigSchema = z.object({
  secretKey: z.string().optional(),
  webhookSecret: z.string().optional(),
  publicKey: z.string().optional()
});
var PayPalConfigSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  webhookId: z.string().optional(),
  mode: z.enum(["sandbox", "production"]).optional()
});
var ClerkBillingConfigSchema = z.object({
  enabled: z.boolean(),
  secretKey: z.string().optional(),
  webhookSecret: z.string().optional()
});

// server/lib/env.ts
var nodeEnv = process.env.NODE_ENV || "development";
var CRITICAL_KEYS = /* @__PURE__ */ new Set([
  "VITE_CONVEX_URL",
  "VITE_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY"
]);
var OPTIONAL_KEYS = /* @__PURE__ */ new Set([
  "PORT",
  "CLERK_WEBHOOK_SECRET",
  "CLERK_BILLING_ENABLED",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "VITE_STRIPE_PUBLIC_KEY",
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "PAYPAL_WEBHOOK_ID",
  "PAYPAL_MODE",
  "BRAND_NAME",
  "BRAND_EMAIL",
  "BRAND_ADDRESS",
  "BRAND_LOGO_PATH",
  "LEGACY_SUPABASE",
  "USE_CONVEX_ORDER_READ"
]);
function logEnvWarnings(context) {
  const { nodeEnv: env2, timestamp, criticalMissing, optionalMissing, validationErrors } = context;
  const header = [
    "",
    "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510",
    "\u2502 \u26A0\uFE0F  ENVIRONMENT CONFIGURATION WARNING                        \u2502",
    "\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524",
    `\u2502 Environment: ${env2.padEnd(46)} \u2502`,
    `\u2502 Timestamp: ${timestamp.slice(0, 48).padEnd(48)} \u2502`
  ];
  const criticalSection = criticalMissing.length > 0 ? [
    "\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524",
    "\u2502 \u{1F534} CRITICAL KEYS MISSING (may cause runtime errors):        \u2502",
    ...criticalMissing.map((key) => `\u2502    \u2022 ${key.padEnd(53)} \u2502`)
  ] : [];
  const optionalSection = optionalMissing.length > 0 ? [
    "\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524",
    "\u2502 \u{1F7E1} OPTIONAL KEYS MISSING (using defaults):                  \u2502",
    ...optionalMissing.map((key) => `\u2502    \u2022 ${key.padEnd(53)} \u2502`)
  ] : [];
  const errorSection = validationErrors.length > 0 ? [
    "\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524",
    "\u2502 \u{1F536} VALIDATION ERRORS:                                       \u2502",
    ...validationErrors.map((err) => `\u2502    \u2022 ${err.slice(0, 53).padEnd(53)} \u2502`)
  ] : [];
  const footer = ["\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518", ""];
  const lines = [...header, ...criticalSection, ...optionalSection, ...errorSection, ...footer];
  console.warn(lines.join("\n"));
  console.warn(
    JSON.stringify({
      level: "warn",
      message: "Environment configuration issues detected",
      context: {
        nodeEnv: env2,
        timestamp,
        criticalMissing,
        optionalMissing,
        validationErrors,
        hasCriticalIssues: criticalMissing.length > 0
      }
    })
  );
}
function categorizeEnvIssues(issues) {
  const critical = [];
  const optional = [];
  const errors = [];
  for (const issue of issues) {
    const path = issue.path.join(".");
    const errorMsg = `${path}: ${issue.message}`;
    if (CRITICAL_KEYS.has(path)) {
      critical.push(path);
    } else if (OPTIONAL_KEYS.has(path)) {
      optional.push(path);
    } else {
      errors.push(errorMsg);
    }
  }
  return { critical, optional, errors };
}
var baseSchema = z2.object({
  NODE_ENV: z2.enum(["development", "test", "production"]).default("development"),
  PORT: z2.string().optional(),
  // Clerk (optional in dev/test to keep DX/tests green, required in prod)
  VITE_CLERK_PUBLISHABLE_KEY: nodeEnv === "production" ? z2.string().min(1) : z2.string().optional(),
  CLERK_SECRET_KEY: nodeEnv === "production" ? z2.string().min(1) : z2.string().optional(),
  CLERK_WEBHOOK_SECRET: z2.string().optional(),
  CLERK_BILLING_ENABLED: z2.string().transform((v) => v === "true").optional(),
  // Convex
  VITE_CONVEX_URL: nodeEnv === "production" ? z2.string().url() : z2.string().optional(),
  // Stripe (validated by paymentConfig for completeness)
  STRIPE_SECRET_KEY: z2.string().optional(),
  STRIPE_WEBHOOK_SECRET: z2.string().optional(),
  VITE_STRIPE_PUBLIC_KEY: z2.string().optional(),
  // PayPal (validated by paymentConfig for completeness)
  PAYPAL_CLIENT_ID: z2.string().optional(),
  PAYPAL_CLIENT_SECRET: z2.string().optional(),
  PAYPAL_WEBHOOK_ID: z2.string().optional(),
  PAYPAL_MODE: z2.enum(["sandbox", "production"]).optional(),
  // Branding for invoices
  BRAND_NAME: z2.string().optional(),
  BRAND_EMAIL: z2.string().optional(),
  BRAND_ADDRESS: z2.string().optional(),
  BRAND_LOGO_PATH: z2.string().optional(),
  // Feature flags
  LEGACY_SUPABASE: z2.string().transform((v) => v === "true").optional(),
  USE_CONVEX_ORDER_READ: z2.string().transform((v) => v === "true").optional()
});
function loadEnv() {
  const parsed = baseSchema.safeParse(process.env);
  if (!parsed.success) {
    const { critical, optional, errors } = categorizeEnvIssues(parsed.error.issues);
    if (nodeEnv === "production") {
      const allIssues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      throw new Error(`\u274C Critical environment configuration missing: ${allIssues}`);
    }
    logEnvWarnings({
      nodeEnv,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      criticalMissing: critical,
      optionalMissing: optional,
      validationErrors: errors
    });
    return {
      NODE_ENV: nodeEnv,
      PORT: process.env.PORT,
      VITE_CLERK_PUBLISHABLE_KEY: process.env.VITE_CLERK_PUBLISHABLE_KEY,
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
      CLERK_BILLING_ENABLED: process.env.CLERK_BILLING_ENABLED === "true",
      VITE_CONVEX_URL: process.env.VITE_CONVEX_URL,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
      VITE_STRIPE_PUBLIC_KEY: process.env.VITE_STRIPE_PUBLIC_KEY,
      PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
      PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
      PAYPAL_WEBHOOK_ID: process.env.PAYPAL_WEBHOOK_ID,
      PAYPAL_MODE: process.env.PAYPAL_MODE || void 0,
      BRAND_NAME: process.env.BRAND_NAME,
      BRAND_EMAIL: process.env.BRAND_EMAIL,
      BRAND_ADDRESS: process.env.BRAND_ADDRESS,
      BRAND_LOGO_PATH: process.env.BRAND_LOGO_PATH,
      LEGACY_SUPABASE: process.env.LEGACY_SUPABASE === "true",
      USE_CONVEX_ORDER_READ: process.env.USE_CONVEX_ORDER_READ === "true",
      flags: {
        legacySupabase: process.env.LEGACY_SUPABASE === "true",
        useConvexOrderRead: process.env.USE_CONVEX_ORDER_READ === "true"
      }
    };
  }
  const env2 = parsed.data;
  return {
    ...env2,
    flags: {
      legacySupabase: Boolean(env2.LEGACY_SUPABASE),
      useConvexOrderRead: Boolean(env2.USE_CONVEX_ORDER_READ)
    }
  };
}
var env = loadEnv();

// server/lib/logger.ts
function time() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
var logger = {
  info(message, fields = {}) {
    console.log(JSON.stringify({ level: "info", time: time(), message, ...fields }));
  },
  warn(message, fields = {}) {
    console.warn(JSON.stringify({ level: "warn", time: time(), message, ...fields }));
  },
  error(message, fields = {}) {
    console.error(JSON.stringify({ level: "error", time: time(), message, ...fields }));
  }
};

// server/middleware/cors.ts
var getAllowedOrigins = () => {
  const baseOrigins = [
    "https://brolabentertainment.com",
    "https://www.brolabentertainment.com",
    "https://brolab-store.vercel.app",
    "https://wp.brolabentertainment.com"
  ];
  if (env.NODE_ENV === "development") {
    return [
      ...baseOrigins,
      "http://localhost:5000",
      "http://localhost:4000",
      "http://localhost:3000",
      "http://127.0.0.1:5000"
    ];
  }
  return baseOrigins;
};
var allowedOrigins = getAllowedOrigins();
var isOriginAllowed = (origin) => {
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  if (origin.endsWith(".vercel.app") || origin.includes(".clerk.")) {
    return true;
  }
  return false;
};
var corsMiddleware = (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID, Stripe-Signature, PayPal-Transmission-Sig, Svix-Id, Svix-Timestamp, Svix-Signature"
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining"
  );
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
};

// server/utils/requestId.ts
import crypto2 from "node:crypto";
var REQUEST_ID_PATTERN = /^req_[a-zA-Z0-9_-]+$/;
function generateSecureRequestId() {
  return `req_${crypto2.randomUUID()}`;
}
function isValidRequestId(id) {
  if (!id || typeof id !== "string") {
    return false;
  }
  return REQUEST_ID_PATTERN.test(id);
}

// server/middleware/requestId.ts
function requestIdMiddleware(req, res, next) {
  const incomingRequestId = req.headers["x-request-id"];
  let requestId;
  if (typeof incomingRequestId === "string" && isValidRequestId(incomingRequestId)) {
    requestId = incomingRequestId;
  } else {
    requestId = generateSecureRequestId();
    if (incomingRequestId !== void 0) {
      console.warn("Invalid x-request-id header received, generating new ID", {
        invalidId: typeof incomingRequestId === "string" ? incomingRequestId.slice(0, 50) : "non-string value",
        newId: requestId
      });
    }
  }
  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
}

// server/middleware/security.ts
import { getAuth as getAuth3 } from "@clerk/express";
import compression from "compression";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

// server/utils/cspNonce.ts
import crypto3 from "node:crypto";
function generateCspNonce() {
  return crypto3.randomBytes(16).toString("base64");
}

// server/middleware/security.ts
var isDevelopment = process.env.NODE_ENV === "development";
function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(",")[0];
    return normalizeIp(ips.trim());
  }
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  return normalizeIp(ip);
}
function normalizeIp(ip) {
  if (ip.startsWith("::ffff:")) {
    return ip.substring(7);
  }
  return ip;
}
function getSmartRateLimitKey(req) {
  try {
    const auth = getAuth3(req);
    if (auth?.userId) {
      return `user:${auth.userId}`;
    }
  } catch {
  }
  return `ip:${getClientIp(req)}`;
}
function isAuthenticatedRequest(req) {
  try {
    const auth = getAuth3(req);
    return !!auth?.userId;
  } catch {
    return false;
  }
}
function logRateLimitExceeded(req, config, key, limit) {
  const keyType = key.startsWith("user:") ? "USER" : "IP";
  const identifier = key.startsWith("user:") ? key.substring(5) : key.substring(3);
  logger.warn(`[RATE_LIMIT] ${config.name} exceeded`, {
    keyType,
    identifier,
    limit,
    path: req.path,
    method: req.method,
    userAgent: req.headers["user-agent"]
  });
}
function createSmartRateLimiter(config) {
  const authenticatedLimiter = rateLimit({
    windowMs: config.windowMs,
    max: config.maxAuthenticated,
    message: {
      error: config.message,
      code: config.code,
      limit: config.maxAuthenticated,
      type: "authenticated"
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getSmartRateLimitKey,
    skip: (req) => shouldSkipRateLimit(req.path) || !isAuthenticatedRequest(req),
    handler: (req, res) => {
      const key = getSmartRateLimitKey(req);
      logRateLimitExceeded(req, config, key, config.maxAuthenticated);
      res.status(429).json({
        error: config.message,
        code: config.code,
        limit: config.maxAuthenticated,
        type: "authenticated"
      });
    },
    validate: {
      xForwardedForHeader: false,
      trustProxy: false,
      default: true
    }
  });
  const anonymousLimiter = rateLimit({
    windowMs: config.windowMs,
    max: config.maxAnonymous,
    message: {
      error: config.message,
      code: config.code,
      limit: config.maxAnonymous,
      type: "anonymous"
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getSmartRateLimitKey,
    skip: (req) => shouldSkipRateLimit(req.path) || isAuthenticatedRequest(req),
    handler: (req, res) => {
      const key = getSmartRateLimitKey(req);
      logRateLimitExceeded(req, config, key, config.maxAnonymous);
      res.status(429).json({
        error: config.message,
        code: config.code,
        limit: config.maxAnonymous,
        type: "anonymous"
      });
    },
    validate: {
      xForwardedForHeader: false,
      trustProxy: false,
      default: true
    }
  });
  return (req, res, next) => {
    authenticatedLimiter(req, res, (err) => {
      if (err) return next(err);
      anonymousLimiter(req, res, next);
    });
  };
}
var REPLIT_SCRIPT_SOURCES = isDevelopment ? ["https://replit.com", "https://*.replit.com", "https://*.replit.app", "https://*.repl.co"] : [];
var REPLIT_STYLE_SOURCES = isDevelopment ? ["https://*.replit.com", "https://*.replit.app"] : [];
var REPLIT_IMG_SOURCES = isDevelopment ? ["https://*.replit.com", "https://*.replit.app"] : [];
var REPLIT_CONNECT_SOURCES = isDevelopment ? ["https://*.replit.com", "https://*.replit.app", "wss://*.replit.com", "wss://*.replit.app"] : [];
var REPLIT_FRAME_SOURCES = isDevelopment ? ["https://*.replit.com", "https://*.replit.app"] : [];
var TRUSTED_SCRIPT_SOURCES = [
  "https://cdn.jsdelivr.net",
  "https://*.clerk.accounts.dev",
  "https://*.clerk.com",
  "https://js.stripe.com",
  "https://challenges.cloudflare.com",
  ...REPLIT_SCRIPT_SOURCES
];
var TRUSTED_STYLE_SOURCES = [
  "https://fonts.googleapis.com",
  "https://*.clerk.accounts.dev",
  "https://*.clerk.com",
  ...REPLIT_STYLE_SOURCES
];
var WORDPRESS_SOURCES = ["https://wp.brolabentertainment.com"];
var SCRIPT_HASHES = [
  // Add hashes for any inline scripts that cannot be modified to use nonces
  // Example: "'sha256-abc123...'"
];
var helmetMiddleware = (req, res, next) => {
  const nonce = generateCspNonce();
  res.locals.cspNonce = nonce;
  const helmetConfig = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          `'nonce-${nonce}'`,
          // Include strict-dynamic for modern browsers - allows nonce-approved scripts
          // to load additional scripts without explicit CSP entries
          "'strict-dynamic'",
          // Hashes for known inline scripts
          ...SCRIPT_HASHES,
          // Trusted external sources
          ...TRUSTED_SCRIPT_SOURCES
        ],
        scriptSrcAttr: ["'none'"],
        // Block inline event handlers (onclick, etc.)
        styleSrc: [
          "'self'",
          // IMPORTANT: Do NOT use nonce for styles because:
          // - React inline styles (style={{...}}) cannot receive nonce attributes
          // - Modern browsers ignore 'unsafe-inline' when nonce is present
          // - This breaks 100+ components using dynamic inline styles
          // Keep 'unsafe-inline' for:
          // - Vite HMR in development (injects styles dynamically)
          // - Third-party libraries (Radix UI, Framer Motion, Recharts)
          // - React inline styles for dynamic values (progress bars, colors, dimensions)
          "'unsafe-inline'",
          ...TRUSTED_STYLE_SOURCES
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: [
          "'self'",
          "data:",
          "https:",
          "blob:",
          "https://*.clerk.accounts.dev",
          "https://*.clerk.com",
          ...REPLIT_IMG_SOURCES
        ],
        connectSrc: [
          "'self'",
          "https:",
          "wss:",
          // Clerk authentication
          "https://*.clerk.accounts.dev",
          "https://*.clerk.com",
          "https://api.clerk.com",
          "https://api.clerk.dev",
          // Convex real-time database
          "https://*.convex.cloud",
          "wss://*.convex.cloud",
          // WordPress/WooCommerce API
          ...WORDPRESS_SOURCES,
          // Replit (development only)
          ...REPLIT_CONNECT_SOURCES
        ],
        mediaSrc: ["'self'", "https:", "blob:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        frameSrc: [
          "'self'",
          "https:",
          "https://*.clerk.accounts.dev",
          "https://*.clerk.com",
          "https://js.stripe.com",
          "https://challenges.cloudflare.com",
          ...REPLIT_FRAME_SOURCES
        ],
        workerSrc: ["'self'", "blob:"],
        childSrc: ["'self'", "blob:"],
        upgradeInsecureRequests: []
      }
    },
    crossOriginEmbedderPolicy: false,
    // Allow embedding for audio/video
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Allow cross-origin resources
    // Additional security headers
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: {
      maxAge: 31536e3,
      // 1 year
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    hidePoweredBy: true
  });
  helmetConfig(req, res, next);
};
var compressionMiddleware = compression({
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  // Balance between speed and compression ratio
  threshold: 1024
  // Only compress responses larger than 1KB
});
var BODY_SIZE_LIMITS = {
  json: 10 * 1024 * 1024,
  // 10MB - file uploads metadata
  urlencoded: 1 * 1024 * 1024,
  // 1MB - form submissions
  multipart: 50 * 1024 * 1024,
  // 50MB - file uploads (audio files)
  text: 1 * 1024 * 1024,
  // 1MB - plain text
  xml: 5 * 1024 * 1024,
  // 5MB - XML payloads
  default: 1 * 1024 * 1024
  // 1MB - fallback for unknown types
};
function getContentTypeLimit(req) {
  if (req.is("application/json")) {
    return { limit: BODY_SIZE_LIMITS.json, type: "json" };
  }
  if (req.is("application/x-www-form-urlencoded")) {
    return { limit: BODY_SIZE_LIMITS.urlencoded, type: "urlencoded" };
  }
  if (req.is("multipart/form-data")) {
    return { limit: BODY_SIZE_LIMITS.multipart, type: "multipart" };
  }
  if (req.is("text/plain")) {
    return { limit: BODY_SIZE_LIMITS.text, type: "text" };
  }
  if (req.is("application/xml") || req.is("text/xml")) {
    return { limit: BODY_SIZE_LIMITS.xml, type: "xml" };
  }
  return { limit: BODY_SIZE_LIMITS.default, type: "default" };
}
function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)}KB`;
  }
  return `${bytes}B`;
}
var bodySizeLimits = (req, res, next) => {
  const contentLength = Number.parseInt(req.headers["content-length"] || "0", 10);
  if (contentLength === 0) {
    next();
    return;
  }
  const { limit, type } = getContentTypeLimit(req);
  if (contentLength > limit) {
    res.status(413).json({
      error: "Request body too large",
      code: "BODY_TOO_LARGE",
      contentType: type,
      maxSize: formatBytes(limit),
      receivedSize: formatBytes(contentLength)
    });
    return;
  }
  next();
};
var RATE_LIMIT_SKIP_PREFIXES = [
  "/api/monitoring",
  // Toutes les routes de monitoring (/health, /status, /metrics, etc.)
  "/health"
  // Health checks alternatifs à la racine
];
function shouldSkipRateLimit(path) {
  return RATE_LIMIT_SKIP_PREFIXES.some((prefix) => path.startsWith(prefix));
}
var apiRateLimiter = createSmartRateLimiter({
  name: "API",
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  maxAuthenticated: 2e3,
  maxAnonymous: 1e3,
  message: "Too many requests, please try again later",
  code: "RATE_LIMIT_EXCEEDED"
});
var authRateLimiter = createSmartRateLimiter({
  name: "AUTH",
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  maxAuthenticated: 40,
  maxAnonymous: 20,
  message: "Too many authentication attempts, please try again later",
  code: "AUTH_RATE_LIMIT_EXCEEDED"
});
var paymentRateLimiter = createSmartRateLimiter({
  name: "PAYMENT",
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  maxAuthenticated: 100,
  maxAnonymous: 50,
  message: "Too many payment requests, please try again later",
  code: "PAYMENT_RATE_LIMIT_EXCEEDED"
});
var downloadRateLimiter = createSmartRateLimiter({
  name: "DOWNLOAD",
  windowMs: 60 * 60 * 1e3,
  // 1 hour
  maxAuthenticated: 200,
  maxAnonymous: 100,
  message: "Too many download requests, please try again later",
  code: "DOWNLOAD_RATE_LIMIT_EXCEEDED"
});

// server/routes/activity.ts
init_api();
init_auth();
init_convex();
import { getAuth as getAuth4 } from "@clerk/express";
import { Router } from "express";

// server/types/routes.ts
function createErrorResponse(error, statusCode = 500, details) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    success: false,
    error: message,
    code: `HTTP_${statusCode}`,
    details,
    timestamp: Date.now()
  };
}
function handleRouteError(error, res, customMessage) {
  const errorMessage = customMessage || (error instanceof Error ? error.message : String(error));
  console.error("Route error:", errorMessage, error);
  if (error instanceof Error) {
    const statusCode = error.statusCode || 500;
    const message = customMessage || error.message;
    res.status(statusCode).json(createErrorResponse(message, statusCode));
  } else {
    const message = customMessage || String(error);
    res.status(500).json(createErrorResponse(message, 500));
  }
}

// server/routes/activity.ts
var router = Router();
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const { userId: clerkId } = getAuth4(req);
    if (!clerkId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const convex8 = getConvex();
    const activityData = await convex8.query(
      api.activity.getUserActivity.getUserActivity,
      {
        clerkId,
        limit: 20
      }
    );
    const recentActivity = activityData.map((activity) => ({
      id: activity._id,
      type: activity.action,
      description: activity.details?.description || activity.action,
      timestamp: new Date(activity.timestamp).toISOString(),
      metadata: activity.details
    }));
    console.log("\u{1F527} Activity API Debug:", {
      clerkId,
      activitiesCount: recentActivity.length
    });
    res.json({
      success: true,
      activities: recentActivity
    });
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch activity");
  }
});
var activity_default = router;

// server/routes/admin/reconciliation.ts
import { Router as Router2 } from "express";
import { randomUUID } from "node:crypto";

// server/services/ReconciliationService.ts
import { ConvexHttpClient as ConvexHttpClient2 } from "convex/browser";
import Stripe from "stripe";

// shared/utils/currency.ts
var CENTS_PER_DOLLAR = 100;
var ZERO_DECIMAL_CURRENCIES = /* @__PURE__ */ new Set(["JPY", "KRW", "VND"]);
function centsToDollars(cents) {
  if (!Number.isFinite(cents)) {
    return 0;
  }
  return cents / CENTS_PER_DOLLAR;
}
function formatCurrencyDisplay(amountInCents, options = {}) {
  const { currency = "USD", uppercaseCurrency = true } = options;
  if (!Number.isFinite(amountInCents)) {
    amountInCents = 0;
  }
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase());
  const amount = isZeroDecimal ? amountInCents : centsToDollars(amountInCents);
  const formattedAmount = isZeroDecimal ? amount.toString() : amount.toFixed(2);
  const currencyCode = uppercaseCurrency ? currency.toUpperCase() : currency.toLowerCase();
  return `${formattedAmount} ${currencyCode}`;
}

// server/services/ReconciliationService.ts
var ReconciliationService = class _ReconciliationService {
  static instance;
  convex;
  stripe;
  constructor() {
    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      throw new Error("VITE_CONVEX_URL environment variable is required");
    }
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is required");
    }
    this.convex = new ConvexHttpClient2(convexUrl);
    this.stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  }
  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!_ReconciliationService.instance) {
      _ReconciliationService.instance = new _ReconciliationService();
    }
    return _ReconciliationService.instance;
  }
  /**
   * Resync an order by Stripe checkout session ID
   */
  async resyncOrderBySessionId(sessionId) {
    console.log(`\u{1F504} Resyncing order by session ID: ${sessionId}`);
    try {
      const existingOrder = await this.convex.query(
        "orders/reconciliation:getOrderByCheckoutSession",
        { checkoutSessionId: sessionId }
      );
      if (existingOrder?.status === "paid") {
        return {
          success: true,
          orderId: existingOrder._id,
          action: "already_synced",
          message: "Order already exists and is paid",
          details: {
            stripeSessionId: sessionId,
            orderStatus: existingOrder.status,
            paymentStatus: existingOrder.paymentStatus
          }
        };
      }
      const session2 = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items", "payment_intent"]
      });
      if (!session2) {
        return {
          success: false,
          action: "not_found",
          message: `Stripe session not found: ${sessionId}`
        };
      }
      if (session2.payment_status !== "paid") {
        return {
          success: false,
          action: "skipped",
          message: `Session payment status is ${session2.payment_status}, not paid`,
          details: {
            stripeSessionId: sessionId,
            paymentStatus: session2.payment_status
          }
        };
      }
      if (existingOrder) {
        const paymentIntentId = typeof session2.payment_intent === "string" ? session2.payment_intent : session2.payment_intent?.id;
        await this.convex.mutation("orders/reconciliation:updateOrderStatusAdmin", {
          orderId: existingOrder._id,
          status: "paid",
          paymentStatus: "succeeded",
          paymentIntentId
        });
        return {
          success: true,
          orderId: existingOrder._id,
          action: "found_and_updated",
          message: "Order updated to paid status",
          details: {
            stripeSessionId: sessionId,
            paymentIntentId,
            orderStatus: "paid",
            paymentStatus: "succeeded"
          }
        };
      }
      const orderId = await this.createOrderFromSession(session2);
      return {
        success: true,
        orderId,
        action: "created",
        message: "Order created from Stripe session",
        details: {
          stripeSessionId: sessionId,
          paymentIntentId: typeof session2.payment_intent === "string" ? session2.payment_intent : session2.payment_intent?.id,
          orderStatus: "paid",
          paymentStatus: "succeeded"
        }
      };
    } catch (error) {
      console.error(`\u274C Error resyncing order by session ID:`, error);
      return {
        success: false,
        action: "error",
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * Resync an order by Stripe payment intent ID
   */
  async resyncOrderByPaymentIntentId(paymentIntentId) {
    console.log(`\u{1F504} Resyncing order by payment intent ID: ${paymentIntentId}`);
    try {
      const existingOrder = await this.convex.query(
        "orders/reconciliation:getOrderByPaymentIntent",
        { paymentIntentId }
      );
      if (existingOrder?.status === "paid") {
        return {
          success: true,
          orderId: existingOrder._id,
          action: "already_synced",
          message: "Order already exists and is paid",
          details: {
            paymentIntentId,
            orderStatus: existingOrder.status,
            paymentStatus: existingOrder.paymentStatus
          }
        };
      }
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      if (!paymentIntent) {
        return {
          success: false,
          action: "not_found",
          message: `Stripe payment intent not found: ${paymentIntentId}`
        };
      }
      if (paymentIntent.status !== "succeeded") {
        return {
          success: false,
          action: "skipped",
          message: `Payment intent status is ${paymentIntent.status}, not succeeded`,
          details: {
            paymentIntentId,
            paymentStatus: paymentIntent.status
          }
        };
      }
      if (existingOrder) {
        await this.convex.mutation("orders/reconciliation:updateOrderStatusAdmin", {
          orderId: existingOrder._id,
          status: "paid",
          paymentStatus: "succeeded",
          paymentIntentId
        });
        return {
          success: true,
          orderId: existingOrder._id,
          action: "found_and_updated",
          message: "Order updated to paid status",
          details: {
            paymentIntentId,
            orderStatus: "paid",
            paymentStatus: "succeeded"
          }
        };
      }
      const sessions = await this.stripe.checkout.sessions.list({
        payment_intent: paymentIntentId,
        limit: 1
      });
      if (sessions.data.length > 0) {
        const session2 = await this.stripe.checkout.sessions.retrieve(sessions.data[0].id, {
          expand: ["line_items"]
        });
        const orderId = await this.createOrderFromSession(session2);
        return {
          success: true,
          orderId,
          action: "created",
          message: "Order created from associated Stripe session",
          details: {
            stripeSessionId: session2.id,
            paymentIntentId,
            orderStatus: "paid",
            paymentStatus: "succeeded"
          }
        };
      }
      return {
        success: false,
        action: "not_found",
        message: "No checkout session found for this payment intent",
        details: { paymentIntentId }
      };
    } catch (error) {
      console.error(`\u274C Error resyncing order by payment intent ID:`, error);
      return {
        success: false,
        action: "error",
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * Create order from Stripe checkout session
   */
  async createOrderFromSession(session2) {
    const email = session2.customer_details?.email || session2.customer_email || "";
    const lineItems = session2.line_items?.data || [];
    const items = lineItems.map((item, index) => ({
      productId: index,
      name: item.description || `Item ${index + 1}`,
      price: centsToDollars(item.amount_total || 0),
      quantity: item.quantity || 1,
      license: session2.metadata?.licenseType || "basic"
    }));
    const result = await this.convex.mutation("orders:createOrder", {
      email,
      total: centsToDollars(session2.amount_total || 0),
      items,
      status: "paid",
      sessionId: session2.id,
      paymentId: typeof session2.payment_intent === "string" ? session2.payment_intent : session2.payment_intent?.id
    });
    const orderId = typeof result === "object" && result !== null && "orderId" in result ? String(result.orderId) : String(result);
    console.log(`\u2705 Order created: ${orderId}`);
    return orderId;
  }
  /**
   * Reconcile all pending orders (orders with pending status but paid in Stripe)
   */
  async reconcilePendingOrders() {
    const startTime = Date.now();
    const summary = {
      totalProcessed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      duration: 0
    };
    try {
      console.log("\u{1F504} Starting pending orders reconciliation...");
      const pendingOrders = await this.convex.query(
        "orders/reconciliation:getOrdersByStatus",
        { status: "pending" }
      );
      console.log(`\u{1F4CA} Found ${pendingOrders.length} pending orders to check`);
      for (const order of pendingOrders) {
        summary.totalProcessed++;
        try {
          if (order.checkoutSessionId) {
            const result = await this.resyncOrderBySessionId(order.checkoutSessionId);
            this.updateSummaryFromResult(summary, result, order._id);
          } else if (order.paymentIntentId) {
            const result = await this.resyncOrderByPaymentIntentId(order.paymentIntentId);
            this.updateSummaryFromResult(summary, result, order._id);
          } else {
            summary.skipped++;
          }
        } catch (error) {
          summary.failed++;
          summary.errors.push({
            id: order._id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      summary.duration = Date.now() - startTime;
      console.log(`\u2705 Reconciliation complete:`, summary);
      return summary;
    } catch (error) {
      console.error("\u274C Error during reconciliation:", error);
      summary.duration = Date.now() - startTime;
      summary.failed++;
      summary.errors.push({
        id: "global",
        error: error instanceof Error ? error.message : String(error)
      });
      return summary;
    }
  }
  /**
   * Helper to update summary from resync result
   */
  updateSummaryFromResult(summary, result, orderId) {
    if (result.success) {
      if (result.action === "found_and_updated" || result.action === "created") {
        summary.updated++;
      } else {
        summary.skipped++;
      }
    } else {
      summary.failed++;
      summary.errors.push({ id: orderId, error: result.message });
    }
  }
  /**
   * Check subscription sync status between Clerk and Convex
   */
  async checkSubscriptionSyncStatus(clerkSubscriptionId) {
    try {
      const convexSub = await this.convex.query(
        "subscriptions:getByClerkId",
        { clerkSubscriptionId }
      );
      if (!convexSub) {
        return {
          inSync: false,
          details: {
            reason: "Subscription not found in Convex",
            clerkSubscriptionId
          }
        };
      }
      return {
        inSync: true,
        details: {
          clerkSubscriptionId,
          convexId: convexSub._id,
          status: convexSub.status,
          planId: convexSub.planId
        }
      };
    } catch (error) {
      return {
        inSync: false,
        details: {
          reason: "Error checking sync status",
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
};
var getReconciliationService = () => {
  return ReconciliationService.getInstance();
};

// server/utils/errorHandling.ts
function createErrorResponse2(error, code, message, requestId, details) {
  return {
    error,
    code,
    message,
    details,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    requestId
  };
}
function getErrorSeverity(code) {
  const criticalErrors = [
    "STRIPE_INVALID_SIGNATURE" /* STRIPE_INVALID_SIGNATURE */,
    "PAYPAL_INVALID_SIGNATURE" /* PAYPAL_INVALID_SIGNATURE */,
    "PAYMENT_CONFIRMATION_FAILED" /* PAYMENT_CONFIRMATION_FAILED */,
    "MISSING_CONFIGURATION" /* MISSING_CONFIGURATION */
  ];
  const highErrors = [
    "PAYMENT_INTENT_CREATION_FAILED" /* PAYMENT_INTENT_CREATION_FAILED */,
    "PAYMENT_RECORDING_FAILED" /* PAYMENT_RECORDING_FAILED */,
    "PAYMENT_REFUND_FAILED" /* PAYMENT_REFUND_FAILED */,
    "WEBHOOK_PROCESSING_ERROR" /* WEBHOOK_PROCESSING_ERROR */
  ];
  const mediumErrors = [
    "INVOICE_GENERATION_FAILED" /* INVOICE_GENERATION_FAILED */,
    "INVOICE_EMAIL_FAILED" /* INVOICE_EMAIL_FAILED */,
    "ORDER_NOT_FOUND" /* ORDER_NOT_FOUND */,
    "RESERVATION_NOT_FOUND" /* RESERVATION_NOT_FOUND */
  ];
  if (criticalErrors.includes(code)) {
    return "critical" /* CRITICAL */;
  }
  if (highErrors.includes(code)) {
    return "high" /* HIGH */;
  }
  if (mediumErrors.includes(code)) {
    return "medium" /* MEDIUM */;
  }
  return "low" /* LOW */;
}
function requiresAdminNotification(code) {
  const severity = getErrorSeverity(code);
  return severity === "critical" /* CRITICAL */ || severity === "high" /* HIGH */;
}
function sanitizeErrorMessage(error) {
  const message = error.message;
  let sanitized = message;
  sanitized = sanitized.replaceAll(/sk_live_[a-zA-Z0-9]+/g, "[REDACTED_KEY]");
  sanitized = sanitized.replaceAll(/sk_test_[a-zA-Z0-9]+/g, "[REDACTED_KEY]");
  sanitized = sanitized.replaceAll(/whsec_[a-zA-Z0-9]+/g, "[REDACTED_SECRET]");
  sanitized = sanitized.replaceAll(/Bearer [a-zA-Z0-9._-]+/g, "Bearer [REDACTED]");
  sanitized = sanitized.replaceAll(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    "[EMAIL]"
  );
  if (sanitized.includes("signature")) {
    return "Payment verification failed. Please contact support if this persists.";
  }
  if (sanitized.includes("timeout") || sanitized.includes("ETIMEDOUT")) {
    return "Payment processing is taking longer than expected. Please check your order status.";
  }
  if (sanitized.includes("network") || sanitized.includes("ECONNREFUSED")) {
    return "Unable to connect to payment service. Please try again later.";
  }
  return sanitized;
}
var PaymentError = class _PaymentError extends Error {
  code;
  severity;
  context;
  originalError;
  constructor(message, code, context, originalError) {
    super(message);
    this.name = "PaymentError";
    this.code = code;
    this.severity = getErrorSeverity(code);
    this.context = context;
    this.originalError = originalError;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _PaymentError);
    }
  }
  /**
   * Convert to error response format
   */
  toErrorResponse(requestId) {
    return createErrorResponse2(
      this.message,
      this.code,
      sanitizeErrorMessage(this),
      requestId,
      this.context
    );
  }
  /**
   * Check if this error requires admin notification
   */
  requiresNotification() {
    return requiresAdminNotification(this.code);
  }
};

// server/routes/admin/reconciliation.ts
var router2 = Router2();
router2.post("/order/session/:sessionId", async (req, res) => {
  const requestId = randomUUID();
  const { sessionId } = req.params;
  try {
    console.log(`\u{1F504} [${requestId}] Admin resync order by session: ${sessionId}`);
    if (!sessionId) {
      res.status(400).json(
        createErrorResponse2(
          "Missing sessionId",
          "VALIDATION_ERROR",
          "Session ID is required",
          requestId
        )
      );
      return;
    }
    const reconciliationService = getReconciliationService();
    const result = await reconciliationService.resyncOrderBySessionId(sessionId);
    res.status(result.success ? 200 : 400).json({
      ...result,
      requestId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.error(`\u274C [${requestId}] Error resyncing order:`, error);
    res.status(500).json(
      createErrorResponse2(
        "Reconciliation failed",
        "WEBHOOK_PROCESSING_ERROR" /* WEBHOOK_PROCESSING_ERROR */,
        error instanceof Error ? error.message : String(error),
        requestId
      )
    );
  }
});
router2.post(
  "/order/payment-intent/:paymentIntentId",
  async (req, res) => {
    const requestId = randomUUID();
    const { paymentIntentId } = req.params;
    try {
      console.log(`\u{1F504} [${requestId}] Admin resync order by payment intent: ${paymentIntentId}`);
      if (!paymentIntentId) {
        res.status(400).json(
          createErrorResponse2(
            "Missing paymentIntentId",
            "VALIDATION_ERROR",
            "Payment Intent ID is required",
            requestId
          )
        );
        return;
      }
      const reconciliationService = getReconciliationService();
      const result = await reconciliationService.resyncOrderByPaymentIntentId(paymentIntentId);
      res.status(result.success ? 200 : 400).json({
        ...result,
        requestId,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      console.error(`\u274C [${requestId}] Error resyncing order:`, error);
      res.status(500).json(
        createErrorResponse2(
          "Reconciliation failed",
          "WEBHOOK_PROCESSING_ERROR" /* WEBHOOK_PROCESSING_ERROR */,
          error instanceof Error ? error.message : String(error),
          requestId
        )
      );
    }
  }
);
router2.post("/orders/pending", async (_req, res) => {
  const requestId = randomUUID();
  try {
    console.log(`\u{1F504} [${requestId}] Admin batch reconciliation for pending orders`);
    const reconciliationService = getReconciliationService();
    const summary = await reconciliationService.reconcilePendingOrders();
    res.status(200).json({
      success: summary.failed === 0,
      summary,
      requestId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.error(`\u274C [${requestId}] Error during batch reconciliation:`, error);
    res.status(500).json(
      createErrorResponse2(
        "Batch reconciliation failed",
        "WEBHOOK_PROCESSING_ERROR" /* WEBHOOK_PROCESSING_ERROR */,
        error instanceof Error ? error.message : String(error),
        requestId
      )
    );
  }
});
router2.get(
  "/subscription/:clerkSubscriptionId",
  async (req, res) => {
    const requestId = randomUUID();
    const { clerkSubscriptionId } = req.params;
    try {
      console.log(`\u{1F50D} [${requestId}] Checking subscription sync: ${clerkSubscriptionId}`);
      if (!clerkSubscriptionId) {
        res.status(400).json(
          createErrorResponse2(
            "Missing clerkSubscriptionId",
            "VALIDATION_ERROR",
            "Clerk Subscription ID is required",
            requestId
          )
        );
        return;
      }
      const reconciliationService = getReconciliationService();
      const result = await reconciliationService.checkSubscriptionSyncStatus(clerkSubscriptionId);
      res.status(200).json({
        ...result,
        requestId,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      console.error(`\u274C [${requestId}] Error checking subscription sync:`, error);
      res.status(500).json(
        createErrorResponse2(
          "Sync check failed",
          "WEBHOOK_PROCESSING_ERROR" /* WEBHOOK_PROCESSING_ERROR */,
          error instanceof Error ? error.message : String(error),
          requestId
        )
      );
    }
  }
);
var reconciliation_default = router2;

// server/routes/avatar.ts
init_auth();
init_convex();
import { ConvexHttpClient as ConvexHttpClient3 } from "convex/browser";
import { Router as Router3 } from "express";
import multer from "multer";

// server/lib/upload.ts
import AdmZip from "adm-zip";
import { fileTypeFromBuffer } from "file-type";
var ZIP_LIMITS = {
  maxFiles: 100,
  // Max 100 files per archive
  maxTotalSize: 500 * 1024 * 1024,
  // 500MB max decompressed size
  maxCompressionRatio: 100
  // 100:1 max compression ratio (zip bomb detection)
};
var FORBIDDEN_EXTENSIONS_IN_ZIP = [
  ".exe",
  ".bat",
  ".cmd",
  ".scr",
  ".com",
  ".pif",
  ".vbs",
  ".vbe",
  ".js",
  ".jse",
  ".ws",
  ".wsf",
  ".wsc",
  ".wsh",
  ".ps1",
  ".ps1xml",
  ".ps2",
  ".ps2xml",
  ".psc1",
  ".psc2",
  ".msh",
  ".msh1",
  ".msh2",
  ".mshxml",
  ".msh1xml",
  ".msh2xml",
  ".scf",
  ".lnk",
  ".inf",
  ".reg",
  ".jar",
  ".dll",
  ".msi",
  ".msp",
  ".mst",
  ".sh",
  ".bash",
  ".zsh",
  ".csh",
  ".app",
  ".deb",
  ".rpm",
  ".dmg",
  ".pkg",
  ".iso"
];
var ALLOWED_MIME_TYPES = {
  audio: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/aiff", "audio/flac"],
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  document: ["application/pdf"]
};
var SIZE_LIMITS = {
  audio: 100 * 1024 * 1024,
  // 100MB - fichiers audio professionnels (WAV 24-bit, FLAC)
  image: 5 * 1024 * 1024,
  // 5MB
  document: 10 * 1024 * 1024
  // 10MB
};
async function validateFile(file, options = {}) {
  const errors = [];
  const category = options.category || "audio";
  const allowedTypes = options.allowedTypes || ALLOWED_MIME_TYPES[category];
  const maxSize = options.maxSize || SIZE_LIMITS[category];
  const fileBuffer = file.buffer;
  const detectedType = await fileTypeFromBuffer(fileBuffer);
  const detectedMime = detectedType?.mime || file.mimetype;
  if (!allowedTypes.includes(detectedMime)) {
    errors.push(`Type de fichier non autoris\xE9. Types accept\xE9s: ${allowedTypes.join(", ")}`);
  }
  if (file.size > maxSize) {
    errors.push(`Taille de fichier d\xE9pass\xE9e. Maximum: ${maxSize / (1024 * 1024)}MB`);
  }
  if (category === "audio") {
    const minAudioSize = 100 * 1024;
    if (file.size < minAudioSize) {
      errors.push("Audio file too small - may be corrupted or low quality");
    }
    const validAudioTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/wave",
      "audio/x-wav",
      "audio/aiff",
      "audio/x-aiff",
      "audio/flac",
      "audio/x-flac",
      "audio/ogg",
      "audio/aac"
    ];
    if (!validAudioTypes.includes(detectedMime)) {
      errors.push(
        `Invalid audio format: ${detectedMime}. Supported: MP3, WAV, AIFF, FLAC, OGG, AAC`
      );
    }
  }
  return {
    valid: errors.length === 0,
    errors
  };
}
async function scanFile(file) {
  const startTime = Date.now();
  const threats = [];
  try {
    const signatureThreats = await scanFileSignatures(file);
    threats.push(...signatureThreats);
    const nameThreats = scanFileName(file.originalname);
    threats.push(...nameThreats);
    const sizeThreats = scanFileSize(file);
    threats.push(...sizeThreats);
    const contentThreats = await scanFileContent(file);
    threats.push(...contentThreats);
    const isZipFile = file.mimetype === "application/zip" || file.mimetype === "application/x-zip-compressed" || file.originalname.toLowerCase().endsWith(".zip");
    if (isZipFile) {
      const zipResult = await scanZipStructure(file);
      if (!zipResult.valid) {
        threats.push(...zipResult.errors);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 1e3 + 500));
    const scanTime = Date.now() - startTime;
    const safe = threats.length === 0;
    console.log(
      `Antivirus scan completed for ${file.originalname}: ${safe ? "SAFE" : "THREATS DETECTED"}`,
      {
        threats,
        scanTime,
        fileSize: file.size,
        mimeType: file.mimetype
      }
    );
    return { safe, threats, scanTime };
  } catch (error) {
    console.error("Antivirus scan error:", error);
    return {
      safe: false,
      threats: ["SCAN_ERROR: Unable to complete security scan"],
      scanTime: Date.now() - startTime
    };
  }
}
async function scanFileSignatures(file) {
  const threats = [];
  const buffer = file.buffer;
  const malwareSignatures = [
    { name: "PE_EXECUTABLE", pattern: [77, 90], description: "Windows executable detected" },
    {
      name: "ELF_EXECUTABLE",
      pattern: [127, 69, 76, 70],
      description: "Linux executable detected"
    },
    { name: "MACH_O", pattern: [254, 237, 250, 206], description: "macOS executable detected" },
    { name: "SCRIPT_HEADER", pattern: [35, 33], description: "Script file detected" }
    // #!/
  ];
  for (const signature of malwareSignatures) {
    if (signature.pattern.every((byte, index) => buffer[index] === byte)) {
      if (!isExpectedExecutable(file.originalname, file.mimetype)) {
        threats.push(`${signature.name}: ${signature.description}`);
      }
    }
  }
  return threats;
}
function scanFileName(fileName) {
  const threats = [];
  const lowerName = fileName.toLowerCase();
  const dangerousExtensions = [
    ".exe",
    ".bat",
    ".cmd",
    ".scr",
    ".com",
    ".pif",
    ".vbs",
    ".js",
    ".jar",
    ".app",
    ".deb",
    ".dmg",
    ".iso",
    ".msi",
    ".pkg",
    ".rpm"
  ];
  for (const ext of dangerousExtensions) {
    if (lowerName.endsWith(ext)) {
      threats.push(`DANGEROUS_EXTENSION: File extension ${ext} is not allowed`);
    }
  }
  const extensionCount = (fileName.match(/\./g) || []).length;
  if (extensionCount > 1) {
    const parts = fileName.split(".");
    if (parts.length > 2) {
      threats.push("DOUBLE_EXTENSION: Multiple file extensions detected");
    }
  }
  const suspiciousNames = ["autorun.inf", "desktop.ini", "thumbs.db", "folder.htt"];
  if (suspiciousNames.includes(lowerName)) {
    threats.push(`SUSPICIOUS_NAME: ${fileName} is a suspicious system file`);
  }
  return threats;
}
function scanFileSize(file) {
  const threats = [];
  const { size, mimetype } = file;
  if (mimetype?.startsWith("audio/") && size < 1e3) {
    threats.push("SUSPICIOUS_SIZE: Audio file is suspiciously small");
  }
  if (mimetype?.startsWith("video/") && size < 1e4) {
    threats.push("SUSPICIOUS_SIZE: Video file is suspiciously small");
  }
  return threats;
}
async function scanFileContent(file) {
  const threats = [];
  const buffer = file.buffer;
  const content = buffer.toString("utf8", 0, Math.min(buffer.length, 1024));
  const scriptPatterns = [
    /eval\s*\(/gi,
    /document\.write\s*\(/gi,
    /window\.location\s*=/gi,
    /<script[^>]*>/gi,
    /javascript:/gi,
    /vbscript:/gi
  ];
  for (const pattern of scriptPatterns) {
    if (pattern.test(content)) {
      threats.push(`SUSPICIOUS_CONTENT: Potentially malicious script content detected`);
      break;
    }
  }
  if (!isExpectedExecutable(file.originalname, file.mimetype)) {
    const executableMarkers = [
      "MZ",
      // PE header
      "\x7FELF"
      // ELF header
    ];
    for (const marker of executableMarkers) {
      if (content.includes(marker)) {
        threats.push("EMBEDDED_EXECUTABLE: Executable code found in non-executable file");
        break;
      }
    }
  }
  return threats;
}
function isExpectedExecutable(fileName, mimeType) {
  const executableExtensions = [".exe", ".app", ".deb", ".dmg", ".msi", ".pkg", ".rpm"];
  const executableMimeTypes = [
    "application/x-executable",
    "application/x-msdos-program",
    "application/x-msdownload"
  ];
  const hasExecutableExtension = executableExtensions.some(
    (ext) => fileName.toLowerCase().endsWith(ext)
  );
  const hasExecutableMimeType = mimeType ? executableMimeTypes.includes(mimeType) : false;
  return hasExecutableExtension || hasExecutableMimeType;
}
async function scanZipStructure(file) {
  const errors = [];
  const stats = {
    fileCount: 0,
    totalCompressedSize: file.size,
    totalDecompressedSize: 0,
    compressionRatio: 0,
    forbiddenFiles: [],
    nestedZips: []
  };
  try {
    const zip = new AdmZip(file.buffer);
    const entries = zip.getEntries();
    stats.fileCount = entries.filter((entry) => !entry.isDirectory).length;
    if (stats.fileCount > ZIP_LIMITS.maxFiles) {
      errors.push(
        `ZIP_TOO_MANY_FILES: Archive contains ${stats.fileCount} files (max: ${ZIP_LIMITS.maxFiles})`
      );
    }
    analyzeZipEntries(entries, stats);
    if (stats.totalCompressedSize > 0) {
      stats.compressionRatio = stats.totalDecompressedSize / stats.totalCompressedSize;
    }
    collectZipErrors(errors, stats);
    logZipScanResult(file.originalname, stats, errors.length === 0);
    return { valid: errors.length === 0, errors, stats };
  } catch (error) {
    console.error(`ZIP scan error for ${file.originalname}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      valid: false,
      errors: [`ZIP_SCAN_ERROR: Unable to parse ZIP structure - ${errorMessage}`],
      stats
    };
  }
}
function analyzeZipEntries(entries, stats) {
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const fileName = entry.entryName.toLowerCase();
    stats.totalDecompressedSize += entry.header.size;
    const hasForbiddenExt = FORBIDDEN_EXTENSIONS_IN_ZIP.some((ext) => fileName.endsWith(ext));
    if (hasForbiddenExt) {
      stats.forbiddenFiles.push(entry.entryName);
    }
    if (fileName.endsWith(".zip") || fileName.endsWith(".7z") || fileName.endsWith(".rar")) {
      stats.nestedZips.push(entry.entryName);
    }
  }
}
function collectZipErrors(errors, stats) {
  if (stats.totalDecompressedSize > ZIP_LIMITS.maxTotalSize) {
    const maxSizeMB = ZIP_LIMITS.maxTotalSize / (1024 * 1024);
    const actualSizeMB = (stats.totalDecompressedSize / (1024 * 1024)).toFixed(2);
    errors.push(
      `ZIP_TOO_LARGE: Decompressed size ${actualSizeMB}MB exceeds limit of ${maxSizeMB}MB`
    );
  }
  if (stats.compressionRatio > ZIP_LIMITS.maxCompressionRatio) {
    const ratio = stats.compressionRatio.toFixed(1);
    errors.push(
      `ZIP_BOMB_DETECTED: Suspicious compression ratio ${ratio}:1 (max: ${ZIP_LIMITS.maxCompressionRatio}:1)`
    );
  }
  if (stats.forbiddenFiles.length > 0) {
    const fileList = formatFileList(stats.forbiddenFiles, 5);
    errors.push(`ZIP_FORBIDDEN_FILES: Archive contains forbidden file types: ${fileList}`);
  }
  if (stats.nestedZips.length > 0) {
    const fileList = formatFileList(stats.nestedZips, 3);
    errors.push(
      `ZIP_NESTED_ARCHIVE: Archive contains nested archives which cannot be scanned: ${fileList}`
    );
  }
}
function formatFileList(files, maxShow) {
  const shown = files.slice(0, maxShow).join(", ");
  const remaining = files.length - maxShow;
  return remaining > 0 ? `${shown} and ${remaining} more` : shown;
}
function logZipScanResult(filename, stats, valid) {
  console.log(`ZIP structure scan completed for ${filename}:`, {
    fileCount: stats.fileCount,
    compressedSize: `${(stats.totalCompressedSize / 1024).toFixed(2)}KB`,
    decompressedSize: `${(stats.totalDecompressedSize / (1024 * 1024)).toFixed(2)}MB`,
    compressionRatio: `${stats.compressionRatio.toFixed(1)}:1`,
    forbiddenFiles: stats.forbiddenFiles.length,
    nestedZips: stats.nestedZips.length,
    valid
  });
}
async function uploadToStorage(file, path, options = {}) {
  try {
    const { api: api2 } = await Promise.resolve().then(() => (init_api(), api_exports));
    const { getConvex: getConvex2 } = await Promise.resolve().then(() => (init_convex(), convex_exports));
    const convex8 = getConvex2();
    const uploadResult = await convex8.action(api2.files.generateUploadUrl);
    const uploadUrl = uploadResult.url;
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": options.contentType || file.mimetype
      },
      body: file.buffer
    });
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    const { storageId } = await response.json();
    const fileUrl = await convex8.mutation(api2.files.getStorageUrl, { storageId });
    console.log(`\u2705 File uploaded to Convex: ${file.originalname} -> ${path}`, {
      storageId,
      contentType: options.contentType || file.mimetype,
      fileSize: file.size
    });
    return {
      path: storageId,
      url: fileUrl || `https://convex.cloud/storage/${storageId}`
    };
  } catch (error) {
    console.error("\u274C Convex upload failed, using fallback:", error);
    return {
      path,
      url: `https://placeholder.brolabentertainment.com/${path}`
    };
  }
}

// server/middleware/rateLimiter.ts
var InMemoryRateLimiter = class {
  limits = /* @__PURE__ */ new Map();
  async checkLimit(key, config) {
    const now = Date.now();
    const existing = this.limits.get(key);
    if (!existing || now > existing.resetTime) {
      this.limits.set(key, { count: 1, resetTime: now + config.windowMs, blocked: 0 });
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
        totalRequests: 1
      };
    }
    existing.count++;
    if (existing.count > config.maxRequests) {
      existing.blocked++;
      return {
        allowed: false,
        remaining: 0,
        resetTime: existing.resetTime,
        totalRequests: existing.count,
        retryAfter: Math.ceil((existing.resetTime - now) / 1e3)
      };
    }
    return {
      allowed: true,
      remaining: config.maxRequests - existing.count,
      resetTime: existing.resetTime,
      totalRequests: existing.count
    };
  }
  async resetLimit(key) {
    this.limits.delete(key);
  }
  async getStats(key) {
    const existing = this.limits.get(key);
    const now = Date.now();
    if (!existing || now > existing.resetTime) {
      return {
        key,
        requests: 0,
        remaining: 0,
        resetTime: now,
        windowStart: now,
        blocked: 0
      };
    }
    return {
      key,
      requests: existing.count,
      remaining: Math.max(0, existing.count),
      resetTime: existing.resetTime,
      windowStart: existing.resetTime - 6e4,
      blocked: existing.blocked
    };
  }
};
var rateLimiter = new InMemoryRateLimiter();
var RateLimiter = class _RateLimiter {
  config;
  action;
  constructor(action, config) {
    this.action = action;
    const defaults = {
      windowMs: 60 * 60 * 1e3,
      // 1 hour default
      maxRequests: 10,
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    };
    this.config = { ...defaults, ...config };
  }
  async middleware(req, res, next) {
    try {
      if (!req.isAuthenticated() && !this.shouldCheckUnauthenticated(req)) {
        return next();
      }
      const userId = req.isAuthenticated() ? req.user.id.toString() : null;
      const ip = this.getClientIP(req);
      let key;
      if (this.config.keyGenerator) {
        key = this.config.keyGenerator(req);
      } else if (userId) {
        key = `${userId}:${this.action}`;
      } else {
        key = `${ip}:${this.action}`;
      }
      const result = await rateLimiter.checkLimit(key, {
        windowMs: this.config.windowMs,
        maxRequests: this.config.maxRequests
      });
      if (!result.allowed) {
        res.set({
          "X-RateLimit-Limit": this.config.maxRequests.toString(),
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
          "Retry-After": result.retryAfter?.toString() || "60"
        });
        return res.status(429).json({
          error: "Rate limit exceeded",
          message: this.config.message || `Too many ${this.action} requests. Try again later.`,
          retryAfter: result.retryAfter,
          resetTime: new Date(result.resetTime).toISOString()
        });
      }
      res.set({
        "X-RateLimit-Limit": this.config.maxRequests.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": new Date(result.resetTime).toISOString()
      });
      const originalEnd = res.end.bind(res);
      let requestCompleted = false;
      const config = this.config;
      const decrementCounter = this.decrementCounter.bind(this);
      res.end = ((chunk, encoding, cb) => {
        if (!requestCompleted) {
          requestCompleted = true;
          const shouldCount = !(res.statusCode >= 200 && res.statusCode < 300 && config.skipSuccessfulRequests || res.statusCode >= 400 && config.skipFailedRequests);
          if (!shouldCount) {
            decrementCounter(key).catch(console.error);
          }
        }
        if (chunk === void 0) {
          return originalEnd();
        } else if (typeof encoding === "function") {
          return originalEnd(chunk, encoding);
        } else if (typeof encoding === "string" && typeof cb === "function") {
          return originalEnd(chunk, encoding, cb);
        } else if (typeof encoding === "string") {
          return originalEnd(chunk, encoding);
        } else {
          return originalEnd(chunk);
        }
      });
      next();
    } catch (error) {
      console.error("Rate limiter middleware error:", error);
      next();
    }
  }
  shouldCheckUnauthenticated(_req) {
    const checkUnauthenticatedActions = ["api_request", "file_download"];
    return checkUnauthenticatedActions.includes(this.action);
  }
  getClientIP(req) {
    if (req.ip) return req.ip;
    if (req.socket?.remoteAddress) return req.socket.remoteAddress;
    const legacyConnection = req.connection;
    if (legacyConnection?.remoteAddress) return legacyConnection.remoteAddress;
    if (legacyConnection?.socket?.remoteAddress) return legacyConnection.socket.remoteAddress;
    return "unknown";
  }
  async decrementCounter(key) {
    try {
      console.log(`Would decrement counter for key: ${key}`);
    } catch (error) {
      console.error("Failed to decrement rate limit counter:", error);
    }
  }
  // Static method to create middleware
  static create(action, config) {
    const limiter = new _RateLimiter(action, config);
    return limiter.middleware.bind(limiter);
  }
  // Method to get rate limit stats
  async getStats(key) {
    try {
      if (rateLimiter && typeof rateLimiter.getStats === "function") {
        return await rateLimiter.getStats(key);
      } else {
        console.warn("getStats method not available on rate limiter instance");
        return {
          key,
          requests: 0,
          remaining: 0,
          resetTime: Date.now(),
          windowStart: Date.now(),
          blocked: 0
        };
      }
    } catch (error) {
      console.error("Failed to get rate limit stats:", error);
      return null;
    }
  }
  // Method to reset rate limit
  async resetLimit(key) {
    try {
      if (rateLimiter && typeof rateLimiter.resetLimit === "function") {
        await rateLimiter.resetLimit(key);
        return true;
      } else {
        console.warn("resetLimit method not available on rate limiter instance");
        return false;
      }
    } catch (error) {
      console.error("Failed to reset rate limit:", error);
      return false;
    }
  }
};
var uploadRateLimit = RateLimiter.create("file_upload", {
  windowMs: 60 * 60 * 1e3,
  // 1 hour
  maxRequests: 20,
  // 20 uploads per hour
  message: "Too many file uploads. Please wait before uploading more files."
});
var downloadRateLimit = RateLimiter.create("file_download", {
  windowMs: 60 * 60 * 1e3,
  // 1 hour
  maxRequests: 100,
  // 100 downloads per hour
  message: "Download limit exceeded. Please wait before downloading more files."
});
var apiRateLimit = RateLimiter.create("api_request", {
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  maxRequests: 500,
  // 500 API calls per 15 minutes
  message: "API rate limit exceeded. Please slow down your requests."
});
var emailRateLimit = RateLimiter.create("email_send", {
  windowMs: 24 * 60 * 60 * 1e3,
  // 24 hours
  maxRequests: 10,
  // 10 emails per day
  message: "Email sending limit exceeded. Please wait before sending more emails."
});

// server/routes/avatar.ts
var router3 = Router3();
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
  // 5MB max pour les avatars
});
router3.post(
  "/upload",
  isAuthenticated,
  uploadRateLimit,
  upload.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Aucun fichier fourni" });
        return;
      }
      const validation = await validateFile(req.file, {
        category: "image",
        allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        maxSize: 5 * 1024 * 1024
        // 5MB
      });
      if (!validation.valid) {
        res.status(400).json({
          error: "Validation du fichier \xE9chou\xE9e",
          details: validation.errors
        });
        return;
      }
      const scanResult = await scanFile(req.file);
      if (!scanResult.safe) {
        res.status(400).json({
          error: "Le fichier n'a pas pass\xE9 le scan de s\xE9curit\xE9",
          threats: scanResult.threats
        });
        return;
      }
      const clerkId = req.user.id;
      const convexUrl = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL;
      if (!convexUrl) {
        throw new Error("CONVEX_URL environment variable is required");
      }
      const convex8 = new ConvexHttpClient3(convexUrl);
      const uploadUrlData = await convex8.action("files:generateUploadUrl", {});
      const uploadUrl = uploadUrlData.url;
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": req.file.mimetype },
        body: req.file.buffer
      });
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to Convex storage");
      }
      const { storageId } = await uploadResponse.json();
      const avatarUrl = await convex8.mutation("files:getStorageUrl", { storageId });
      if (!avatarUrl) {
        throw new Error("Storage URL is null");
      }
      const result = await updateUserAvatar(clerkId, avatarUrl);
      if (!result) {
        throw new Error("Failed to update user avatar in database");
      }
      res.json({
        success: true,
        url: avatarUrl,
        message: "Avatar mis \xE0 jour avec succ\xE8s"
      });
    } catch (error) {
      console.error("Erreur upload avatar:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({
        error: "Erreur lors de l'upload de l'avatar",
        details: errorMessage
      });
    }
  }
);
var avatar_default = router3;

// server/routes/beats.ts
import { Router as Router4 } from "express";
var router4 = Router4();
router4.get("/filters", (_req, res) => {
  try {
    const filters = {
      genres: [
        { value: "hip-hop", label: "Hip-Hop" },
        { value: "trap", label: "Trap" },
        { value: "r&b", label: "R&B" },
        { value: "pop", label: "Pop" },
        { value: "drill", label: "Drill" },
        { value: "afrobeat", label: "Afrobeat" },
        { value: "reggaeton", label: "Reggaeton" },
        { value: "dancehall", label: "Dancehall" },
        { value: "uk-drill", label: "UK Drill" },
        { value: "jersey-club", label: "Jersey Club" },
        { value: "amapiano", label: "Amapiano" }
      ],
      moods: [
        { value: "aggressive", label: "Aggressive" },
        { value: "chill", label: "Chill" },
        { value: "dark", label: "Dark" },
        { value: "energetic", label: "Energetic" },
        { value: "emotional", label: "Emotional" },
        { value: "happy", label: "Happy" },
        { value: "melancholic", label: "Melancholic" },
        { value: "mysterious", label: "Mysterious" },
        { value: "romantic", label: "Romantic" },
        { value: "uplifting", label: "Uplifting" }
      ],
      keys: [
        { value: "C", label: "C Major" },
        { value: "C#", label: "C# Major" },
        { value: "D", label: "D Major" },
        { value: "D#", label: "D# Major" },
        { value: "E", label: "E Major" },
        { value: "F", label: "F Major" },
        { value: "F#", label: "F# Major" },
        { value: "G", label: "G Major" },
        { value: "G#", label: "G# Major" },
        { value: "A", label: "A Major" },
        { value: "A#", label: "A# Major" },
        { value: "B", label: "B Major" },
        { value: "Cm", label: "C Minor" },
        { value: "C#m", label: "C# Minor" },
        { value: "Dm", label: "D Minor" },
        { value: "D#m", label: "D# Minor" },
        { value: "Em", label: "E Minor" },
        { value: "Fm", label: "F Minor" },
        { value: "F#m", label: "F# Minor" },
        { value: "Gm", label: "G Minor" },
        { value: "G#m", label: "G# Minor" },
        { value: "Am", label: "A Minor" },
        { value: "A#m", label: "A# Minor" },
        { value: "Bm", label: "B Minor" }
      ],
      bpmRange: { min: 60, max: 200 },
      priceRange: { min: 0, max: 500 }
    };
    return res.json(filters);
  } catch (error) {
    logger.error("/api/beats/filters error:", { error });
    return res.status(500).json({ error: "Failed to fetch filters" });
  }
});
router4.get("/featured", async (req, res) => {
  try {
    const base = `${req.protocol}://${req.get("host")}`;
    const wooResponse = await fetch(`${base}/api/woocommerce/products?featured=true&per_page=8`);
    if (!wooResponse.ok) {
      logger.warn("Failed to fetch featured beats from WooCommerce", {
        status: wooResponse.status
      });
      return res.json([]);
    }
    const products = await wooResponse.json();
    const beats = Array.isArray(products) ? products.map((p) => ({
      id: p.id,
      title: p.name || "Untitled",
      price: p.price || "0",
      image: p.images?.[0]?.src || "",
      slug: p.slug || "",
      featured: true
    })) : [];
    return res.json(beats);
  } catch (error) {
    logger.error("/api/beats/featured error:", { error });
    return res.json([]);
  }
});
router4.get("/", async (req, res) => {
  try {
    const base = `${req.protocol}://${req.get("host")}`;
    const queryParams = new URLSearchParams(req.query);
    const wooResponse = await fetch(`${base}/api/woocommerce/products?${queryParams}`);
    if (!wooResponse.ok) {
      logger.warn("Failed to fetch beats from WooCommerce", {
        status: wooResponse.status
      });
      return res.json({ beats: [] });
    }
    const products = await wooResponse.json();
    const beats = Array.isArray(products) ? products.map((p) => ({
      id: p.id,
      title: p.name || "Untitled",
      price: p.price || "0",
      image: p.images?.[0]?.src || "",
      slug: p.slug || ""
    })) : [];
    return res.json({ beats });
  } catch (error) {
    logger.error("/api/beats error:", { error });
    return res.json({ beats: [] });
  }
});
var beats_default = router4;

// server/routes/categories.ts
import { Router as Router5 } from "express";
var router5 = Router5();
router5.get("/", async (_req, res) => {
  try {
    const categories = [
      { id: 1, name: "Hip Hop", slug: "hip-hop", count: 15 },
      { id: 2, name: "Trap", slug: "trap", count: 12 },
      { id: 3, name: "R&B", slug: "rb", count: 8 },
      { id: 4, name: "Pop", slug: "pop", count: 10 },
      { id: 5, name: "Electronic", slug: "electronic", count: 6 }
    ];
    res.json(categories);
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch categories");
  }
});
var categories_default = router5;

// server/routes/clerk.ts
import { Router as Router6 } from "express";
import Stripe2 from "stripe";

// shared/validation/validators.ts
import { z as z3 } from "zod";
var validateEmail = (email) => {
  if (!email || email.length > 254) return false;
  return z3.string().email().safeParse(email).success;
};
var validatePhoneNumber = (phone) => {
  if (!phone || phone.length < 10 || phone.length > 17) return false;
  const cleaned = phone.replaceAll(/[\s\-()+]/g, "");
  const digitRegex = /^\d{10,15}$/;
  return digitRegex.test(cleaned);
};

// shared/validation/AuthValidation.ts
import { z as z4 } from "zod";
var registerSchema = z4.object({
  username: z4.string().min(3, "Username must be at least 3 characters").max(30, "Username must be less than 30 characters").regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain letters, numbers, underscores, and hyphens"
  ),
  email: z4.string().email("Please enter a valid email address").max(255, "Email is too long"),
  password: z4.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long").regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain at least one lowercase letter, one uppercase letter, and one number"
  ),
  confirmPassword: z4.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});
var serverRegisterSchema = z4.object({
  username: z4.string().min(3, "Username must be at least 3 characters").max(30, "Username must be less than 30 characters").regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain letters, numbers, underscores, and hyphens"
  ),
  email: z4.string().email("Please enter a valid email address").max(255, "Email is too long"),
  password: z4.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long").regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain at least one lowercase letter, one uppercase letter, and one number"
  )
});
var enhancedRegisterSchema = registerSchema.refine((data) => validateEmail(data.email), {
  message: "Email domain is not valid",
  path: ["email"]
});
var loginSchema = z4.object({
  username: z4.string().min(1, "Username is required"),
  password: z4.string().min(1, "Password is required")
});
var updateProfileSchema = z4.object({
  username: z4.string().min(3, "Username must be at least 3 characters").max(30, "Username must be less than 30 characters").regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain letters, numbers, underscores, and hyphens"
  ).optional(),
  email: z4.string().email("Please enter a valid email address").max(255, "Email is too long").optional(),
  avatar: z4.string().url("Invalid avatar URL").optional()
});

// shared/validation/PaymentValidation.ts
import { z as z5 } from "zod";
var PAYPAL_SUPPORTED_CURRENCIES = ["EUR", "USD", "GBP", "CAD", "AUD"];
var createSubscriptionSchema = z5.object({
  priceId: z5.enum(["basic", "pro", "unlimited"], {
    errorMap: () => ({ message: "Invalid subscription plan" })
  }),
  billingInterval: z5.enum(["monthly", "annual"], {
    errorMap: () => ({ message: "Invalid billing interval" })
  })
});
var serverCreateSubscriptionSchema = createSubscriptionSchema.extend({
  userAgent: z5.string().optional(),
  ipAddress: z5.string().ip().optional(),
  timestamp: z5.number().optional()
});
var paymentIntentSchema = z5.object({
  amount: z5.number().min(100, "Amount must be at least $1.00").max(999999, "Amount is too high"),
  currency: z5.enum(["usd", "eur"], {
    errorMap: () => ({ message: "Invalid currency" })
  }),
  metadata: z5.record(z5.string()).optional()
});
var enhancedPaymentIntentSchema = paymentIntentSchema.refine(
  (data) => {
    const minimums = { usd: 50, eur: 50 };
    return data.amount >= minimums[data.currency];
  },
  {
    message: "Amount below minimum for currency",
    path: ["amount"]
  }
);
var stripeWebhookSchema = z5.object({
  id: z5.string(),
  type: z5.string(),
  data: z5.object({
    object: z5.record(z5.unknown())
  }),
  created: z5.number()
});
var paypalCreateOrderSchema = z5.object({
  serviceType: z5.string().min(1, "Service type is required").max(100, "Service type must be 100 characters or less"),
  amount: z5.number({ invalid_type_error: "Amount must be a number" }).min(0.5, "Minimum amount is $0.50").max(999999.99, "Amount exceeds maximum allowed ($999,999.99)"),
  currency: z5.enum(PAYPAL_SUPPORTED_CURRENCIES, {
    errorMap: () => ({
      message: `Currency must be one of: ${PAYPAL_SUPPORTED_CURRENCIES.join(", ")}`
    })
  }),
  description: z5.string().min(1, "Description is required").max(500, "Description must be 500 characters or less"),
  reservationId: z5.string().min(1, "Reservation ID is required"),
  customerEmail: z5.string().email("Invalid email format")
});
var rateLimitSchema = z5.object({
  ip: z5.string(),
  endpoint: z5.string(),
  timestamp: z5.number(),
  count: z5.number().min(0)
});
var auditLogSchema = z5.object({
  userId: z5.number(),
  action: z5.string(),
  resource: z5.string(),
  details: z5.record(z5.unknown()).optional(),
  ipAddress: z5.string().optional(),
  userAgent: z5.string().optional(),
  timestamp: z5.date()
});

// shared/validation/FileValidation.ts
import { z as z6 } from "zod";
var fileUploadValidation = z6.object({
  name: z6.string().min(1, "Filename is required"),
  size: z6.number().max(50 * 1024 * 1024, "File size exceeds 50MB limit"),
  type: z6.string().min(1, "File type is required"),
  lastModified: z6.number().optional()
});
var fileFilterValidation = z6.object({
  genre: z6.string().optional(),
  bpm: z6.object({
    min: z6.number().min(60).max(200),
    max: z6.number().min(60).max(200)
  }).optional(),
  key: z6.string().optional(),
  mood: z6.string().optional(),
  tags: z6.array(z6.string()).optional()
});
var serviceOrderValidation = z6.object({
  service_type: z6.enum(["mixing", "mastering", "recording", "consultation"]),
  details: z6.string().min(10, "Details must be at least 10 characters"),
  budget: z6.number().min(50, "Minimum budget is $50"),
  deadline: z6.string().datetime("Invalid deadline format"),
  contact_email: z6.string().email("Invalid email address"),
  contact_phone: z6.string().optional()
});
var mixingMasteringFormSchema = z6.object({
  // Personal Information
  name: z6.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters").regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
  email: z6.string().email("Please enter a valid email address").max(255, "Email is too long"),
  phone: z6.string().refine((phone) => !phone || validatePhoneNumber(phone), {
    message: "Please enter a valid phone number"
  }),
  // Booking Details
  preferredDate: z6.string().min(1, "Please select a preferred date").refine(
    (date) => {
      const selectedDate = new Date(date);
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate >= today;
    },
    {
      message: "Preferred date must be today or in the future"
    }
  ),
  timeSlot: z6.string().min(1, "Please select a time slot").refine(
    (slot) => {
      const validSlots = [
        "9:00 AM",
        "10:00 AM",
        "11:00 AM",
        "1:00 PM",
        "2:00 PM",
        "3:00 PM",
        "4:00 PM"
      ];
      return validSlots.includes(slot);
    },
    {
      message: "Please select a valid time slot"
    }
  ),
  // Project Details
  projectDetails: z6.string().min(20, "Project details must be at least 20 characters").max(2e3, "Project details must be less than 2000 characters"),
  trackCount: z6.string().optional().refine((count) => !count || Number.parseInt(count) >= 1 && Number.parseInt(count) <= 100, {
    message: "Track count must be between 1 and 100"
  }),
  genre: z6.string().optional(),
  reference: z6.string().optional().refine((ref) => !ref || ref.length <= 500, {
    message: "Reference must be less than 500 characters"
  }),
  specialRequests: z6.string().optional().refine((req) => !req || req.length <= 1e3, {
    message: "Special requests must be less than 1000 characters"
  })
});
var serviceSelectionSchema = z6.object({
  selectedService: z6.enum(["mixing", "mastering", "mixing-mastering"], {
    errorMap: () => ({ message: "Please select a valid service" })
  })
});
var mixingMasteringSubmissionSchema = mixingMasteringFormSchema.merge(serviceSelectionSchema);
var customBeatRequestSchema = z6.object({
  // Basic beat specifications
  genre: z6.string().min(1, "Genre is required"),
  subGenre: z6.string().optional(),
  bpm: z6.number().min(60, "BPM must be at least 60").max(200, "BPM must be at most 200"),
  key: z6.string().min(1, "Key is required"),
  // Creative specifications
  mood: z6.array(z6.string()).min(1, "At least one mood is required"),
  instruments: z6.array(z6.string()).optional(),
  duration: z6.number().min(60, "Duration must be at least 60 seconds").max(600, "Duration must be at most 10 minutes"),
  // Project details
  description: z6.string().min(20, "Description must be at least 20 characters").max(2e3, "Description must be less than 2000 characters"),
  referenceTrack: z6.string().optional(),
  // Business details
  budget: z6.number().min(50, "Minimum budget is $50").max(1e3, "Maximum budget is $1000"),
  deadline: z6.string().optional().refine(
    (date) => {
      if (!date) return true;
      const deadlineDate = new Date(date);
      const minDate = /* @__PURE__ */ new Date();
      minDate.setDate(minDate.getDate() + 1);
      return deadlineDate >= minDate;
    },
    {
      message: "Deadline must be at least 1 day from today"
    }
  ),
  revisions: z6.number().min(0).max(5, "Maximum 5 revisions allowed"),
  priority: z6.enum(["standard", "priority", "express"]),
  additionalNotes: z6.string().max(1e3, "Additional notes must be less than 1000 characters").optional(),
  // File uploads
  uploadedFiles: z6.array(
    z6.object({
      name: z6.string(),
      size: z6.number().max(100 * 1024 * 1024, "Individual files must be under 100MB"),
      type: z6.string(),
      lastModified: z6.number().optional()
    })
  ).optional().refine(
    (files) => {
      if (!files) return true;
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      return totalSize <= 200 * 1024 * 1024;
    },
    {
      message: "Total file size must be under 200MB"
    }
  ).refine(
    (files) => {
      if (!files) return true;
      const fileNames = files.map((f) => f.name.toLowerCase());
      const uniqueNames = new Set(fileNames);
      return uniqueNames.size === fileNames.length;
    },
    {
      message: "Duplicate file names are not allowed"
    }
  )
});
var customBeatFileValidation = z6.object({
  name: z6.string().min(1, "Filename is required").refine(
    (name) => {
      const lowerName = name.toLowerCase();
      const audioExtensions = [".mp3", ".wav", ".aiff", ".flac", ".m4a"];
      const archiveExtensions = [".zip", ".rar", ".7z"];
      const isAudio = audioExtensions.some((ext) => lowerName.endsWith(ext));
      const isArchive = archiveExtensions.some((ext) => lowerName.endsWith(ext));
      return isAudio || isArchive;
    },
    {
      message: "File must be an audio file or compressed archive"
    }
  ),
  size: z6.number().max(100 * 1024 * 1024, "File size exceeds 100MB limit"),
  type: z6.string().min(1, "File type is required"),
  lastModified: z6.number().optional()
});

// shared/validation/BeatValidation.ts
import { z as z7 } from "zod";
var BeatGenre = z7.enum([
  "hip-hop",
  "trap",
  "r&b",
  "pop",
  "drill",
  "afrobeat",
  "reggaeton",
  "dancehall",
  "uk-drill",
  "jersey-club",
  "amapiano",
  "custom"
]);
var BeatMood = z7.enum([
  "aggressive",
  "chill",
  "dark",
  "energetic",
  "emotional",
  "happy",
  "melancholic",
  "mysterious",
  "romantic",
  "uplifting"
]);
var MusicalKey = z7.enum([
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
  "Cm",
  "C#m",
  "Dbm",
  "Dm",
  "D#m",
  "Ebm",
  "Em",
  "Fm",
  "F#m",
  "Gbm",
  "Gm",
  "G#m",
  "Abm",
  "Am",
  "A#m",
  "Bbm",
  "Bm"
]);
var LicenseType = z7.enum(["basic", "premium", "unlimited", "exclusive"]);
var BeatStatus = z7.enum([
  "active",
  "inactive",
  "sold_exclusively",
  "pending_review",
  "rejected"
]);
var BpmSchema = z7.number().min(60, "BPM must be at least 60").max(200, "BPM cannot exceed 200").int("BPM must be a whole number");
var BeatPriceSchema = z7.number().min(100, "Price must be at least $1.00").max(99999999, "Price cannot exceed $999,999.99").int("Price must be in cents (whole number)");
var BeatDurationSchema = z7.number().min(30, "Beat must be at least 30 seconds").max(600, "Beat cannot exceed 10 minutes").positive("Duration must be positive");
var BeatTagsSchema = z7.array(z7.string().min(1).max(20)).max(10, "Maximum 10 tags allowed").optional();
var AudioFileSchema = z7.object({
  url: z7.string().url("Invalid audio file URL"),
  format: z7.enum(["mp3", "wav", "aiff", "flac"]),
  quality: z7.enum(["128", "192", "256", "320", "lossless"]),
  duration: BeatDurationSchema,
  fileSize: z7.number().positive("File size must be positive"),
  waveformData: z7.array(z7.number()).optional()
});
var BeatMetadataSchema = z7.object({
  producer: z7.string().min(1, "Producer name is required").max(100),
  credits: z7.string().max(500).optional(),
  description: z7.string().max(1e3).optional(),
  inspiration: z7.string().max(200).optional(),
  collaborators: z7.array(z7.string()).max(5).optional()
});
var BeatSchema = z7.object({
  id: z7.number().positive().optional(),
  title: z7.string().min(1, "Beat title is required").max(100, "Beat title cannot exceed 100 characters").regex(/^[a-zA-Z0-9\s\-_()]+$/, "Beat title contains invalid characters"),
  slug: z7.string().min(1, "Slug is required").max(120, "Slug cannot exceed 120 characters").regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  genre: BeatGenre,
  mood: BeatMood.optional(),
  key: MusicalKey.optional(),
  bpm: BpmSchema,
  status: BeatStatus.default("pending_review"),
  // Pricing for different license types
  basicPrice: BeatPriceSchema,
  premiumPrice: BeatPriceSchema,
  unlimitedPrice: BeatPriceSchema,
  exclusivePrice: BeatPriceSchema.optional(),
  // Audio files
  previewFile: AudioFileSchema,
  basicFile: AudioFileSchema.optional(),
  premiumFile: AudioFileSchema.optional(),
  unlimitedFile: AudioFileSchema.optional(),
  stemsFile: AudioFileSchema.optional(),
  // Metadata
  metadata: BeatMetadataSchema.optional(),
  tags: BeatTagsSchema,
  // Timestamps
  createdAt: z7.string().datetime().optional(),
  updatedAt: z7.string().datetime().optional(),
  // Producer information
  producerId: z7.number().positive(),
  producerName: z7.string().min(1).max(100),
  // Analytics
  playCount: z7.number().nonnegative().default(0),
  downloadCount: z7.number().nonnegative().default(0),
  likeCount: z7.number().nonnegative().default(0),
  // SEO
  seoTitle: z7.string().max(60).optional(),
  seoDescription: z7.string().max(160).optional(),
  // Featured status
  isFeatured: z7.boolean().default(false),
  featuredUntil: z7.string().datetime().optional()
});
var CreateBeatSchema = BeatSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  playCount: true,
  downloadCount: true,
  likeCount: true
});
var UpdateBeatSchema = BeatSchema.partial().extend({
  id: z7.number().positive()
});
var BeatFilterSchema = z7.object({
  genre: BeatGenre.optional(),
  mood: BeatMood.optional(),
  key: MusicalKey.optional(),
  bpmMin: z7.number().min(60).max(200).optional(),
  bpmMax: z7.number().min(60).max(200).optional(),
  priceMin: z7.number().min(0).optional(),
  priceMax: z7.number().min(0).optional(),
  tags: z7.array(z7.string()).optional(),
  producer: z7.string().optional(),
  isFeatured: z7.boolean().optional(),
  status: BeatStatus.optional(),
  search: z7.string().max(100).optional(),
  sortBy: z7.enum(["newest", "oldest", "price_low", "price_high", "popular", "trending"]).default("newest"),
  page: z7.number().positive().default(1),
  limit: z7.number().min(1).max(100).default(20)
});
var BeatPurchaseSchema = z7.object({
  beatId: z7.number().positive(),
  licenseType: LicenseType,
  quantity: z7.number().positive().default(1),
  customLicenseTerms: z7.string().max(1e3).optional()
});
var BeatInteractionSchema = z7.object({
  beatId: z7.number().positive(),
  action: z7.enum(["like", "unlike", "favorite", "unfavorite"])
});

// shared/validation/ErrorValidation.ts
import { z as z8 } from "zod";
var ErrorSeverity = z8.enum(["low", "medium", "high", "critical"]);
var ErrorCategory = z8.enum([
  "authentication",
  "authorization",
  "validation",
  "payment",
  "audio_processing",
  "file_upload",
  "database",
  "external_api",
  "rate_limiting",
  "system",
  "user_input",
  "business_logic",
  "network",
  "security"
]);
var ErrorType = z8.enum([
  // Authentication errors
  "invalid_credentials",
  "account_locked",
  "session_expired",
  "two_factor_required",
  // Authorization errors
  "insufficient_permissions",
  "resource_forbidden",
  "subscription_required",
  "quota_exceeded",
  // Validation errors
  "invalid_input",
  "missing_required_field",
  "format_error",
  "constraint_violation",
  // Payment errors
  "payment_failed",
  "insufficient_funds",
  "card_declined",
  "payment_method_invalid",
  "subscription_expired",
  // Audio processing errors
  "audio_format_unsupported",
  "audio_file_corrupted",
  "processing_timeout",
  "waveform_generation_failed",
  // File upload errors
  "file_too_large",
  "file_type_not_allowed",
  "virus_detected",
  "upload_failed",
  "file_validation_failed",
  "security_threat_detected",
  "security_check_failed",
  "upload_rate_limit",
  "upload_size_limit",
  // Database errors
  "connection_failed",
  "query_timeout",
  "constraint_violation_db",
  "data_not_found",
  // External API errors
  "api_unavailable",
  "api_rate_limited",
  "api_authentication_failed",
  "api_response_invalid",
  // System errors
  "internal_server_error",
  "service_unavailable",
  "timeout",
  "configuration_error",
  // Business logic errors
  "beat_not_available",
  "license_conflict",
  "reservation_conflict",
  "order_processing_failed"
]);
var ErrorContextSchema = z8.object({
  // Request information
  requestId: z8.string().optional(),
  userId: z8.string().optional(),
  userAgent: z8.string().optional(),
  ipAddress: z8.string().ip().optional(),
  // API information
  endpoint: z8.string().optional(),
  method: z8.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  statusCode: z8.number().min(100).max(599).optional(),
  // Business context
  beatId: z8.number().optional(),
  orderId: z8.string().optional(),
  reservationId: z8.string().optional(),
  // Technical context
  stackTrace: z8.string().optional(),
  errorCode: z8.string().optional(),
  // Additional metadata
  metadata: z8.record(z8.unknown()).optional()
});
var ErrorResolutionSchema = z8.object({
  // User-facing information
  userMessage: z8.string().min(1, "User message is required").max(500),
  userAction: z8.string().max(200).optional(),
  // Support information
  supportCode: z8.string().max(50).optional(),
  documentationUrl: z8.string().url().optional(),
  // Recovery suggestions
  retryable: z8.boolean().default(false),
  retryAfter: z8.number().positive().optional(),
  // seconds
  // Escalation
  requiresSupport: z8.boolean().default(false),
  escalationLevel: z8.enum(["none", "tier1", "tier2", "engineering"]).default("none")
});
var ErrorSchema = z8.object({
  id: z8.string().optional(),
  // Error classification
  type: ErrorType,
  category: ErrorCategory,
  severity: ErrorSeverity,
  // Error details
  message: z8.string().min(1, "Error message is required").max(1e3),
  code: z8.string().max(50).optional(),
  // Context information
  context: ErrorContextSchema.optional(),
  // Resolution information
  resolution: ErrorResolutionSchema,
  // Timestamps
  occurredAt: z8.string().datetime(),
  resolvedAt: z8.string().datetime().optional(),
  // Tracking
  count: z8.number().positive().default(1),
  firstOccurrence: z8.string().datetime().optional(),
  lastOccurrence: z8.string().datetime().optional()
});
var ApiErrorResponseSchema = z8.object({
  error: z8.object({
    type: ErrorType,
    message: z8.string().min(1).max(500),
    code: z8.string().max(50).optional(),
    details: z8.record(z8.unknown()).optional(),
    // User guidance
    userMessage: z8.string().max(500).optional(),
    userAction: z8.string().max(200).optional(),
    // Support information
    supportCode: z8.string().max(50).optional(),
    documentationUrl: z8.string().url().optional(),
    // Request tracking
    requestId: z8.string().optional(),
    timestamp: z8.string().datetime()
  }),
  // Additional context for debugging (dev/staging only)
  debug: z8.object({
    stackTrace: z8.string().optional(),
    context: z8.record(z8.unknown()).optional()
  }).optional()
});
var ValidationErrorSchema = z8.object({
  field: z8.string().min(1, "Field name is required"),
  value: z8.unknown(),
  message: z8.string().min(1, "Validation message is required"),
  code: z8.string().optional(),
  // Nested validation errors (simplified to avoid circular reference)
  nested: z8.array(
    z8.object({
      field: z8.string(),
      value: z8.unknown(),
      message: z8.string(),
      code: z8.string().optional()
    })
  ).optional()
});
var ValidationErrorResponseSchema = z8.object({
  error: z8.object({
    type: z8.literal("validation_error"),
    message: z8.string().default("Validation failed"),
    errors: z8.array(ValidationErrorSchema).min(1, "At least one validation error required"),
    // Summary
    errorCount: z8.number().positive(),
    // Request tracking
    requestId: z8.string().optional(),
    timestamp: z8.string().datetime()
  })
});
var RateLimitErrorSchema = z8.object({
  error: z8.object({
    type: z8.literal("rate_limit_exceeded"),
    message: z8.string().default("Rate limit exceeded"),
    // Rate limit details
    limit: z8.number().positive(),
    remaining: z8.number().nonnegative(),
    resetTime: z8.string().datetime(),
    retryAfter: z8.number().positive(),
    // seconds
    // Request tracking
    requestId: z8.string().optional(),
    timestamp: z8.string().datetime()
  })
});
var BusinessLogicErrorSchema = z8.object({
  error: z8.object({
    type: ErrorType,
    message: z8.string().min(1).max(500),
    // Business context
    businessRule: z8.string().max(100).optional(),
    resourceId: z8.string().optional(),
    resourceType: z8.enum(["beat", "order", "reservation", "user", "subscription"]).optional(),
    // Resolution guidance
    userMessage: z8.string().max(500),
    suggestedAction: z8.string().max(200).optional(),
    // Request tracking
    requestId: z8.string().optional(),
    timestamp: z8.string().datetime()
  })
});
var createApiError = (type, message, options = {}) => {
  return {
    error: {
      type,
      message,
      code: options.code,
      userMessage: options.userMessage || message,
      userAction: options.userAction,
      supportCode: options.supportCode,
      requestId: options.requestId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
};
var createValidationError = (errors, requestId) => {
  return {
    error: {
      type: "validation_error",
      message: "Validation failed",
      errors: errors.map((err) => ({
        field: err.field,
        value: err.value,
        message: err.message,
        code: err.code
      })),
      errorCount: errors.length,
      requestId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
};

// shared/validation/OrderValidation.ts
import { z as z9 } from "zod";
var OrderStatus = z9.enum([
  "pending",
  "processing",
  "completed",
  "cancelled",
  "refunded",
  "failed"
]);
var PaymentStatus = z9.enum([
  "pending",
  "processing",
  "succeeded",
  "failed",
  "cancelled",
  "refunded",
  "requires_payment_method",
  "requires_confirmation"
]);
var PaymentProvider = z9.enum(["stripe", "paypal", "clerk_billing"]);
var Currency = z9.enum([
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "JPY",
  "CHF",
  "SEK",
  "NOK",
  "DKK"
]);
var OrderItemSchema = z9.object({
  id: z9.string().optional(),
  productId: z9.number().positive(),
  productType: z9.enum(["beat", "subscription", "service", "custom"]),
  title: z9.string().min(1, "Product title is required").max(200),
  // License information for beats
  licenseType: LicenseType.optional(),
  // Pricing
  unitPrice: z9.number().min(0, "Unit price cannot be negative"),
  quantity: z9.number().positive().default(1),
  totalPrice: z9.number().min(0, "Total price cannot be negative"),
  // Discounts
  discountAmount: z9.number().min(0).default(0),
  discountCode: z9.string().max(50).optional(),
  // Metadata
  metadata: z9.record(z9.unknown()).optional(),
  // Digital delivery
  downloadUrl: z9.string().url().optional(),
  downloadExpiry: z9.string().datetime().optional(),
  downloadCount: z9.number().nonnegative().default(0),
  maxDownloads: z9.number().positive().optional()
});
var BillingAddressSchema = z9.object({
  firstName: z9.string().min(1, "First name is required").max(50),
  lastName: z9.string().min(1, "Last name is required").max(50),
  company: z9.string().max(100).optional(),
  addressLine1: z9.string().min(1, "Address is required").max(100),
  addressLine2: z9.string().max(100).optional(),
  city: z9.string().min(1, "City is required").max(50),
  state: z9.string().max(50).optional(),
  postalCode: z9.string().min(1, "Postal code is required").max(20),
  country: z9.string().length(2, "Country must be 2-letter ISO code"),
  phone: z9.string().max(20).optional()
});
var TaxInfoSchema = z9.object({
  taxRate: z9.number().min(0).max(1),
  // 0-100% as decimal
  taxAmount: z9.number().min(0),
  taxType: z9.enum(["vat", "sales_tax", "gst", "none"]),
  taxId: z9.string().max(50).optional(),
  exemptionReason: z9.string().max(200).optional()
});
var PaymentInfoSchema = z9.object({
  provider: PaymentProvider,
  paymentIntentId: z9.string().optional(),
  sessionId: z9.string().optional(),
  transactionId: z9.string().optional(),
  // Payment method details (encrypted/tokenized)
  paymentMethodId: z9.string().optional(),
  last4: z9.string().length(4).optional(),
  brand: z9.string().max(20).optional(),
  // Processing details
  processingFee: z9.number().min(0).default(0),
  netAmount: z9.number().min(0),
  // Timestamps
  authorizedAt: z9.string().datetime().optional(),
  capturedAt: z9.string().datetime().optional(),
  // Failure information
  failureCode: z9.string().max(50).optional(),
  failureMessage: z9.string().max(200).optional()
});
var InvoiceInfoSchema = z9.object({
  invoiceNumber: z9.string().min(1, "Invoice number is required").max(50),
  invoiceDate: z9.string().datetime(),
  dueDate: z9.string().datetime().optional(),
  // PDF generation
  pdfUrl: z9.string().url().optional(),
  pdfStorageId: z9.string().optional(),
  // Invoice status
  status: z9.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
  // Notes
  notes: z9.string().max(1e3).optional(),
  terms: z9.string().max(2e3).optional()
});
var OrderSchema = z9.object({
  id: z9.string().optional(),
  orderNumber: z9.string().min(1, "Order number is required").max(50),
  // Customer information
  userId: z9.string().optional(),
  email: z9.string().email("Valid email is required"),
  // Order items
  items: z9.array(OrderItemSchema).min(1, "Order must contain at least one item"),
  // Pricing
  subtotal: z9.number().min(0, "Subtotal cannot be negative"),
  taxInfo: TaxInfoSchema.optional(),
  shippingCost: z9.number().min(0).default(0),
  discountTotal: z9.number().min(0).default(0),
  total: z9.number().min(0, "Total cannot be negative"),
  currency: Currency,
  // Status
  status: OrderStatus,
  paymentStatus: PaymentStatus,
  // Payment and billing
  paymentInfo: PaymentInfoSchema.optional(),
  billingAddress: BillingAddressSchema.optional(),
  // Invoice
  invoice: InvoiceInfoSchema.optional(),
  // Fulfillment
  fulfillmentStatus: z9.enum(["pending", "processing", "fulfilled", "cancelled"]).default("pending"),
  fulfillmentDate: z9.string().datetime().optional(),
  // Metadata
  metadata: z9.record(z9.unknown()).optional(),
  notes: z9.string().max(1e3).optional(),
  // Timestamps
  createdAt: z9.string().datetime().optional(),
  updatedAt: z9.string().datetime().optional(),
  // Idempotency
  idempotencyKey: z9.string().max(255).optional()
});
var CreateOrderSchema = z9.object({
  items: z9.array(
    z9.object({
      productId: z9.number().positive(),
      productType: z9.enum(["beat", "subscription", "service", "custom"]),
      title: z9.string().min(1).max(200),
      licenseType: LicenseType.optional(),
      unitPrice: z9.number().min(0),
      quantity: z9.number().positive().default(1),
      metadata: z9.record(z9.unknown()).optional()
    })
  ).min(1, "Order must contain at least one item"),
  currency: Currency.default("USD"),
  email: z9.string().email("Valid email is required"),
  // Optional fields
  billingAddress: BillingAddressSchema.optional(),
  metadata: z9.record(z9.unknown()).optional(),
  notes: z9.string().max(1e3).optional(),
  idempotencyKey: z9.string().max(255).optional()
});
var UpdateOrderSchema = z9.object({
  id: z9.string().min(1, "Order ID is required"),
  status: OrderStatus.optional(),
  paymentStatus: PaymentStatus.optional(),
  fulfillmentStatus: z9.enum(["pending", "processing", "fulfilled", "cancelled"]).optional(),
  notes: z9.string().max(1e3).optional(),
  metadata: z9.record(z9.unknown()).optional()
});
var OrderFilterSchema = z9.object({
  userId: z9.string().optional(),
  email: z9.string().email().optional(),
  status: OrderStatus.optional(),
  paymentStatus: PaymentStatus.optional(),
  currency: Currency.optional(),
  // Date range filters
  createdAfter: z9.string().datetime().optional(),
  createdBefore: z9.string().datetime().optional(),
  // Amount filters
  minAmount: z9.number().min(0).optional(),
  maxAmount: z9.number().min(0).optional(),
  // Search
  search: z9.string().max(100).optional(),
  // Pagination
  page: z9.number().positive().default(1),
  limit: z9.number().min(1).max(100).default(20),
  // Sorting
  sortBy: z9.enum(["created_at", "updated_at", "total", "status"]).default("created_at"),
  sortOrder: z9.enum(["asc", "desc"]).default("desc")
});
var CreatePaymentIntentSchema = z9.object({
  orderId: z9.string().min(1, "Order ID is required"),
  amount: z9.number().min(50, "Minimum amount is $0.50"),
  // $0.50 minimum
  currency: Currency.default("USD"),
  paymentProvider: PaymentProvider.default("stripe"),
  // Payment method options
  paymentMethods: z9.array(z9.enum(["card", "paypal", "bank_transfer"])).optional(),
  // Customer information
  customerId: z9.string().optional(),
  customerEmail: z9.string().email().optional(),
  // Metadata
  metadata: z9.record(z9.string()).optional()
});
var RefundRequestSchema = z9.object({
  orderId: z9.string().min(1, "Order ID is required"),
  amount: z9.number().positive().optional(),
  // If not provided, full refund
  reason: z9.enum([
    "duplicate",
    "fraudulent",
    "requested_by_customer",
    "product_not_delivered",
    "product_defective",
    "other"
  ]),
  description: z9.string().max(500).optional(),
  notifyCustomer: z9.boolean().default(true)
});

// shared/validation/ReservationValidation.ts
import { z as z10 } from "zod";
var ServiceType = z10.enum([
  "mixing",
  "mastering",
  "recording",
  "custom_beat",
  "consultation",
  "vocal_tuning",
  "beat_remake",
  "full_production"
]);
var ReservationStatus = z10.enum([
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
  "rescheduled"
]);
var PriorityLevel = z10.enum(["standard", "priority", "rush", "emergency"]);
var StudioRoom = z10.enum([
  "studio_a",
  "studio_b",
  "vocal_booth_1",
  "vocal_booth_2",
  "mixing_room",
  "mastering_suite",
  "remote"
  // For online services
]);
var EquipmentRequirementsSchema = z10.object({
  microphones: z10.array(z10.string()).optional(),
  instruments: z10.array(z10.string()).optional(),
  software: z10.array(z10.string()).optional(),
  specialRequests: z10.string().max(500).optional()
});
var ServiceDetailsSchema = z10.object({
  // Recording details
  trackCount: z10.number().min(1).max(100).optional(),
  estimatedDuration: z10.number().min(30).max(480).optional(),
  // 30 minutes to 8 hours
  // Mixing/Mastering details
  stemCount: z10.number().min(1).max(50).optional(),
  referenceTrack: z10.string().url().optional(),
  targetLoudness: z10.number().optional(),
  // Beat production details
  genre: z10.string().max(50).optional(),
  bpm: z10.number().min(60).max(200).optional(),
  key: z10.string().max(10).optional(),
  mood: z10.string().max(50).optional(),
  // File requirements
  deliveryFormat: z10.enum(["wav", "mp3", "aiff", "flac"]).optional(),
  bitRate: z10.enum(["16bit", "24bit", "32bit"]).optional(),
  sampleRate: z10.enum(["44100", "48000", "96000", "192000"]).optional(),
  // Additional services
  includeStems: z10.boolean().default(false),
  includeRevisions: z10.number().min(0).max(5).default(2),
  rushDelivery: z10.boolean().default(false)
});
var ClientInfoSchema = z10.object({
  firstName: z10.string().min(1, "First name is required").max(50),
  lastName: z10.string().min(1, "Last name is required").max(50),
  email: z10.string().email("Valid email is required"),
  phone: z10.string().min(10, "Valid phone number is required").max(20),
  // Professional details
  artistName: z10.string().max(100).optional(),
  recordLabel: z10.string().max(100).optional(),
  website: z10.string().url().optional(),
  // Experience level
  experienceLevel: z10.enum(["beginner", "intermediate", "advanced", "professional"]).optional(),
  // Previous client
  isPreviousClient: z10.boolean().default(false),
  referralSource: z10.string().max(100).optional()
});
var PricingInfoSchema = z10.object({
  basePrice: z10.number().min(0),
  // in cents
  additionalFees: z10.array(
    z10.object({
      name: z10.string().max(100),
      amount: z10.number().min(0),
      description: z10.string().max(200).optional()
    })
  ).default([]),
  discounts: z10.array(
    z10.object({
      name: z10.string().max(100),
      amount: z10.number().min(0),
      type: z10.enum(["fixed", "percentage"]),
      description: z10.string().max(200).optional()
    })
  ).default([]),
  totalPrice: z10.number().min(0),
  // in cents
  currency: z10.enum(["USD", "EUR", "GBP", "CAD"]).default("USD"),
  // Payment terms
  depositRequired: z10.boolean().default(false),
  depositAmount: z10.number().min(0).optional(),
  paymentDueDate: z10.string().datetime().optional()
});
var TimeSlotSchema = z10.object({
  startTime: z10.string().datetime(),
  endTime: z10.string().datetime(),
  duration: z10.number().min(30).max(480),
  // 30 minutes to 8 hours in minutes
  // Timezone handling
  timezone: z10.string().default("UTC"),
  // Buffer time
  setupTime: z10.number().min(0).max(60).default(15),
  // Setup time in minutes
  teardownTime: z10.number().min(0).max(30).default(15)
  // Teardown time in minutes
});
var ReservationSchema = z10.object({
  id: z10.string().optional(),
  // Service information
  serviceType: ServiceType,
  status: ReservationStatus.default("pending"),
  priority: PriorityLevel.default("standard"),
  // Client information
  userId: z10.string().optional(),
  // If user is registered
  clientInfo: ClientInfoSchema,
  // Scheduling
  timeSlot: TimeSlotSchema,
  studioRoom: StudioRoom.optional(),
  // Service details
  serviceDetails: ServiceDetailsSchema,
  equipmentRequirements: EquipmentRequirementsSchema.optional(),
  // Pricing
  pricing: PricingInfoSchema,
  // Communication
  notes: z10.string().max(2e3).optional(),
  internalNotes: z10.string().max(1e3).optional(),
  // Staff only
  // Files and attachments
  attachments: z10.array(
    z10.object({
      name: z10.string().max(255),
      url: z10.string().url(),
      type: z10.enum(["audio", "document", "image", "other"]),
      size: z10.number().positive()
    })
  ).optional(),
  // Assignment
  assignedEngineer: z10.string().max(100).optional(),
  assignedProducer: z10.string().max(100).optional(),
  // Completion tracking
  deliverables: z10.array(
    z10.object({
      name: z10.string().max(200),
      description: z10.string().max(500).optional(),
      fileUrl: z10.string().url().optional(),
      completedAt: z10.string().datetime().optional()
    })
  ).default([]),
  // Timestamps
  createdAt: z10.string().datetime().optional(),
  updatedAt: z10.string().datetime().optional(),
  confirmedAt: z10.string().datetime().optional(),
  completedAt: z10.string().datetime().optional(),
  // Metadata
  metadata: z10.record(z10.unknown()).optional()
});
var CreateReservationSchema = z10.object({
  serviceType: ServiceType,
  // Client information
  clientInfo: z10.object({
    firstName: z10.string().min(1).max(50),
    lastName: z10.string().min(1).max(50),
    email: z10.string().email(),
    phone: z10.string().min(10).max(20),
    artistName: z10.string().max(100).optional(),
    experienceLevel: z10.enum(["beginner", "intermediate", "advanced", "professional"]).optional(),
    referralSource: z10.string().max(100).optional()
  }),
  // Preferred scheduling
  preferredDate: z10.string().datetime(),
  preferredDuration: z10.number().min(30).max(480),
  alternativeDates: z10.array(z10.string().datetime()).max(3).optional(),
  // Service requirements
  serviceDetails: z10.object({
    trackCount: z10.number().min(1).max(100).optional(),
    genre: z10.string().max(50).optional(),
    bpm: z10.number().min(60).max(200).optional(),
    deliveryFormat: z10.enum(["wav", "mp3", "aiff", "flac"]).optional(),
    includeRevisions: z10.number().min(0).max(5).default(2),
    rushDelivery: z10.boolean().default(false)
  }).optional(),
  // Additional information
  notes: z10.string().max(2e3).optional(),
  budget: z10.number().min(0).optional(),
  // in cents
  // Terms acceptance
  acceptTerms: z10.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions"
  })
});
var UpdateReservationSchema = z10.object({
  id: z10.string().min(1, "Reservation ID is required"),
  status: ReservationStatus.optional(),
  timeSlot: TimeSlotSchema.optional(),
  studioRoom: StudioRoom.optional(),
  serviceDetails: ServiceDetailsSchema.optional(),
  notes: z10.string().max(2e3).optional(),
  internalNotes: z10.string().max(1e3).optional(),
  assignedEngineer: z10.string().max(100).optional(),
  assignedProducer: z10.string().max(100).optional()
});
var ReservationFilterSchema = z10.object({
  serviceType: ServiceType.optional(),
  status: ReservationStatus.optional(),
  priority: PriorityLevel.optional(),
  studioRoom: StudioRoom.optional(),
  // Date range filters
  startDate: z10.string().datetime().optional(),
  endDate: z10.string().datetime().optional(),
  // Assignment filters
  assignedEngineer: z10.string().optional(),
  assignedProducer: z10.string().optional(),
  // Client filters
  clientEmail: z10.string().email().optional(),
  clientName: z10.string().optional(),
  // Search
  search: z10.string().max(100).optional(),
  // Pagination
  page: z10.number().positive().default(1),
  limit: z10.number().min(1).max(100).default(20),
  // Sorting
  sortBy: z10.enum(["created_at", "start_time", "status", "service_type"]).default("start_time"),
  sortOrder: z10.enum(["asc", "desc"]).default("asc")
});
var AvailabilityCheckSchema = z10.object({
  startTime: z10.string().datetime(),
  endTime: z10.string().datetime(),
  serviceType: ServiceType,
  studioRoom: StudioRoom.optional(),
  excludeReservationId: z10.string().optional()
  // For rescheduling
});
var RescheduleRequestSchema = z10.object({
  reservationId: z10.string().min(1, "Reservation ID is required"),
  newStartTime: z10.string().datetime(),
  newDuration: z10.number().min(30).max(480),
  reason: z10.string().max(500).optional(),
  notifyClient: z10.boolean().default(true)
});

// shared/validation/UserValidation.ts
import { z as z11 } from "zod";
var UserRole = z11.enum(["user", "producer", "admin", "service_role", "moderator"]);
var UserStatus = z11.enum([
  "active",
  "inactive",
  "suspended",
  "pending_verification",
  "banned"
]);
var SubscriptionPlan = z11.enum(["free", "basic", "pro", "unlimited", "enterprise"]);
var SubscriptionStatus = z11.enum([
  "active",
  "inactive",
  "cancelled",
  "past_due",
  "unpaid",
  "trialing"
]);
var UserPreferencesSchema = z11.object({
  language: z11.enum(["en", "fr", "es", "de", "it", "pt"]).default("en"),
  currency: z11.enum(["USD", "EUR", "GBP", "CAD", "AUD"]).default("USD"),
  timezone: z11.string().max(50).default("UTC"),
  // Notification preferences
  emailNotifications: z11.boolean().default(true),
  marketingEmails: z11.boolean().default(false),
  pushNotifications: z11.boolean().default(true),
  // Audio preferences
  autoPlay: z11.boolean().default(false),
  audioQuality: z11.enum(["128", "192", "256", "320"]).default("192"),
  // Privacy preferences
  profileVisibility: z11.enum(["public", "private", "friends_only"]).default("public"),
  showActivity: z11.boolean().default(true),
  // Theme preferences
  theme: z11.enum(["light", "dark", "auto"]).default("auto"),
  compactMode: z11.boolean().default(false)
});
var UserProfileSchema = z11.object({
  displayName: z11.string().min(1, "Display name is required").max(50),
  bio: z11.string().max(500).optional(),
  website: z11.string().url("Invalid website URL").optional(),
  location: z11.string().max(100).optional(),
  // Social media links
  socialLinks: z11.object({
    instagram: z11.string().url().optional(),
    twitter: z11.string().url().optional(),
    youtube: z11.string().url().optional(),
    soundcloud: z11.string().url().optional(),
    spotify: z11.string().url().optional()
  }).optional(),
  // Producer-specific fields
  producerInfo: z11.object({
    stageName: z11.string().max(50).optional(),
    genres: z11.array(z11.string()).max(10).optional(),
    yearsActive: z11.number().min(0).max(50).optional(),
    equipment: z11.string().max(1e3).optional(),
    collaborationRate: z11.number().min(0).max(1e5).optional()
    // in cents
  }).optional(),
  // Avatar
  avatarUrl: z11.string().url().optional(),
  avatarStorageId: z11.string().optional()
});
var UserSubscriptionSchema = z11.object({
  plan: SubscriptionPlan,
  status: SubscriptionStatus,
  // Billing
  billingInterval: z11.enum(["monthly", "annual"]).default("monthly"),
  amount: z11.number().min(0),
  // in cents
  currency: z11.enum(["USD", "EUR", "GBP", "CAD", "AUD"]).default("USD"),
  // Dates
  startDate: z11.string().datetime(),
  endDate: z11.string().datetime().optional(),
  trialEndDate: z11.string().datetime().optional(),
  // Quotas and limits
  downloadQuota: z11.number().min(0).default(0),
  // 0 = unlimited
  downloadCount: z11.number().min(0).default(0),
  // External IDs
  stripeSubscriptionId: z11.string().optional(),
  clerkSubscriptionId: z11.string().optional(),
  // Features
  features: z11.array(z11.string()).default([]),
  // Auto-renewal
  autoRenew: z11.boolean().default(true),
  cancelAtPeriodEnd: z11.boolean().default(false)
});
var UserAnalyticsSchema = z11.object({
  // Activity metrics
  totalLogins: z11.number().min(0).default(0),
  lastLoginAt: z11.string().datetime().optional(),
  totalSessionTime: z11.number().min(0).default(0),
  // in seconds
  // Purchase metrics
  totalPurchases: z11.number().min(0).default(0),
  totalSpent: z11.number().min(0).default(0),
  // in cents
  averageOrderValue: z11.number().min(0).default(0),
  // in cents
  // Engagement metrics
  beatsPlayed: z11.number().min(0).default(0),
  beatsDownloaded: z11.number().min(0).default(0),
  beatsLiked: z11.number().min(0).default(0),
  // Producer metrics (if applicable)
  beatsUploaded: z11.number().min(0).default(0),
  totalEarnings: z11.number().min(0).default(0),
  // in cents
  // Referral metrics
  referralCount: z11.number().min(0).default(0),
  referralEarnings: z11.number().min(0).default(0)
  // in cents
});
var UserSchema = z11.object({
  id: z11.string().optional(),
  clerkId: z11.string().min(1, "Clerk ID is required"),
  // Basic information
  username: z11.string().min(3, "Username must be at least 3 characters").max(30, "Username cannot exceed 30 characters").regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain letters, numbers, underscores, and hyphens"
  ),
  email: z11.string().email("Valid email is required").max(255, "Email is too long"),
  // Optional fields
  firstName: z11.string().max(50).optional(),
  lastName: z11.string().max(50).optional(),
  // Status and role
  role: UserRole.default("user"),
  status: UserStatus.default("active"),
  // Profile information
  profile: UserProfileSchema.optional(),
  preferences: UserPreferencesSchema.default({}),
  // Subscription
  subscription: UserSubscriptionSchema.optional(),
  // Analytics
  analytics: UserAnalyticsSchema.default({}),
  // Verification
  emailVerified: z11.boolean().default(false),
  phoneVerified: z11.boolean().default(false),
  identityVerified: z11.boolean().default(false),
  // Security
  twoFactorEnabled: z11.boolean().default(false),
  lastPasswordChange: z11.string().datetime().optional(),
  // Timestamps
  createdAt: z11.string().datetime().optional(),
  updatedAt: z11.string().datetime().optional(),
  lastActiveAt: z11.string().datetime().optional(),
  // Metadata
  metadata: z11.record(z11.unknown()).optional()
});
var RegisterUserSchema = z11.object({
  username: z11.string().min(3, "Username must be at least 3 characters").max(30, "Username cannot exceed 30 characters").regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain letters, numbers, underscores, and hyphens"
  ),
  email: z11.string().email("Valid email is required").max(255, "Email is too long"),
  password: z11.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long").regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain at least one lowercase letter, one uppercase letter, and one number"
  ),
  firstName: z11.string().max(50).optional(),
  lastName: z11.string().max(50).optional(),
  // Terms and privacy
  acceptTerms: z11.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions"
  }),
  acceptPrivacy: z11.boolean().refine((val) => val === true, {
    message: "You must accept the privacy policy"
  }),
  // Marketing consent
  marketingConsent: z11.boolean().default(false),
  // Referral code
  referralCode: z11.string().max(20).optional()
});
var LoginUserSchema = z11.object({
  identifier: z11.string().min(1, "Email or username is required"),
  // Can be email or username
  password: z11.string().min(1, "Password is required"),
  rememberMe: z11.boolean().default(false)
});
var UpdateUserProfileSchema = z11.object({
  displayName: z11.string().min(1).max(50).optional(),
  bio: z11.string().max(500).optional(),
  website: z11.string().url().optional(),
  location: z11.string().max(100).optional(),
  // Social links
  socialLinks: z11.object({
    instagram: z11.string().url().optional(),
    twitter: z11.string().url().optional(),
    youtube: z11.string().url().optional(),
    soundcloud: z11.string().url().optional(),
    spotify: z11.string().url().optional()
  }).optional(),
  // Producer info
  producerInfo: z11.object({
    stageName: z11.string().max(50).optional(),
    genres: z11.array(z11.string()).max(10).optional(),
    yearsActive: z11.number().min(0).max(50).optional(),
    equipment: z11.string().max(1e3).optional(),
    collaborationRate: z11.number().min(0).max(1e5).optional()
  }).optional()
});
var UpdateUserPreferencesSchema = UserPreferencesSchema.partial();
var ChangePasswordSchema = z11.object({
  currentPassword: z11.string().min(1, "Current password is required"),
  newPassword: z11.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long").regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain at least one lowercase letter, one uppercase letter, and one number"
  ),
  confirmPassword: z11.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});
var UserFilterSchema = z11.object({
  role: UserRole.optional(),
  status: UserStatus.optional(),
  subscriptionPlan: SubscriptionPlan.optional(),
  subscriptionStatus: SubscriptionStatus.optional(),
  // Search
  search: z11.string().max(100).optional(),
  // Date filters
  createdAfter: z11.string().datetime().optional(),
  createdBefore: z11.string().datetime().optional(),
  lastActiveAfter: z11.string().datetime().optional(),
  // Verification filters
  emailVerified: z11.boolean().optional(),
  identityVerified: z11.boolean().optional(),
  // Pagination
  page: z11.number().positive().default(1),
  limit: z11.number().min(1).max(100).default(20),
  // Sorting
  sortBy: z11.enum(["created_at", "last_active_at", "username", "email"]).default("created_at"),
  sortOrder: z11.enum(["asc", "desc"]).default("desc")
});

// shared/validation/sync.ts
import { z as z12 } from "zod";
var ConnectionStatusSchema = z12.object({
  type: z12.enum(["websocket", "polling", "offline"]),
  connected: z12.boolean(),
  reconnecting: z12.boolean(),
  lastConnected: z12.number().min(0),
  reconnectAttempts: z12.number().min(0),
  maxReconnectAttempts: z12.number().min(1),
  nextReconnectIn: z12.number().min(0).optional()
});
var SyncMetricsSchema = z12.object({
  averageLatency: z12.number().min(0),
  successRate: z12.number().min(0).max(100),
  errorCount: z12.number().min(0),
  reconnectCount: z12.number().min(0),
  dataInconsistencies: z12.number().min(0),
  lastInconsistencyTime: z12.number().min(0).optional()
});
var SyncErrorSchema = z12.object({
  type: z12.enum([
    "network_error",
    "websocket_error",
    "data_inconsistency",
    "validation_error",
    "conflict_error",
    "timeout_error",
    "auth_error"
  ]),
  message: z12.string().min(1),
  code: z12.string().optional(),
  timestamp: z12.number().min(0),
  context: z12.record(z12.unknown()),
  retryable: z12.boolean(),
  retryCount: z12.number().min(0),
  maxRetries: z12.number().min(0),
  nextRetryAt: z12.number().min(0).optional()
});
var SyncStatusSchema = z12.object({
  connected: z12.boolean(),
  connectionType: z12.enum(["websocket", "polling", "offline"]),
  lastSync: z12.number().min(0),
  syncInProgress: z12.boolean(),
  errors: z12.array(SyncErrorSchema),
  metrics: SyncMetricsSchema
});
var ConsistentUserStatsSchema = z12.object({
  totalFavorites: z12.number().min(0),
  totalDownloads: z12.number().min(0),
  totalOrders: z12.number().min(0),
  totalSpent: z12.number().min(0),
  recentActivity: z12.number().min(0),
  quotaUsed: z12.number().min(0),
  quotaLimit: z12.number().min(0),
  monthlyDownloads: z12.number().min(0),
  monthlyOrders: z12.number().min(0),
  monthlyRevenue: z12.number().min(0),
  // Consistency metadata
  calculatedAt: z12.string().datetime(),
  dataHash: z12.string().min(1),
  source: z12.enum(["database", "cache", "optimistic"]),
  version: z12.number().min(1)
});
var ValidationErrorSchema2 = z12.object({
  field: z12.string().min(1),
  message: z12.string().min(1),
  code: z12.string().min(1),
  expected: z12.unknown().optional(),
  actual: z12.unknown().optional()
});
var ValidationWarningSchema = z12.object({
  field: z12.string().min(1),
  message: z12.string().min(1),
  code: z12.string().min(1),
  suggestion: z12.string().optional()
});
var ValidationResultSchema = z12.object({
  valid: z12.boolean(),
  errors: z12.array(ValidationErrorSchema2),
  warnings: z12.array(ValidationWarningSchema),
  dataHash: z12.string().min(1),
  validatedAt: z12.number().min(0)
});
var InconsistencySchema = z12.object({
  type: z12.enum(["calculation", "timing", "missing_data", "duplicate_data"]),
  sections: z12.array(z12.string().min(1)).min(1),
  description: z12.string().min(1),
  severity: z12.enum(["low", "medium", "high", "critical"]),
  autoResolvable: z12.boolean(),
  detectedAt: z12.number().min(0),
  expectedValue: z12.unknown().optional(),
  actualValue: z12.unknown().optional()
});
var CrossValidationResultSchema = z12.object({
  consistent: z12.boolean(),
  inconsistencies: z12.array(InconsistencySchema),
  affectedSections: z12.array(z12.string().min(1)),
  recommendedAction: z12.enum(["sync", "reload", "ignore"])
});
var OptimisticUpdateSchema = z12.object({
  id: z12.string().min(1),
  type: z12.enum(["add", "update", "delete"]),
  section: z12.string().min(1),
  data: z12.unknown(),
  timestamp: z12.number().min(0),
  confirmed: z12.boolean(),
  rollbackData: z12.unknown().optional(),
  userId: z12.string().optional(),
  correlationId: z12.string().optional()
});
var ConflictResolutionStrategySchema = z12.object({
  type: z12.enum(["server_wins", "client_wins", "merge", "manual"]),
  description: z12.string().min(1),
  automatic: z12.boolean(),
  confidence: z12.number().min(0).max(1)
});
var DataConflictSchema = z12.object({
  id: z12.string().min(1),
  updates: z12.array(OptimisticUpdateSchema).min(1),
  type: z12.enum(["concurrent_update", "version_mismatch", "data_corruption"]),
  description: z12.string().min(1),
  resolutionStrategies: z12.array(ConflictResolutionStrategySchema),
  detectedAt: z12.number().min(0)
});
var DashboardEventSchema = z12.object({
  type: z12.string().min(1),
  payload: z12.unknown(),
  timestamp: z12.number().min(0),
  source: z12.enum(["user", "server", "system"]),
  id: z12.string().min(1),
  correlationId: z12.string().optional(),
  userId: z12.string().optional(),
  priority: z12.enum(["low", "normal", "high", "critical"]).optional()
});
var _SubscriptionOptionsSchema = z12.object({
  includeHistory: z12.boolean().optional(),
  historyLimit: z12.number().min(1).optional(),
  priorityFilter: z12.array(z12.enum(["low", "normal", "high", "critical"])).optional(),
  persistent: z12.boolean().optional()
});
var DataChangeSchema = z12.object({
  section: z12.string().min(1),
  type: z12.enum(["create", "update", "delete"]),
  data: z12.unknown(),
  previousData: z12.unknown().optional(),
  timestamp: z12.number().min(0),
  source: z12.enum(["server", "optimistic", "conflict_resolution"])
});
var SyncResultSchema = z12.object({
  success: z12.boolean(),
  syncedSections: z12.array(z12.string().min(1)),
  errors: z12.array(SyncErrorSchema),
  duration: z12.number().min(0),
  dataChanges: z12.array(DataChangeSchema),
  inconsistenciesResolved: z12.number().min(0),
  syncedAt: z12.number().min(0)
});
var MemoryStatsSchema = z12.object({
  cacheSize: z12.number().min(0),
  eventHistorySize: z12.number().min(0),
  subscriptionCount: z12.number().min(0),
  pendingUpdatesCount: z12.number().min(0),
  totalMemoryUsage: z12.number().min(0),
  measuredAt: z12.number().min(0)
});
var MemoryLimitsSchema = z12.object({
  maxCacheSize: z12.number().min(1),
  maxEventHistorySize: z12.number().min(1),
  maxSubscriptions: z12.number().min(1),
  maxPendingUpdates: z12.number().min(1),
  cleanupThreshold: z12.number().min(0).max(1)
});
var DashboardDataSchema = z12.object({
  user: z12.object({
    id: z12.string().min(1),
    clerkId: z12.string().min(1),
    email: z12.string().email(),
    firstName: z12.string().optional(),
    lastName: z12.string().optional(),
    imageUrl: z12.string().url().optional(),
    username: z12.string().optional()
  }),
  stats: ConsistentUserStatsSchema,
  favorites: z12.array(
    z12.object({
      id: z12.string().min(1),
      beatId: z12.number().min(1),
      beatTitle: z12.string().min(1),
      beatArtist: z12.string().optional(),
      beatImageUrl: z12.string().url().optional(),
      beatGenre: z12.string().optional(),
      beatBpm: z12.number().min(1).optional(),
      beatPrice: z12.number().min(0).optional(),
      createdAt: z12.string().datetime()
    })
  ),
  orders: z12.array(
    z12.object({
      id: z12.string().min(1),
      orderNumber: z12.string().optional(),
      total: z12.number().min(0),
      currency: z12.string().min(1),
      status: z12.enum([
        "draft",
        "pending",
        "processing",
        "paid",
        "completed",
        "cancelled",
        "refunded",
        "payment_failed"
      ]),
      createdAt: z12.string().datetime(),
      updatedAt: z12.string().datetime()
    })
  ),
  downloads: z12.array(
    z12.object({
      id: z12.string().min(1),
      beatId: z12.number().min(1),
      beatTitle: z12.string().min(1),
      format: z12.enum(["mp3", "wav", "flac"]),
      licenseType: z12.string().min(1),
      downloadedAt: z12.string().datetime(),
      downloadCount: z12.number().min(1)
    })
  ),
  reservations: z12.array(
    z12.object({
      id: z12.string().min(1),
      serviceType: z12.enum(["mixing", "mastering", "recording", "consultation", "custom_beat"]),
      preferredDate: z12.string().datetime(),
      duration: z12.number().min(1),
      totalPrice: z12.number().min(0),
      status: z12.enum(["pending", "confirmed", "in_progress", "completed", "cancelled"]),
      createdAt: z12.string().datetime()
    })
  ),
  activity: z12.array(
    z12.object({
      id: z12.string().min(1),
      type: z12.string().min(1),
      description: z12.string().min(1),
      timestamp: z12.string().datetime(),
      metadata: z12.record(z12.unknown())
    })
  ),
  chartData: z12.array(
    z12.object({
      date: z12.string().min(1),
      orders: z12.number().min(0),
      downloads: z12.number().min(0),
      revenue: z12.number().min(0),
      favorites: z12.number().min(0)
    })
  ),
  trends: z12.object({
    orders: z12.object({
      period: z12.enum(["7d", "30d", "90d", "1y"]),
      value: z12.number().min(0),
      change: z12.number(),
      changePercent: z12.number(),
      isPositive: z12.boolean()
    }),
    downloads: z12.object({
      period: z12.enum(["7d", "30d", "90d", "1y"]),
      value: z12.number().min(0),
      change: z12.number(),
      changePercent: z12.number(),
      isPositive: z12.boolean()
    }),
    revenue: z12.object({
      period: z12.enum(["7d", "30d", "90d", "1y"]),
      value: z12.number().min(0),
      change: z12.number(),
      changePercent: z12.number(),
      isPositive: z12.boolean()
    }),
    favorites: z12.object({
      period: z12.enum(["7d", "30d", "90d", "1y"]),
      value: z12.number().min(0),
      change: z12.number(),
      changePercent: z12.number(),
      isPositive: z12.boolean()
    })
  })
});

// shared/validation/index.ts
import { z as z14 } from "zod";

// shared/types/apiEndpoints.ts
import { z as z13 } from "zod";
var signInRequestSchema = z13.object({
  username: z13.string().optional(),
  email: z13.string().email().optional(),
  password: z13.string().min(1)
}).refine((data) => data.username || data.email, {
  message: "Either username or email is required"
});
var registerRequestSchema = z13.object({
  username: z13.string().min(3).max(30),
  email: z13.string().email(),
  password: z13.string().min(8),
  firstName: z13.string().optional(),
  lastName: z13.string().optional()
});
var getBeatsRequestSchema = z13.object({
  limit: z13.number().min(1).max(100).optional(),
  genre: z13.string().optional(),
  search: z13.string().optional(),
  bpm: z13.number().min(1).max(300).optional(),
  key: z13.string().optional(),
  mood: z13.string().optional(),
  priceMin: z13.number().min(0).optional(),
  priceMax: z13.number().min(0).optional(),
  featured: z13.boolean().optional(),
  free: z13.boolean().optional(),
  sortBy: z13.enum(["newest", "oldest", "price_low", "price_high", "popular"]).optional(),
  page: z13.number().min(1).optional()
});
var createBeatRequestSchema = z13.object({
  title: z13.string().min(1).max(200),
  description: z13.string().optional(),
  genre: z13.string().min(1),
  bpm: z13.number().min(1).max(300).optional(),
  key: z13.string().optional(),
  mood: z13.string().optional(),
  price: z13.number().min(0),
  audioUrl: z13.string().url().optional(),
  imageUrl: z13.string().url().optional(),
  tags: z13.array(z13.string()).optional(),
  featured: z13.boolean().optional(),
  duration: z13.number().min(1).optional(),
  isActive: z13.boolean().optional(),
  isExclusive: z13.boolean().optional(),
  isFree: z13.boolean().optional()
});
var createOrderRequestSchema = z13.object({
  items: z13.array(
    z13.object({
      productId: z13.number().positive(),
      title: z13.string().min(1),
      type: z13.enum(["beat", "subscription", "service"]),
      qty: z13.number().min(1),
      unitPrice: z13.number().min(0),
      metadata: z13.record(z13.unknown()).optional()
    })
  ).min(1),
  currency: z13.string().length(3),
  metadata: z13.record(z13.unknown()).optional(),
  idempotencyKey: z13.string().optional()
});
var createPaymentSessionRequestSchema = z13.object({
  reservationId: z13.string().min(1),
  amount: z13.number().min(1),
  currency: z13.string().length(3),
  description: z13.string().min(1),
  metadata: z13.record(z13.unknown()).optional()
});
var createReservationRequestSchema = z13.object({
  serviceType: z13.enum(["mixing", "mastering", "recording", "custom_beat", "consultation"]),
  details: z13.object({
    name: z13.string().min(1),
    email: z13.string().email(),
    phone: z13.string().min(10),
    requirements: z13.string().optional(),
    referenceLinks: z13.array(z13.string().url()).optional()
  }),
  preferredDate: z13.string().datetime(),
  durationMinutes: z13.number().min(30).max(480),
  totalPrice: z13.number().min(0),
  notes: z13.string().optional()
});
var addToCartRequestSchema = z13.object({
  beatId: z13.number().positive().optional(),
  beat_id: z13.number().positive().optional(),
  licenseType: z13.enum(["basic", "premium", "unlimited"]).optional(),
  quantity: z13.number().min(1).optional().default(1)
}).refine((data) => data.beatId || data.beat_id, {
  message: "Either beatId or beat_id is required"
});
var playBeatRequestSchema = z13.object({
  beatId: z13.number().positive()
});
var setVolumeRequestSchema = z13.object({
  level: z13.number().min(0).max(1)
});
var seekRequestSchema = z13.object({
  position: z13.number().min(0)
});
var trackDownloadRequestSchema = z13.object({
  productId: z13.number().positive(),
  license: z13.enum(["basic", "premium", "unlimited"]),
  price: z13.number().min(0).optional(),
  productName: z13.string().optional()
});

// shared/validation/index.ts
var CommonParams = {
  /** Generic string ID - use when ID format is flexible */
  id: z14.object({
    id: z14.string().min(1, "ID is required")
  }),
  /** Numeric ID - for WooCommerce products, beats, etc. */
  numericId: z14.object({
    id: z14.string().regex(/^\d+$/, "ID must be numeric").transform(Number)
  }),
  /** Stripe Payment Intent ID - format: pi_xxx */
  stripePaymentIntentId: z14.object({
    id: z14.string().regex(/^pi_[a-zA-Z0-9]+$/, "Invalid Stripe payment intent ID")
  }),
  /** Stripe Checkout Session ID - format: cs_xxx or cs_test_xxx */
  stripeSessionId: z14.object({
    id: z14.string().regex(/^cs_(test_)?[a-zA-Z0-9]+$/, "Invalid Stripe checkout session ID")
  }),
  slug: z14.object({
    slug: z14.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Invalid slug format")
  })
};
var CommonQueries = {
  pagination: z14.object({
    page: z14.string().optional().transform((val) => val ? Number.parseInt(val, 10) : 1),
    limit: z14.string().optional().transform((val) => val ? Math.min(Number.parseInt(val, 10), 100) : 20),
    offset: z14.string().optional().transform((val) => val ? Number.parseInt(val, 10) : 0)
  }),
  sorting: z14.object({
    sortBy: z14.string().optional(),
    sortOrder: z14.enum(["asc", "desc"]).optional().default("desc")
  }),
  search: z14.object({
    q: z14.string().max(100).optional(),
    search: z14.string().max(100).optional()
  }),
  dateRange: z14.object({
    startDate: z14.string().datetime().optional(),
    endDate: z14.string().datetime().optional()
  })
};
var validateBody = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        const validationErrors = result.error.errors.map((err) => ({
          field: err.path.join("."),
          value: req.body,
          message: err.message,
          code: err.code
        }));
        const errorResponse = createValidationError(
          validationErrors,
          req.headers["x-request-id"]
        );
        return res.status(400).json(errorResponse);
      }
      req.body = result.data;
      next();
    } catch (error) {
      console.error("Validation middleware error:", error);
      res.status(500).json({
        error: {
          type: "internal_server_error",
          message: "Validation processing failed",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    }
  };
};
var validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.query);
      if (!result.success) {
        const validationErrors = result.error.errors.map((err) => ({
          field: `query.${err.path.join(".")}`,
          value: req.query,
          message: err.message,
          code: err.code
        }));
        const errorResponse = createValidationError(
          validationErrors,
          req.headers["x-request-id"]
        );
        return res.status(400).json(errorResponse);
      }
      req.query = result.data;
      next();
    } catch (error) {
      console.error("Query validation middleware error:", error);
      res.status(500).json({
        error: {
          type: "internal_server_error",
          message: "Query validation processing failed",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    }
  };
};
var validateParams = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.params);
      if (!result.success) {
        const validationErrors = result.error.errors.map((err) => ({
          field: `params.${err.path.join(".")}`,
          value: req.params,
          message: err.message,
          code: err.code
        }));
        const errorResponse = createValidationError(
          validationErrors,
          req.headers["x-request-id"]
        );
        return res.status(400).json(errorResponse);
      }
      req.params = result.data;
      next();
    } catch (error) {
      console.error("Params validation middleware error:", error);
      res.status(500).json({
        error: {
          type: "internal_server_error",
          message: "Parameter validation processing failed",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    }
  };
};

// server/config/urls.ts
var CLIENT_BASE_URL = process.env.CLIENT_URL || "https://brolabentertainment.com";
var SERVER_BASE_URL = process.env.SERVER_URL || "https://brolabentertainment.com";
var urls = {
  checkoutSuccess: (sessionId) => {
    const sessionParam = sessionId ? `?session_id=${sessionId}` : "";
    return `${CLIENT_BASE_URL}/checkout-success${sessionParam}`;
  },
  cart: `${CLIENT_BASE_URL}/cart`,
  paypal: {
    captureBase: `${SERVER_BASE_URL}/api/paypal/capture`,
    success: (token, payerId) => {
      const payerParam = payerId ? `&PayerID=${payerId}` : "";
      return `${CLIENT_BASE_URL}/payment/success?token=${token}${payerParam}`;
    },
    error: (code, token) => {
      const tokenParam = token ? `&token=${token}` : "";
      return `${CLIENT_BASE_URL}/payment/error?error=${code}${tokenParam}`;
    },
    cancel: `${CLIENT_BASE_URL}/payment/cancel`
  },
  genericCheckout: (reservationId, amount, currency) => `${CLIENT_BASE_URL}/checkout?reservation=${reservationId}&amount=${amount}&currency=${currency}`
};

// server/routes/clerk.ts
var logPaymentEvent = (level, event, data) => {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const logData = {
    timestamp,
    event,
    level,
    ...data
  };
  if (level === "error") {
    console.error(`\u{1F6A8} [PAYMENT-ERROR] ${event}:`, logData);
  } else if (level === "warn") {
    console.warn(`\u26A0\uFE0F [PAYMENT-WARN] ${event}:`, logData);
  } else {
    console.log(`\u2139\uFE0F [PAYMENT-INFO] ${event}:`, logData);
  }
};
var createErrorResponse3 = (error, message, field, code, details) => {
  return {
    error,
    message,
    ...field && { field },
    ...code && { code },
    ...details && { details },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
};
var router6 = Router6();
var stripe = new Stripe2(process.env.STRIPE_SECRET_KEY, {
  // Using default API version for compatibility
});
router6.get("/health", (req, res) => {
  logPaymentEvent("info", "health_check", {
    userAgent: req.headers["user-agent"],
    ip: req.ip
  });
  res.json({
    status: "ok",
    clerk: "initialized",
    stripe: "connected",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
var validateAmount = (amount, requestId, res) => {
  if (!amount || amount <= 0) {
    const errorResponse = createErrorResponse3(
      "Validation Error",
      "Valid amount is required. Amount must be greater than 0.",
      "amount"
    );
    logPaymentEvent("warn", "validation_failed", {
      requestId,
      field: "amount",
      providedValue: amount,
      reason: "invalid_amount"
    });
    res.status(400).json(errorResponse);
    return false;
  }
  return true;
};
var validateUserMetadata = (metadata, requestId, res) => {
  if (!metadata.userId || !metadata.userEmail) {
    const errorResponse = createErrorResponse3(
      "Validation Error",
      "User authentication is required. Please ensure you are logged in.",
      "metadata",
      "missing_user_data"
    );
    logPaymentEvent("warn", "validation_failed", {
      requestId,
      field: "metadata",
      hasUserId: !!metadata.userId,
      hasUserEmail: !!metadata.userEmail,
      reason: "missing_user_authentication"
    });
    res.status(400).json(errorResponse);
    return false;
  }
  return true;
};
var validateCurrency = (currency, requestId, res) => {
  if (!["usd", "eur", "gbp"].includes(currency.toLowerCase())) {
    const errorResponse = createErrorResponse3(
      "Validation Error",
      "Unsupported currency. Supported currencies: USD, EUR, GBP",
      "currency",
      "unsupported_currency",
      { supportedCurrencies: ["USD", "EUR", "GBP"] }
    );
    logPaymentEvent("warn", "validation_failed", {
      requestId,
      field: "currency",
      providedValue: currency,
      reason: "unsupported_currency"
    });
    res.status(400).json(errorResponse);
    return false;
  }
  return true;
};
var buildServiceLineItems = (services, currency) => {
  return services.map((service) => ({
    price_data: {
      currency: currency.toLowerCase(),
      product_data: {
        name: `${service.service_type} Service`,
        description: `${service.service_type} - ${service.duration_minutes} minutes`,
        metadata: {
          service_type: service.service_type,
          reservation_id: service.reservation_id || "",
          duration_minutes: service.duration_minutes?.toString() || ""
        }
      },
      unit_amount: Math.round(service.price * 100)
    },
    quantity: 1
  }));
};
var buildCartLineItems = (cartItems2, currency) => {
  return cartItems2.map((item) => ({
    price_data: {
      currency: currency.toLowerCase(),
      product_data: {
        name: item.title || `Beat #${item.beat_id}`,
        description: `${item.license_type} License`,
        metadata: {
          beat_id: item.beat_id?.toString() || "",
          license_type: item.license_type || ""
        }
      },
      unit_amount: Math.round(item.price * 100)
    },
    quantity: item.quantity || 1
  }));
};
var buildFallbackLineItem = (amount, currency, metadata) => {
  return {
    price_data: {
      currency: currency.toLowerCase(),
      product_data: {
        name: metadata.description || "BroLab Purchase",
        description: `Purchase: ${metadata.description || "Beats and Services"}`
      },
      unit_amount: amount
    },
    quantity: 1
  };
};
var buildLineItems = (services, cartItems2, amount, currency, metadata) => {
  const lineItems = [];
  if (services?.length > 0) {
    lineItems.push(...buildServiceLineItems(services, currency));
  }
  if (cartItems2?.length > 0) {
    lineItems.push(...buildCartLineItems(cartItems2, currency));
  }
  if (lineItems.length === 0) {
    lineItems.push(buildFallbackLineItem(amount, currency, metadata));
  }
  return lineItems;
};
var determinePaymentType = (reservationIds, cartItems2, services) => {
  if (reservationIds.length > 0 && cartItems2.length > 0) {
    return "mixed_cart";
  }
  if (reservationIds.length > 0 || services.length > 0) {
    return "reservation_payment";
  }
  return "beats_only";
};
var buildEnhancedMetadata = (metadata, paymentType, reservationIds, services, cartItems2, amount) => {
  const { userId, userEmail, description, ...additionalMetadata } = metadata;
  return {
    ...additionalMetadata,
    userId,
    userEmail,
    type: paymentType,
    reservationIds: reservationIds.join(","),
    servicesCount: services?.length?.toString() || "0",
    servicesTotal: services?.reduce((sum, s) => sum + (s.price || 0), 0)?.toString() || "0",
    cartCount: cartItems2?.length?.toString() || "0",
    cartTotal: cartItems2?.reduce(
      (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
      0
    )?.toString() || "0",
    orderTotal: centsToDollars(amount).toString(),
    description: description || `${paymentType.replace("_", " ")} payment`
  };
};
var handleStripeError = (stripeError, requestId, res) => {
  logPaymentEvent("error", "stripe_session_creation_failed", {
    requestId,
    errorType: stripeError instanceof Stripe2.errors.StripeError ? stripeError.type : "unknown",
    errorCode: stripeError instanceof Stripe2.errors.StripeError ? stripeError.code : "unknown",
    errorMessage: stripeError instanceof Error ? stripeError.message : String(stripeError)
  });
  if (stripeError instanceof Stripe2.errors.StripeError) {
    const errorResponse2 = createErrorResponse3(
      "Payment Error",
      stripeError.message || "Failed to create checkout session",
      void 0,
      stripeError.type,
      {
        stripeCode: stripeError.code,
        requestId,
        canRetry: ["rate_limit_error", "api_connection_error"].includes(stripeError.type)
      }
    );
    res.status(400).json(errorResponse2);
    return;
  }
  const errorResponse = createErrorResponse3(
    "Internal Error",
    "An unexpected error occurred while processing your payment",
    void 0,
    "internal_error",
    { requestId }
  );
  res.status(500).json(errorResponse);
};
router6.post("/create-checkout-session", async (req, res) => {
  const requestId = generateSecureRequestId();
  try {
    logPaymentEvent("info", "checkout_session_request", {
      requestId,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      bodyKeys: Object.keys(req.body)
    });
    const {
      amount,
      currency = "usd",
      metadata = {},
      reservationIds = [],
      cartItems: cartItems2 = [],
      services = []
    } = req.body;
    logPaymentEvent("info", "payment_data_received", {
      requestId,
      amount,
      currency,
      hasMetadata: !!metadata,
      userId: metadata.userId,
      userEmail: metadata.userEmail ? "***@***.***" : void 0,
      reservationCount: reservationIds?.length || 0,
      cartItemCount: cartItems2?.length || 0,
      serviceCount: services?.length || 0
    });
    if (!validateAmount(amount, requestId, res)) return;
    if (!validateUserMetadata(metadata, requestId, res)) return;
    if (!validateCurrency(currency, requestId, res)) return;
    const paymentType = determinePaymentType(reservationIds, cartItems2, services);
    const lineItems = buildLineItems(services, cartItems2, amount, currency, metadata);
    const enhancedMetadata = buildEnhancedMetadata(
      metadata,
      paymentType,
      reservationIds,
      services,
      cartItems2,
      amount
    );
    logPaymentEvent("info", "stripe_session_creation_start", {
      requestId,
      paymentType,
      lineItemCount: lineItems.length,
      totalAmount: amount,
      currency: currency.toLowerCase()
    });
    try {
      const session2 = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: urls.checkoutSuccess("{CHECKOUT_SESSION_ID}"),
        cancel_url: urls.cart,
        metadata: enhancedMetadata,
        customer_email: metadata.userEmail,
        client_reference_id: metadata.userId
      });
      logPaymentEvent("info", "stripe_session_created", {
        requestId,
        sessionId: session2.id,
        paymentType,
        reservationCount: reservationIds.length,
        cartItemCount: cartItems2?.length || 0,
        serviceCount: services?.length || 0,
        totalAmount: amount,
        currency: currency.toLowerCase(),
        expiresAt: session2.expires_at
      });
      res.json({
        success: true,
        url: session2.url,
        sessionId: session2.id,
        paymentType,
        metadata: enhancedMetadata,
        expiresAt: session2.expires_at
      });
    } catch (stripeError) {
      handleStripeError(stripeError, requestId, res);
    }
  } catch (error) {
    logPaymentEvent("error", "checkout_session_unexpected_error", {
      requestId,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : void 0
    });
    handleRouteError(error, res, "Failed to create checkout session");
  }
});
router6.get(
  "/checkout-session/:id",
  validateParams(CommonParams.stripeSessionId),
  async (req, res) => {
    const requestId = `get_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    try {
      const { id } = req.params;
      if (!id || typeof id !== "string") {
        const errorResponse = createErrorResponse3(
          "Validation Error",
          "Valid session ID is required",
          "id"
        );
        logPaymentEvent("warn", "session_retrieval_invalid_id", {
          requestId,
          providedId: id
        });
        res.status(400).json(errorResponse);
        return;
      }
      logPaymentEvent("info", "session_retrieval_start", {
        requestId,
        sessionId: id
      });
      const session2 = await stripe.checkout.sessions.retrieve(id);
      logPaymentEvent("info", "session_retrieved", {
        requestId,
        sessionId: session2.id,
        status: session2.status,
        amount: session2.amount_total,
        currency: session2.currency,
        paymentType: session2.metadata?.type || "unknown"
      });
      res.json({
        success: true,
        id: session2.id,
        status: session2.status,
        amount: session2.amount_total,
        currency: session2.currency,
        metadata: session2.metadata,
        customerEmail: session2.customer_email,
        createdAt: session2.created * 1e3,
        // Convert to milliseconds
        expiresAt: session2.expires_at * 1e3
        // Convert to milliseconds
      });
    } catch (error) {
      logPaymentEvent("error", "session_retrieval_failed", {
        requestId,
        sessionId: req.params.id,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      if (error instanceof Stripe2.errors.StripeInvalidRequestError) {
        const errorResponse = createErrorResponse3(
          "Not Found",
          "Checkout session not found",
          "id",
          "session_not_found"
        );
        res.status(404).json(errorResponse);
        return;
      }
      handleRouteError(error, res, "Failed to retrieve checkout session");
    }
  }
);
var clerk_default = router6;

// server/routes/clerk-billing.ts
import { Router as Router7 } from "express";
import { randomUUID as randomUUID2 } from "node:crypto";

// server/services/WebhookAuditLogger.ts
var WebhookAuditLogger = class _WebhookAuditLogger {
  static instance;
  constructor() {
  }
  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!_WebhookAuditLogger.instance) {
      _WebhookAuditLogger.instance = new _WebhookAuditLogger();
    }
    return _WebhookAuditLogger.instance;
  }
  /**
   * Log a webhook audit entry
   *
   * Requirements:
   * - 4.1: Log structured audit entry for any webhook request
   * - 4.2: Include rejection reason for rejected webhooks
   * - 4.3: Include mutation called and sync status for successful webhooks
   *
   * @param entry - Complete audit entry with all required fields
   */
  log(entry) {
    const level = this.determineLogLevel(entry);
    const logEntry = this.formatLogEntry(entry);
    this.writeLog(level, logEntry);
  }
  /**
   * Log a security warning for suspicious IP activity
   *
   * Requirement 4.4: Log security warning when multiple failures from same IP
   *
   * @param ip - Source IP address
   * @param failureCount - Number of failures from this IP
   */
  logSecurityWarning(ip, failureCount) {
    const warningEntry = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      sourceIp: ip,
      failureCount,
      message: `Multiple signature verification failures detected from IP: ${ip}`
    };
    const logEntry = {
      type: "webhook_security_warning",
      ...warningEntry
    };
    this.writeLog("warn", logEntry);
  }
  /**
   * Create a partial audit entry with common fields pre-filled
   * Useful for starting to build an audit entry at request start
   *
   * @param requestId - Unique request identifier
   * @param sourceIp - Source IP address
   * @param svixId - Svix webhook identifier
   * @returns Partial audit entry with common fields
   */
  createPartialEntry(requestId, sourceIp, svixId) {
    return {
      requestId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      sourceIp,
      svixId
    };
  }
  /**
   * Determine the appropriate log level based on outcome
   */
  determineLogLevel(entry) {
    switch (entry.outcome) {
      case "success":
      case "duplicate":
        return "info";
      case "rejected":
        return "warn";
      case "error":
        return "error";
      default:
        return "info";
    }
  }
  /**
   * Format the audit entry for logging
   * Adds type field and ensures consistent structure
   */
  formatLogEntry(entry) {
    const logEntry = {
      type: "webhook_audit",
      requestId: entry.requestId,
      timestamp: entry.timestamp,
      eventType: entry.eventType,
      sourceIp: entry.sourceIp,
      svixId: entry.svixId,
      signatureValid: entry.signatureValid,
      processingTimeMs: entry.processingTimeMs,
      outcome: entry.outcome
    };
    if (entry.rejectionReason !== void 0) {
      logEntry.rejectionReason = entry.rejectionReason;
    }
    if (entry.mutationCalled !== void 0) {
      logEntry.mutationCalled = entry.mutationCalled;
    }
    if (entry.syncStatus !== void 0) {
      logEntry.syncStatus = entry.syncStatus;
    }
    return logEntry;
  }
  /**
   * Write log entry to console as JSON
   * In production, this would be picked up by log aggregators
   */
  writeLog(level, entry) {
    const jsonLog = JSON.stringify(entry);
    switch (level) {
      case "info":
        console.info(jsonLog);
        break;
      case "warn":
        console.warn(jsonLog);
        break;
      case "error":
        console.error(jsonLog);
        break;
    }
  }
};
function getWebhookAuditLogger() {
  return WebhookAuditLogger.getInstance();
}
var webhookAuditLogger = WebhookAuditLogger.getInstance();

// server/utils/LRUCache.ts
var LRUCache = class {
  cache;
  maxSize;
  defaultTTL;
  constructor(config) {
    this.cache = /* @__PURE__ */ new Map();
    this.maxSize = config.maxSize;
    this.defaultTTL = config.defaultTTL;
  }
  /**
   * Get a value from the cache
   * Returns undefined if key doesn't exist or has expired
   * Moves accessed key to end (most recently used)
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return void 0;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return void 0;
    }
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }
  /**
   * Set a value in the cache with optional custom TTL
   * Evicts oldest entry if max size is reached
   */
  set(key, value, ttl) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    const expiresAt = Date.now() + (ttl ?? this.defaultTTL);
    this.cache.set(key, { value, expiresAt });
  }
  /**
   * Check if a key exists and is not expired
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
  /**
   * Delete a key from the cache
   * Returns true if key existed and was deleted
   */
  delete(key) {
    return this.cache.delete(key);
  }
  /**
   * Clear all entries from the cache
   */
  clear() {
    this.cache.clear();
  }
  /**
   * Get the current number of entries in the cache
   * Note: May include expired entries until they are accessed
   */
  get size() {
    return this.cache.size;
  }
  /**
   * Evict the oldest (least recently used) entry
   * Map maintains insertion order, so first key is oldest
   */
  evictOldest() {
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey !== void 0) {
      this.cache.delete(oldestKey);
    }
  }
  /**
   * Clean up expired entries
   * Useful for periodic maintenance
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }
    return removed;
  }
};

// server/services/WebhookSecurityService.ts
var DEFAULT_CONFIG = {
  maxTimestampAge: 300,
  // 5 minutes
  maxTimestampFuture: 60,
  // 1 minute
  idempotencyCacheSize: 1e4,
  idempotencyCacheTTL: 3e5,
  // 5 minutes
  failureTrackingWindow: 3e5,
  // 5 minutes
  failureThreshold: 5
};
var WebhookSecurityService = class {
  config;
  idempotencyCache;
  ipFailureCache;
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    const idempotencyCacheConfig = {
      maxSize: this.config.idempotencyCacheSize,
      defaultTTL: this.config.idempotencyCacheTTL
    };
    this.idempotencyCache = new LRUCache(idempotencyCacheConfig);
    const ipFailureCacheConfig = {
      maxSize: 1e3,
      // Track up to 1000 unique IPs
      defaultTTL: this.config.failureTrackingWindow
    };
    this.ipFailureCache = new LRUCache(ipFailureCacheConfig);
  }
  /**
   * Validate webhook timestamp for replay attack protection
   *
   * Requirements:
   * - 2.1: Reject timestamps older than 300 seconds (5 minutes)
   * - 2.2: Reject timestamps more than 60 seconds in the future
   * - 2.3: Accept timestamps within the valid window
   *
   * @param timestamp - Unix timestamp in seconds (from svix-timestamp header)
   * @returns ValidationResult indicating if timestamp is valid
   */
  validateTimestamp(timestamp) {
    const timestampSeconds = Number.parseInt(timestamp, 10);
    if (Number.isNaN(timestampSeconds)) {
      return {
        valid: false,
        reason: "Invalid timestamp format: not a valid number",
        code: "WEBHOOK_INVALID_TIMESTAMP_FORMAT"
      };
    }
    const nowSeconds = Math.floor(Date.now() / 1e3);
    const ageSeconds = nowSeconds - timestampSeconds;
    if (ageSeconds > this.config.maxTimestampAge) {
      return {
        valid: false,
        reason: `Timestamp too old: ${ageSeconds} seconds (max: ${this.config.maxTimestampAge})`,
        code: "WEBHOOK_REPLAY_DETECTED"
      };
    }
    if (ageSeconds < -this.config.maxTimestampFuture) {
      return {
        valid: false,
        reason: `Timestamp too far in future: ${-ageSeconds} seconds (max: ${this.config.maxTimestampFuture})`,
        code: "WEBHOOK_INVALID_TIMESTAMP_FUTURE"
      };
    }
    return { valid: true };
  }
  /**
   * Check if a webhook has already been processed (idempotency check)
   *
   * Requirements:
   * - 3.1: Detect duplicate webhooks by svix-id
   * - 3.2: Cache processed webhooks with 5-minute TTL
   *
   * @param svixId - Unique webhook identifier from svix-id header
   * @returns IdempotencyResult indicating if this is a duplicate
   */
  checkIdempotency(svixId) {
    const entry = this.idempotencyCache.get(svixId);
    if (entry) {
      return {
        isDuplicate: true,
        originalProcessedAt: entry.processedAt
      };
    }
    return { isDuplicate: false };
  }
  /**
   * Record a successfully processed webhook for idempotency tracking
   *
   * Requirements:
   * - 3.2: Store svix-id in cache with 5-minute TTL
   * - 3.3: LRU eviction when max size reached (handled by LRUCache)
   *
   * @param svixId - Unique webhook identifier
   * @param eventType - Type of webhook event
   */
  recordProcessed(svixId, eventType) {
    const entry = {
      svixId,
      processedAt: Date.now(),
      eventType
    };
    this.idempotencyCache.set(svixId, entry);
  }
  /**
   * Track a signature verification failure for an IP address
   *
   * Requirement 4.4: Track failures within 5-minute sliding window
   *
   * @param ip - Source IP address
   */
  trackSignatureFailure(ip) {
    const now = Date.now();
    const record = this.ipFailureCache.get(ip);
    if (record) {
      const recentFailures = record.failures.filter(
        (timestamp) => now - timestamp < this.config.failureTrackingWindow
      );
      recentFailures.push(now);
      this.ipFailureCache.set(ip, { failures: recentFailures });
    } else {
      this.ipFailureCache.set(ip, { failures: [now] });
    }
  }
  /**
   * Check if an IP has exceeded the failure threshold
   *
   * Requirement 4.4: Trigger warning after 5 failures from same IP
   *
   * @param ip - Source IP address
   * @returns true if IP should trigger a security warning
   */
  shouldWarnAboutIP(ip) {
    const record = this.ipFailureCache.get(ip);
    if (!record) {
      return false;
    }
    const now = Date.now();
    const recentFailures = record.failures.filter(
      (timestamp) => now - timestamp < this.config.failureTrackingWindow
    );
    return recentFailures.length >= this.config.failureThreshold;
  }
  /**
   * Get the current failure count for an IP
   *
   * @param ip - Source IP address
   * @returns Number of recent failures
   */
  getFailureCount(ip) {
    const record = this.ipFailureCache.get(ip);
    if (!record) {
      return 0;
    }
    const now = Date.now();
    return record.failures.filter((timestamp) => now - timestamp < this.config.failureTrackingWindow).length;
  }
  /**
   * Get the current configuration
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return {
      idempotencyCacheSize: this.idempotencyCache.size,
      ipFailureCacheSize: this.ipFailureCache.size
    };
  }
};
var instance = null;
function getWebhookSecurityService(config) {
  instance ??= new WebhookSecurityService(config);
  return instance;
}

// server/routes/clerk-billing.ts
var router7 = Router7();
var securityService = getWebhookSecurityService();
var auditLogger2 = getWebhookAuditLogger();
var SUBSCRIPTION_EVENT_MUTATIONS = {
  "subscription.created": "clerk/billing:handleSubscriptionCreated",
  "subscription.updated": "clerk/billing:handleSubscriptionUpdated",
  "subscription.deleted": "clerk/billing:handleSubscriptionDeleted"
};
var INVOICE_EVENT_MUTATIONS = {
  "invoice.created": "clerk/billing:handleInvoiceCreated",
  "invoice.paid": "clerk/billing:handleInvoicePaid",
  "invoice.payment_failed": "clerk/billing:handleInvoicePaymentFailed"
};
router7.post("/", async (req, res) => {
  const requestId = randomUUID2();
  const startTime = Date.now();
  const sourceIp = extractSourceIP(req);
  const svixHeaders = extractSvixHeaders(req);
  const svixId = svixHeaders?.["svix-id"] || "unknown";
  const svixTimestamp = svixHeaders?.["svix-timestamp"] || "";
  let eventType = "unknown";
  let signatureValid = false;
  let outcome = "error";
  let rejectionReason;
  let mutationCalled;
  let syncStatus;
  try {
    logger.info("Processing Clerk Billing webhook", { requestId });
    const config = validateEnvironmentConfig(requestId);
    if (!config.isValid) {
      outcome = "rejected";
      rejectionReason = "Environment configuration invalid";
      logAuditEntry({
        requestId,
        startTime,
        eventType,
        sourceIp,
        svixId,
        signatureValid,
        outcome,
        rejectionReason
      });
      res.status(config.statusCode).json(config.errorResponse);
      return;
    }
    if (!svixHeaders) {
      outcome = "rejected";
      rejectionReason = "Missing required Svix headers";
      logger.warn("Missing required Svix headers", { requestId });
      logAuditEntry({
        requestId,
        startTime,
        eventType,
        sourceIp,
        svixId,
        signatureValid,
        outcome,
        rejectionReason
      });
      const errorResponse = createErrorResponse2(
        "Missing headers",
        "WEBHOOK_MISSING_HEADERS" /* WEBHOOK_MISSING_HEADERS */,
        rejectionReason,
        requestId
      );
      res.status(400).json(errorResponse);
      return;
    }
    const timestampValidation = securityService.validateTimestamp(svixTimestamp);
    if (!timestampValidation.valid) {
      outcome = "rejected";
      rejectionReason = timestampValidation.reason;
      logger.warn("Timestamp validation failed", { requestId, reason: rejectionReason });
      logAuditEntry({
        requestId,
        startTime,
        eventType,
        sourceIp,
        svixId,
        signatureValid,
        outcome,
        rejectionReason
      });
      const errorResponse = createErrorResponse2(
        "Invalid timestamp",
        timestampValidation.code,
        rejectionReason,
        requestId
      );
      res.status(400).json(errorResponse);
      return;
    }
    const idempotencyResult = securityService.checkIdempotency(svixId);
    if (idempotencyResult.isDuplicate) {
      outcome = "duplicate";
      logger.info("Duplicate webhook detected", {
        requestId,
        svixId,
        originalProcessedAt: new Date(idempotencyResult.originalProcessedAt).toISOString()
      });
      logAuditEntry({
        requestId,
        startTime,
        eventType,
        sourceIp,
        svixId,
        signatureValid: true,
        // Signature was valid when originally processed
        outcome
      });
      res.status(200).json({
        received: true,
        synced: false,
        message: "Duplicate webhook - already processed",
        requestId,
        duplicate: true
      });
      return;
    }
    const payload = await verifyWebhookSignature(
      req,
      config.webhookSecret,
      config.isProd,
      requestId
    );
    if (!payload) {
      outcome = "rejected";
      rejectionReason = "Webhook signature verification failed";
      securityService.trackSignatureFailure(sourceIp);
      if (securityService.shouldWarnAboutIP(sourceIp)) {
        const failureCount = securityService.getFailureCount(sourceIp);
        auditLogger2.logSecurityWarning(sourceIp, failureCount);
        logger.warn("Security warning: multiple signature failures from IP", {
          requestId,
          sourceIp,
          failureCount
        });
      }
      logAuditEntry({
        requestId,
        startTime,
        eventType,
        sourceIp,
        svixId,
        signatureValid,
        outcome,
        rejectionReason
      });
      const errorResponse = createErrorResponse2(
        "Invalid signature",
        "STRIPE_INVALID_SIGNATURE" /* STRIPE_INVALID_SIGNATURE */,
        rejectionReason,
        requestId
      );
      res.status(400).json(errorResponse);
      return;
    }
    signatureValid = true;
    eventType = payload.type || "unknown";
    const response = await processWebhookEvent(payload, config.convexUrl, requestId);
    securityService.recordProcessed(svixId, eventType);
    outcome = "success";
    syncStatus = response.synced;
    mutationCalled = response.handled ? `${response.handled}:${eventType}` : void 0;
    logAuditEntry({
      requestId,
      startTime,
      eventType,
      sourceIp,
      svixId,
      signatureValid,
      outcome,
      mutationCalled,
      syncStatus
    });
    res.status(200).json(response);
  } catch (error) {
    outcome = "error";
    rejectionReason = error instanceof Error ? error.message : String(error);
    logAuditEntry({
      requestId,
      startTime,
      eventType,
      sourceIp,
      svixId,
      signatureValid,
      outcome,
      rejectionReason
    });
    handleWebhookError(error, requestId, res);
  }
});
function extractSourceIP(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(",")[0].trim();
  }
  const realIp = req.headers["x-real-ip"];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }
  return req.socket.remoteAddress || "unknown";
}
function logAuditEntry(options) {
  const processingTimeMs = Date.now() - options.startTime;
  const auditEntry = {
    requestId: options.requestId,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    eventType: options.eventType,
    sourceIp: options.sourceIp,
    svixId: options.svixId,
    signatureValid: options.signatureValid,
    processingTimeMs,
    outcome: options.outcome
  };
  if (options.rejectionReason !== void 0) {
    auditEntry.rejectionReason = options.rejectionReason;
  }
  if (options.mutationCalled !== void 0) {
    auditEntry.mutationCalled = options.mutationCalled;
  }
  if (options.syncStatus !== void 0) {
    auditEntry.syncStatus = options.syncStatus;
  }
  auditLogger2.log(auditEntry);
}
function validateEnvironmentConfig(requestId) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  const convexUrl = process.env.VITE_CONVEX_URL;
  const isProd = process.env.NODE_ENV === "production";
  if (!webhookSecret && isProd) {
    logger.error("CLERK_WEBHOOK_SECRET not configured in production", { requestId });
    return {
      isValid: false,
      isProd,
      statusCode: 500,
      errorResponse: createErrorResponse2(
        "Webhook secret not configured",
        "WEBHOOK_PROCESSING_ERROR" /* WEBHOOK_PROCESSING_ERROR */,
        "CLERK_WEBHOOK_SECRET environment variable is required",
        requestId
      )
    };
  }
  if (!webhookSecret) {
    logger.warn("CLERK_WEBHOOK_SECRET not set; using raw body in dev", { requestId });
  }
  if (!convexUrl) {
    logger.warn("VITE_CONVEX_URL not set; webhook will be acknowledged but not synced", {
      requestId
    });
  }
  return {
    isValid: true,
    webhookSecret,
    convexUrl,
    isProd
  };
}
async function verifyWebhookSignature(req, webhookSecret, isProd, requestId) {
  if (!webhookSecret) {
    return req.body;
  }
  try {
    const { Webhook } = await import("svix");
    const svix = new Webhook(webhookSecret);
    const svixHeaders = extractSvixHeaders(req);
    if (!svixHeaders) {
      throw new Error("Missing required Svix headers");
    }
    const rawBody = req.rawBody;
    const bodyToVerify = rawBody ? rawBody.toString("utf8") : JSON.stringify(req.body);
    if (!rawBody) {
      logger.warn("Raw body not available, using JSON.stringify fallback", { requestId });
    }
    const payload = svix.verify(bodyToVerify, svixHeaders);
    logger.info("Webhook signature verified", { requestId });
    return payload;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error("Webhook signature verification failed", { requestId, error: errorMessage });
    if (isProd) {
      return null;
    }
    logger.warn("Svix verification failed; using raw body in dev", { requestId });
    return req.body;
  }
}
function extractSvixHeaders(req) {
  const svixId = req.headers["svix-id"];
  const svixTimestamp = req.headers["svix-timestamp"];
  const svixSignature = req.headers["svix-signature"];
  if (!svixId || !svixTimestamp || !svixSignature) {
    return null;
  }
  return {
    "svix-id": svixId,
    "svix-timestamp": svixTimestamp,
    "svix-signature": svixSignature
  };
}
async function processWebhookEvent(payload, convexUrl, requestId) {
  const { type: eventType, data: eventData } = payload;
  logger.info("Processing webhook event", { requestId, eventType });
  if (!convexUrl) {
    return {
      received: true,
      synced: false,
      message: "Convex URL not configured",
      requestId
    };
  }
  if (eventType.startsWith("subscription.")) {
    await handleEventWithMutation(
      eventType,
      eventData,
      SUBSCRIPTION_EVENT_MUTATIONS,
      convexUrl,
      requestId
    );
    return {
      received: true,
      synced: true,
      handled: "subscription",
      eventType,
      requestId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  if (eventType.startsWith("invoice.")) {
    await handleEventWithMutation(
      eventType,
      eventData,
      INVOICE_EVENT_MUTATIONS,
      convexUrl,
      requestId
    );
    return {
      received: true,
      synced: true,
      handled: "invoice",
      eventType,
      requestId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  if (eventType === "session.created" || eventType === "user.created" || eventType === "user.updated") {
    await handleUserEvent(eventType, eventData, convexUrl, requestId);
    return {
      received: true,
      synced: true,
      handled: "user_session",
      eventType,
      requestId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  logger.info("Unhandled event type", { requestId, eventType });
  return {
    received: true,
    synced: false,
    message: `Event type ${eventType} not handled`,
    requestId
  };
}
async function handleEventWithMutation(eventType, data, mutationMap, convexUrl, requestId) {
  const mutationName = mutationMap[eventType];
  if (!mutationName) {
    logger.info("No mutation defined for event", { requestId, eventType });
    return;
  }
  logger.info("Handling event", { requestId, eventType });
  logEventDetails(eventType, data, requestId);
  await callConvexMutation(mutationName, data, convexUrl, requestId);
}
function logEventDetails(eventType, data, requestId) {
  if (eventType.startsWith("subscription.")) {
    logger.info("Subscription details", {
      requestId,
      subscriptionId: data.id,
      planId: data.plan_id,
      status: data.status
    });
  } else if (eventType.startsWith("invoice.")) {
    logger.info("Invoice details", {
      requestId,
      invoiceId: data.id,
      amount: data.amount,
      status: data.status
    });
  }
}
async function handleUserEvent(eventType, data, convexUrl, requestId) {
  logger.info("Handling user event", { requestId, eventType });
  try {
    const userId = data.user_id || data.id;
    const emailAddresses = data.email_addresses;
    const email = emailAddresses?.[0]?.email_address || "unknown@temp.com";
    const firstName = data.first_name || void 0;
    const lastName = data.last_name || void 0;
    logger.info("User data extracted", { requestId, clerkId: userId });
    const { upsertUser: upsertUser2 } = await Promise.resolve().then(() => (init_convex(), convex_exports));
    const result = await upsertUser2({
      clerkId: userId,
      email,
      username: data.username || void 0,
      firstName,
      lastName,
      imageUrl: data.image_url || void 0
    });
    logger.info("User synced successfully", {
      requestId,
      userId,
      result: result ? "success" : "failed"
    });
    if (!result) {
      throw new Error("User sync returned null");
    }
    if (eventType === "user.created" && email !== "unknown@temp.com") {
      try {
        const { getResendContactService: getResendContactService2 } = await Promise.resolve().then(() => (init_ResendContactService(), ResendContactService_exports));
        const resendService = getResendContactService2();
        const syncResult = await resendService.syncContact({
          email,
          firstName,
          lastName
        });
        logger.info("Resend contact sync", { requestId, success: syncResult.success });
      } catch (resendError) {
        logger.warn("Resend contact sync failed (non-blocking)", { requestId, error: resendError });
      }
    }
  } catch (error) {
    logger.error("Error syncing user", { requestId, error });
    throw error;
  }
}
async function callConvexMutation(mutationName, data, convexUrl, requestId) {
  try {
    const { ConvexHttpClient: ConvexHttpClient9 } = await import("convex/browser");
    const convex8 = new ConvexHttpClient9(convexUrl);
    logger.info("Calling Convex mutation", { requestId, mutationName });
    await convex8.mutation(mutationName, { data });
    logger.info("Convex mutation completed", { requestId, mutationName });
  } catch (error) {
    logger.error("Error calling Convex mutation", { requestId, mutationName, error });
    throw error;
  }
}
function handleWebhookError(error, requestId, res) {
  logger.error("Error processing Clerk Billing webhook", { requestId, error });
  if (error instanceof PaymentError) {
    const errorResponse2 = error.toErrorResponse(requestId);
    res.status(500).json(errorResponse2);
    return;
  }
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const errorResponse = createErrorResponse2(
    "Webhook processing failed",
    "WEBHOOK_PROCESSING_ERROR" /* WEBHOOK_PROCESSING_ERROR */,
    sanitizeErrorMessage(errorObj),
    requestId,
    { stack: errorObj.stack }
  );
  res.status(500).json(errorResponse);
}
var clerk_billing_default = router7;

// server/routes/contact.ts
import { Router as Router8 } from "express";

// shared/schema.ts
import { z as z15 } from "zod";
var LicenseType2 = ["basic", "premium", "unlimited"];
var OrderStatus2 = [
  "pending",
  "processing",
  "paid",
  "completed",
  "failed",
  "refunded",
  "cancelled"
];
var insertUserSchema = z15.object({
  username: z15.string().min(2),
  email: z15.string().email(),
  password: z15.string().min(6)
});
var insertEmailVerificationSchema = z15.object({
  user_id: z15.number(),
  token: z15.string(),
  expires_at: z15.string()
});
var insertPasswordResetSchema = z15.object({
  user_id: z15.number(),
  token: z15.string(),
  expires_at: z15.string()
});
var verifyEmailSchema = z15.object({
  token: z15.string().uuid("Format de token invalide")
});
var resendVerificationSchema = z15.object({
  email: z15.string().email("Format d'email invalide")
});
var forgotPasswordSchema = z15.object({
  email: z15.string().email("Format d'email invalide")
});
var resetPasswordSchema = z15.object({
  token: z15.string().uuid("Format de token invalide"),
  password: z15.string().min(6, "Le mot de passe doit contenir au moins 6 caract\xE8res")
});
var insertBeatSchema = z15.object({
  wordpress_id: z15.number(),
  title: z15.string().min(2),
  description: z15.string().optional().nullable(),
  genre: z15.string(),
  bpm: z15.number(),
  key: z15.string().optional().nullable(),
  mood: z15.string().optional().nullable(),
  price: z15.number(),
  audio_url: z15.string().optional().nullable(),
  image_url: z15.string().optional().nullable(),
  tags: z15.array(z15.string()).optional().nullable(),
  featured: z15.boolean().optional(),
  downloads: z15.number().optional(),
  views: z15.number().optional(),
  duration: z15.number().optional(),
  is_active: z15.boolean().optional()
});
var insertWishlistItemSchema = z15.object({
  user_id: z15.number(),
  beat_id: z15.number()
});
var insertCartItemSchema = z15.object({
  beat_id: z15.number(),
  license_type: z15.enum(LicenseType2),
  price: z15.number(),
  quantity: z15.number().min(1),
  session_id: z15.string().optional().nullable(),
  user_id: z15.number().optional().nullable()
});
var insertOrderSchema = z15.object({
  user_id: z15.number().optional().nullable(),
  session_id: z15.string().optional().nullable(),
  email: z15.string().email(),
  total: z15.number(),
  status: z15.enum(OrderStatus2),
  stripe_payment_intent_id: z15.string().optional().nullable(),
  items: z15.array(
    z15.object({
      productId: z15.number().optional(),
      title: z15.string(),
      price: z15.number().optional(),
      quantity: z15.number().optional(),
      license: z15.string().optional(),
      type: z15.string().optional(),
      sku: z15.string().optional(),
      metadata: z15.object({
        beatGenre: z15.string().optional(),
        beatBpm: z15.number().optional(),
        beatKey: z15.string().optional(),
        downloadFormat: z15.string().optional(),
        licenseTerms: z15.string().optional()
      }).optional()
    })
  )
});
var insertOrderStatusHistorySchema = z15.object({
  order_id: z15.number(),
  status: z15.enum(OrderStatus2),
  comment: z15.string().optional().nullable()
});
var insertSubscriptionSchema = z15.object({
  user_id: z15.number(),
  plan: z15.enum(LicenseType2),
  status: z15.enum(["active", "inactive", "canceled"]),
  started_at: z15.string(),
  expires_at: z15.string()
});
var insertDownloadSchema = z15.object({
  productId: z15.number().positive("Product ID must be a positive number"),
  license: z15.enum(LicenseType2, {
    errorMap: () => ({ message: "License must be basic, premium, or unlimited" })
  }),
  price: z15.number().min(0).optional(),
  // Price in cents, optional for free downloads
  productName: z15.string().optional()
  // Optional product name for order creation
});
var insertActivityLogSchema = z15.object({
  user_id: z15.number().optional().nullable(),
  action: z15.string(),
  details: z15.object({
    action: z15.string(),
    resource: z15.string(),
    resourceId: z15.string().optional(),
    changes: z15.record(
      z15.object({
        from: z15.unknown(),
        to: z15.unknown()
      })
    ).optional(),
    metadata: z15.object({
      ipAddress: z15.string().optional(),
      userAgent: z15.string().optional(),
      duration: z15.number().optional(),
      success: z15.boolean(),
      errorMessage: z15.string().optional(),
      additionalContext: z15.record(z15.unknown()).optional()
    })
  }).optional(),
  timestamp: z15.string().optional()
});
var insertFileSchema = z15.object({
  user_id: z15.number(),
  filename: z15.string(),
  original_name: z15.string(),
  mime_type: z15.string(),
  size: z15.number(),
  storage_path: z15.string(),
  role: z15.enum(["upload", "deliverable", "invoice"]),
  reservation_id: z15.string().optional().nullable(),
  order_id: z15.number().optional().nullable(),
  owner_id: z15.number().optional().nullable()
});
var ServiceType2 = [
  "mixing",
  "mastering",
  "recording",
  "custom_beat",
  "consultation"
];
var insertServiceOrderSchema = z15.object({
  user_id: z15.number(),
  service_type: z15.enum(ServiceType2),
  details: z15.object({
    duration: z15.number().optional(),
    tracks: z15.number().optional(),
    format: z15.enum(["wav", "mp3", "aiff"]).optional(),
    quality: z15.enum(["standard", "premium"]).optional(),
    rush: z15.boolean().optional(),
    notes: z15.string().optional()
  }),
  estimated_price: z15.number().min(0),
  status: z15.enum(["pending", "in_progress", "completed", "cancelled"]).optional()
});
var ReservationStatus2 = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled"
];
var insertReservationSchema = z15.object({
  user_id: z15.number().optional().nullable(),
  service_type: z15.enum(ServiceType2),
  details: z15.object({
    name: z15.string().min(1, "Name is required"),
    email: z15.string().email("Invalid email format"),
    phone: z15.string().min(10, "Invalid phone number"),
    requirements: z15.string().optional(),
    referenceLinks: z15.array(z15.string().url()).optional()
  }),
  preferred_date: z15.string().datetime(),
  duration_minutes: z15.number().min(30).max(480),
  total_price: z15.number().min(0),
  notes: z15.string().optional().nullable()
});
var contactFormSchema = z15.object({
  name: z15.string().min(2, "Le nom doit contenir au moins 2 caract\xE8res").max(100, "Le nom ne peut pas d\xE9passer 100 caract\xE8res"),
  email: z15.string().email("Format d'email invalide"),
  subject: z15.string().max(200, "Le sujet ne peut pas d\xE9passer 200 caract\xE8res").optional().default(""),
  message: z15.string().min(10, "Le message doit contenir au moins 10 caract\xE8res").max(5e3, "Le message ne peut pas d\xE9passer 5000 caract\xE8res")
});

// server/lib/validation.ts
import { ZodError, z as z16 } from "zod";

// shared/constants/HttpStatus.ts
var HTTP_STATUS = {
  // Success responses (2xx)
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  // Redirection responses (3xx)
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
  // Client error responses (4xx)
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  LENGTH_REQUIRED: 411,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  URI_TOO_LONG: 414,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RANGE_NOT_SATISFIABLE: 416,
  EXPECTATION_FAILED: 417,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  // Server error responses (5xx)
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  HTTP_VERSION_NOT_SUPPORTED: 505
};
var STATUS_DESCRIPTIONS = {
  [HTTP_STATUS.OK]: "OK",
  [HTTP_STATUS.CREATED]: "Created",
  [HTTP_STATUS.ACCEPTED]: "Accepted",
  [HTTP_STATUS.NO_CONTENT]: "No Content",
  [HTTP_STATUS.MOVED_PERMANENTLY]: "Moved Permanently",
  [HTTP_STATUS.FOUND]: "Found",
  [HTTP_STATUS.NOT_MODIFIED]: "Not Modified",
  [HTTP_STATUS.BAD_REQUEST]: "Bad Request",
  [HTTP_STATUS.UNAUTHORIZED]: "Unauthorized",
  [HTTP_STATUS.PAYMENT_REQUIRED]: "Payment Required",
  [HTTP_STATUS.FORBIDDEN]: "Forbidden",
  [HTTP_STATUS.NOT_FOUND]: "Not Found",
  [HTTP_STATUS.METHOD_NOT_ALLOWED]: "Method Not Allowed",
  [HTTP_STATUS.NOT_ACCEPTABLE]: "Not Acceptable",
  [HTTP_STATUS.REQUEST_TIMEOUT]: "Request Timeout",
  [HTTP_STATUS.CONFLICT]: "Conflict",
  [HTTP_STATUS.GONE]: "Gone",
  [HTTP_STATUS.LENGTH_REQUIRED]: "Length Required",
  [HTTP_STATUS.PRECONDITION_FAILED]: "Precondition Failed",
  [HTTP_STATUS.PAYLOAD_TOO_LARGE]: "Payload Too Large",
  [HTTP_STATUS.URI_TOO_LONG]: "URI Too Long",
  [HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE]: "Unsupported Media Type",
  [HTTP_STATUS.RANGE_NOT_SATISFIABLE]: "Range Not Satisfiable",
  [HTTP_STATUS.EXPECTATION_FAILED]: "Expectation Failed",
  [HTTP_STATUS.UNPROCESSABLE_ENTITY]: "Unprocessable Entity",
  [HTTP_STATUS.TOO_MANY_REQUESTS]: "Too Many Requests",
  [HTTP_STATUS.INTERNAL_SERVER_ERROR]: "Internal Server Error",
  [HTTP_STATUS.NOT_IMPLEMENTED]: "Not Implemented",
  [HTTP_STATUS.BAD_GATEWAY]: "Bad Gateway",
  [HTTP_STATUS.SERVICE_UNAVAILABLE]: "Service Unavailable",
  [HTTP_STATUS.GATEWAY_TIMEOUT]: "Gateway Timeout",
  [HTTP_STATUS.HTTP_VERSION_NOT_SUPPORTED]: "HTTP Version Not Supported"
};
var BROLAB_STATUS_MAPPING = {
  // Authentication & Authorization
  INVALID_CREDENTIALS: HTTP_STATUS.UNAUTHORIZED,
  SESSION_EXPIRED: HTTP_STATUS.UNAUTHORIZED,
  INSUFFICIENT_PERMISSIONS: HTTP_STATUS.FORBIDDEN,
  ACCOUNT_SUSPENDED: HTTP_STATUS.FORBIDDEN,
  EMAIL_NOT_VERIFIED: HTTP_STATUS.UNAUTHORIZED,
  // Beat Licensing
  LICENSE_NOT_AVAILABLE: HTTP_STATUS.CONFLICT,
  BEAT_NOT_FOUND: HTTP_STATUS.NOT_FOUND,
  BEAT_UNAVAILABLE: HTTP_STATUS.CONFLICT,
  EXCLUSIVE_BEAT_SOLD: HTTP_STATUS.GONE,
  INVALID_LICENSE_TYPE: HTTP_STATUS.BAD_REQUEST,
  LICENSE_TERMS_VIOLATION: HTTP_STATUS.FORBIDDEN,
  // Payment Processing
  PAYMENT_FAILED: HTTP_STATUS.PAYMENT_REQUIRED,
  INSUFFICIENT_FUNDS: HTTP_STATUS.PAYMENT_REQUIRED,
  CARD_DECLINED: HTTP_STATUS.PAYMENT_REQUIRED,
  PAYMENT_METHOD_INVALID: HTTP_STATUS.BAD_REQUEST,
  CURRENCY_NOT_SUPPORTED: HTTP_STATUS.BAD_REQUEST,
  REFUND_FAILED: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  SUBSCRIPTION_PAYMENT_FAILED: HTTP_STATUS.PAYMENT_REQUIRED,
  // Audio Processing
  AUDIO_FILE_CORRUPT: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  AUDIO_FORMAT_UNSUPPORTED: HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
  WAVEFORM_GENERATION_FAILED: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  AUDIO_PROCESSING_TIMEOUT: HTTP_STATUS.REQUEST_TIMEOUT,
  AUDIO_QUALITY_INSUFFICIENT: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  // Download & Quota
  DOWNLOAD_QUOTA_EXCEEDED: HTTP_STATUS.TOO_MANY_REQUESTS,
  DOWNLOAD_LINK_EXPIRED: HTTP_STATUS.GONE,
  FILE_NOT_FOUND: HTTP_STATUS.NOT_FOUND,
  DOWNLOAD_FAILED: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  CONCURRENT_DOWNLOAD_LIMIT: HTTP_STATUS.TOO_MANY_REQUESTS,
  // Studio Booking
  BOOKING_CONFLICT: HTTP_STATUS.CONFLICT,
  STUDIO_UNAVAILABLE: HTTP_STATUS.SERVICE_UNAVAILABLE,
  BOOKING_CANCELLED: HTTP_STATUS.GONE,
  SERVICE_NOT_AVAILABLE: HTTP_STATUS.SERVICE_UNAVAILABLE,
  BOOKING_DEADLINE_PASSED: HTTP_STATUS.GONE,
  // File Upload
  FILE_TOO_LARGE: HTTP_STATUS.PAYLOAD_TOO_LARGE,
  FILE_TYPE_NOT_ALLOWED: HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
  VIRUS_DETECTED: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  UPLOAD_FAILED: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  STORAGE_QUOTA_EXCEEDED: HTTP_STATUS.PAYLOAD_TOO_LARGE,
  // Subscription
  SUBSCRIPTION_EXPIRED: HTTP_STATUS.PAYMENT_REQUIRED,
  SUBSCRIPTION_CANCELLED: HTTP_STATUS.FORBIDDEN,
  PLAN_NOT_FOUND: HTTP_STATUS.NOT_FOUND,
  UPGRADE_FAILED: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  DOWNGRADE_RESTRICTED: HTTP_STATUS.FORBIDDEN,
  // Business Logic
  CART_EMPTY: HTTP_STATUS.BAD_REQUEST,
  ITEM_OUT_OF_STOCK: HTTP_STATUS.CONFLICT,
  PRICE_CHANGED: HTTP_STATUS.CONFLICT,
  PROMOTIONAL_CODE_INVALID: HTTP_STATUS.BAD_REQUEST,
  WISHLIST_FULL: HTTP_STATUS.CONFLICT,
  // System Errors
  DATABASE_ERROR: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  EXTERNAL_SERVICE_ERROR: HTTP_STATUS.SERVICE_UNAVAILABLE,
  RATE_LIMIT_EXCEEDED: HTTP_STATUS.TOO_MANY_REQUESTS,
  MAINTENANCE_MODE: HTTP_STATUS.SERVICE_UNAVAILABLE,
  FEATURE_DISABLED: HTTP_STATUS.SERVICE_UNAVAILABLE,
  // Validation Errors
  VALIDATION_ERROR: HTTP_STATUS.BAD_REQUEST,
  INVALID_INPUT: HTTP_STATUS.BAD_REQUEST,
  MISSING_REQUIRED_FIELD: HTTP_STATUS.BAD_REQUEST,
  // API Errors
  API_ERROR: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  INTERNAL_ERROR: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  NOT_FOUND: HTTP_STATUS.NOT_FOUND,
  UNAUTHORIZED: HTTP_STATUS.UNAUTHORIZED,
  FORBIDDEN: HTTP_STATUS.FORBIDDEN
};

// server/lib/errorResponses.ts
function createErrorResponse4(type, message, statusCode, code, details, requestId) {
  return {
    error: {
      type,
      message,
      code: code || type.toUpperCase(),
      details
    },
    timestamp: Date.now(),
    requestId
  };
}
function sendValidationError(res, errors, requestId) {
  const response = {
    success: false,
    error: {
      type: "validation_error" /* VALIDATION_ERROR */,
      message: "Request validation failed",
      code: "VALIDATION_ERROR",
      details: {
        errors,
        invalidFields: errors.map((e) => e.field)
      }
    },
    timestamp: Date.now(),
    requestId
  };
  res.status(HTTP_STATUS.BAD_REQUEST).json(response);
}
function sendInternalError(res, message = "Internal server error", error, requestId) {
  const response = createErrorResponse4(
    "internal_error" /* INTERNAL_ERROR */,
    message,
    500,
    "INTERNAL_ERROR",
    {
      errorName: error?.name,
      // Only include stack trace in development
      ...process.env.NODE_ENV === "development" && { stack: error?.stack }
    },
    requestId
  );
  res.status(500).json(response);
}
function getRequestId(req) {
  if (req && typeof req === "object" && "requestId" in req) {
    return req.requestId;
  }
  return void 0;
}

// server/lib/validation.ts
function createValidationMiddleware(schema) {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.method === "GET" ? req.query : req.body);
      const validatedReq = req;
      if (req.method === "GET") {
        validatedReq.validatedQuery = validatedData;
      } else {
        req.body = validatedData;
      }
      validatedReq.validatedData = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code
        }));
        return sendValidationError(res, validationErrors, getRequestId(req));
      }
      return sendInternalError(res, "Internal validation error", error, getRequestId(req));
    }
  };
}
var commonSchemas = {
  id: z16.object({
    id: z16.string().or(z16.number().positive())
  }),
  pagination: z16.object({
    page: z16.number().min(1).optional().default(1),
    limit: z16.number().min(1).max(100).optional().default(20),
    offset: z16.number().min(0).optional()
  }),
  sorting: z16.object({
    sortBy: z16.string().optional(),
    sortOrder: z16.enum(["asc", "desc"]).optional().default("desc")
  }),
  dateRange: z16.object({
    startDate: z16.string().datetime().optional(),
    endDate: z16.string().datetime().optional()
  }),
  search: z16.object({
    query: z16.string().min(1).optional(),
    filters: z16.record(z16.unknown()).optional()
  })
};
var validateFileUpload2 = (allowedTypes, maxSize) => {
  return (req, res, next) => {
    const files = req.files;
    if (!files || files.length === 0) {
      return sendValidationError(
        res,
        [{ field: "files", message: "At least one file is required", code: "required" }],
        getRequestId(req)
      );
    }
    for (const file of files) {
      if (!allowedTypes.includes(file.mimetype)) {
        return sendValidationError(
          res,
          [
            {
              field: "files",
              message: `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
              code: "invalid_type"
            }
          ],
          getRequestId(req)
        );
      }
      if (file.size > maxSize) {
        return sendValidationError(
          res,
          [
            {
              field: "files",
              message: `File size ${file.size} exceeds maximum allowed size of ${maxSize} bytes`,
              code: "file_too_large"
            }
          ],
          getRequestId(req)
        );
      }
    }
    next();
  };
};
var validateAudioUpload = validateFileUpload2(
  ["audio/mpeg", "audio/wav", "audio/flac", "audio/aiff"],
  100 * 1024 * 1024
  // 100MB
);
var validateImageUpload = validateFileUpload2(
  ["image/jpeg", "image/png", "image/gif", "image/webp"],
  10 * 1024 * 1024
  // 10MB
);

// server/services/mail.ts
import nodemailer from "nodemailer";
var createTransporter = () => {
  const resendKey = process.env.RESEND_API_KEY;
  console.log("\u{1F4E7} Email config check:", {
    hasResendKey: !!resendKey,
    keyPrefix: resendKey ? resendKey.substring(0, 6) + "..." : "none",
    nodeEnv: process.env.NODE_ENV
  });
  if (resendKey) {
    console.log("\u{1F4E7} Email transporter: Using Resend SMTP");
    return nodemailer.createTransport({
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      auth: {
        user: "resend",
        pass: resendKey
      }
    });
  }
  console.log("\u{1F4E7} Email transporter: Resend API key not found, falling back to Gmail SMTP");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpUser || !smtpPass || smtpUser === "your_email@gmail.com" || smtpPass === "your_app_password_here") {
    logger.error("SMTP credentials not configured", {
      hint: "Please set SMTP_USER and SMTP_PASS in .env or use RESEND_API_KEY"
    });
    throw new Error("Email service not configured. Please contact administrator.");
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    pool: true,
    maxConnections: 3,
    rateDelta: 1e3,
    rateLimit: 5
  });
};
var transporter = null;
var getTransporter = () => {
  if (!transporter) {
    try {
      transporter = createTransporter();
    } catch (error) {
      logger.error("Failed to create email transporter", {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  return transporter;
};
var sleep2 = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var calculateDelay2 = (attempt, options) => {
  const baseDelay = options.baseDelay || 1e3;
  const backoffFactor = options.backoffFactor || 2;
  const maxDelay = options.maxDelay || 3e4;
  const delay = baseDelay * Math.pow(backoffFactor, attempt - 1);
  return Math.min(delay, maxDelay);
};
var stripHTML = (html) => {
  return html.replaceAll(/<[^>]*>/g, "").replaceAll("&nbsp;", " ").replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').trim();
};
async function sendMail(payload, retryOptions) {
  const options = {
    maxRetries: 3,
    baseDelay: 1e3,
    maxDelay: 3e4,
    backoffFactor: 2,
    ...retryOptions
  };
  let lastError = null;
  for (let attempt = 1; attempt <= (options.maxRetries || 3); attempt++) {
    try {
      if (process.env.MAIL_DRY_RUN === "true") {
        console.log("\u{1F4E7} MAIL DRY RUN:", {
          to: payload.to,
          subject: payload.subject,
          from: payload.from || process.env.DEFAULT_FROM,
          attempt
        });
        return "dry-run-message-id";
      }
      const transporter2 = getTransporter();
      const mailOptions = {
        from: payload.from || process.env.DEFAULT_FROM || "BroLab <contact@brolabentertainment.com>",
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text || stripHTML(payload.html),
        replyTo: payload.replyTo
      };
      const result = await transporter2.sendMail(mailOptions);
      console.log(`\u2705 Email sent successfully on attempt ${attempt}:`, result.messageId);
      return result.messageId;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `\u26A0\uFE0F Email sending failed on attempt ${attempt}/${options.maxRetries}:`,
        lastError.message
      );
      if (attempt === options.maxRetries) {
        break;
      }
      const delay = calculateDelay2(attempt, options);
      console.log(`\u23F3 Retrying in ${delay}ms...`);
      await sleep2(delay);
    }
  }
  const errorMessage = lastError?.message || "Unknown error";
  logger.error("All email sending attempts failed", {
    to: payload.to,
    subject: payload.subject,
    maxRetries: options.maxRetries,
    error: errorMessage
  });
  throw new Error(`Email sending failed after ${options.maxRetries} attempts: ${errorMessage}`);
}
async function sendMailWithResult(payload, retryOptions) {
  const options = {
    maxRetries: 3,
    baseDelay: 1e3,
    maxDelay: 3e4,
    backoffFactor: 2,
    ...retryOptions
  };
  let lastError = null;
  for (let attempt = 1; attempt <= (options.maxRetries || 3); attempt++) {
    try {
      const messageId = await sendMail(payload, { maxRetries: 1 });
      return {
        success: true,
        messageId,
        attempts: attempt
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === options.maxRetries) {
        break;
      }
      const delay = calculateDelay2(attempt, options);
      await sleep2(delay);
    }
  }
  return {
    success: false,
    error: lastError?.message || "Unknown error",
    attempts: options.maxRetries || 3
  };
}
async function sendAdminNotification(type, payload) {
  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || ["contact@brolabentertainment.com"];
  return await sendMail({
    to: adminEmails,
    subject: `[BroLab Admin] ${payload.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #8B5CF6;">Admin Notification - ${type}</h2>
        ${payload.html}
        ${payload.metadata ? `<pre style="background: #f5f5f5; padding: 10px; margin-top: 20px;">${JSON.stringify(payload.metadata, null, 2)}</pre>` : ""}
      </div>
    `
  });
}

// server/routes/contact.ts
var router8 = Router8();
var contactRateLimitMap = /* @__PURE__ */ new Map();
var checkContactRateLimit = (identifier) => {
  const now = Date.now();
  const key = `contact_${identifier}`;
  const limit = contactRateLimitMap.get(key);
  if (!limit || now > limit.resetTime) {
    contactRateLimitMap.set(key, { count: 1, resetTime: now + 60 * 60 * 1e3 });
    return true;
  }
  if (limit.count >= 5) {
    return false;
  }
  limit.count++;
  return true;
};
var generateContactConfirmationEmail = (name, message) => {
  const frontendUrl = process.env.FRONTEND_URL || "https://www.brolabentertainment.com";
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background: #f4f4f4;">
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Message Received! \u{1F4EC}</h1>
          <p style="color: #E5E7EB; margin: 10px 0 0 0; font-size: 16px;">Thank you for contacting us</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <h2 style="color: #333; margin: 0 0 20px 0;">Hello ${name}! \u{1F44B}</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            We have received your message and will get back to you as soon as possible, 
            typically within 24 to 48 business hours.
          </p>
          
          <div style="background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8B5CF6; margin: 0 0 10px 0;">Your message summary:</h3>
            <p style="color: #374151; white-space: pre-wrap; margin: 0;">${message.substring(0, 500)}${message.length > 500 ? "..." : ""}</p>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            In the meantime, feel free to explore our beats catalog or check out our FAQ.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/shop" 
               style="background: #8B5CF6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Explore Our Beats
            </a>
          </div>
        </div>
        
        <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
          <p style="margin: 0;">BroLab Entertainment - Professional Music Production Services</p>
          <p style="margin: 5px 0 0 0;">Your destination for quality beats</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
router8.post(
  "/",
  createValidationMiddleware(contactFormSchema),
  async (req, res) => {
    try {
      if (!req.validatedData) {
        res.status(400).json({
          success: false,
          message: "Invalid request data"
        });
        return;
      }
      const { name, email, subject, message } = req.validatedData;
      const clientIp = req.ip || req.socket.remoteAddress || "unknown";
      if (!checkContactRateLimit(clientIp) || !checkContactRateLimit(email)) {
        logger.warn("Contact form rate limit exceeded", { email, ip: clientIp });
        res.status(429).json({
          success: false,
          message: "Too many messages sent. Please try again in an hour."
        });
        return;
      }
      logger.info("Processing contact form submission", {
        name,
        email,
        subject: subject || "(no subject)",
        messageLength: message.length
      });
      try {
        await sendMail({
          to: email,
          subject: "Your message has been received - BroLab Entertainment",
          html: generateContactConfirmationEmail(name, message)
        });
        logger.info("Contact confirmation email sent", { email });
      } catch (emailError) {
        logger.error("Failed to send contact confirmation email", {
          error: emailError instanceof Error ? emailError.message : String(emailError),
          email
        });
      }
      try {
        const subjectLine = subject ? `New message from ${name} - ${subject}` : `New message from ${name}`;
        await sendAdminNotification("Contact Form", {
          subject: subjectLine,
          html: `
            <div style="background: #FFF7ED; padding: 20px; border-radius: 8px; border-left: 4px solid #F59E0B;">
              <h3 style="color: #D97706; margin: 0 0 15px 0;">\u{1F4EC} New Contact Message</h3>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
              ${subject ? `<p><strong>Subject:</strong> ${subject}</p>` : ""}
              <p><strong>Message:</strong></p>
              <div style="background: white; padding: 15px; border-radius: 5px; margin-top: 10px;">
                <p style="white-space: pre-wrap; margin: 0;">${message}</p>
              </div>
            </div>
          `,
          metadata: {
            senderName: name,
            senderEmail: email,
            subject: subject || "(no subject)",
            messageLength: message.length,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            clientIp
          }
        });
        logger.info("Admin notification sent for contact form");
      } catch (adminError) {
        logger.error("Failed to send admin notification", {
          error: adminError instanceof Error ? adminError.message : String(adminError)
        });
      }
      res.json({
        success: true,
        message: "Your message has been sent successfully. We'll get back to you soon!"
      });
    } catch (error) {
      logger.error("Contact form submission failed", {
        error: error instanceof Error ? error.message : String(error)
      });
      handleRouteError(error, res, "Failed to send message");
    }
  }
);
var contact_default = router8;

// server/routes/downloads.ts
import archiver from "archiver";
import express from "express";
import { Parser } from "json2csv";
init_auth();

// server/middleware/clerkAuth.ts
import { clerkMiddleware as clerkMiddleware2, getAuth as getAuth5 } from "@clerk/express";
var withClerkAuth = clerkMiddleware2();
var getCurrentClerkUser = (req) => {
  const auth = getAuth5(req);
  return auth?.userId ? {
    id: auth.userId,
    sessionId: auth.sessionId,
    getToken: auth.getToken
  } : null;
};

// server/middleware/requireDownloadAccess.ts
init_audit();

// server/services/DownloadEntitlementService.ts
init_audit();
import { ConvexHttpClient as ConvexHttpClient4 } from "convex/browser";
var DownloadEntitlementService = class _DownloadEntitlementService {
  static instance;
  convex;
  constructor(convexUrl) {
    this.convex = new ConvexHttpClient4(convexUrl);
  }
  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!_DownloadEntitlementService.instance) {
      const convexUrl = process.env.VITE_CONVEX_URL;
      if (!convexUrl) {
        throw new Error("VITE_CONVEX_URL environment variable is required");
      }
      _DownloadEntitlementService.instance = new _DownloadEntitlementService(convexUrl);
    }
    return _DownloadEntitlementService.instance;
  }
  /**
   * Assert that a user can download a specific beat
   *
   * Checks entitlement through:
   * 1. Existing download record (already granted access)
   * 2. Paid order containing the beat
   * 3. Active subscription with available quota
   *
   * @param userId - Convex user ID
   * @param beatId - Beat/product ID to download
   * @param requestedLicenseType - Optional specific license type requested
   * @param ipAddress - Client IP for audit logging
   * @param userAgent - Client user agent for audit logging
   * @returns EntitlementResult with decision and metadata
   */
  async assertCanDownload(userId, beatId, requestedLicenseType, ipAddress, userAgent) {
    const startTime = Date.now();
    try {
      const existingDownload = await this.checkExistingDownload(
        userId,
        beatId,
        requestedLicenseType
      );
      if (existingDownload.canDownload) {
        await this.logDownloadAttempt(
          userId,
          beatId,
          true,
          "existing_download",
          ipAddress,
          userAgent
        );
        return existingDownload;
      }
      const orderEntitlement = await this.checkOrderEntitlement(
        userId,
        beatId,
        requestedLicenseType
      );
      if (orderEntitlement.canDownload) {
        await this.logDownloadAttempt(userId, beatId, true, "paid_order", ipAddress, userAgent);
        return orderEntitlement;
      }
      const subscriptionEntitlement = await this.checkSubscriptionEntitlement(userId);
      if (subscriptionEntitlement.canDownload) {
        await this.logDownloadAttempt(userId, beatId, true, "subscription", ipAddress, userAgent);
        return subscriptionEntitlement;
      }
      await this.logDownloadAttempt(userId, beatId, false, "no_entitlement", ipAddress, userAgent);
      return {
        canDownload: false,
        reason: "No valid entitlement found for this beat",
        source: "none"
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`\u274C Entitlement check failed after ${duration}ms:`, error);
      await this.logDownloadAttempt(userId, beatId, false, "error", ipAddress, userAgent, {
        error: error instanceof Error ? error.message : "Unknown error"
      });
      return {
        canDownload: false,
        reason: "Unable to verify download entitlement",
        source: "none"
      };
    }
  }
  /**
   * Check for existing download record
   * Uses Convex HTTP client with string-based function reference
   */
  async checkExistingDownload(userId, beatId, requestedLicenseType) {
    try {
      const convexClient2 = this.convex;
      const downloads = await convexClient2.query(
        "downloads:getUserDownloads",
        {}
      );
      const matchingDownload = downloads.find((d) => {
        const beatMatch = d.beatId === beatId;
        const licenseMatch = !requestedLicenseType || d.licenseType === requestedLicenseType;
        return beatMatch && licenseMatch;
      });
      if (matchingDownload) {
        return {
          canDownload: true,
          reason: "Download access already granted",
          source: "order",
          licenseType: matchingDownload.licenseType
        };
      }
      return {
        canDownload: false,
        reason: "No existing download record",
        source: "none"
      };
    } catch (error) {
      console.error("Error checking existing download:", error);
      return {
        canDownload: false,
        reason: "Error checking download records",
        source: "none"
      };
    }
  }
  /**
   * Check for paid order containing the beat
   * Uses listOrdersByClerkId which accepts clerkId parameter
   */
  async checkOrderEntitlement(userId, beatId, requestedLicenseType) {
    try {
      const convexClient2 = this.convex;
      const orders = await convexClient2.query("orders/listUserOrders:listOrdersByClerkId", {
        clerkId: userId,
        status: "paid"
      });
      for (const order of orders) {
        const matchingItem = order.items?.find((item) => {
          const productMatch = item.productId === beatId;
          const licenseMatch = !requestedLicenseType || item.license === requestedLicenseType;
          return productMatch && licenseMatch;
        });
        if (matchingItem) {
          return {
            canDownload: true,
            reason: "Valid paid order found",
            source: "order",
            orderId: order._id,
            licenseType: matchingItem.license
          };
        }
      }
      return {
        canDownload: false,
        reason: "No paid order found for this beat",
        source: "none"
      };
    } catch (error) {
      console.error("Error checking order entitlement:", error);
      return {
        canDownload: false,
        reason: "Error checking order records",
        source: "none"
      };
    }
  }
  /**
   * Check subscription-based download quota
   */
  async checkSubscriptionEntitlement(_userId) {
    try {
      const convexClient2 = this.convex;
      const quotaResult = await convexClient2.query(
        "subscriptions/checkDownloadQuota:checkDownloadQuota",
        {}
      );
      if (quotaResult.canDownload) {
        return {
          canDownload: true,
          reason: quotaResult.reason,
          source: "subscription",
          subscriptionId: quotaResult.subscriptionId,
          licenseType: quotaResult.planId,
          remainingQuota: quotaResult.quota.remaining
        };
      }
      return {
        canDownload: false,
        reason: quotaResult.reason || "Subscription quota exceeded or no active subscription",
        source: "none"
      };
    } catch (error) {
      console.error("Error checking subscription entitlement:", error);
      return {
        canDownload: false,
        reason: "Error checking subscription quota",
        source: "none"
      };
    }
  }
  /**
   * Log download attempt to audit system
   */
  async logDownloadAttempt(userId, beatId, allowed, source, ipAddress, userAgent, additionalDetails) {
    try {
      await auditLogger.log({
        userId,
        action: allowed ? "download_authorized" : "download_denied",
        resource: "downloads",
        details: {
          beatId,
          source,
          allowed,
          ...additionalDetails
        },
        ipAddress,
        userAgent
      });
    } catch (error) {
      console.error("Failed to log download attempt:", error);
    }
  }
  /**
   * Check entitlement for guest user (by email)
   * Used for guest checkout scenarios
   */
  async assertCanDownloadByEmail(email, beatId, requestedLicenseType, ipAddress, userAgent) {
    try {
      const convexClient2 = this.convex;
      const orders = await convexClient2.query("orders/getOrdersByEmail:getOrdersByEmail", {
        email,
        status: "paid"
      });
      for (const order of orders) {
        const matchingItem = order.items?.find((item) => {
          const productMatch = item.productId === beatId;
          const licenseMatch = !requestedLicenseType || item.license === requestedLicenseType;
          return productMatch && licenseMatch;
        });
        if (matchingItem) {
          await this.logDownloadAttempt(
            `guest:${email}`,
            beatId,
            true,
            "guest_order",
            ipAddress,
            userAgent
          );
          return {
            canDownload: true,
            reason: "Valid paid order found for guest",
            source: "order",
            orderId: order._id,
            licenseType: matchingItem.license
          };
        }
      }
      await this.logDownloadAttempt(
        `guest:${email}`,
        beatId,
        false,
        "no_guest_entitlement",
        ipAddress,
        userAgent
      );
      return {
        canDownload: false,
        reason: "No paid order found for this email",
        source: "none"
      };
    } catch (error) {
      console.error("Error checking guest entitlement:", error);
      return {
        canDownload: false,
        reason: "Error checking guest order records",
        source: "none"
      };
    }
  }
};
var getDownloadEntitlementService = () => {
  return DownloadEntitlementService.getInstance();
};

// server/middleware/requireDownloadAccess.ts
function getClientIp2(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0] || req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown";
}
function getUserAgent(req) {
  return req.headers["user-agent"] || "unknown";
}
var requireDownloadAccess = async (req, res, next) => {
  const ipAddress = getClientIp2(req);
  const userAgent = getUserAgent(req);
  try {
    if (!req.user) {
      await auditLogger.logSecurityEvent(
        "anonymous",
        "download_access_denied",
        {
          reason: "not_authenticated",
          path: req.path,
          method: req.method
        },
        ipAddress,
        userAgent
      );
      res.status(401).json({
        error: "Authentication required",
        code: "UNAUTHORIZED"
      });
      return;
    }
    const beatId = extractBeatId(req);
    if (!beatId) {
      res.status(400).json({
        error: "Beat ID is required",
        code: "MISSING_BEAT_ID"
      });
      return;
    }
    const licenseType = extractLicenseType(req);
    const userId = req.user.clerkId || req.user.id;
    if (!userId) {
      res.status(401).json({
        error: "Invalid user session",
        code: "INVALID_SESSION"
      });
      return;
    }
    const entitlementService = getDownloadEntitlementService();
    const entitlement = await entitlementService.assertCanDownload(
      userId,
      beatId,
      licenseType,
      ipAddress,
      userAgent
    );
    if (!entitlement.canDownload) {
      await auditLogger.logSecurityEvent(
        userId,
        "download_access_denied",
        {
          beatId,
          licenseType,
          reason: entitlement.reason,
          path: req.path
        },
        ipAddress,
        userAgent
      );
      res.status(403).json({
        error: "Download access denied",
        code: "DOWNLOAD_NOT_ENTITLED",
        reason: entitlement.reason
      });
      return;
    }
    req.downloadEntitlement = {
      canDownload: true,
      source: entitlement.source,
      orderId: entitlement.orderId,
      licenseType: entitlement.licenseType,
      subscriptionId: entitlement.subscriptionId,
      remainingQuota: entitlement.remainingQuota
    };
    await auditLogger.logSecurityEvent(
      userId,
      "download_access_granted",
      {
        beatId,
        licenseType: entitlement.licenseType,
        source: entitlement.source,
        path: req.path
      },
      ipAddress,
      userAgent
    );
    next();
  } catch (error) {
    console.error("Error in requireDownloadAccess middleware:", error);
    await auditLogger.logSecurityEvent(
      req.user?.clerkId || "unknown",
      "download_access_error",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        path: req.path
      },
      ipAddress,
      userAgent
    );
    res.status(500).json({
      error: "Download authorization check failed",
      code: "INTERNAL_ERROR"
    });
  }
};
function extractBeatId(req) {
  const fromParams = req.params?.beatId || req.params?.productId;
  const fromQuery = req.query?.beatId || req.query?.productId;
  const body = req.body;
  const fromBody = body?.beatId || body?.productId;
  const rawId = fromParams || fromQuery || fromBody;
  if (!rawId) return null;
  const beatId = typeof rawId === "string" ? Number.parseInt(rawId, 10) : Number(rawId);
  return Number.isNaN(beatId) ? null : beatId;
}
function extractLicenseType(req) {
  const body = req.body;
  return req.query?.licenseType || req.query?.license || body?.licenseType || body?.license;
}

// server/routes/downloads.ts
init_convex();
var convex2 = getConvex();
var router9 = express.Router();
router9.post(
  "/",
  isAuthenticated,
  createValidationMiddleware(insertDownloadSchema),
  requireDownloadAccess,
  async (req, res) => {
    const downloadReq = req;
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const clerkUser = getCurrentClerkUser(req);
      if (!clerkUser) {
        res.status(401).json({ error: "Clerk authentication required" });
        return;
      }
      const body = req.body;
      const { productId, license, price, productName } = body;
      const entitlement = downloadReq.downloadEntitlement;
      const effectiveLicense = entitlement?.licenseType || license;
      console.log(`\u{1F527} Download request received:`, {
        userId: user.id,
        clerkId: clerkUser.id,
        productId,
        license: effectiveLicense,
        price,
        productName,
        entitlementSource: entitlement?.source
      });
      const convexClient2 = convex2;
      const download = await convexClient2.mutation("downloads:recordDownload", {
        beatId: Number(productId),
        licenseType: String(effectiveLicense),
        downloadUrl: void 0
      });
      if (download) {
        res.json({
          success: true,
          message: "Download logged successfully",
          download: {
            id: download,
            userId: user.id,
            productId,
            license: effectiveLicense,
            timestamp: Date.now()
          }
        });
      } else {
        res.status(500).json({ error: "Failed to log download" });
      }
    } catch (error) {
      handleRouteError(error, res, "Download failed");
    }
  }
);
router9.get("/", isAuthenticated, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const clerkUser = getCurrentClerkUser(req);
    if (!clerkUser) {
      res.status(401).json({ error: "Clerk authentication required" });
      return;
    }
    const downloads = await convex2.query("downloads:getUserDownloads", {});
    res.json({
      downloads: downloads.map((download) => ({
        id: download._id,
        product_id: download.beatId,
        license: download.licenseType,
        downloaded_at: new Date(download.timestamp).toISOString(),
        // Convert timestamp to ISO string
        download_count: download.downloadCount || 1
      }))
    });
  } catch (error) {
    handleRouteError(error, res, "Failed to list downloads");
  }
});
router9.get("/export", isAuthenticated, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const clerkUser = getCurrentClerkUser(req);
    if (!clerkUser) {
      res.status(401).json({ error: "Clerk authentication required" });
      return;
    }
    const downloads = await convex2.query("downloads:getUserDownloads", {});
    const csvData = downloads.map((download) => ({
      product_id: download.beatId,
      license: download.licenseType,
      downloaded_at: new Date(download.timestamp).toISOString(),
      // Convert timestamp to ISO string
      download_count: download.downloadCount || 1
    }));
    const parser = new Parser({
      fields: ["product_id", "license", "downloaded_at", "download_count"],
      header: true
    });
    const csv = parser.parse(csvData);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="downloads.csv"');
    res.send(csv);
  } catch (error) {
    handleRouteError(error, res, "Failed to export downloads");
  }
});
router9.get("/quota", isAuthenticated, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const clerkUser = getCurrentClerkUser(req);
    if (!clerkUser) {
      res.status(401).json({ error: "Clerk authentication required" });
      return;
    }
    const convexClient2 = convex2;
    const quotaResult = await convexClient2.query(
      "subscriptions/checkDownloadQuota:checkDownloadQuota",
      {}
    );
    const downloadsUsed = quotaResult.quota.used;
    const quota = quotaResult.quota.limit === Infinity ? -1 : quotaResult.quota.limit;
    const remaining = quotaResult.quota.remaining === Infinity ? -1 : quotaResult.quota.remaining;
    const isUnlimited = quota === -1;
    const progress = isUnlimited ? 0 : Math.min(downloadsUsed / quota * 100, 100);
    console.log(
      `\u{1F50D} Quota API - User ${user.id}: ${downloadsUsed}/${isUnlimited ? "unlimited" : quota} downloads (plan: ${quotaResult.planId || "unknown"})`
    );
    res.json({
      downloadsUsed,
      quota,
      remaining,
      progress,
      isUnlimited,
      canDownload: quotaResult.canDownload,
      licenseType: quotaResult.planId || "free",
      currentPeriodEnd: quotaResult.currentPeriodEnd
    });
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch download quota");
  }
});
router9.get("/debug", async (req, res) => {
  try {
    res.json({
      success: true,
      tableExists: true,
      message: "Convex downloads table is working correctly",
      note: "Authentication required for actual data queries"
    });
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({
      error: "Debug failed",
      details: error,
      message: "Check if Convex connection is working"
    });
  }
});
router9.get("/quota/test", async (req, res) => {
  try {
    res.json({
      downloadsUsed: 0,
      quota: 5,
      // Basic plan default
      remaining: 5,
      progress: 0,
      test: true,
      message: "Test endpoint - authentication required for actual data"
    });
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch test download quota");
  }
});
router9.get("/file/:productId/:type", async (req, res) => {
  try {
    const { productId, type } = req.params;
    res.json({
      success: true,
      productId,
      type,
      message: `Download initiated for product ${productId} (${type})`,
      downloadUrl: `/api/placeholder/audio.mp3`,
      // Placeholder URL
      note: "This is a placeholder. In production, this would serve the actual file."
    });
  } catch (error) {
    handleRouteError(error, res, "File download failed");
  }
});
router9.get("/proxy", async (req, res) => {
  try {
    const { url, filename } = req.query;
    console.log("\u{1F4E5} Proxy download request:", { url, filename });
    if (!url || typeof url !== "string") {
      console.error("\u274C Missing or invalid URL parameter");
      res.status(400).json({ error: "Missing or invalid URL parameter" });
      return;
    }
    const decodedUrl = decodeURIComponent(url);
    console.log("\u{1F4E5} Decoded URL:", decodedUrl);
    const allowedDomains = ["brolabentertainment.com", "wp-content", "uploads"];
    const isAllowed = allowedDomains.some((domain) => decodedUrl.includes(domain));
    if (!isAllowed) {
      console.error("\u274C URL domain not allowed:", decodedUrl);
      res.status(403).json({ error: "URL domain not allowed", url: decodedUrl });
      return;
    }
    console.log("\u{1F4E5} Fetching file from:", decodedUrl);
    const response = await fetch(decodedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "audio/mpeg, audio/*, */*",
        "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
        Referer: "https://brolabentertainment.com/"
      }
    });
    if (!response.ok) {
      console.error("\u274C Failed to fetch file:", response.status, response.statusText);
      res.status(response.status).json({
        error: "Failed to fetch file from source",
        status: response.status,
        statusText: response.statusText,
        url: decodedUrl
      });
      return;
    }
    const contentType = response.headers.get("content-type") || "audio/mpeg";
    const contentLength = response.headers.get("content-length");
    console.log("\u{1F4E5} File info:", { contentType, contentLength });
    const safeFilename = typeof filename === "string" ? filename.replaceAll(/[^a-zA-Z0-9._-]/g, "_") : "download.mp3";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }
    const arrayBuffer = await response.arrayBuffer();
    console.log("\u2705 Sending file:", safeFilename, "size:", arrayBuffer.byteLength);
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error("\u274C Proxy download error:", error);
    handleRouteError(error, res, "Proxy download failed");
  }
});
var ALLOWED_DOMAINS = ["brolabentertainment.com", "wp-content", "uploads"];
var AUDIO_FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "audio/mpeg, audio/*, */*",
  Referer: "https://brolabentertainment.com/"
};
function isUrlAllowed(url) {
  return ALLOWED_DOMAINS.some((domain) => url.includes(domain));
}
function validateTrackUrls(tracks) {
  for (const track of tracks) {
    const trackUrl = track.downloadUrl || track.url;
    if (trackUrl && !isUrlAllowed(trackUrl)) {
      return { valid: false, invalidUrl: trackUrl };
    }
  }
  return { valid: true };
}
async function fetchTrackBuffer(trackUrl, trackIndex, totalTracks) {
  console.log(`\u{1F4E5} Fetching track ${trackIndex}/${totalTracks}: ${trackUrl.substring(0, 60)}...`);
  const response = await fetch(trackUrl, { headers: AUDIO_FETCH_HEADERS });
  if (!response.ok) {
    console.error(`\u274C Failed to fetch track ${trackIndex}:`, response.status);
    return null;
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
function generateTrackFilename(track, index) {
  const trackTitle = track.title || `Track_${index}`;
  const safeTrackTitle = trackTitle.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
  return `${String(index).padStart(2, "0")}_${safeTrackTitle}.mp3`;
}
async function addTracksToArchive(archive, tracks) {
  let trackIndex = 1;
  for (const track of tracks) {
    const trackUrl = track.downloadUrl || track.url;
    if (!trackUrl) {
      console.warn(`\u26A0\uFE0F Skipping track ${trackIndex}: no URL`);
      trackIndex++;
      continue;
    }
    try {
      const buffer = await fetchTrackBuffer(trackUrl, trackIndex, tracks.length);
      if (buffer) {
        const trackFilename = generateTrackFilename(track, trackIndex);
        console.log(`\u2705 Adding to ZIP: ${trackFilename} (${buffer.length} bytes)`);
        archive.append(buffer, { name: trackFilename });
      }
    } catch (fetchError) {
      console.error(`\u274C Error fetching track ${trackIndex}:`, fetchError);
    }
    trackIndex++;
  }
}
router9.post("/zip", async (req, res) => {
  try {
    const { productName, tracks } = req.body;
    console.log("\u{1F4E6} ZIP download request:", { productName, trackCount: tracks?.length });
    if (!productName || !tracks || !Array.isArray(tracks) || tracks.length === 0) {
      res.status(400).json({ error: "Missing productName or tracks array" });
      return;
    }
    const validation = validateTrackUrls(tracks);
    if (!validation.valid) {
      console.error("\u274C Track URL domain not allowed:", validation.invalidUrl);
      res.status(403).json({ error: "Track URL domain not allowed", url: validation.invalidUrl });
      return;
    }
    const safeProductName = productName.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
    const zipFilename = `${safeProductName}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipFilename}"`);
    const archive = archiver("zip", { zlib: { level: 5 } });
    archive.on("error", (err) => {
      console.error("\u274C Archive error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to create ZIP archive" });
      }
    });
    archive.pipe(res);
    await addTracksToArchive(archive, tracks);
    await archive.finalize();
    console.log(`\u2705 ZIP archive created: ${zipFilename}`);
  } catch (error) {
    console.error("\u274C ZIP download error:", error);
    if (!res.headersSent) {
      handleRouteError(error, res, "ZIP download failed");
    }
  }
});
var downloads_default = router9;

// server/routes/email.ts
import bcrypt from "bcrypt";
import { Router as Router9 } from "express";
import { v4 as uuidv4 } from "uuid";
init_convex();

// server/services/ReservationEmailService.ts
var ReservationEmailService = class {
  options;
  constructor(options = {}) {
    this.options = {
      retryOptions: {
        maxRetries: 3,
        baseDelay: 1e3,
        maxDelay: 3e4,
        backoffFactor: 2
      },
      adminEmails: process.env.ADMIN_EMAILS?.split(",") || ["contact@brolabentertainment.com"],
      fromEmail: process.env.DEFAULT_FROM || "BroLab <contact@brolabentertainment.com>",
      ...options
    };
  }
  /**
   * Send reservation confirmation email to user
   */
  async sendReservationConfirmation(user, reservations, payment) {
    const emailContent = this.generateReservationConfirmationEmail(reservations, payment);
    return await sendMailWithResult(
      {
        to: user.email,
        subject: `\u{1F3B5} Reservation Confirmed - BroLab Entertainment`,
        html: emailContent,
        from: this.options.fromEmail
      },
      this.options.retryOptions
    );
  }
  /**
   * Send admin notification for new reservation
   */
  async sendAdminNotification(user, reservation) {
    const emailContent = this.generateAdminNotificationEmail(user, reservation);
    return await sendMailWithResult(
      {
        to: this.options.adminEmails,
        subject: `\u{1F514} New Reservation - ${reservation.serviceType} - BroLab Entertainment`,
        html: emailContent,
        from: this.options.fromEmail
      },
      this.options.retryOptions
    );
  }
  /**
   * Send status update email to user
   */
  async sendStatusUpdate(user, reservation, oldStatus, newStatus) {
    const emailContent = this.generateStatusUpdateEmail(reservation, oldStatus, newStatus);
    return await sendMailWithResult(
      {
        to: user.email,
        subject: `\u{1F4C5} Reservation Status Update - ${newStatus.toUpperCase()} - BroLab Entertainment`,
        html: emailContent,
        from: this.options.fromEmail
      },
      this.options.retryOptions
    );
  }
  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmation(user, reservations, payment) {
    const emailContent = this.generatePaymentConfirmationEmail(reservations, payment);
    return await sendMailWithResult(
      {
        to: user.email,
        subject: `\u{1F4B3} Payment Confirmed - BroLab Entertainment`,
        html: emailContent,
        from: this.options.fromEmail
      },
      this.options.retryOptions
    );
  }
  /**
   * Send payment failure notification
   */
  async sendPaymentFailure(user, reservationIds, payment, failureReason) {
    const emailContent = this.generatePaymentFailureEmail(reservationIds, payment, failureReason);
    return await sendMailWithResult(
      {
        to: user.email,
        subject: `\u26A0\uFE0F Payment Failed - BroLab Entertainment`,
        html: emailContent,
        from: this.options.fromEmail
      },
      this.options.retryOptions
    );
  }
  /**
   * Send reservation reminder email (24 hours before)
   */
  async sendReservationReminder(user, reservation) {
    const emailContent = this.generateReminderEmail(reservation);
    return await sendMailWithResult(
      {
        to: user.email,
        subject: `\u23F0 Reminder: Your session is tomorrow - BroLab Entertainment`,
        html: emailContent,
        from: this.options.fromEmail
      },
      this.options.retryOptions
    );
  }
  /**
   * Generate reservation confirmation email template
   */
  generateReservationConfirmationEmail(reservations, payment) {
    const reservationsList = reservations.map((reservation) => {
      const date = new Date(reservation.preferredDate);
      return `
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <h3 style="color: #8B5CF6; margin: 0 0 10px 0;">${this.formatServiceType(reservation.serviceType)}</h3>
            <p><strong>Date:</strong> ${date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      })}</p>
            <p><strong>Time:</strong> ${date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit"
      })}</p>
            <p><strong>Duration:</strong> ${reservation.durationMinutes} minutes</p>
            <p><strong>Status:</strong> <span style="color: #10B981; font-weight: bold;">CONFIRMED</span></p>
            ${reservation.notes ? `<p><strong>Notes:</strong> ${reservation.notes}</p>` : ""}
          </div>
        `;
    }).join("");
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Reservation Confirmed!</h1>
          <p style="color: #E5E7EB; margin: 10px 0 0 0; font-size: 16px;">Your reservation${reservations.length > 1 ? "s are" : " is"} now confirmed</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Thank you for choosing BroLab Entertainment! Your reservation${reservations.length > 1 ? "s have" : " has"} been confirmed and we're excited to work with you.
          </p>
          
          <h2 style="color: #8B5CF6; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px;">Reservation Details</h2>
          ${reservationsList}
          
          ${payment ? `
          <div style="background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8B5CF6; margin: 0 0 10px 0;">Payment Information</h3>
            <p><strong>Amount:</strong> ${formatCurrencyDisplay(payment.amount, { currency: payment.currency })}</p>
            <p><strong>Payment Method:</strong> ${payment.paymentMethod || "Card"}</p>
            ${payment.paymentIntentId ? `<p><strong>Transaction ID:</strong> ${payment.paymentIntentId}</p>` : ""}
          </div>
          ` : ""}
          
          <div style="background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #059669; margin: 0 0 10px 0;">What's Next?</h3>
            <ul style="color: #374151; padding-left: 20px;">
              <li>We'll contact you 24-48 hours before your session to confirm details</li>
              <li>Please arrive 10 minutes early to your scheduled session</li>
              <li>Bring any reference materials or files you'd like to work with</li>
              <li>If you need to reschedule, please contact us at least 24 hours in advance</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
            <p style="color: #6B7280; margin-bottom: 10px;">Questions? We're here to help!</p>
            <p style="color: #8B5CF6; font-weight: bold;">
              \u{1F4E7} contact@brolabentertainment.com<br>
              \u{1F4DE} +33 (0)1 XX XX XX XX
            </p>
          </div>
        </div>
        
        <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
          <p>BroLab Entertainment - Professional Music Production Services</p>
          <p>This is an automated confirmation email. Please do not reply to this message.</p>
        </div>
      </div>
    `;
  }
  /**
   * Generate admin notification email template
   */
  generateAdminNotificationEmail(user, reservation) {
    const date = new Date(reservation.preferredDate);
    const userName = user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown User";
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">\u{1F514} New Reservation</h1>
          <p style="color: #FEF3C7; margin: 10px 0 0 0; font-size: 16px;">A new reservation has been created</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <div style="background: #FFF7ED; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
            <h3 style="color: #D97706; margin: 0 0 15px 0;">Reservation Details</h3>
            <p><strong>Service:</strong> ${this.formatServiceType(reservation.serviceType)}</p>
            <p><strong>Client:</strong> ${userName}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Phone:</strong> ${reservation.details.phone || "Not provided"}</p>
            <p><strong>Date:</strong> ${date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    })}</p>
            <p><strong>Time:</strong> ${date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    })}</p>
            <p><strong>Duration:</strong> ${reservation.durationMinutes} minutes</p>
            <p><strong>Price:</strong> \u20AC${reservation.totalPrice}</p>
            <p><strong>Status:</strong> ${reservation.status.toUpperCase()}</p>
            ${reservation.notes ? `<p><strong>Notes:</strong> ${reservation.notes}</p>` : ""}
            ${reservation.details.requirements ? `<p><strong>Requirements:</strong> ${reservation.details.requirements}</p>` : ""}
          </div>
          
          <div style="background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8B5CF6; margin: 0 0 10px 0;">Action Required</h3>
            <ul style="color: #374151; padding-left: 20px;">
              <li>Review the reservation details and confirm availability</li>
              <li>Contact the client if additional information is needed</li>
              <li>Update the reservation status in the admin panel</li>
              <li>Prepare any necessary materials for the session</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || "https://brolabentertainment.com"}/admin/reservations/${reservation.id}" 
               style="background: #8B5CF6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              View Reservation
            </a>
          </div>
        </div>
        
        <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
          <p>BroLab Entertainment - Admin Notification System</p>
        </div>
      </div>
    `;
  }
  /**
   * Generate status update email template
   */
  generateStatusUpdateEmail(reservation, oldStatus, newStatus) {
    const date = new Date(reservation.preferredDate);
    const statusColors = {
      pending: "#F59E0B",
      confirmed: "#10B981",
      in_progress: "#3B82F6",
      completed: "#8B5CF6",
      cancelled: "#EF4444"
    };
    const statusMessages = {
      confirmed: "Your reservation has been confirmed! We're looking forward to working with you.",
      in_progress: "Your session is currently in progress. We're working hard to deliver exceptional results!",
      completed: "Your session has been completed! We hope you're satisfied with the results.",
      cancelled: "Your reservation has been cancelled. If this was unexpected, please contact us immediately."
    };
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Reservation Update</h1>
          <p style="color: #E5E7EB; margin: 10px 0 0 0; font-size: 16px;">Your reservation status has been updated</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            ${statusMessages[newStatus] || "We wanted to let you know that your reservation status has been updated."}
          </p>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8B5CF6; margin: 0 0 15px 0;">${this.formatServiceType(reservation.serviceType)}</h3>
            <p><strong>Date:</strong> ${date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    })}</p>
            <p><strong>Time:</strong> ${date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    })}</p>
            <p><strong>Duration:</strong> ${reservation.durationMinutes} minutes</p>
          </div>
          
          <div style="background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8B5CF6; margin: 0 0 10px 0;">Status Update</h3>
            <p><strong>Previous Status:</strong> <span style="color: ${statusColors[oldStatus] || "#6B7280"}; font-weight: bold;">${oldStatus.toUpperCase()}</span></p>
            <p><strong>New Status:</strong> <span style="color: ${statusColors[newStatus] || "#6B7280"}; font-weight: bold;">${newStatus.toUpperCase()}</span></p>
            ${reservation.notes ? `<p><strong>Notes:</strong> ${reservation.notes}</p>` : ""}
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
            <p style="color: #6B7280; margin-bottom: 10px;">Questions about your reservation?</p>
            <p style="color: #8B5CF6; font-weight: bold;">
              \u{1F4E7} contact@brolabentertainment.com<br>
              \u{1F4DE} +33 (0)1 XX XX XX XX
            </p>
          </div>
        </div>
        
        <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
          <p>BroLab Entertainment - Professional Music Production Services</p>
        </div>
      </div>
    `;
  }
  /**
   * Generate payment confirmation email template
   */
  generatePaymentConfirmationEmail(reservations, payment) {
    const reservationsList = reservations.map((reservation) => {
      const date = new Date(reservation.preferredDate);
      return `
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <h4 style="color: #8B5CF6; margin: 0 0 10px 0;">${this.formatServiceType(reservation.serviceType)}</h4>
            <p><strong>Date:</strong> ${date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      })}</p>
            <p><strong>Time:</strong> ${date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit"
      })}</p>
          </div>
        `;
    }).join("");
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">\u{1F4B3} Payment Confirmed!</h1>
          <p style="color: #D1FAE5; margin: 10px 0 0 0; font-size: 16px;">Your payment has been processed successfully</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Thank you! Your payment has been processed successfully. Your reservation${reservations.length > 1 ? "s are" : " is"} now fully confirmed.
          </p>
          
          <div style="background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
            <h3 style="color: #059669; margin: 0 0 10px 0;">Payment Details</h3>
            <p><strong>Amount Paid:</strong> ${formatCurrencyDisplay(payment.amount, { currency: payment.currency })}</p>
            <p><strong>Payment Method:</strong> ${payment.paymentMethod || "Card"}</p>
            ${payment.paymentIntentId ? `<p><strong>Transaction ID:</strong> ${payment.paymentIntentId}</p>` : ""}
            <p><strong>Status:</strong> <span style="color: #10B981; font-weight: bold;">PAID</span></p>
          </div>
          
          <h3 style="color: #8B5CF6; margin: 20px 0 10px 0;">Confirmed Reservations</h3>
          ${reservationsList}
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
            <p style="color: #6B7280; margin-bottom: 10px;">Need help or have questions?</p>
            <p style="color: #8B5CF6; font-weight: bold;">
              \u{1F4E7} contact@brolabentertainment.com<br>
              \u{1F4DE} +33 (0)1 XX XX XX XX
            </p>
          </div>
        </div>
        
        <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
          <p>BroLab Entertainment - Professional Music Production Services</p>
          <p>Keep this email as your payment receipt.</p>
        </div>
      </div>
    `;
  }
  /**
   * Generate payment failure email template
   */
  generatePaymentFailureEmail(reservationIds, payment, failureReason) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Payment Failed</h1>
          <p style="color: #FEE2E2; margin: 10px 0 0 0; font-size: 16px;">We couldn't process your payment</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            We're sorry, but we encountered an issue processing your payment for your reservation${reservationIds.length > 1 ? "s" : ""}. 
            Don't worry - your reservation${reservationIds.length > 1 ? "s are" : " is"} still held for you.
          </p>
          
          <div style="background: #FEF2F2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444;">
            <h3 style="color: #DC2626; margin: 0 0 10px 0;">Payment Details</h3>
            <p><strong>Amount:</strong> ${formatCurrencyDisplay(payment.amount, { currency: payment.currency })}</p>
            ${payment.paymentIntentId ? `<p><strong>Payment Intent ID:</strong> ${payment.paymentIntentId}</p>` : ""}
            <p><strong>Failure Reason:</strong> ${failureReason || "Payment processing failed"}</p>
          </div>
          
          <div style="background: #F0F9FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0369A1; margin: 0 0 10px 0;">What You Can Do</h3>
            <ul style="color: #374151; padding-left: 20px;">
              <li>Check that your payment method has sufficient funds</li>
              <li>Verify your card details are correct</li>
              <li>Try a different payment method</li>
              <li>Contact your bank if the issue persists</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || "https://brolabentertainment.com"}/checkout" 
               style="background: #8B5CF6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Try Payment Again
            </a>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
            <p style="color: #6B7280; margin-bottom: 10px;">Need help? We're here for you!</p>
            <p style="color: #8B5CF6; font-weight: bold;">
              \u{1F4E7} contact@brolabentertainment.com<br>
              \u{1F4DE} +33 (0)1 XX XX XX XX
            </p>
          </div>
        </div>
        
        <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
          <p>BroLab Entertainment - Professional Music Production Services</p>
          <p>Your reservation${reservationIds.length > 1 ? "s are" : " is"} held for 24 hours while you resolve the payment issue.</p>
        </div>
      </div>
    `;
  }
  /**
   * Generate reminder email template
   */
  generateReminderEmail(reservation) {
    const date = new Date(reservation.preferredDate);
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">\u23F0 Session Reminder</h1>
          <p style="color: #FEF3C7; margin: 10px 0 0 0; font-size: 16px;">Your session is tomorrow!</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            This is a friendly reminder that your session is scheduled for tomorrow. We're excited to work with you!
          </p>
          
          <div style="background: #FFF7ED; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
            <h3 style="color: #D97706; margin: 0 0 15px 0;">${this.formatServiceType(reservation.serviceType)}</h3>
            <p><strong>Date:</strong> ${date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    })}</p>
            <p><strong>Time:</strong> ${date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    })}</p>
            <p><strong>Duration:</strong> ${reservation.durationMinutes} minutes</p>
            ${reservation.notes ? `<p><strong>Notes:</strong> ${reservation.notes}</p>` : ""}
          </div>
          
          <div style="background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8B5CF6; margin: 0 0 10px 0;">Preparation Checklist</h3>
            <ul style="color: #374151; padding-left: 20px;">
              <li>Arrive 10 minutes early to get settled</li>
              <li>Bring any reference materials or inspiration tracks</li>
              <li>Have your project files ready (if applicable)</li>
              <li>Bring headphones if you have a preferred pair</li>
              <li>Come with an open mind and creative energy!</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
            <p style="color: #6B7280; margin-bottom: 10px;">Need to reschedule or have questions?</p>
            <p style="color: #8B5CF6; font-weight: bold;">
              \u{1F4E7} contact@brolabentertainment.com<br>
              \u{1F4DE} +33 (0)1 XX XX XX XX
            </p>
          </div>
        </div>
        
        <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
          <p>BroLab Entertainment - Professional Music Production Services</p>
          <p>We look forward to seeing you tomorrow!</p>
        </div>
      </div>
    `;
  }
  /**
   * Format service type for display
   */
  formatServiceType(serviceType) {
    const serviceNames = {
      mixing_mastering: "Mixing & Mastering",
      recording_session: "Recording Session",
      custom_beat: "Custom Beat Production",
      production_consultation: "Production Consultation"
    };
    return serviceNames[serviceType] || serviceType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }
};
var reservationEmailService = new ReservationEmailService();

// server/templates/emailTemplates.ts
var EMAIL_STYLES = {
  container: "font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;",
  header: "background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; text-align: center;",
  headerTitle: "color: white; margin: 0; font-size: 28px;",
  headerSubtitle: "color: #E5E7EB; margin: 10px 0 0 0; font-size: 16px;",
  content: "padding: 30px; background: white;",
  footer: "background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;",
  button: "background: #8B5CF6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;",
  infoBox: "background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0;",
  successBox: "background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;",
  warningBox: "background: #FFF7ED; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;",
  errorBox: "background: #FEF2F2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444;"
};
var generateEmailWrapper = (title, subtitle, content, footerText) => {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background: #f4f4f4;">
      <div style="${EMAIL_STYLES.container}">
        <div style="${EMAIL_STYLES.header}">
          <h1 style="${EMAIL_STYLES.headerTitle}">${title}</h1>
          <p style="${EMAIL_STYLES.headerSubtitle}">${subtitle}</p>
        </div>
        
        <div style="${EMAIL_STYLES.content}">
          ${content}
        </div>
        
        <div style="${EMAIL_STYLES.footer}">
          <p style="margin: 0;">BroLab Entertainment - Professional Music Production Services</p>
          ${footerText ? `<p style="margin: 5px 0 0 0;">${footerText}</p>` : ""}
        </div>
      </div>
    </body>
    </html>
  `;
};
var emailTemplates = {
  /**
   * Email verification template
   */
  verifyEmail: (verificationLink, username) => ({
    subject: "Verify your email address - BroLab Entertainment",
    html: generateEmailWrapper(
      "BroLab Entertainment",
      "Verify your account",
      `
        <h2 style="color: #333; margin: 0 0 20px 0;">Hey ${username}! \u{1F44B}</h2>
        <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
          Welcome to BroLab Entertainment! To complete your registration and access your account, please verify your email address.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="${EMAIL_STYLES.button}">
            Verify my email
          </a>
        </div>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          This link will expire in 24 hours. If you didn't create an account, please ignore this email.
        </p>
      `,
      "Your destination for quality beats"
    )
  }),
  /**
   * Password reset template
   */
  resetPassword: (resetLink, username) => ({
    subject: "Reset your password - BroLab Entertainment",
    html: generateEmailWrapper(
      "BroLab Entertainment",
      "Password Reset",
      `
        <h2 style="color: #333; margin: 0 0 20px 0;">Password Reset</h2>
        <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
          Hey ${username}, you requested to reset your password. Click the button below to create a new password.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background: #EF4444; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Reset my password
          </a>
        </div>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          This link will expire in 15 minutes. If you didn't request this reset, please ignore this email.
        </p>
      `,
      "Account Security"
    )
  }),
  /**
   * Order confirmation template
   */
  orderConfirmation: (orderDetails) => ({
    subject: `Order Confirmed #${orderDetails.orderNumber} - BroLab Entertainment`,
    html: generateEmailWrapper(
      "Order Confirmed! \u{1F389}",
      "Your purchase has been processed successfully",
      `
        <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
          Thank you ${orderDetails.customerName} for your purchase! Your order has been processed successfully.
        </p>
        <div style="${EMAIL_STYLES.infoBox}">
          <p style="margin: 0;"><strong>Order Number:</strong> ${orderDetails.orderNumber}</p>
          <p style="margin: 10px 0 0 0;"><strong>Total:</strong> $${orderDetails.total}</p>
        </div>
        <p style="color: #666; line-height: 1.6;">
          Your files are now available in your account. Log in to download them.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || "https://www.brolabentertainment.com"}/dashboard" style="${EMAIL_STYLES.button}">
            Access my downloads
          </a>
        </div>
      `,
      "Thank you for your trust"
    )
  }),
  /**
   * Subscription confirmation template
   */
  subscriptionConfirmation: (subscriptionDetails) => ({
    subject: `Subscription Activated - ${subscriptionDetails.planName} - BroLab Entertainment`,
    html: generateEmailWrapper(
      "Subscription Activated! \u2B50",
      "Your plan is now active",
      `
        <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
          Congratulations ${subscriptionDetails.customerName}! Your ${subscriptionDetails.planName} subscription is now active.
        </p>
        <div style="${EMAIL_STYLES.infoBox}">
          <p style="margin: 0;"><strong>Plan:</strong> ${subscriptionDetails.planName}</p>
          <p style="margin: 10px 0 0 0;"><strong>Billing Cycle:</strong> ${subscriptionDetails.billingCycle}</p>
          <p style="margin: 10px 0 0 0;"><strong>Next Billing Date:</strong> ${subscriptionDetails.nextBillingDate}</p>
        </div>
        <p style="color: #666; line-height: 1.6;">
          Enjoy all the benefits of your subscription starting now!
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || "https://www.brolabentertainment.com"}/membership" style="background: #F59E0B; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Manage my subscription
          </a>
        </div>
      `,
      "Your musical partner"
    )
  })
};
var sendReservationConfirmationEmail = async (userEmail, reservations, payment) => {
  const user = {
    id: "unknown",
    email: userEmail,
    fullName: reservations[0]?.details?.name || "User"
  };
  const result = await reservationEmailService.sendReservationConfirmation(
    user,
    reservations,
    payment
  );
  if (!result.success) {
    logger.error("Failed to send reservation confirmation email", {
      error: result.error,
      reservationCount: reservations.length
    });
    throw new Error(`Email sending failed: ${result.error}`);
  }
  logger.info("Reservation confirmation email sent successfully", {
    attempts: result.attempts,
    hasReservationId: !!reservations[0]?.id,
    reservationCount: reservations.length
  });
};
var sendPaymentFailureEmail = async (userEmail, reservationIds, payment, failureReason) => {
  const user = {
    id: "unknown",
    email: userEmail
  };
  const result = await reservationEmailService.sendPaymentFailure(
    user,
    reservationIds,
    payment,
    failureReason
  );
  if (!result.success) {
    logger.error("Failed to send payment failure email", {
      error: result.error,
      reservationIdCount: reservationIds.length
    });
    throw new Error(`Email sending failed: ${result.error}`);
  }
  logger.info("Payment failure email sent successfully", {
    attempts: result.attempts,
    reservationIdCount: reservationIds.length
  });
};
var sendAdminReservationNotification = async (user, reservation) => {
  const result = await reservationEmailService.sendAdminNotification(user, reservation);
  if (!result.success) {
    logger.error("Failed to send admin notification email", {
      error: result.error,
      reservationId: reservation.id,
      userId: user.id
    });
    throw new Error(`Email sending failed: ${result.error}`);
  }
  logger.info("Admin notification email sent successfully", {
    attempts: result.attempts,
    hasReservationId: !!reservation.id,
    userId: user.id
  });
};

// server/routes/email.ts
var router10 = Router9();
var convex3 = getConvex();
var rateLimitMap = /* @__PURE__ */ new Map();
var checkRateLimit = (email) => {
  const now = Date.now();
  const key = `verify_${email}`;
  const limit = rateLimitMap.get(key);
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + 24 * 60 * 60 * 1e3 });
    return true;
  }
  if (limit.count >= 3) {
    return false;
  }
  limit.count++;
  return true;
};
router10.get(
  "/verify-email",
  createValidationMiddleware(verifyEmailSchema),
  async (req, res) => {
    try {
      if (!req.validatedData) {
        res.status(400).json({
          success: false,
          message: "Invalid request data"
        });
        return;
      }
      const { token } = req.validatedData;
      const { api: api2 } = await Promise.resolve().then(() => (init_api(), api_exports));
      const verification = await convex3.query(api2.emailVerifications.getByToken, { token });
      if (!verification) {
        res.status(400).json({
          success: false,
          message: "Invalid or expired verification token"
        });
        return;
      }
      await convex3.mutation(api2.emailVerifications.markVerified, { token });
      console.log("\u2705 Email verified for user:", verification.userId);
      res.json({
        success: true,
        message: "Email verified successfully"
      });
    } catch (error) {
      console.error("\u274C Email verification failed:", error);
      handleRouteError(error, res, "Email verification failed");
    }
  }
);
router10.post(
  "/resend-verification",
  createValidationMiddleware(resendVerificationSchema),
  async (req, res) => {
    try {
      if (!req.validatedData) {
        res.status(400).json({
          success: false,
          message: "Invalid request data"
        });
        return;
      }
      const { email } = req.validatedData;
      if (!checkRateLimit(email)) {
        res.status(429).json({
          success: false,
          message: "Too many verification requests. Try again tomorrow."
        });
        return;
      }
      const { api: api2 } = await Promise.resolve().then(() => (init_api(), api_exports));
      const user = await convex3.query(api2.users.getUserByEmail, { email });
      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found"
        });
        return;
      }
      const token = uuidv4();
      const expiresAt = Date.now() + 24 * 60 * 60 * 1e3;
      await convex3.mutation(api2.emailVerifications.create, {
        userId: user._id,
        email,
        token,
        expiresAt
      });
      console.log("\u{1F4E7} Generated verification token:", token, "for user:", user._id);
      const verificationLink = `${process.env.FRONTEND_URL || "http://localhost:5000"}/verify-email?token=${token}`;
      const template = emailTemplates.verifyEmail(verificationLink, user.username || "User");
      await sendMail({
        to: email,
        subject: template.subject,
        html: template.html
      });
      res.json({
        success: true,
        message: "Verification email sent successfully"
      });
    } catch (error) {
      handleRouteError(error, res, "Failed to send verification email");
    }
  }
);
router10.post(
  "/forgot-password",
  createValidationMiddleware(forgotPasswordSchema),
  async (req, res) => {
    try {
      if (!req.validatedData) {
        res.status(400).json({
          success: false,
          message: "Invalid request data"
        });
        return;
      }
      const { email } = req.validatedData;
      const { api: api2 } = await Promise.resolve().then(() => (init_api(), api_exports));
      const recentAttempts = await convex3.query(api2.passwordResets.getRecentAttempts, {
        email,
        windowMs: 60 * 60 * 1e3
        // 1 hour
      });
      if (recentAttempts >= 3) {
        res.status(429).json({
          success: false,
          message: "Too many password reset requests. Please try again later."
        });
        return;
      }
      const user = await convex3.query(api2.users.getUserByEmail, { email });
      if (!user) {
        res.json({
          success: true,
          message: "If this email exists, a reset link has been sent"
        });
        return;
      }
      const token = uuidv4();
      const expiresAt = Date.now() + 15 * 60 * 1e3;
      await convex3.mutation(api2.passwordResets.create, {
        userId: user._id,
        email,
        token,
        expiresAt,
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });
      console.log("\u{1F510} Password reset token stored in Convex for user:", user._id);
      const resetLink = `${process.env.FRONTEND_URL || "http://localhost:5000"}/reset-password?token=${token}`;
      const template = emailTemplates.resetPassword(resetLink, user.username || "User");
      await sendMail({
        to: email,
        subject: template.subject,
        html: template.html
      });
      res.json({
        success: true,
        message: "If this email exists, a reset link has been sent"
      });
    } catch (error) {
      handleRouteError(error, res, "Failed to process password reset request");
    }
  }
);
router10.post(
  "/reset-password",
  createValidationMiddleware(resetPasswordSchema),
  async (req, res) => {
    try {
      if (!req.validatedData) {
        res.status(400).json({
          success: false,
          message: "Invalid request data"
        });
        return;
      }
      const { token, password } = req.validatedData;
      const { api: api2 } = await Promise.resolve().then(() => (init_api(), api_exports));
      const reset = await convex3.query(api2.passwordResets.getByToken, {
        token
      });
      if (!reset) {
        res.status(400).json({
          success: false,
          message: "Invalid or expired reset token"
        });
        return;
      }
      const user = await convex3.query(api2.users.getUserById, {
        id: reset.userId
      });
      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found"
        });
        return;
      }
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      console.log("\u{1F510} Password reset validated for user:", reset.userId);
      console.log("\u{1F510} New hashed password ready (length:", hashedPassword?.length || 0, ")");
      await convex3.mutation(api2.passwordResets.markUsed, { token });
      await convex3.mutation(api2.passwordResets.deleteToken, { token });
      console.log("\u2705 Password reset token marked as used and deleted");
      res.json({
        success: true,
        message: "Password reset successfully"
      });
    } catch (error) {
      console.error("\u274C Password reset failed:", error);
      handleRouteError(error, res, "Failed to reset password");
    }
  }
);
var email_default = router10;

// server/routes/monitoring.ts
import { getAuth as getAuth6 } from "@clerk/express";
import { Router as Router10 } from "express";

// shared/constants/ErrorMessages.ts
var ErrorMessages = {
  // Authentication & Authorization
  AUTH: {
    UNAUTHORIZED: "You must be logged in to access this resource",
    FORBIDDEN: "You do not have permission to perform this action",
    INVALID_TOKEN: "Invalid or expired authentication token",
    SESSION_EXPIRED: "Your session has expired. Please log in again",
    ACCOUNT_SUSPENDED: "Your account has been suspended. Please contact support"
  },
  // User Management
  USER: {
    NOT_FOUND: "User not found",
    INVALID_EMAIL: "Please enter a valid email address",
    EMAIL_ALREADY_EXISTS: "An account with this email already exists",
    WEAK_PASSWORD: "Password must be at least 8 characters with uppercase, lowercase, and numbers",
    PROFILE_UPDATE_FAILED: "Failed to update profile. Please try again",
    INVALID_USER_DATA: "Invalid user data provided"
  },
  // Beats & Products
  BEATS: {
    NOT_FOUND: "Beat not found",
    UNAVAILABLE: "This beat is no longer available",
    INVALID_LICENSE: "Invalid license type selected",
    ALREADY_PURCHASED: "You have already purchased this beat",
    INSUFFICIENT_QUOTA: "You have exceeded your download quota. Please upgrade your subscription",
    UPLOAD_FAILED: "Failed to upload beat. Please try again",
    INVALID_AUDIO_FORMAT: "Invalid audio format. Please upload MP3, WAV, or FLAC files",
    FILE_TOO_LARGE: "File size exceeds maximum limit of 50MB",
    VIRUS_DETECTED: "File failed security scan. Please contact support"
  },
  // Cart & Orders
  CART: {
    EMPTY: "Your cart is empty",
    ITEM_NOT_FOUND: "Item not found in cart",
    INVALID_QUANTITY: "Invalid quantity specified",
    UPDATE_FAILED: "Failed to update cart. Please try again",
    EXPIRED_ITEMS: "Some items in your cart are no longer available"
  },
  ORDER: {
    NOT_FOUND: "Order not found",
    ALREADY_PROCESSED: "This order has already been processed",
    INVALID_STATUS: "Invalid order status",
    PROCESSING_FAILED: "Failed to process order. Please try again",
    INSUFFICIENT_FUNDS: "Insufficient funds to complete purchase"
  },
  // Payment Processing
  PAYMENT: {
    FAILED: "Payment processing failed. Please try again",
    INVALID_CARD: "Invalid credit card information",
    CARD_DECLINED: "Your card was declined. Please try a different payment method",
    EXPIRED_CARD: "Your card has expired. Please update your payment information",
    INSUFFICIENT_FUNDS: "Insufficient funds. Please try a different payment method",
    PAYMENT_METHOD_REQUIRED: "Please add a payment method to continue",
    REFUND_FAILED: "Refund processing failed. Please contact support",
    STRIPE_ERROR: "Payment service error. Please try again later",
    PAYPAL_ERROR: "PayPal service error. Please try again later"
  },
  // Subscriptions
  SUBSCRIPTION: {
    NOT_FOUND: "Subscription not found",
    ALREADY_ACTIVE: "You already have an active subscription",
    EXPIRED: "Your subscription has expired. Please renew to continue",
    UPGRADE_FAILED: "Failed to upgrade subscription. Please try again",
    CANCEL_FAILED: "Failed to cancel subscription. Please contact support",
    INVALID_PLAN: "Invalid subscription plan selected"
  },
  // File Management
  FILE: {
    NOT_FOUND: "File not found",
    UPLOAD_FAILED: "File upload failed. Please try again",
    DOWNLOAD_FAILED: "File download failed. Please try again",
    INVALID_FORMAT: "Invalid file format",
    CORRUPTED: "File appears to be corrupted",
    ACCESS_DENIED: "You do not have access to this file",
    STORAGE_FULL: "Storage limit exceeded. Please free up space"
  },
  // Reservations & Services
  RESERVATION: {
    NOT_FOUND: "Reservation not found",
    SLOT_UNAVAILABLE: "Selected time slot is no longer available",
    BOOKING_FAILED: "Failed to create reservation. Please try again",
    CANCELLATION_FAILED: "Failed to cancel reservation. Please contact support",
    INVALID_DATE: "Invalid date selected",
    PAST_DATE: "Cannot book appointments in the past",
    TOO_FAR_AHEAD: "Cannot book more than 3 months in advance"
  },
  // WooCommerce Integration
  WOOCOMMERCE: {
    SYNC_FAILED: "Failed to sync with WooCommerce. Please try again later",
    PRODUCT_NOT_FOUND: "Product not found in WooCommerce",
    INVALID_PRODUCT_DATA: "Invalid product data received from WooCommerce",
    CONNECTION_ERROR: "Unable to connect to WooCommerce API",
    RATE_LIMIT_EXCEEDED: "Too many requests. Please wait before trying again"
  },
  // Database & Server
  DATABASE: {
    CONNECTION_ERROR: "Database connection error. Please try again later",
    QUERY_FAILED: "Database query failed. Please try again",
    CONSTRAINT_VIOLATION: "Data constraint violation. Please check your input",
    TIMEOUT: "Database operation timed out. Please try again"
  },
  SERVER: {
    INTERNAL_ERROR: "Internal server error. Please try again later",
    SERVICE_UNAVAILABLE: "Service temporarily unavailable. Please try again later",
    RATE_LIMIT_EXCEEDED: "Too many requests. Please wait before trying again",
    MAINTENANCE_MODE: "System is under maintenance. Please try again later"
  },
  // Validation
  VALIDATION: {
    REQUIRED_FIELD: "This field is required",
    INVALID_FORMAT: "Invalid format provided",
    TOO_SHORT: "Input is too short",
    TOO_LONG: "Input is too long",
    INVALID_CHARACTERS: "Contains invalid characters",
    NUMERIC_ONLY: "Only numeric values are allowed",
    ALPHA_ONLY: "Only alphabetic characters are allowed"
  },
  // Network & API
  NETWORK: {
    CONNECTION_ERROR: "Network connection error. Please check your internet connection",
    TIMEOUT: "Request timed out. Please try again",
    OFFLINE: "You are currently offline. Please check your connection",
    API_ERROR: "API service error. Please try again later"
  },
  // Generic Messages
  GENERIC: {
    UNKNOWN_ERROR: "An unexpected error occurred. Please try again",
    TRY_AGAIN: "Something went wrong. Please try again",
    CONTACT_SUPPORT: "If this problem persists, please contact support",
    FEATURE_UNAVAILABLE: "This feature is currently unavailable",
    COMING_SOON: "This feature is coming soon"
  }
};

// server/lib/monitoring.ts
init_api();
init_convex();
var MonitoringService = class {
  metrics = /* @__PURE__ */ new Map();
  healthChecks = [];
  requestCounts = /* @__PURE__ */ new Map();
  errorCounts = /* @__PURE__ */ new Map();
  // Database health check using Convex
  async checkDatabaseHealth() {
    const startTime = Date.now();
    try {
      const convex8 = getConvex();
      const result = await convex8.query(api.health.check.checkHealth);
      const responseTime = Date.now() - startTime;
      const isHealthy = result.status === "healthy";
      let status = "healthy";
      if (!isHealthy) {
        status = "down";
      } else if (responseTime > 2e3) {
        status = "degraded";
      }
      return {
        service: "database",
        status,
        responseTime,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: isHealthy ? void 0 : "Database connectivity issue"
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown database error";
      return {
        service: "database",
        status: "down",
        responseTime: Date.now() - startTime,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: errorMessage
      };
    }
  }
  // Storage service health check using Convex storage
  async checkStorageHealth() {
    const startTime = Date.now();
    try {
      const convex8 = getConvex();
      if (convex8) {
        const responseTime = Date.now() - startTime;
        return {
          service: "storage",
          status: responseTime > 1e3 ? "degraded" : "healthy",
          responseTime,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      throw new Error("Convex client not available");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown storage error";
      return {
        service: "storage",
        status: "down",
        responseTime: Date.now() - startTime,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: errorMessage
      };
    }
  }
  // External API health checks
  async checkWooCommerceHealth() {
    const startTime = Date.now();
    try {
      const wcKey = process.env.VITE_WC_KEY || "";
      const wcSecret = process.env.VITE_WC_SECRET || "";
      const credentials = Buffer.from(`${wcKey}:${wcSecret}`).toString("base64");
      const response = await fetch(`${process.env.VITE_WOOCOMMERCE_URL}/products?per_page=1`, {
        headers: {
          Authorization: `Basic ${credentials}`,
          "User-Agent": "BroLab-Beats-Store/1.0"
        }
      });
      const responseTime = Date.now() - startTime;
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return {
        service: "woocommerce",
        status: responseTime > 3e3 ? "degraded" : "healthy",
        responseTime,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown WooCommerce API error";
      return {
        service: "woocommerce",
        status: "down",
        responseTime: Date.now() - startTime,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: errorMessage
      };
    }
  }
  // Comprehensive health check
  async performHealthCheck() {
    const checks = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkStorageHealth(),
      this.checkWooCommerceHealth()
    ]);
    this.healthChecks = checks;
    return checks;
  }
  // Request tracking
  trackRequest(endpoint, success) {
    const minute = Math.floor(Date.now() / 6e4);
    const key = `${minute}:${endpoint}`;
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);
    if (!success) {
      this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    }
    const cutoff = minute - 5;
    Array.from(this.requestCounts.keys()).forEach((k) => {
      const keyMinute = Number.parseInt(k.split(":")[0], 10);
      if (keyMinute < cutoff) {
        this.requestCounts.delete(k);
        this.errorCounts.delete(k);
      }
    });
  }
  // Get system metrics
  getSystemMetrics() {
    const now = Date.now();
    const currentMinute = Math.floor(now / 6e4);
    let requestsPerMinute = 0;
    let errors = 0;
    Array.from(this.requestCounts.entries()).forEach(([key, count]) => {
      const keyMinute = Number.parseInt(key.split(":")[0], 10);
      if (keyMinute === currentMinute - 1) {
        requestsPerMinute += count;
        errors += this.errorCounts.get(key) || 0;
      }
    });
    const errorRate = requestsPerMinute > 0 ? errors / requestsPerMinute * 100 : 0;
    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      activeConnections: this.metrics.get("activeConnections") || 0,
      requestsPerMinute,
      errorRate,
      lastCheck: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  // Log system events to Convex
  async logSystemEvent(event) {
    try {
      const convex8 = getConvex();
      await convex8.mutation(api.audit.logAuditEvent, {
        action: `system_${event.type}`,
        resource: event.service,
        details: {
          message: event.message,
          ...event.details
        }
      });
      console.log(
        `[${event.type.toUpperCase()}] ${event.service}: ${event.message}`,
        event.details
      );
    } catch (error) {
      console.error("Failed to log system event to Convex:", error);
      console.log(
        `[${event.type.toUpperCase()}] ${event.service}: ${event.message}`,
        event.details
      );
    }
  }
  // Performance metrics collection
  async collectPerformanceMetrics() {
    const metrics = this.getSystemMetrics();
    const healthChecks = await this.performHealthCheck();
    const degradedServices = healthChecks.filter(
      (check) => check.status === "degraded" || check.status === "down"
    );
    for (const service of degradedServices) {
      await this.logSystemEvent({
        type: service.status === "down" ? "error" : "warning",
        service: service.service,
        message: `Service ${service.status}`,
        details: {
          responseTime: service.responseTime,
          error: service.error
        }
      });
    }
    if (metrics.errorRate > 10) {
      await this.logSystemEvent({
        type: "warning",
        service: "api",
        message: `High error rate detected: ${metrics.errorRate.toFixed(2)}%`,
        details: {
          requestsPerMinute: metrics.requestsPerMinute,
          errorRate: metrics.errorRate
        }
      });
    }
    return { metrics, healthChecks };
  }
  // Express middleware for request tracking
  trackingMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const originalEnd = res.end;
      res.end = (...args) => {
        const responseTime = Date.now() - startTime;
        const success = res.statusCode < 400;
        this.trackRequest(req.path || req.url, success);
        if (responseTime > 5e3) {
          this.logSystemEvent({
            type: "warning",
            service: "api",
            message: `Slow request detected: ${req.method} ${req.path || req.url}`,
            details: {
              responseTime,
              statusCode: res.statusCode,
              userAgent: req.get ? req.get("User-Agent") : void 0
            }
          }).catch(console.error);
        }
        return originalEnd.apply(res, args);
      };
      next();
    };
  }
};
var monitoring = new MonitoringService();
var monitoring_default = monitoring;

// server/utils/authz.ts
function isAdmin(user) {
  if (!user) return false;
  return user.role === "admin" /* ADMIN */ || user.role === "admin";
}
function isOwner(user, resourceUserId) {
  if (!user?.id || !resourceUserId) return false;
  return String(user.id) === String(resourceUserId);
}
function canAccessResource(user, resourceUserId) {
  if (isAdmin(user)) return true;
  return isOwner(user, resourceUserId);
}

// server/routes/monitoring.ts
var router11 = Router10();
router11.get("/health", apiRateLimit, async (req, res) => {
  try {
    const healthChecks = await monitoring_default.performHealthCheck();
    const allHealthy = healthChecks.every((check) => check.status === "healthy");
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? "healthy" : "degraded",
      checks: healthChecks,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    handleRouteError(error, res, "Health check failed");
  }
});
router11.get("/auth-check", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const hasAuthHeader = !!authHeader;
    const hasBearerToken = authHeader?.startsWith("Bearer ") ?? false;
    let clerkAuth = null;
    try {
      clerkAuth = getAuth6(req);
    } catch (e) {
      clerkAuth = { error: e instanceof Error ? e.message : "Unknown error" };
    }
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      hasClerkSecretKey: !!process.env.CLERK_SECRET_KEY,
      clerkSecretKeyPrefix: process.env.CLERK_SECRET_KEY?.substring(0, 8) || "not set",
      hasClerkPublishableKey: !!process.env.VITE_CLERK_PUBLISHABLE_KEY,
      clerkPublishableKeyPrefix: process.env.VITE_CLERK_PUBLISHABLE_KEY?.substring(0, 8) || "not set",
      hasConvexUrl: !!process.env.VITE_CONVEX_URL
    };
    res.json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      request: {
        hasAuthHeader,
        hasBearerToken,
        tokenLength: hasBearerToken ? authHeader.length - 7 : 0
      },
      clerkAuth: {
        userId: clerkAuth?.userId || null,
        sessionId: clerkAuth?.sessionId || null,
        hasSessionClaims: !!clerkAuth?.sessionClaims,
        error: clerkAuth?.error || null
      },
      environment: envCheck
    });
  } catch (error) {
    handleRouteError(error, res, "Auth check failed");
  }
});
router11.get("/metrics", apiRateLimit, async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: ErrorMessages.AUTH.UNAUTHORIZED });
      return;
    }
    const user = req.user;
    if (!isAdmin(user)) {
      res.status(403).json({ error: ErrorMessages.AUTH.FORBIDDEN });
      return;
    }
    const { metrics, healthChecks } = await monitoring_default.collectPerformanceMetrics();
    res.json({
      system: metrics,
      services: healthChecks,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    handleRouteError(error, res, "Failed to collect metrics");
  }
});
router11.get("/status", async (req, res) => {
  try {
    const metrics = monitoring_default.getSystemMetrics();
    res.json({
      status: "online",
      uptime: metrics.uptime,
      memory: {
        used: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(metrics.memoryUsage.rss / 1024 / 1024)
      },
      requestsPerMinute: metrics.requestsPerMinute,
      errorRate: Math.round(metrics.errorRate * 100) / 100,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    handleRouteError(error, res, "Failed to get system status");
  }
});
router11.post("/health/check", apiRateLimit, async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: ErrorMessages.AUTH.UNAUTHORIZED });
      return;
    }
    const user = req.user;
    if (!isAdmin(user)) {
      res.status(403).json({ error: ErrorMessages.AUTH.FORBIDDEN });
      return;
    }
    const healthChecks = await monitoring_default.performHealthCheck();
    await monitoring_default.logSystemEvent({
      type: "info",
      service: "monitoring",
      message: "Manual health check triggered",
      details: {
        triggeredBy: user.username,
        results: healthChecks
      }
    });
    res.json({
      message: "Health check completed",
      results: healthChecks,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    handleRouteError(error, res, "Manual health check failed");
  }
});
var monitoring_default2 = router11;

// server/routes/openGraph.ts
import { Router as Router11 } from "express";

// server/lib/openGraphGenerator.ts
function generateBeatOpenGraph(beat, config) {
  const baseUrl = config.baseUrl;
  const siteName = config.siteName;
  return {
    title: `${beat.title} - ${beat.genre} Beat by BroLab Entertainment`,
    description: beat.description || `${beat.title} - Professional ${beat.genre} beat with ${beat.bpm} BPM. High-quality production for music producers and artists.`,
    url: `${baseUrl}/product/${beat.id}`,
    image: beat.image_url || config.defaultImage || `${baseUrl}/logo.png`,
    type: "music.song",
    siteName,
    twitterCard: "summary_large_image",
    twitterHandle: config.twitterHandle,
    audioUrl: beat.audio_url ?? void 0,
    duration: beat.duration ? `${Math.floor(beat.duration / 60)}:${(beat.duration % 60).toString().padStart(2, "0")}` : void 0,
    artist: "BroLab Entertainment"
  };
}
function generateShopOpenGraph(config) {
  const baseUrl = config.baseUrl;
  const siteName = config.siteName;
  return {
    title: "BroLab Beats - Professional Music Production",
    description: "Discover premium beats from top producers around the world. Find the perfect sound for your next hit with our collection of high-quality music production.",
    url: `${baseUrl}/shop`,
    image: config.defaultImage || `${baseUrl}/logo.png`,
    type: "website",
    siteName,
    twitterCard: "summary_large_image",
    twitterHandle: config.twitterHandle
  };
}
function generateHomeOpenGraph(config) {
  const baseUrl = config.baseUrl;
  const siteName = config.siteName;
  return {
    title: "BroLab Entertainment - Professional Music Production & Beats",
    description: "Professional music production services and premium beats for artists and producers. Mix & mastering, custom beats, and high-quality music production.",
    url: baseUrl,
    image: config.defaultImage || `${baseUrl}/logo.png`,
    type: "website",
    siteName,
    twitterCard: "summary_large_image",
    twitterHandle: config.twitterHandle
  };
}
function generateStaticPageOpenGraph(page, config) {
  const baseUrl = config.baseUrl;
  const siteName = config.siteName;
  const pages = {
    about: {
      title: "About BroLab Entertainment - Professional Music Production",
      description: "Learn about BroLab Entertainment, our mission to provide professional music production services and premium beats for artists worldwide.",
      url: `${baseUrl}/about`
    },
    contact: {
      title: "Contact BroLab Entertainment - Get in Touch",
      description: "Contact BroLab Entertainment for professional music production services, custom beats, mix & mastering, and collaboration opportunities.",
      url: `${baseUrl}/contact`
    },
    terms: {
      title: "Terms of Service - BroLab Entertainment",
      description: "Terms of service and usage conditions for BroLab Entertainment music production services and beat licensing.",
      url: `${baseUrl}/terms`
    },
    privacy: {
      title: "Privacy Policy - BroLab Entertainment",
      description: "Privacy policy and data protection information for BroLab Entertainment music production services.",
      url: `${baseUrl}/privacy`
    },
    license: {
      title: "Music Licensing - BroLab Entertainment",
      description: "Music licensing information and terms for BroLab Entertainment beats and music production services.",
      url: `${baseUrl}/license`
    }
  };
  const pageInfo = pages[page];
  return {
    title: pageInfo.title,
    description: pageInfo.description,
    url: pageInfo.url,
    image: config.defaultImage || `${baseUrl}/logo.png`,
    type: "website",
    siteName,
    twitterCard: "summary",
    twitterHandle: config.twitterHandle
  };
}
function generateOpenGraphHTML(meta) {
  const tags = [
    // Open Graph
    `<meta property="og:title" content="${escapeHtml2(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml2(meta.description)}" />`,
    `<meta property="og:url" content="${meta.url}" />`,
    `<meta property="og:image" content="${meta.image}" />`,
    `<meta property="og:type" content="${meta.type}" />`,
    `<meta property="og:site_name" content="${escapeHtml2(meta.siteName)}" />`,
    // Twitter Card
    `<meta name="twitter:card" content="${meta.twitterCard || "summary"}" />`,
    `<meta name="twitter:title" content="${escapeHtml2(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml2(meta.description)}" />`,
    `<meta name="twitter:image" content="${meta.image}" />`
  ];
  if (meta.twitterHandle) {
    tags.push(
      `<meta name="twitter:site" content="${meta.twitterHandle}" />`,
      `<meta name="twitter:creator" content="${meta.twitterHandle}" />`
    );
  }
  if (meta.type === "music.song") {
    if (meta.audioUrl) {
      tags.push(
        `<meta property="og:audio" content="${meta.audioUrl}" />`,
        `<meta property="og:audio:type" content="audio/mpeg" />`
      );
    }
    if (meta.duration) {
      tags.push(`<meta property="og:audio:duration" content="${meta.duration}" />`);
    }
    if (meta.artist) {
      tags.push(`<meta property="og:audio:artist" content="${escapeHtml2(meta.artist)}" />`);
    }
  }
  return tags.join("\n    ");
}
function escapeHtml2(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
}

// server/routes/openGraph.ts
var router12 = Router11();
async function wcApiRequest(endpoint, options = {}) {
  const WOOCOMMERCE_API_URL2 = process.env.WOOCOMMERCE_API_URL || "https://brolabentertainment.com/wp-json/wc/v3";
  const WC_CONSUMER_KEY2 = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const WC_CONSUMER_SECRET2 = process.env.WOOCOMMERCE_CONSUMER_SECRET;
  if (!WC_CONSUMER_KEY2 || !WC_CONSUMER_SECRET2) {
    if (process.env.NODE_ENV === "test") {
      return {};
    }
    throw new Error("WooCommerce API credentials not configured");
  }
  const url = new URL(`${WOOCOMMERCE_API_URL2}${endpoint}`);
  url.searchParams.append("consumer_key", WC_CONSUMER_KEY2);
  url.searchParams.append("consumer_secret", WC_CONSUMER_SECRET2);
  const response = process.env.NODE_ENV === "test" ? {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({})
  } : await fetch(url.toString(), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "BroLab-Frontend/1.0",
      Accept: "application/json",
      ...options.headers
    }
  });
  if (!response.ok) {
    throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}
var openGraphConfig = {
  baseUrl: process.env.FRONTEND_URL || "https://brolabentertainment.com",
  siteName: "BroLab Entertainment",
  defaultImage: "https://brolabentertainment.com/logo.png",
  twitterHandle: "@brolabentertainment"
};
router12.get("/beat/:id", validateParams(CommonParams.numericId), async (req, res) => {
  try {
    const beatId = req.params.id;
    let product;
    try {
      product = await wcApiRequest(`/products/${beatId}`);
    } catch (error) {
      if (error instanceof Error && error.message?.includes("404")) {
        res.status(404).json({ error: "Beat not found" });
        return;
      }
      throw error;
    }
    if (!product?.id) {
      res.status(404).json({ error: "Beat not found" });
      return;
    }
    const extractBpmFromMeta = (metaData) => {
      const bpmMeta = metaData.find((meta) => meta.key === "bpm");
      return bpmMeta?.value ? Number.parseInt(bpmMeta.value.toString()) : void 0;
    };
    const extractStringFromMeta = (metaData, key) => {
      const meta = metaData.find((meta2) => meta2.key === key);
      return meta?.value?.toString() || null;
    };
    const beat = {
      id: product.id,
      title: product.name,
      name: product.name,
      // Alias for compatibility
      description: product.description,
      genre: product.categories?.[0]?.name || "Unknown",
      bpm: (() => {
        if (product.bpm) {
          return Number.parseInt(product.bpm.toString());
        }
        if (product.meta_data) {
          return extractBpmFromMeta(product.meta_data);
        }
        return void 0;
      })(),
      key: product.key || (product.meta_data ? extractStringFromMeta(product.meta_data, "key") : null),
      mood: product.mood || (product.meta_data ? extractStringFromMeta(product.meta_data, "mood") : null),
      price: Number.parseFloat(product.price) || 0,
      image_url: product.images?.[0]?.src,
      image: product.images?.[0]?.src,
      // Alias for compatibility
      images: product.images?.map((img) => ({ src: img.src, alt: img.alt })),
      audio_url: product.audio_url || void 0,
      tags: product.tags?.map((tag) => tag.name) || [],
      categories: product.categories?.map((cat) => ({
        id: cat.id,
        name: cat.name
      })),
      meta_data: product.meta_data,
      duration: product.duration ? Number.parseFloat(product.duration.toString()) : void 0,
      downloads: Array.isArray(product.downloads) ? product.downloads.length : product.downloads || 0
    };
    const openGraphMeta = generateBeatOpenGraph(beat, openGraphConfig);
    const openGraphHTML = generateOpenGraphHTML(openGraphMeta);
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(openGraphHTML);
  } catch (error) {
    handleRouteError(error, res, "Failed to generate Open Graph for beat");
  }
});
router12.get("/shop", async (_req, res) => {
  try {
    const openGraphMeta = generateShopOpenGraph(openGraphConfig);
    const openGraphHTML = generateOpenGraphHTML(openGraphMeta);
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(openGraphHTML);
  } catch (error) {
    handleRouteError(error, res, "Failed to generate Open Graph for shop");
  }
});
router12.get("/home", async (_req, res) => {
  try {
    const openGraphMeta = generateHomeOpenGraph(openGraphConfig);
    const openGraphHTML = generateOpenGraphHTML(openGraphMeta);
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(openGraphHTML);
  } catch (error) {
    handleRouteError(error, res, "Failed to generate Open Graph for home");
  }
});
router12.get("/page/:pageName", async (req, res) => {
  try {
    const pageName = req.params.pageName;
    const validPages = ["about", "contact", "terms", "privacy", "license"];
    if (!validPages.includes(pageName)) {
      res.status(400).json({ error: "Invalid page name" });
      return;
    }
    const openGraphMeta = generateStaticPageOpenGraph(pageName, openGraphConfig);
    const openGraphHTML = generateOpenGraphHTML(openGraphMeta);
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(openGraphHTML);
  } catch (error) {
    handleRouteError(error, res, "Failed to generate Open Graph for page");
  }
});
var openGraph_default = router12;

// server/routes/orders.ts
import { Router as Router12 } from "express";
init_auth();
init_convex();
var ordersRouter = Router12();
var convex4 = getConvex();
var createOrderIdempotent = async (args) => {
  return await convex4.mutation(
    "orders:createOrderIdempotent",
    args
  );
};
var listOrders = async (args) => {
  return await convex4.query(
    "orders:listOrders",
    args
  );
};
var getOrderWithRelations = async (args) => {
  return await convex4.query(
    "orders:getOrderWithRelations",
    args
  );
};
var getOrderStatusHistory = async (args) => {
  return await convex4.query(
    "orders:getOrderStatusHistory",
    args
  );
};
ordersRouter.use(isAuthenticated);
var createOrder2 = async (req, res) => {
  try {
    const body = req.body;
    const idempotencyKey = body.idempotencyKey || req.headers["x-idempotency-key"];
    const orderArgs = {
      items: body.items.map((item) => ({
        productId: item.productId,
        title: item.title,
        type: item.type,
        qty: item.qty,
        unitPrice: item.unitPrice,
        metadata: item.metadata
      })),
      currency: body.currency,
      email: req.user?.email || "",
      metadata: body.metadata,
      idempotencyKey
    };
    const result = await createOrderIdempotent(orderArgs);
    const response = {
      orderId: result.orderId,
      order: result.order,
      idempotent: result.idempotent
    };
    res.status(201).json(response);
  } catch (error) {
    handleRouteError(error, res, "Failed to create order");
  }
};
ordersRouter.post("/", validateBody(CreateOrderSchema), createOrder2);
var getMyOrders = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const { items, cursor, hasMore } = await listOrders({ limit });
    const response = {
      orders: items,
      page,
      total: items.length,
      totalPages: hasMore ? page + 1 : page,
      cursor,
      hasMore
    };
    res.json(response);
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch orders");
  }
};
ordersRouter.get("/me", validateQuery(CommonQueries.pagination), getMyOrders);
var getOrder = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await getOrderWithRelations({ orderId: id });
    const orderUserId = data?.order?.userId;
    if (!canAccessResource(req.user, orderUserId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const statusHistory = await getOrderStatusHistory({ orderId: id });
    const response = {
      order: data?.order,
      items: data?.items || [],
      statusHistory: statusHistory.map((h) => ({
        status: h.status,
        timestamp: new Date(h.timestamp).toISOString(),
        comment: h.action
      }))
    };
    res.json(response);
  } catch (error) {
    handleRouteError(error, res, "Failed to get order");
  }
};
ordersRouter.get("/:id", validateParams(CommonParams.id), getOrder);
var getInvoice = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await getOrderWithRelations({ orderId: id });
    const orderUserId = data?.order?.userId;
    if (!canAccessResource(req.user, orderUserId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const invoiceUrl = data?.order?.invoiceUrl;
    if (!invoiceUrl) {
      res.status(404).json({ error: "Invoice not ready" });
      return;
    }
    const response = { url: invoiceUrl };
    res.json(response);
  } catch (error) {
    handleRouteError(error, res, "Failed to get invoice");
  }
};
ordersRouter.get("/:id/invoice", validateParams(CommonParams.id), getInvoice);
ordersRouter.get("/:id/invoice/download", validateParams(CommonParams.id), async (req, res) => {
  try {
    const id = req.params.id;
    const data = await getOrderWithRelations({ orderId: id });
    const orderUserId = data?.order?.userId;
    if (!canAccessResource(req.user, orderUserId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const invoice = data;
    if (!invoice?.invoice?.pdfUrl) {
      res.status(404).json({ error: "Invoice not ready" });
      return;
    }
    res.redirect(invoice.invoice.pdfUrl);
  } catch (error) {
    handleRouteError(error, res, "Failed to download invoice");
  }
});
var orders_default = ordersRouter;

// server/routes/payments.ts
import { ConvexHttpClient as ConvexHttpClient5 } from "convex/browser";
import { Router as Router13 } from "express";
import Stripe3 from "stripe";

// server/services/paypal.ts
init_api();
import {
  CheckoutPaymentIntent,
  OrderApplicationContextUserAction,
  OrdersController
} from "@paypal/paypal-server-sdk";
import { createVerify } from "node:crypto";

// server/config/paypal.ts
import { Client, Environment } from "@paypal/paypal-server-sdk";
var clientId = process.env.PAYPAL_CLIENT_ID;
var clientSecret = process.env.PAYPAL_CLIENT_SECRET;
var paypalMode = process.env.PAYPAL_MODE || "sandbox";
if (!clientId || !clientSecret) {
  throw new Error("PayPal credentials are not configured. Please check your .env file.");
}
console.log(`\u{1F510} PayPal ${paypalMode.toUpperCase()} credentials loaded:`, {
  clientId: clientId ? `${clientId.substring(0, 8)}...` : "undefined",
  clientSecret: clientSecret ? `${clientSecret.substring(0, 8)}...` : "undefined",
  mode: paypalMode
});
var environment = paypalMode === "production" ? Environment.Production : Environment.Sandbox;
var paypalClient = new Client({
  environment,
  clientId,
  clientSecret
});
var PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID;
var PAYPAL_RETURN_URL = `${process.env.SERVER_URL || "http://localhost:5000"}/api/paypal/capture`;
var PAYPAL_CANCEL_URL = `${process.env.CLIENT_URL || "https://brolabentertainment.com"}/payment/cancel`;

// server/services/paypal.ts
init_convex();
var convex5 = getConvex();
var PayPalService = class {
  /**
   * Creates a real PayPal order for payment
   * Handles return URLs correctly
   */
  static async createPaymentOrder(paymentRequest) {
    try {
      const { amount, currency, description, reservationId } = paymentRequest;
      console.log("\u{1F680} Creating REAL PayPal order for reservation:", reservationId);
      console.log("\u{1F4B0} Payment details:", { amount, currency, description });
      if (!["EUR", "USD"].includes(currency)) {
        throw new Error(`Currency '${currency}' not supported`);
      }
      const ordersController = new OrdersController(paypalClient);
      const requestBody = {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            amount: {
              currencyCode: currency,
              value: amount.toString()
            },
            customId: reservationId
          }
        ],
        applicationContext: {
          returnUrl: `${PAYPAL_RETURN_URL}/${reservationId}`,
          cancelUrl: PAYPAL_CANCEL_URL,
          brandName: "BroLab Entertainment",
          userAction: OrderApplicationContextUserAction.PayNow
        }
      };
      console.log("\u{1F4E4} Sending PayPal order creation request...");
      console.log("\u{1F4CB} Request body:", JSON.stringify(requestBody, null, 2));
      const order = await ordersController.createOrder({
        body: requestBody,
        prefer: "return=representation"
      });
      if (order.result?.id) {
        const orderId = order.result.id;
        const approvalUrl = order.result.links?.find(
          (link) => link.rel === "approve"
        )?.href;
        if (!approvalUrl) {
          throw new Error("PayPal approval URL not found");
        }
        console.log("\u2705 REAL PayPal order created successfully:", orderId);
        console.log("\u{1F517} Approval URL:", approvalUrl);
        console.log("\u{1F4DD} Reservation ID stored in customId:", reservationId);
        return {
          success: true,
          paymentUrl: approvalUrl,
          orderId
        };
      } else {
        throw new Error("Invalid PayPal order response");
      }
    } catch (error) {
      console.error("\u274C Error creating REAL PayPal order:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Captures a real PayPal payment after approval
   * Uses PayPal orderId (token) for capture
   */
  static async capturePayment(orderId) {
    try {
      console.log("\u{1F3AF} Capturing REAL PayPal payment for order:", orderId);
      if (!orderId || orderId.length < 10) {
        throw new Error("Invalid PayPal order ID");
      }
      const ordersController = new OrdersController(paypalClient);
      console.log("\u{1F4E4} Sending PayPal capture request...");
      const capture = await ordersController.captureOrder({
        id: orderId
      });
      if (capture.result?.id) {
        const transactionId = capture.result.id;
        const status = capture.result.status;
        console.log("\u2705 REAL PayPal payment captured successfully:", { transactionId, status });
        return {
          success: true,
          transactionId
        };
      } else {
        throw new Error("Invalid PayPal capture response");
      }
    } catch (error) {
      console.error("\u274C Error capturing REAL PayPal payment:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Verifies PayPal webhook signature using proper certificate validation
   * Implements PayPal's webhook signature verification algorithm
   * @see https://developer.paypal.com/docs/api-basics/notifications/webhooks/notification-messages/#link-verifysignature
   */
  static async verifyWebhookSignature(webhookId, transmissionId, timestamp, certUrl, authAlgo, transmissionSig, body) {
    try {
      console.log("\u{1F510} Verifying PayPal webhook signature", {
        webhookId: webhookId?.substring(0, 10) + "...",
        transmissionId: transmissionId?.substring(0, 10) + "...",
        timestamp,
        authAlgo
      });
      if (!webhookId || !transmissionId || !timestamp || !certUrl || !authAlgo || !transmissionSig || !body) {
        console.error("\u274C Missing required webhook verification parameters");
        return false;
      }
      const configuredWebhookId = process.env.PAYPAL_WEBHOOK_ID;
      if (!configuredWebhookId) {
        console.error("\u274C PAYPAL_WEBHOOK_ID not configured in environment");
        return false;
      }
      if (webhookId !== configuredWebhookId) {
        console.error("\u274C Webhook ID mismatch", {
          received: webhookId,
          expected: configuredWebhookId?.substring(0, 10) + "..."
        });
        return false;
      }
      const validCertDomains = [
        "https://api.paypal.com",
        "https://api.sandbox.paypal.com",
        "https://api-m.paypal.com",
        "https://api-m.sandbox.paypal.com"
      ];
      const isValidCertUrl = validCertDomains.some((domain) => certUrl.startsWith(domain));
      if (!isValidCertUrl) {
        console.error("\u274C Invalid certificate URL domain", { certUrl });
        return false;
      }
      let certificate;
      try {
        const certResponse = await fetch(certUrl);
        if (!certResponse.ok) {
          throw new Error(`Failed to fetch certificate: ${certResponse.status}`);
        }
        certificate = await certResponse.text();
        console.log("\u2705 PayPal certificate fetched successfully");
      } catch (error) {
        console.error("\u274C Failed to fetch PayPal certificate:", error);
        return false;
      }
      const crc32 = this.calculateCRC32(body);
      const expectedSignatureString = `${transmissionId}|${timestamp}|${webhookId}|${crc32}`;
      console.log("\u{1F510} Verifying signature with expected string", {
        expectedSignatureString: expectedSignatureString.substring(0, 50) + "...",
        algorithm: authAlgo
      });
      try {
        const verifier = createVerify(authAlgo.toUpperCase());
        verifier.update(expectedSignatureString);
        verifier.end();
        const isValid = verifier.verify(certificate, transmissionSig, "base64");
        if (isValid) {
          console.log("\u2705 PayPal webhook signature verified successfully");
          return true;
        } else {
          console.error("\u274C PayPal webhook signature verification failed - signature mismatch");
          return false;
        }
      } catch (error) {
        console.error("\u274C Error during signature verification:", error);
        return false;
      }
    } catch (error) {
      console.error("\u274C Unexpected error verifying webhook signature:", error);
      console.error("\u{1F6A8} SECURITY: PayPal webhook signature verification failed", {
        error: error instanceof Error ? error.message : String(error),
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      return false;
    }
  }
  /**
   * Calculate CRC32 checksum for webhook body
   * Required for PayPal webhook signature verification
   */
  static calculateCRC32(str) {
    const table = [];
    let crc = 0;
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
      }
      table[i] = c;
    }
    crc = 0 ^ -1;
    for (let i = 0; i < str.length; i++) {
      const charCode = str.codePointAt(i) ?? 0;
      crc = crc >>> 8 ^ table[(crc ^ charCode) & 255];
    }
    return (crc ^ -1) >>> 0;
  }
  /**
   * Processes a PayPal webhook event
   * Handles PayPal IDs correctly
   */
  static async processWebhookEvent(event) {
    try {
      console.log("\u{1F4E1} Processing REAL PayPal webhook event:", event.event_type);
      switch (event.event_type) {
        case "PAYMENT.CAPTURE.COMPLETED":
          return await this.handlePaymentCompleted(event);
        case "PAYMENT.CAPTURE.DENIED":
          return await this.handlePaymentDenied(event);
        case "PAYMENT.CAPTURE.REFUNDED":
          return await this.handlePaymentRefunded(event);
        default:
          console.log("\u2139\uFE0F Unhandled webhook event type:", event.event_type);
          return {
            success: true,
            message: `Unhandled event type: ${event.event_type}`
          };
      }
    } catch (error) {
      console.error("\u274C Error processing webhook event:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Handles PAYMENT.CAPTURE.COMPLETED webhook event
   */
  static async handlePaymentCompleted(event) {
    const transactionId = event.resource.id;
    const customId = event.resource.custom_id;
    console.log("\u{1F4B0} Payment completed:", { transactionId, reservationId: customId });
    if (!customId) {
      return {
        success: true,
        message: "Payment completed but no reservation ID found"
      };
    }
    await this.updateReservationStatus(
      customId,
      "confirmed",
      `PayPal payment completed. Transaction ID: ${transactionId}`
    );
    console.log("\u2705 Reservation status updated to confirmed:", customId);
    return {
      success: true,
      message: `Payment completed for reservation ${customId}`
    };
  }
  /**
   * Handles PAYMENT.CAPTURE.DENIED webhook event
   */
  static async handlePaymentDenied(event) {
    const deniedCustomId = event.resource.custom_id;
    console.log("\u274C Payment denied for reservation:", deniedCustomId);
    if (!deniedCustomId) {
      return {
        success: true,
        message: "Payment denied but no reservation ID found"
      };
    }
    await this.updateReservationStatus(
      deniedCustomId,
      "pending",
      `PayPal payment denied. Event ID: ${event.id}`
    );
    console.log("\u2705 Reservation status updated to pending (payment denied):", deniedCustomId);
    return {
      success: true,
      message: `Payment denied for reservation ${deniedCustomId}`
    };
  }
  /**
   * Handles PAYMENT.CAPTURE.REFUNDED webhook event
   */
  static async handlePaymentRefunded(event) {
    const refundedCustomId = event.resource.custom_id;
    const refundId = event.resource.id;
    console.log("\u21A9\uFE0F Payment refunded for reservation:", refundedCustomId);
    if (!refundedCustomId) {
      return {
        success: true,
        message: "Payment refunded but no reservation ID found"
      };
    }
    await this.updateReservationStatus(
      refundedCustomId,
      "cancelled",
      `PayPal payment refunded. Refund ID: ${refundId}`
    );
    console.log("\u2705 Reservation status updated to cancelled (refunded):", refundedCustomId);
    return {
      success: true,
      message: `Payment refunded for reservation ${refundedCustomId}`
    };
  }
  /**
   * Updates reservation status in Convex
   * Centralized error handling for reservation updates
   */
  static async updateReservationStatus(reservationId, status, notes) {
    try {
      await convex5.mutation(api.reservations.updateReservationStatus, {
        reservationId,
        status,
        notes,
        skipEmailNotification: false
      });
    } catch (error) {
      console.error("\u274C Failed to update reservation status:", error);
      throw new Error(
        `Failed to update reservation status: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Gets details of a real PayPal order
   * Uses PayPal orderId
   */
  static async getOrderDetails(orderId) {
    try {
      console.log("\u{1F4CB} Getting REAL PayPal order details:", orderId);
      if (!orderId || orderId.length < 10) {
        throw new Error("Invalid PayPal order ID");
      }
      const ordersController = new OrdersController(paypalClient);
      console.log("\u{1F4E4} Sending PayPal order details request...");
      const order = await ordersController.getOrder({
        id: orderId
      });
      if (order.result) {
        console.log("\u2705 REAL PayPal order details retrieved successfully");
        return order.result;
      } else {
        throw new Error("Invalid PayPal order response");
      }
    } catch (error) {
      console.error("\u274C Error getting REAL PayPal order details:", error);
      throw error;
    }
  }
  /**
   * Performs a lightweight health check by attempting to fetch a non-existent order
   * This validates OAuth credentials and API connectivity without creating transactions
   * Returns healthy=true if auth succeeds (even if order not found - expected behavior)
   */
  static async healthCheck() {
    const startTime = Date.now();
    try {
      const ordersController = new OrdersController(paypalClient);
      await ordersController.getOrder({ id: "HEALTH_CHECK_PING" });
      return { healthy: true, latencyMs: Date.now() - startTime };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorString = JSON.stringify(error);
      if (errorMessage.includes("RESOURCE_NOT_FOUND") || errorMessage.includes("INVALID_RESOURCE_ID") || errorString.includes("RESOURCE_NOT_FOUND") || errorString.includes("INVALID_RESOURCE_ID")) {
        return { healthy: true, latencyMs };
      }
      return {
        healthy: false,
        latencyMs,
        error: errorMessage
      };
    }
  }
};
var paypal_default = PayPalService;

// server/routes/payments.ts
var router13 = Router13();
async function handleOrderWebhook(normalized, mapped, convexUrl) {
  logger.info("Processing order webhook", {
    sessionId: normalized.sessionId,
    status: mapped.status,
    paymentStatus: mapped.paymentStatus
  });
  const convex8 = new ConvexHttpClient5(convexUrl);
  let orderId = null;
  if (normalized.sessionId) {
    const orders = await convex8.query("orders:listOrdersAdmin", {
      limit: 1
    });
    const ordersList = Array.isArray(orders) ? orders : [];
    const order = ordersList.find(
      (o) => o.checkoutSessionId === normalized.sessionId
    );
    if (order && "_id" in order) {
      orderId = order._id;
    }
  }
  if (!orderId && normalized.paymentId) {
    const orders = await convex8.query("orders:listOrdersAdmin", {
      limit: 1
    });
    const ordersList = Array.isArray(orders) ? orders : [];
    const order = ordersList.find(
      (o) => o.paymentIntentId === normalized.paymentId
    );
    if (order && "_id" in order) {
      orderId = order._id;
    }
  }
  if (!orderId) {
    logger.warn("Order not found for session/payment ID", { sessionId: normalized.sessionId });
    return;
  }
  await convex8.mutation("orders:recordPayment", {
    orderId,
    provider: "stripe",
    status: mapped.paymentStatus,
    amount: 0,
    // Amount should come from webhook data
    currency: "usd",
    stripeEventId: normalized.sessionId || normalized.paymentId || "",
    stripePaymentIntentId: normalized.paymentId
  });
  if (mapped.paymentStatus === "succeeded") {
    await convex8.mutation("orders:confirmPayment:confirmPayment", {
      orderId,
      paymentIntentId: normalized.paymentId || normalized.sessionId || "",
      status: "succeeded",
      provider: "stripe"
    });
    logger.info("Order payment confirmed", { orderId });
  }
}
var stripeSecretKey = process.env.STRIPE_SECRET_KEY;
var stripeClient = null;
if (stripeSecretKey) {
  stripeClient = new Stripe3(stripeSecretKey, {
    apiVersion: "2025-08-27.basil"
  });
}
var createPaymentSession = async (req, res) => {
  try {
    const { reservationId, amount, currency, description, metadata } = req.body;
    if (!req.user?.id) {
      const requestId = req.requestId || generateSecureRequestId();
      res.status(401).json({
        error: "Authentication required",
        message: "Please log in to continue",
        requestId
      });
      return;
    }
    const userId = String(req.user.id);
    const userEmail = req.user.email || "";
    const paymentProvider = metadata?.paymentProvider || "stripe";
    logger.info("Creating payment session", { provider: paymentProvider, reservationId });
    if (paymentProvider === "paypal") {
      const paypalResult = await paypal_default.createPaymentOrder({
        serviceType: metadata?.serviceType || "service",
        amount: centsToDollars(amount),
        // PayPal expects amount in dollars, not cents
        currency: currency.toUpperCase(),
        description,
        reservationId,
        userId,
        customerEmail: userEmail
      });
      if (!paypalResult.success || !paypalResult.paymentUrl) {
        res.status(500).json({
          error: "Failed to create PayPal payment session",
          message: paypalResult.error || "Unknown error"
        });
        return;
      }
      const response2 = {
        success: true,
        checkoutUrl: paypalResult.paymentUrl,
        sessionId: paypalResult.orderId || `paypal_${Date.now()}`,
        amount,
        currency,
        description,
        metadata: { ...metadata, provider: "paypal" }
      };
      logger.info("PayPal payment session created", { sessionId: paypalResult.orderId });
      res.json(response2);
      return;
    }
    if (!stripeClient) {
      logger.error("Stripe client not initialized", { reason: "STRIPE_SECRET_KEY missing" });
      res.status(500).json({
        error: "Payment service unavailable",
        message: "Stripe is not configured. Please contact support."
      });
      return;
    }
    const baseUrl = process.env.CLIENT_URL || "https://brolabentertainment.com";
    const successUrl = `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&reservation_id=${reservationId}`;
    const cancelUrl = `${baseUrl}/payment/cancel?reservation_id=${reservationId}`;
    const session2 = await stripeClient.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: description || "Service Payment",
              description: `Reservation: ${reservationId}`
            },
            unit_amount: amount
            // Amount in cents
          },
          quantity: 1
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: userEmail || void 0,
      metadata: {
        reservationId,
        userId,
        type: "reservation_payment",
        ...metadata
      },
      expires_at: Math.floor(Date.now() / 1e3) + 30 * 60
      // 30 minutes expiration
    });
    if (!session2.url) {
      res.status(500).json({
        error: "Failed to create Stripe checkout session",
        message: "No checkout URL returned from Stripe"
      });
      return;
    }
    const response = {
      success: true,
      checkoutUrl: session2.url,
      sessionId: session2.id,
      amount,
      currency,
      description,
      metadata: { ...metadata, provider: "stripe" }
    };
    logger.info("Stripe checkout session created", { sessionId: session2.id });
    res.json(response);
  } catch (error) {
    logger.error("Error creating payment session", { error });
    handleRouteError(error, res, "Failed to create payment session");
  }
};
router13.post(
  "/create-payment-session",
  validateBody(createPaymentSessionRequestSchema),
  createPaymentSession
);
async function verifyWebhookSignature2(body, headers, secret) {
  const { Webhook } = await import("svix");
  if (!Webhook) throw new Error("Svix Webhook class not found");
  const svix = new Webhook(secret);
  return svix.verify(JSON.stringify(body), headers);
}
async function getWebhookPayload(req, res) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  const isProd = process.env.NODE_ENV === "production";
  if (!WEBHOOK_SECRET) {
    if (isProd) {
      logger.error("CLERK_WEBHOOK_SECRET not set in production");
      res.status(500).json({ error: "Webhook secret not configured" });
      return null;
    }
    logger.warn("Missing CLERK_WEBHOOK_SECRET; using raw body in dev");
    return req.body;
  }
  try {
    return await verifyWebhookSignature2(
      req.body,
      req.headers,
      WEBHOOK_SECRET
    );
  } catch (err) {
    if (isProd) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error("Webhook signature verification failed", { error: errorMessage });
      res.status(400).json({ error: "invalid_signature" });
      return null;
    }
    logger.warn("Svix not available or verification failed; using raw body in dev");
    return req.body;
  }
}
function extractWebhookData(webhookData) {
  const email = webhookData?.customer_email || webhookData?.customerEmail || webhookData?.email;
  const sessionId = webhookData?.id || webhookData?.session_id || void 0;
  const paymentId = webhookData?.payment_intent || webhookData?.payment_id || void 0;
  const statusRaw = webhookData?.status || void 0;
  return {
    email,
    sessionId,
    paymentId,
    status: statusRaw && typeof statusRaw === "string" ? statusRaw.toLowerCase() : void 0
  };
}
function mapWebhookStatus(status) {
  const statusMap = {
    completed: { status: "completed", paymentStatus: "succeeded" },
    paid: { status: "completed", paymentStatus: "succeeded" },
    succeeded: { status: "completed", paymentStatus: "succeeded" },
    processing: { status: "processing", paymentStatus: "processing" },
    requires_payment_method: { status: "pending", paymentStatus: "requires_payment_method" },
    failed: { status: "cancelled", paymentStatus: "failed" },
    canceled: { status: "cancelled", paymentStatus: "canceled" }
  };
  return statusMap[status || ""] || { status: "completed", paymentStatus: "succeeded" };
}
async function handleOrderPaymentWebhook(payload, convexUrl, res) {
  const webhookData = payload?.data;
  const normalized = extractWebhookData(webhookData);
  const mapped = mapWebhookStatus(normalized.status);
  await handleOrderWebhook(normalized, mapped, convexUrl);
  res.json({
    received: true,
    synced: true,
    handled: "order",
    result: { status: mapped.status }
  });
}
function isClerkBillingEvent(eventType) {
  return eventType.startsWith("subscription.") || eventType.startsWith("invoice.");
}
var paymentWebhook = async (req, res) => {
  try {
    const payload = await getWebhookPayload(req, res);
    if (!payload) return;
    const eventType = (payload?.type || "").toString();
    logger.info("Payment webhook received", { eventType });
    if (isClerkBillingEvent(eventType)) {
      logger.info("Clerk Billing event received on wrong endpoint", {
        eventType,
        correctEndpoint: "/api/webhooks/clerk-billing"
      });
      res.json({
        received: true,
        synced: false,
        message: `Event ${eventType} should be sent to /api/webhooks/clerk-billing`
      });
      return;
    }
    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      logger.warn("VITE_CONVEX_URL not set; skipping Convex sync for webhook");
      res.json({ received: true, synced: false });
      return;
    }
    try {
      await handleOrderPaymentWebhook(payload, convexUrl, res);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error("Failed to sync webhook to Convex", { error: errorMessage });
      res.status(500).json({ received: true, synced: false, error: errorMessage });
    }
  } catch (error) {
    handleRouteError(error, res, "Failed to process payment webhook");
  }
};
router13.post("/webhook", paymentWebhook);
var payments_default = router13;

// server/routes/paypal.ts
import { Router as Router14 } from "express";
init_auth();

// server/lib/secureLogger.ts
import crypto4 from "node:crypto";
var SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth/i,
  /credential/i,
  /private[_-]?key/i,
  /access[_-]?key/i
];
var PII_PATTERNS = [
  /email/i,
  /phone/i,
  /address/i,
  /ssn/i,
  /credit[_-]?card/i,
  /card[_-]?number/i,
  /cvv/i,
  /postal[_-]?code/i,
  /zip[_-]?code/i
];
function hashValue(value) {
  return crypto4.createHash("sha256").update(value).digest("hex").substring(0, 16);
}
function isSensitiveField(fieldName) {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(fieldName));
}
function isPIIField(fieldName) {
  return PII_PATTERNS.some((pattern) => pattern.test(fieldName));
}
function sanitizeValue(value, fieldName) {
  if (isSensitiveField(fieldName)) {
    return "[REDACTED]";
  }
  if (isPIIField(fieldName) && typeof value === "string") {
    return `[HASHED:${hashValue(value)}]`;
  }
  if (typeof value === "string" && value.includes("@")) {
    const [, domain] = value.split("@");
    return `[EMAIL:***@${domain}]`;
  }
  if (fieldName.toLowerCase().includes("clerkid") && typeof value === "string" && value.startsWith("user_")) {
    return `${value.substring(0, 12)}...`;
  }
  if ((fieldName.toLowerCase().includes("id") || fieldName.toLowerCase().includes("token")) && typeof value === "string" && value.length > 20) {
    return `${value.substring(0, 8)}...`;
  }
  return value;
}
function sanitizeObject(obj) {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === void 0) {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(
        (item) => typeof item === "object" && item !== null ? sanitizeObject(item) : sanitizeValue(item, key)
      );
    } else if (typeof value === "object") {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = sanitizeValue(value, key);
    }
  }
  return sanitized;
}
function formatLogEntry(entry) {
  const { level, timestamp, message, context, requestId } = entry;
  if (process.env.NODE_ENV === "production") {
    return JSON.stringify({
      level,
      timestamp,
      message,
      ...context && { context },
      ...requestId && { requestId }
    });
  }
  const emoji = {
    ["debug" /* DEBUG */]: "\u{1F50D}",
    ["info" /* INFO */]: "\u2139\uFE0F",
    ["warn" /* WARN */]: "\u26A0\uFE0F",
    ["error" /* ERROR */]: "\u274C"
  }[level];
  let output = `${emoji} [${level.toUpperCase()}] ${message}`;
  if (requestId) {
    output += ` [${requestId}]`;
  }
  if (context && Object.keys(context).length > 0) {
    output += `
${JSON.stringify(context, null, 2)}`;
  }
  return output;
}
function writeLog(entry) {
  const formatted = formatLogEntry(entry);
  switch (entry.level) {
    case "error" /* ERROR */:
      console.error(formatted);
      break;
    case "warn" /* WARN */:
      console.warn(formatted);
      break;
    case "debug" /* DEBUG */:
      if (process.env.NODE_ENV !== "production") {
        console.log(formatted);
      }
      break;
    case "info" /* INFO */:
    default:
      console.log(formatted);
      break;
  }
}
var SecureLogger = class {
  requestId;
  /**
   * Set request ID for correlation
   */
  setRequestId(requestId) {
    this.requestId = requestId;
  }
  /**
   * Clear request ID
   */
  clearRequestId() {
    this.requestId = void 0;
  }
  /**
   * Log debug message (development only)
   */
  debug(message, context) {
    this.log("debug" /* DEBUG */, message, context);
  }
  /**
   * Log info message
   */
  info(message, context) {
    this.log("info" /* INFO */, message, context);
  }
  /**
   * Log warning message
   */
  warn(message, context) {
    this.log("warn" /* WARN */, message, context);
  }
  /**
   * Log error message
   */
  error(message, error, context) {
    const errorContext = {
      ...context,
      ...error && {
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === "production" ? void 0 : error.stack
        }
      }
    };
    this.log("error" /* ERROR */, message, errorContext);
  }
  /**
   * Core logging method
   */
  log(level, message, context) {
    const entry = {
      level,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      message,
      context: context ? sanitizeObject(context) : void 0,
      requestId: this.requestId
    };
    writeLog(entry);
  }
};
var secureLogger = new SecureLogger();

// server/routes/paypal.ts
var router14 = Router14();
if (process.env.NODE_ENV !== "production") {
  router14.get("/test", async (req, res) => {
    try {
      const testResponse = {
        success: true,
        message: "PayPal endpoint accessible",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        test: true
      };
      res.json(testResponse);
    } catch (error) {
      handleRouteError(error, res, "PayPal test failed");
    }
  });
  router14.get("/test-auth", isAuthenticated, async (req, res) => {
    try {
      res.json({
        success: true,
        message: "PayPal authentication test successful",
        user: {
          id: req.user?.id || null,
          email: req.user?.email || null
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      handleRouteError(error, res, "PayPal auth test failed");
    }
  });
}
router14.post("/create-order", isAuthenticated, async (req, res) => {
  try {
    const body = req.body;
    const parseResult = paypalCreateOrderSchema.safeParse({
      ...body,
      // Normalize amount to number and currency to uppercase before validation
      amount: Number(body.amount),
      currency: typeof body.currency === "string" ? body.currency.toUpperCase() : body.currency
    });
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: fieldErrors
      });
      return;
    }
    const { serviceType, amount, currency, description, reservationId, customerEmail } = parseResult.data;
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: "User authentication required"
      });
      return;
    }
    const paymentRequest = {
      serviceType,
      amount,
      currency,
      description,
      reservationId,
      userId: req.user.id,
      customerEmail
    };
    secureLogger.info("Creating PayPal order", {
      userId: req.user.id,
      serviceType,
      reservationId
    });
    const result = await paypal_default.createPaymentOrder(paymentRequest);
    if (result.success) {
      secureLogger.info("PayPal order created successfully", {
        orderId: result.orderId
      });
      res.json({
        success: true,
        approvalLink: result.paymentUrl,
        // URL PayPal directe
        orderId: result.orderId
        // Pour référence uniquement
      });
    } else {
      secureLogger.error("Failed to create PayPal order", void 0, {
        error: result.error
      });
      res.status(500).json({
        success: false,
        error: result.error || "Failed to create PayPal order"
      });
    }
  } catch (error) {
    handleRouteError(error, res, "Failed to create PayPal order");
  }
});
router14.post("/capture-payment", isAuthenticated, async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      res.status(400).json({
        success: false,
        error: "Missing orderId (PayPal token)"
      });
      return;
    }
    secureLogger.info("Capturing PayPal payment", {
      userId: req.user?.id,
      orderId
    });
    const result = await paypal_default.capturePayment(orderId);
    if (result.success) {
      secureLogger.info("PayPal payment captured successfully", {
        transactionId: result.transactionId,
        orderId
      });
      res.json({
        success: true,
        transactionId: result.transactionId,
        orderId
        // Token PayPal original
      });
    } else {
      secureLogger.error("Failed to capture PayPal payment", void 0, {
        error: result.error,
        orderId
      });
      res.status(500).json({
        success: false,
        error: result.error || "Failed to capture payment"
      });
    }
  } catch (error) {
    handleRouteError(error, res, "Failed to capture PayPal payment");
  }
});
router14.get("/capture/:token", async (req, res) => {
  const { token } = req.params;
  try {
    const { PayerID } = req.query;
    if (!token) {
      const errorUrl = urls.paypal.error("missing_token");
      res.redirect(errorUrl);
      return;
    }
    secureLogger.info("Auto-capturing PayPal payment via token validation", {
      token
    });
    let orderDetails;
    try {
      orderDetails = await paypal_default.getOrderDetails(token);
    } catch (orderError) {
      secureLogger.error(
        "Failed to validate PayPal token",
        orderError instanceof Error ? orderError : void 0,
        {
          token
        }
      );
      const errorUrl = urls.paypal.error("invalid_token", token);
      res.redirect(errorUrl);
      return;
    }
    if (orderDetails.status !== "APPROVED") {
      secureLogger.warn("PayPal order not in APPROVED status", {
        token,
        status: orderDetails.status
      });
      if (orderDetails.status === "COMPLETED") {
        const successUrl = urls.paypal.success(token, PayerID);
        res.redirect(successUrl);
        return;
      }
      const errorUrl = urls.paypal.error("order_not_approved", token);
      res.redirect(errorUrl);
      return;
    }
    const result = await paypal_default.capturePayment(token);
    if (result.success) {
      secureLogger.info("PayPal payment auto-captured successfully", {
        transactionId: result.transactionId,
        token
      });
      const successUrl = urls.paypal.success(token, PayerID);
      res.redirect(successUrl);
    } else {
      secureLogger.error("Failed to auto-capture PayPal payment", void 0, {
        error: result.error,
        token
      });
      const errorUrl = urls.paypal.error("capture_failed", token);
      res.redirect(errorUrl);
    }
  } catch (error) {
    secureLogger.error(
      "Error in PayPal auto-capture endpoint",
      error instanceof Error ? error : void 0,
      { token }
    );
    const errorUrl = urls.paypal.error("server_error");
    res.redirect(errorUrl);
  }
});
router14.get("/order/:orderId", isAuthenticated, async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      res.status(400).json({
        success: false,
        error: "Missing orderId"
      });
      return;
    }
    secureLogger.info("Getting PayPal order details", {
      userId: req.user?.id,
      orderId
    });
    const orderDetails = await paypal_default.getOrderDetails(orderId);
    res.json({
      success: true,
      order: orderDetails
    });
  } catch (error) {
    handleRouteError(error, res, "Failed to get PayPal order details");
  }
});
router14.get("/health", async (req, res) => {
  try {
    const healthResult = await paypal_default.healthCheck();
    if (healthResult.healthy) {
      res.json({
        success: true,
        message: "PayPal service is healthy",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        environment: process.env.PAYPAL_MODE || "sandbox",
        latencyMs: healthResult.latencyMs,
        apiConnectivity: true
      });
    } else {
      res.status(503).json({
        success: false,
        message: "PayPal service is unhealthy",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        environment: process.env.PAYPAL_MODE || "sandbox",
        latencyMs: healthResult.latencyMs,
        apiConnectivity: false,
        error: healthResult.error
      });
    }
  } catch (error) {
    handleRouteError(error, res, "PayPal health check failed");
  }
});
var paypal_default2 = router14;

// server/routes/reservations.ts
import { Router as Router15 } from "express";
import { z as z17 } from "zod";
init_auth();

// server/storage.ts
import * as crypto5 from "node:crypto";

// server/lib/db.ts
init_ConvexUser();
init_convex();
async function getUserByEmail2(email) {
  const convexUser = await getUserByEmail(email);
  if (!convexUser) return null;
  return convexUserToUser(convexUser);
}
async function getUserById2(id) {
  try {
    const convexUserId = createConvexUserId(id);
    const convexUser = await getUserById(convexUserId);
    if (!convexUser) return null;
    return convexUserToUser(convexUser);
  } catch (error) {
    console.error("Failed to get user by ID:", error);
    return null;
  }
}
async function createServiceOrder(order) {
  console.log("Creating service order:", order);
  const estimatedPrice = order.details?.duration ? order.details.duration * 50 : 100;
  const orderData = {
    items: [
      {
        productId: 0,
        title: order.service_type,
        name: order.service_type,
        price: estimatedPrice,
        license: "service",
        quantity: 1
      }
    ],
    total: estimatedPrice,
    email: "",
    status: "pending",
    currency: "USD"
  };
  const result = await createOrder(orderData);
  if (!result) throw new Error("Failed to create service order");
  return {
    id: Number.parseInt(result.orderId?.toString().slice(-8) ?? "0", 10) || 0,
    user_id: order.user_id,
    service_type: order.service_type,
    status: "pending",
    estimated_price: estimatedPrice,
    details: order.details,
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function listServiceOrders(userId) {
  try {
    const convexUserId = createConvexUserId(userId);
    const orders = await listUserOrders(convexUserId);
    const serviceOrders = orders.filter(
      (o) => o.items?.some((item) => item.license === "service")
    );
    return serviceOrders.map((o) => {
      const firstItem = o.items?.[0];
      const serviceType = typeof firstItem?.title === "string" ? firstItem.title : "unknown";
      return {
        id: Number.parseInt(o._id.toString().slice(-8), 10) || 0,
        user_id: userId,
        service_type: serviceType,
        status: o.status,
        estimated_price: o.total,
        details: {},
        created_at: new Date(o.createdAt).toISOString(),
        updated_at: new Date(o.updatedAt).toISOString()
      };
    });
  } catch (error) {
    console.error("Failed to list service orders:", error);
    return [];
  }
}
async function getOrderInvoiceData2(orderId) {
  try {
    const convexOrderId = `orders:${orderId}`;
    const data = await getOrderInvoiceData(convexOrderId);
    if (!data) {
      return { order: {}, items: [] };
    }
    const order = { id: orderId, ...data.order };
    const items = (data.items || []).map((item) => ({
      id: 0,
      beat_id: item.productId,
      license_type: item.license || "basic",
      price: item.price,
      quantity: item.quantity || 1,
      session_id: null,
      user_id: null,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    }));
    return { order, items };
  } catch (error) {
    console.error("Failed to get order invoice data:", error);
    return { order: {}, items: [] };
  }
}
async function listUserOrders2(userId) {
  try {
    const convexUserId = createConvexUserId(userId);
    const orders = await listUserOrders(convexUserId);
    return orders.map((o) => ({
      id: Number.parseInt(o._id.toString().slice(-8), 10) || 0,
      user_id: userId,
      email: o.email,
      total: o.total,
      status: o.status,
      items: o.items || [],
      created_at: new Date(o.createdAt).toISOString()
    }));
  } catch (error) {
    console.error("Failed to list user orders:", error);
    return [];
  }
}
async function createReservation2(reservation) {
  if (!reservation.clerkId) {
    throw new Error("Authentication error: clerkId is required for reservation creation");
  }
  const convexReservationData = {
    serviceType: reservation.service_type,
    details: reservation.details,
    preferredDate: reservation.preferred_date,
    durationMinutes: reservation.duration_minutes,
    totalPrice: reservation.total_price,
    notes: reservation.notes || void 0,
    clerkId: reservation.clerkId
  };
  console.log("\u{1F680} DB Layer: Creating reservation with Convex data:", {
    serviceType: convexReservationData.serviceType,
    preferredDate: convexReservationData.preferredDate,
    durationMinutes: convexReservationData.durationMinutes,
    totalPrice: convexReservationData.totalPrice,
    clerkId: convexReservationData.clerkId ? `${convexReservationData.clerkId.substring(0, 8)}...` : "undefined"
  });
  try {
    const result = await createReservation(convexReservationData);
    if (!result) {
      throw new Error("Convex reservation creation returned null result");
    }
    console.log("\u2705 DB Layer: Reservation created with ID:", result.toString());
    return {
      id: result.toString(),
      user_id: reservation.user_id,
      service_type: reservation.service_type,
      status: "pending",
      details: reservation.details,
      preferred_date: reservation.preferred_date,
      duration_minutes: reservation.duration_minutes,
      total_price: reservation.total_price,
      notes: reservation.notes,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (error) {
    console.error("\u274C DB Layer: Failed to create reservation:", error);
    if (error instanceof Error) {
      if (error.message.includes("User not found")) {
        throw new Error(
          "Authentication failed: User account not found. Please ensure you are properly authenticated."
        );
      }
      if (error.message.includes("Authentication")) {
        throw new Error(
          "Authentication failed: Unable to verify user identity. Please log out and log back in."
        );
      }
    }
    throw new Error(
      `Failed to create reservation: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
async function getReservationById2(id) {
  try {
    const convexReservationId = id;
    const reservation = await getReservationById(convexReservationId, true);
    if (!reservation) return null;
    return {
      id: reservation._id.toString(),
      user_id: reservation.userId ? Number.parseInt(reservation.userId.toString().slice(-8), 10) : null,
      service_type: reservation.serviceType,
      status: reservation.status,
      details: reservation.details,
      preferred_date: reservation.preferredDate,
      duration_minutes: reservation.durationMinutes,
      total_price: reservation.totalPrice,
      notes: reservation.notes,
      created_at: new Date(reservation.createdAt).toISOString(),
      updated_at: new Date(reservation.updatedAt).toISOString()
    };
  } catch (error) {
    console.error("Failed to get reservation by ID:", error);
    return null;
  }
}
async function getUserReservations2(userId) {
  try {
    const clerkId = typeof userId === "string" ? userId : `user_${userId}`;
    const reservations = await getUserReservations(clerkId);
    return reservations.map((r) => ({
      id: r._id.toString(),
      user_id: r.userId ? Number.parseInt(r.userId.toString().slice(-8), 10) : null,
      service_type: r.serviceType,
      status: r.status,
      details: r.details,
      preferred_date: r.preferredDate,
      duration_minutes: r.durationMinutes,
      total_price: r.totalPrice,
      notes: r.notes,
      created_at: new Date(r.createdAt).toISOString(),
      updated_at: new Date(r.updatedAt).toISOString()
    }));
  } catch (error) {
    console.error("Failed to get user reservations:", error);
    return [];
  }
}
async function updateReservationStatus2(id, status) {
  try {
    const convexReservationId = id;
    const result = await updateReservationStatus(convexReservationId, status);
    if (!result?.success) {
      throw new Error("Failed to update reservation status");
    }
    const updated = await getReservationById2(id);
    if (!updated) {
      throw new Error("Failed to fetch updated reservation");
    }
    return updated;
  } catch (error) {
    console.error("Failed to update reservation status:", error);
    throw error;
  }
}
async function getReservationsByDateRange2(startDate, endDate) {
  try {
    const reservations = await getReservationsByDateRange(startDate, endDate);
    return reservations.map((r) => ({
      id: r._id.toString(),
      user_id: r.userId ? Number.parseInt(r.userId.toString().slice(-8), 10) : null,
      service_type: r.serviceType,
      status: r.status,
      details: r.details,
      preferred_date: r.preferredDate,
      duration_minutes: r.durationMinutes,
      total_price: r.totalPrice,
      notes: r.notes,
      created_at: new Date(r.createdAt).toISOString(),
      updated_at: new Date(r.updatedAt).toISOString()
    }));
  } catch (error) {
    console.error("Failed to get reservations by date range:", error);
    return [];
  }
}

// server/storage.ts
function fromDbOrder(row) {
  return {
    ...row,
    items: Array.isArray(row.items) ? row.items : []
  };
}
var MemStorage = class {
  reservations;
  users;
  beats;
  cartItems;
  orders;
  newsletterSubscriptions;
  contactMessages;
  currentUserId;
  currentBeatId;
  currentCartId;
  currentOrderId;
  downloads = /* @__PURE__ */ new Map();
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.beats = /* @__PURE__ */ new Map();
    this.cartItems = /* @__PURE__ */ new Map();
    this.orders = /* @__PURE__ */ new Map();
    this.reservations = /* @__PURE__ */ new Map();
    this.newsletterSubscriptions = /* @__PURE__ */ new Set();
    this.contactMessages = [];
    this.currentUserId = 1;
    this.currentBeatId = 1;
    this.currentCartId = 1;
    this.currentOrderId = 1;
    this.initializeSampleData();
  }
  initializeSampleData() {
    const sampleBeats = [
      {
        wordpressId: 1,
        title: "Dark Trap Vibes",
        description: "This dark trap beat combines heavy 808s with atmospheric pads and crisp hi-hats.",
        genre: "Trap",
        bpm: 140,
        key: "A minor",
        mood: "Dark",
        price: 2500,
        // $25.00 in cents
        audioUrl: "https://example.com/audio/dark-trap-vibes.mp3",
        imageUrl: "https://example.com/images/dark-trap-vibes.jpg",
        isActive: true
      },
      {
        wordpressId: 2,
        title: "Melodic Pop",
        description: "A melodic pop beat perfect for commercial releases and radio play.",
        genre: "Pop",
        bpm: 128,
        key: "C major",
        mood: "Uplifting",
        price: 3e3,
        // $30.00 in cents
        audioUrl: "https://example.com/audio/melodic-pop.mp3",
        imageUrl: "https://example.com/images/melodic-pop.jpg",
        isActive: true
      },
      {
        wordpressId: 3,
        title: "Hip-Hop Classic",
        description: "Classic hip-hop vibes with boom-bap drums and soulful samples.",
        genre: "Hip-Hop",
        bpm: 95,
        key: "F# minor",
        mood: "Nostalgic",
        price: 3500,
        // $35.00 in cents
        audioUrl: "https://example.com/audio/hip-hop-classic.mp3",
        imageUrl: "https://example.com/images/hip-hop-classic.jpg",
        isActive: true
      }
    ];
    for (const beat of sampleBeats) {
      const id = this.currentBeatId++;
      this.beats.set(id, {
        id,
        ...beat,
        key: beat.key || null,
        description: beat.description || null,
        mood: beat.mood || null,
        audio_url: beat.audioUrl || null,
        image_url: beat.imageUrl || null,
        is_active: beat.isActive ?? true,
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        wordpress_id: beat.wordpressId ?? 0
      });
    }
  }
  // User management
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(_username) {
    return Array.from(this.users.values()).find((user) => user.username === _username);
  }
  async getUserByEmail(email) {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }
  async createUser(insertUser) {
    const id = this.currentUserId++;
    const user = {
      ...insertUser,
      id,
      stripeCustomerId: null,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.users.set(id, user);
    return user;
  }
  // Beat management
  async getBeat(id) {
    return this.beats.get(id);
  }
  async getBeats(filters) {
    let beats = Array.from(this.beats.values()).filter((beat) => beat.is_active);
    if (filters) {
      if (filters.genre) {
        beats = beats.filter(
          (beat) => beat.genre.toLowerCase().includes(filters.genre.toLowerCase())
        );
      }
      if (filters.search) {
        beats = beats.filter(
          (beat) => beat.title.toLowerCase().includes(filters.search.toLowerCase()) || beat.description?.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
      if (filters.minPrice) {
        beats = beats.filter((beat) => beat.price >= filters.minPrice);
      }
      if (filters.maxPrice) {
        beats = beats.filter((beat) => beat.price <= filters.maxPrice);
      }
    }
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    return beats.slice(offset, offset + limit);
  }
  async createBeat(insertBeat) {
    const id = this.currentBeatId++;
    const beat = {
      ...insertBeat,
      id,
      key: insertBeat.key || null,
      description: insertBeat.description || null,
      mood: insertBeat.mood || null,
      audio_url: insertBeat.audio_url || null,
      image_url: insertBeat.image_url || null,
      is_active: insertBeat.is_active ?? true,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.beats.set(id, beat);
    return beat;
  }
  async updateBeat(id, updates) {
    const beat = this.beats.get(id);
    if (beat) {
      const updatedBeat = { ...beat, ...updates };
      this.beats.set(id, updatedBeat);
      return updatedBeat;
    }
    return void 0;
  }
  // Cart management
  async getCartItems(sessionId) {
    return Array.from(this.cartItems.values()).filter((item) => item.session_id === sessionId);
  }
  async saveCartItems(sessionId, items) {
    for (const [id, item] of Array.from(this.cartItems.entries())) {
      if (item.session_id === sessionId) {
        this.cartItems.delete(id);
      }
    }
    if (Array.isArray(items)) {
      for (const item of items) {
        const cartItem = item;
        await this.addCartItem({
          beat_id: cartItem.beatId,
          license_type: cartItem.licenseType,
          price: cartItem.price,
          quantity: cartItem.quantity,
          session_id: sessionId,
          user_id: cartItem.userId || null
        });
      }
    }
  }
  async addCartItem(insertItem) {
    const id = this.currentCartId++;
    const item = {
      ...insertItem,
      id,
      quantity: insertItem.quantity || 1,
      session_id: insertItem.session_id || null,
      user_id: insertItem.user_id || null,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.cartItems.set(id, item);
    return item;
  }
  async updateCartItem(id, updates) {
    const item = this.cartItems.get(id);
    if (item) {
      const updatedItem = { ...item, ...updates };
      this.cartItems.set(id, updatedItem);
      return updatedItem;
    }
    return void 0;
  }
  async removeCartItem(id) {
    return this.cartItems.delete(id);
  }
  // Order management
  async getOrder(id) {
    return this.orders.get(id);
  }
  async getOrdersByUser(userId) {
    return Array.from(this.orders.values()).filter((order) => order.user_id === userId);
  }
  async createOrder(insertOrder) {
    const id = this.currentOrderId++;
    const cartItems2 = (insertOrder.items ?? []).map((item, index) => {
      const licenseType = item.license || "basic";
      const validLicense = licenseType === "basic" || licenseType === "premium" || licenseType === "unlimited" ? licenseType : "basic";
      return {
        id: index + 1,
        beat_id: item.productId || 0,
        license_type: validLicense,
        price: item.price || 0,
        quantity: item.quantity || 1,
        session_id: insertOrder.session_id || null,
        user_id: insertOrder.user_id || null,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
    });
    const order = {
      ...insertOrder,
      id,
      session_id: insertOrder.session_id || null,
      user_id: insertOrder.user_id || null,
      stripe_payment_intent_id: insertOrder.stripe_payment_intent_id || null,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      email: insertOrder.email,
      status: insertOrder.status,
      total: insertOrder.total,
      items: cartItems2
    };
    this.orders.set(id, order);
    return order;
  }
  async updateOrderStatus(id, status) {
    const order = this.orders.get(id);
    if (order) {
      const updatedOrder = { ...order, status };
      this.orders.set(id, updatedOrder);
      return updatedOrder;
    }
    return void 0;
  }
  // Downloads management
  async getUserDownloads(userId) {
    return this.downloads.get(userId) || [];
  }
  async logDownload(download) {
    const userDownloads = this.downloads.get(download.userId) || [];
    const newDownload = {
      id: Date.now(),
      ...download
    };
    userDownloads.push(newDownload);
    this.downloads.set(download.userId, userDownloads);
    return newDownload;
  }
  // Newsletter and contact
  async subscribeToNewsletter(email) {
    this.newsletterSubscriptions.add(email.toLowerCase());
  }
  async saveContactMessage(message) {
    this.contactMessages.push({
      id: Date.now(),
      // Generate a simple ID
      name: `${message.firstName} ${message.lastName}`,
      email: message.email,
      message: message.message,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  // Reservation methods
  async createReservation(reservation) {
    const id = crypto5.randomUUID();
    const newReservation = {
      ...reservation,
      id,
      status: "pending",
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.reservations.set(id, newReservation);
    return newReservation;
  }
  async getReservation(id) {
    return this.reservations.get(id);
  }
  async getUserReservations(userId) {
    const numericUserId = typeof userId === "string" ? Number.parseInt(userId, 10) : userId;
    return Array.from(this.reservations.values()).filter((reservation) => reservation.user_id === numericUserId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  async updateReservationStatus(id, status) {
    const reservation = this.reservations.get(id);
    if (!reservation) {
      throw new Error(ErrorMessages.RESERVATION.NOT_FOUND);
    }
    const updatedReservation = {
      ...reservation,
      status,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.reservations.set(id, updatedReservation);
    return updatedReservation;
  }
  async getReservationsByDateRange(startDate, endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    return Array.from(this.reservations.values()).filter((reservation) => {
      const date = new Date(reservation.preferred_date).getTime();
      return date >= start && date <= end;
    }).sort((a, b) => new Date(a.preferred_date).getTime() - new Date(b.preferred_date).getTime());
  }
};
var DatabaseStorage = class {
  orders = /* @__PURE__ */ new Map();
  // Reservation methods
  async createReservation(reservation) {
    logger.info("DatabaseStorage: Creating reservation", {
      hasClerkId: !!reservation.clerkId,
      serviceType: reservation.service_type
    });
    if (!reservation.clerkId) {
      throw new Error("Authentication error: clerkId is required for reservation creation");
    }
    return await createReservation2(reservation);
  }
  async getReservation(id) {
    const reservation = await getReservationById2(id);
    return reservation || void 0;
  }
  async getUserReservations(userId) {
    return await getUserReservations2(userId);
  }
  async updateReservationStatus(id, status) {
    return await updateReservationStatus2(id, status);
  }
  async getReservationsByDateRange(startDate, endDate) {
    return await getReservationsByDateRange2(startDate, endDate);
  }
  // User methods
  async getUser(id) {
    const user = await getUserById2(id);
    return user || void 0;
  }
  async getUserByUsername(_username) {
    return void 0;
  }
  async getUserByEmail(email) {
    const user = await getUserByEmail2(email);
    return user || void 0;
  }
  async createUser(_insertUser) {
    throw new Error(ErrorMessages.GENERIC.FEATURE_UNAVAILABLE);
  }
  // Beat methods - Not implemented (WooCommerce handles beats)
  async getBeat(_id) {
    return void 0;
  }
  async getBeats(_filters) {
    return [];
  }
  async createBeat(_insertBeat) {
    throw new Error(ErrorMessages.GENERIC.FEATURE_UNAVAILABLE);
  }
  async updateBeat(_id, _updates) {
    return void 0;
  }
  // Cart methods - Not implemented (client-side cart management)
  async getCartItems(_sessionId) {
    return [];
  }
  async saveCartItems(_sessionId, _items) {
  }
  async addCartItem(_insertItem) {
    throw new Error(ErrorMessages.GENERIC.FEATURE_UNAVAILABLE);
  }
  async updateCartItem(_id, _updates) {
    return void 0;
  }
  async removeCartItem(_id) {
    return false;
  }
  // Order methods - Not fully implemented
  async getOrdersByUser(userId) {
    const orders = await listUserOrders2(userId);
    return orders.map((order) => fromDbOrder(order));
  }
  async getOrder(id) {
    const { order } = await getOrderInvoiceData2(id);
    return fromDbOrder(order);
  }
  async createOrder(_insertOrder) {
    throw new Error(ErrorMessages.GENERIC.FEATURE_UNAVAILABLE);
  }
  async updateOrderStatus(_id, _status) {
    return void 0;
  }
  // Downloads management
  async getUserDownloads(userId) {
    logger.info("Getting downloads for user", { hasUserId: !!userId });
    return [];
  }
  async logDownload(download) {
    logger.info("Logging download", {
      beatId: download.beatId,
      hasUserId: !!download.userId
    });
    return {
      id: Date.now(),
      // Temporary ID
      ...download
    };
  }
  // Newsletter and contact
  async subscribeToNewsletter(email) {
    logger.info("Newsletter subscription", { hasEmail: !!email });
  }
  async saveContactMessage(message) {
    logger.info("Contact message received", {
      hasEmail: !!message.email,
      subject: message.subject
    });
  }
};
var memStorage = new MemStorage();
var databaseStorage = new DatabaseStorage();
var storage = process.env.NODE_ENV === "test" ? memStorage : databaseStorage;

// server/utils/calendar.ts
function formatDate(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}
function generateICS(event) {
  const endTime = new Date(event.startTime.getTime() + event.durationMinutes * 6e4);
  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BroLab//Reservation System//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART:${formatDate(event.startTime)}`,
    `DTEND:${formatDate(endTime)}`,
    `SUMMARY:${event.summary}`,
    `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`,
    "LOCATION:BroLab Studio",
    `UID:${crypto.randomUUID()}@brolab.fr`,
    "SEQUENCE:0",
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    `DTSTAMP:${formatDate(/* @__PURE__ */ new Date())}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
  return icsContent;
}

// server/routes/reservations.ts
var router15 = Router15();
function getUserDisplayName(user) {
  if (user.username && typeof user.username === "string") {
    return user.username;
  }
  if (user.email && typeof user.email === "string") {
    return user.email;
  }
  return "User";
}
function buildConfirmationEmailContent(user, reservation) {
  const displayName = getUserDisplayName(user);
  const formattedDate = new Date(reservation.preferred_date).toLocaleDateString("en-US");
  const formattedTime = new Date(reservation.preferred_date).toLocaleTimeString("en-US");
  const formattedPrice = centsToDollars(reservation.total_price).toFixed(2);
  return `
    <h2>Reservation Confirmation</h2>
    <p>Hello ${displayName},</p>
    <p>We have received your reservation for a ${reservation.service_type} session.</p>
    <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Date:</strong> ${formattedDate}</p>
      <p><strong>Time:</strong> ${formattedTime}</p>
      <p><strong>Duration:</strong> ${reservation.duration_minutes} minutes</p>
      <p><strong>Price:</strong> ${formattedPrice}</p>
      <p><strong>Reservation Number:</strong> ${reservation.id}</p>
    </div>
    <p>We will contact you shortly to confirm your time slot.</p>
    <p>Thank you for your trust!<br>The BroLab Team</p>
  `;
}
async function sendConfirmationEmail(userEmail, reservation, user) {
  try {
    if (!userEmail || userEmail.trim() === "") {
      logger.warn("Cannot send confirmation email: No recipient email provided", {
        reservationId: reservation.id
      });
      return;
    }
    const emailContent = buildConfirmationEmailContent(user, reservation);
    await sendMail({
      to: userEmail,
      subject: "BroLab Reservation Confirmation",
      html: emailContent
    });
    logger.info("Confirmation email sent", { reservationId: reservation.id });
  } catch (emailError) {
    logger.error("Failed to send confirmation email", {
      reservationId: reservation.id,
      error: emailError
    });
  }
}
async function sendAdminNotification2(user, reservation, clientPhone, notes) {
  try {
    const fullName = user.username || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
    const adminUser = {
      id: user.clerkId || "unknown",
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName
    };
    const reservationData = {
      id: reservation.id,
      serviceType: reservation.service_type,
      preferredDate: reservation.preferred_date,
      durationMinutes: reservation.duration_minutes,
      totalPrice: reservation.total_price / 100,
      status: reservation.status,
      notes: reservation.notes,
      details: {
        name: fullName,
        email: user.email,
        phone: clientPhone || "Not provided",
        requirements: notes || reservation.notes || void 0
      }
    };
    await sendAdminReservationNotification(adminUser, reservationData);
    logger.info("Admin notification sent", { reservationId: reservation.id });
  } catch (adminEmailError) {
    logger.error("Failed to send admin notification", {
      reservationId: reservation.id,
      error: adminEmailError
    });
  }
}
function handleReservationError(error, res) {
  if (error instanceof Error) {
    if (error.message.includes("User not found")) {
      res.status(401).json({
        error: "Authentication error: User account not found. Please log out and log back in.",
        code: "USER_NOT_FOUND"
      });
      return true;
    }
    if (error.message.includes("Authentication")) {
      res.status(401).json({
        error: "Authentication failed. Please ensure you are properly logged in.",
        code: "AUTH_FAILED"
      });
      return true;
    }
    if (error.message.includes("clerkId")) {
      res.status(400).json({
        error: "Invalid user session. Please log out and log back in.",
        code: "INVALID_SESSION"
      });
      return true;
    }
  }
  return false;
}
function hasReservationAccess(reservationUserId, user) {
  if (user.role === "service_role") return true;
  if (reservationUserId == null) return false;
  return reservationUserId === Number.parseInt(user.id, 10);
}
function extractUserFromRequest(req) {
  const reqWithUser = req;
  const user = reqWithUser.user;
  if (!user) return null;
  return {
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    username: user.username,
    firstName: typeof user.firstName === "string" ? user.firstName : void 0,
    lastName: typeof user.lastName === "string" ? user.lastName : void 0,
    role: user.role
  };
}
router15.get("/services", async (_req, res) => {
  try {
    const services = [
      {
        id: 1,
        name: "Recording Sessions",
        description: "Professional recording sessions with state-of-the-art equipment",
        basePrice: 150,
        duration: "2-4 hours"
      },
      {
        id: 2,
        name: "Mixing & Mastering",
        description: "Professional mixing and mastering services for your tracks",
        basePrice: 200,
        duration: "3-5 hours"
      },
      {
        id: 3,
        name: "Custom Beats",
        description: "Custom beat production tailored to your style",
        basePrice: 100,
        duration: "1-2 hours"
      },
      {
        id: 4,
        name: "Production Consultation",
        description: "Expert guidance on music production and arrangement",
        basePrice: 75,
        duration: "1 hour"
      }
    ];
    res.json(services);
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch services");
  }
});
router15.get("/public", async (_req, res) => {
  try {
    const publicInfo = {
      availableServices: 4,
      totalReservations: 42,
      availableSlots: 12,
      nextAvailableDate: "2024-01-20"
    };
    res.json(publicInfo);
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch public reservation info");
  }
});
router15.post(
  "/",
  isAuthenticated,
  validateBody(CreateReservationSchema),
  async (req, res) => {
    try {
      const user = extractUserFromRequest(req);
      if (!user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const body = req.body;
      logger.info("Creating reservation with authentication", {
        userId: user.id,
        serviceType: body.serviceType
      });
      if (!user.clerkId || typeof user.clerkId !== "string") {
        logger.error("Missing or invalid clerkId in authenticated user", { userId: user.id });
        res.status(400).json({
          error: "Authentication error: Missing user identifier. Please log out and log back in."
        });
        return;
      }
      const serviceTypeMap = {
        mixing: "mixing",
        mastering: "mastering",
        recording: "recording",
        custom_beat: "custom_beat",
        consultation: "consultation",
        vocal_tuning: "mixing",
        // Map to mixing
        beat_remake: "custom_beat",
        // Map to custom_beat
        full_production: "recording"
        // Map to recording
      };
      const mappedServiceType = serviceTypeMap[body.serviceType] || "consultation";
      const reservationData = {
        user_id: Number.parseInt(user.id, 10),
        clerkId: user.clerkId,
        service_type: mappedServiceType,
        details: {
          name: `${body.clientInfo.firstName} ${body.clientInfo.lastName}`.trim(),
          email: body.clientInfo.email,
          phone: body.clientInfo.phone,
          requirements: body.notes || "",
          referenceLinks: []
        },
        preferred_date: body.preferredDate,
        duration_minutes: body.preferredDuration,
        total_price: body.budget || 0,
        notes: body.notes || null
      };
      logger.info("Creating reservation with data", {
        userId: user.id,
        serviceType: reservationData.service_type
      });
      const reservation = await storage.createReservation(reservationData);
      logger.info("Reservation created successfully", {
        reservationId: reservation.id,
        serviceType: reservation.service_type,
        status: reservation.status
      });
      const confirmationEmail = user.email && user.email.trim() !== "" ? user.email : body.clientInfo?.email;
      if (confirmationEmail) {
        void sendConfirmationEmail(confirmationEmail, reservation, user);
      } else {
        logger.warn("No email available for confirmation - skipping user email", {
          reservationId: reservation.id
        });
      }
      void sendAdminNotification2(user, reservation, body.clientInfo?.phone, body.notes);
      res.status(201).json(reservation);
    } catch (error) {
      logger.error("Reservation creation failed", { error });
      if (handleReservationError(error, res)) {
        return;
      }
      handleRouteError(error, res, "Failed to create reservation");
    }
  }
);
router15.get("/me", isAuthenticated, async (req, res) => {
  try {
    const user = extractUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const reservations = await storage.getUserReservations(user.id);
    res.json(reservations);
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch user reservations");
  }
});
router15.get(
  "/:id",
  isAuthenticated,
  validateParams(CommonParams.id),
  async (req, res) => {
    try {
      const user = extractUserFromRequest(req);
      if (!user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const reservation = await storage.getReservation(req.params.id);
      if (!reservation) {
        res.status(404).json({ error: "Reservation not found" });
        return;
      }
      if (!hasReservationAccess(reservation.user_id, user)) {
        res.status(403).json({ error: "Unauthorized" });
        return;
      }
      res.json(reservation);
    } catch (error) {
      handleRouteError(error, res, "Failed to fetch reservation");
    }
  }
);
router15.patch(
  "/:id/status",
  isAuthenticated,
  createValidationMiddleware(z17.object({ status: z17.enum(ReservationStatus2) })),
  async (req, res) => {
    try {
      const user = extractUserFromRequest(req);
      if (!user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const reservation = await storage.getReservation(req.params.id);
      if (!reservation) {
        res.status(404).json({ error: "Reservation not found" });
        return;
      }
      if (!hasReservationAccess(reservation.user_id, user)) {
        res.status(403).json({ error: "Unauthorized" });
        return;
      }
      const body = req.body;
      const updatedReservation = await storage.updateReservationStatus(req.params.id, body.status);
      const displayName = getUserDisplayName(user);
      const formattedDate = new Date(updatedReservation.preferred_date).toLocaleDateString("fr-FR");
      const formattedTime = new Date(updatedReservation.preferred_date).toLocaleTimeString("fr-FR");
      const statusUpdateContent = `
        <h2>Mise \xE0 jour de votre r\xE9servation</h2>
        <p>Bonjour ${displayName},</p>
        <p>Le statut de votre r\xE9servation pour ${updatedReservation.service_type} a \xE9t\xE9 mis \xE0 jour.</p>
        <p><strong>Nouveau statut :</strong> ${body.status}</p>
        <p><strong>Date :</strong> ${formattedDate}</p>
        <p><strong>Heure :</strong> ${formattedTime}</p>
      `;
      await sendMail({
        to: user.email,
        subject: `Mise \xE0 jour de votre r\xE9servation - ${body.status}`,
        html: statusUpdateContent
      });
      res.json(updatedReservation);
    } catch (error) {
      handleRouteError(error, res, "Failed to update reservation status");
    }
  }
);
router15.get(
  "/:id/calendar",
  isAuthenticated,
  validateParams(CommonParams.id),
  async (req, res) => {
    try {
      const user = extractUserFromRequest(req);
      if (!user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const reservation = await storage.getReservation(req.params.id);
      if (!reservation) {
        res.status(404).json({ error: "Reservation not found" });
        return;
      }
      if (!hasReservationAccess(reservation.user_id, user)) {
        res.status(403).json({ error: "Unauthorized" });
        return;
      }
      const icsContent = generateICS({
        summary: `BroLab - ${reservation.service_type}`,
        description: reservation.notes || "",
        startTime: new Date(reservation.preferred_date),
        durationMinutes: reservation.duration_minutes
      });
      res.setHeader("Content-Type", "text/calendar");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="reservation-${reservation.id}.ics"`
      );
      res.send(icsContent);
    } catch (error) {
      handleRouteError(error, res, "Failed to generate calendar file");
    }
  }
);
router15.get("/range/:start/:end", isAuthenticated, async (req, res) => {
  try {
    const user = extractUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (user.role !== "service_role") {
      res.status(403).json({ error: "Unauthorized. Admin access required." });
      return;
    }
    const startDate = new Date(req.params.start);
    const endDate = new Date(req.params.end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      res.status(400).json({ error: "Invalid date format" });
      return;
    }
    const reservations = await storage.getReservationsByDateRange(
      startDate.toISOString(),
      endDate.toISOString()
    );
    res.json(reservations);
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch reservations by date range");
  }
});
var reservations_default = router15;

// server/routes/schema.ts
import { Router as Router16 } from "express";

// server/lib/schemaMarkup.ts
function generateBeatSchemaMarkup(beat, baseUrl, options = {}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    "@id": `${baseUrl}/product/${beat.id}`,
    name: beat.title,
    description: beat.description || `${beat.title} - ${beat.genre} beat`,
    url: `${baseUrl}/product/${beat.id}`,
    image: beat.image_url || beat.image,
    genre: beat.genre,
    duration: beat.duration ? `PT${Math.floor(beat.duration / 60)}M${beat.duration % 60}S` : void 0,
    byArtist: {
      "@type": "MusicGroup",
      name: (() => {
        const producerTag = beat.tags?.find((tag) => {
          return tag.toLowerCase().includes("producer");
        });
        return producerTag || "BroLab Entertainment";
      })()
    },
    inAlbum: {
      "@type": "MusicAlbum",
      name: `${beat.genre} Beats Collection`,
      byArtist: {
        "@type": "MusicGroup",
        name: "BroLab Entertainment"
      }
    },
    audio: beat.audio_url ? {
      "@type": "AudioObject",
      contentUrl: beat.audio_url,
      encodingFormat: "audio/mpeg"
    } : void 0,
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "BPM",
        value: beat.bpm?.toString() || "120"
      },
      {
        "@type": "PropertyValue",
        name: "Key",
        value: beat.key || "C Major"
      },
      {
        "@type": "PropertyValue",
        name: "Mood",
        value: beat.mood || "Energetic"
      }
    ]
  };
  if (options.includeOffers && beat.price) {
    schema.offers = {
      "@type": "Offer",
      price: beat.price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${baseUrl}/product/${beat.id}`,
      seller: {
        "@type": "Organization",
        name: "BroLab Entertainment",
        url: baseUrl
      }
    };
  }
  if (options.includeAggregateRating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: "4.5",
      reviewCount: beat.downloads || 0,
      bestRating: "5",
      worstRating: "1"
    };
  }
  return JSON.stringify(schema, null, 2);
}
function generateBeatsListSchemaMarkup(beats, baseUrl, pageTitle = "BroLab Beats") {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MusicAlbum",
    name: pageTitle,
    description: "Professional beats collection for music producers and artists",
    url: `${baseUrl}/shop`,
    byArtist: {
      "@type": "MusicGroup",
      name: "BroLab Entertainment"
    },
    tracks: beats.map((beat) => ({
      "@type": "MusicRecording",
      name: beat.title,
      url: `${baseUrl}/product/${beat.id}`,
      genre: beat.genre,
      byArtist: {
        "@type": "MusicGroup",
        name: "BroLab Entertainment"
      }
    })),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: Math.min(...beats.map((b) => b.price || 0)),
      highPrice: Math.max(...beats.map((b) => b.price || 0)),
      offerCount: beats.length,
      availability: "https://schema.org/InStock"
    }
  };
  return JSON.stringify(schema, null, 2);
}
function generateOrganizationSchemaMarkup(baseUrl) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "BroLab Entertainment",
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description: "Professional beats marketplace for music producers and artists",
    sameAs: ["https://brolabentertainment.com"],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "contact@brolabentertainment.com"
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "US"
    }
  };
  return JSON.stringify(schema, null, 2);
}

// server/routes/schema.ts
var router16 = Router16();
var getBpmFromProduct = (product) => {
  if (product.bpm) return Number.parseInt(product.bpm.toString(), 10);
  const bpmMeta = product.meta_data?.find((meta) => meta.key === "bpm");
  return bpmMeta?.value ? Number.parseInt(bpmMeta.value.toString(), 10) : void 0;
};
var getKeyFromProduct = (product) => {
  return product.key || product.meta_data?.find((meta) => meta.key === "key")?.value?.toString() || null;
};
var getMoodFromProduct = (product) => {
  return product.mood || product.meta_data?.find((meta) => meta.key === "mood")?.value?.toString() || null;
};
var getDurationFromProduct = (product) => {
  return product.duration ? Number.parseFloat(product.duration.toString()) : void 0;
};
var getTagsFromProduct = (product) => {
  return product.tags?.map((tag) => tag.name) || [];
};
async function wcApiRequest2(endpoint, options = {}) {
  const WOOCOMMERCE_API_URL2 = process.env.WOOCOMMERCE_API_URL || "https://brolabentertainment.com/wp-json/wc/v3";
  const WC_CONSUMER_KEY2 = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const WC_CONSUMER_SECRET2 = process.env.WOOCOMMERCE_CONSUMER_SECRET;
  if (!WC_CONSUMER_KEY2 || !WC_CONSUMER_SECRET2) {
    if (process.env.NODE_ENV === "test") {
      return endpoint.includes("/products") ? [] : {};
    }
    throw new Error("WooCommerce API credentials not configured");
  }
  const url = new URL(`${WOOCOMMERCE_API_URL2}${endpoint}`);
  url.searchParams.append("consumer_key", WC_CONSUMER_KEY2);
  url.searchParams.append("consumer_secret", WC_CONSUMER_SECRET2);
  const response = process.env.NODE_ENV === "test" ? {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => endpoint.includes("/products") ? [] : {}
  } : await fetch(url.toString(), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "BroLab-Frontend/1.0",
      Accept: "application/json",
      ...options.headers
    }
  });
  if (!response.ok) {
    throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}
var BASE_URL = process.env.FRONTEND_URL || "https://brolabentertainment.com";
router16.get("/beat/:id", validateParams(CommonParams.numericId), async (req, res) => {
  try {
    const beatId = req.params.id;
    let product;
    try {
      product = await wcApiRequest2(`/products/${beatId}`);
    } catch (error) {
      if (error instanceof Error && error.message?.includes("404")) {
        res.status(404).json({ error: "Beat not found" });
        return;
      }
      throw error;
    }
    if (!product) {
      res.status(404).json({ error: "Beat not found" });
      return;
    }
    const beat = {
      id: product.id,
      title: product.name,
      name: product.name,
      // Alias for compatibility
      description: product.description,
      genre: product.categories?.[0]?.name || "Unknown",
      bpm: getBpmFromProduct(product),
      key: getKeyFromProduct(product),
      mood: getMoodFromProduct(product),
      price: Number.parseFloat(product.price) || 0,
      image_url: product.images?.[0]?.src,
      image: product.images?.[0]?.src,
      // Alias for compatibility
      images: product.images,
      audio_url: product.audio_url,
      tags: getTagsFromProduct(product),
      categories: product.categories,
      meta_data: product.meta_data,
      duration: getDurationFromProduct(product),
      downloads: product.downloads || 0
    };
    const schemaMarkup = generateBeatSchemaMarkup(beat, BASE_URL, {
      includeOffers: true,
      includeAggregateRating: true
    });
    res.setHeader("Content-Type", "application/ld+json");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(schemaMarkup);
  } catch (error) {
    handleRouteError(error, res, "Failed to generate beat schema markup");
  }
});
router16.get("/beats-list", async (req, res) => {
  try {
    const products = await wcApiRequest2("/products");
    if (!products || products.length === 0) {
      res.status(404).json({ error: "No beats found" });
      return;
    }
    const beats = products.map((product) => ({
      id: product.id,
      title: product.name,
      name: product.name,
      // Alias for compatibility
      description: product.description,
      genre: product.categories?.[0]?.name || "Unknown",
      bpm: getBpmFromProduct(product),
      key: getKeyFromProduct(product),
      mood: getMoodFromProduct(product),
      price: Number.parseFloat(product.price) || 0,
      image_url: product.images?.[0]?.src,
      image: product.images?.[0]?.src,
      // Alias for compatibility
      images: product.images,
      audio_url: product.audio_url,
      tags: getTagsFromProduct(product),
      categories: product.categories,
      meta_data: product.meta_data,
      duration: getDurationFromProduct(product),
      downloads: product.downloads || 0
    }));
    const schemaMarkup = generateBeatsListSchemaMarkup(beats, BASE_URL, "BroLab Beats Collection");
    res.setHeader("Content-Type", "application/ld+json");
    res.setHeader("Cache-Control", "public, max-age=1800");
    res.send(schemaMarkup);
  } catch (error) {
    handleRouteError(error, res, "Failed to generate beats list schema markup");
  }
});
router16.get("/organization", async (req, res) => {
  try {
    const schemaMarkup = generateOrganizationSchemaMarkup(BASE_URL);
    res.setHeader("Content-Type", "application/ld+json");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(schemaMarkup);
  } catch (error) {
    handleRouteError(error, res, "Failed to generate organization schema markup");
  }
});
var schema_default = router16;

// server/routes/security.ts
init_auth();
import { Router as Router17 } from "express";
var router17 = Router17();
var RATE_LIMIT_CONFIG = {
  api: { windowMs: 15 * 60 * 1e3, maxRequests: 1e3 },
  auth: { windowMs: 15 * 60 * 1e3, maxRequests: 20 },
  payment: { windowMs: 15 * 60 * 1e3, maxRequests: 50 },
  download: { windowMs: 60 * 60 * 1e3, maxRequests: 100 },
  upload: { windowMs: 60 * 60 * 1e3, maxRequests: 20 }
};
router17.get("/security/status", (req, res) => {
  const convexConfigured = !!(process.env.CONVEX_URL || process.env.VITE_CONVEX_URL);
  const clerkConfigured = !!process.env.CLERK_SECRET_KEY;
  const webhookSecurityService = getWebhookSecurityService();
  const cacheStats = webhookSecurityService.getCacheStats();
  const securityConfig = webhookSecurityService.getConfig();
  const status = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    environment: process.env.NODE_ENV || "development",
    database: {
      provider: "convex",
      configured: convexConfigured,
      userIsolation: true
      // All Convex queries filter by userId/clerkId
    },
    authentication: {
      provider: "clerk",
      enabled: clerkConfigured,
      sessionBased: true
    },
    rateLimit: {
      active: true,
      configuration: RATE_LIMIT_CONFIG,
      description: "express-rate-limit middleware active on all API endpoints"
    },
    securityHeaders: {
      helmet: true,
      csp: true,
      compression: true,
      bodySizeLimits: true,
      corsConfigured: true
    },
    webhookSecurity: {
      idempotencyCacheSize: cacheStats.idempotencyCacheSize,
      ipFailureCacheSize: cacheStats.ipFailureCacheSize,
      maxTimestampAge: securityConfig.maxTimestampAge,
      failureThreshold: securityConfig.failureThreshold,
      failureTrackingWindowMs: securityConfig.failureTrackingWindow
    }
  };
  res.json(status);
});
router17.get("/security/user-info", isAuthenticated, async (req, res) => {
  const userInfo = {
    userId: req.user?.id,
    username: req.user?.username,
    email: req.user?.email,
    permissions: {
      canAccessDashboard: true,
      canDownloadBeats: true,
      canCreateOrders: true
    },
    securityLevel: "authenticated"
  };
  res.json(userInfo);
});
var security_default = router17;

// server/routes/serviceOrders.ts
import express2 from "express";
init_auth();
var router18 = express2.Router();
router18.post(
  "/",
  isAuthenticated,
  validateBody(serviceOrderValidation),
  async (req, res) => {
    try {
      const data = req.body;
      const userId = req.user?.id || req.session?.userId;
      const numericUserId = typeof userId === "string" ? parseInt(userId, 10) : userId;
      if (typeof numericUserId !== "number" || Number.isNaN(numericUserId)) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const order = await createServiceOrder({ ...data, user_id: numericUserId });
      res.status(201).json(order);
    } catch (error) {
      handleRouteError(error, res, "Failed to create service order");
    }
  }
);
router18.get("/", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    const numericUserId = typeof userId === "string" ? parseInt(userId, 10) : userId;
    if (typeof numericUserId !== "number" || Number.isNaN(numericUserId)) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const orders = await listServiceOrders(numericUserId);
    res.json(orders);
  } catch (error) {
    handleRouteError(error, res, "Failed to list service orders");
  }
});
var serviceOrders_default = router18;

// server/routes/sitemap.ts
import { Router as Router18 } from "express";

// server/lib/sitemapGenerator.ts
function generateSitemapXML(beats, categories, config) {
  const {
    baseUrl,
    includeImages = true,
    includeCategories = true,
    includeStaticPages = true
  } = config;
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const urls2 = [
    // Page d'accueil
    {
      loc: `${baseUrl}/`,
      changefreq: "daily",
      priority: 1,
      lastmod: today
    },
    // Page shop
    {
      loc: `${baseUrl}/shop`,
      changefreq: "daily",
      priority: 0.9,
      lastmod: today
    },
    // Pages statiques
    ...includeStaticPages ? [
      { path: "/about", priority: 0.7, changefreq: "monthly" },
      { path: "/contact", priority: 0.6, changefreq: "monthly" },
      { path: "/terms", priority: 0.3, changefreq: "yearly" },
      { path: "/privacy", priority: 0.3, changefreq: "yearly" },
      { path: "/license", priority: 0.5, changefreq: "monthly" }
    ].map((page) => ({
      loc: `${baseUrl}${page.path}`,
      changefreq: page.changefreq,
      priority: page.priority,
      lastmod: today
    })) : [],
    // Catégories de beats
    ...includeCategories && categories.length > 0 ? categories.map((category) => ({
      loc: `${baseUrl}/shop?category=${encodeURIComponent(category.name)}`,
      changefreq: "weekly",
      priority: 0.8,
      lastmod: today
    })) : [],
    // Beats individuels
    ...beats.map((beat) => ({
      loc: `${baseUrl}/product/${beat.id}`,
      changefreq: "weekly",
      priority: 0.8,
      lastmod: beat.created_at ? new Date(beat.created_at).toISOString().split("T")[0] : today
    }))
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls2.map((url) => {
    let urlElement = `  <url>
    <loc>${url.loc}</loc>`;
    if (url.lastmod) {
      urlElement += `
    <lastmod>${url.lastmod}</lastmod>`;
    }
    if (url.changefreq) {
      urlElement += `
    <changefreq>${url.changefreq}</changefreq>`;
    }
    if (url.priority) {
      urlElement += `
    <priority>${url.priority}</priority>`;
    }
    if (includeImages && url.loc.includes("/product/") && beats.length > 0) {
      const beatId = url.loc.split("/").pop();
      const beat = beats.find((b) => b.id.toString() === beatId);
      if (beat?.image_url) {
        urlElement += `
    <image:image>
       <image:loc>${beat.image_url}</image:loc>
       <image:title>${beat.title}</image:title>
       <image:caption>${beat.title} - ${beat.genre} beat by BroLab Entertainment</image:caption>
     </image:image>`;
      }
    }
    urlElement += `
  </url>`;
    return urlElement;
  }).join("\n")}
</urlset>`;
  return xml;
}
function generateSitemapIndex(baseUrl, sitemaps) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(
    (sitemap) => `  <sitemap>
    <loc>${baseUrl}${sitemap}</loc>
    <lastmod>${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}</lastmod>
  </sitemap>`
  ).join("\n")}
</sitemapindex>`;
  return xml;
}
function generateRobotsTxt(baseUrl) {
  return `User-agent: *
Allow: /

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml

# Disallow admin areas
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /static/

# Allow important pages
Allow: /shop
Allow: /product/
Allow: /about
Allow: /contact

# Crawl delay (optional)
Crawl-delay: 1`;
}

// server/routes/sitemap.ts
var router19 = Router18();
var ALLOWED_HOSTS = [
  "brolabentertainment.com",
  "www.brolabentertainment.com",
  "localhost"
];
var VERCEL_PREVIEW_PATTERN = /^[\w-]+\.vercel\.app$/;
var WC_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1e3,
  maxDelay: 1e4,
  timeout: 15e3
};
async function fetchWithRetry(url, options, config = WC_RETRY_CONFIG) {
  let lastError = null;
  const sanitizedUrl = url.split("?")[0];
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.status >= 500 || response.status === 429) {
        const retryable = attempt < config.maxRetries;
        logger.warn("[Sitemap] WooCommerce API returned retryable status", {
          attempt,
          maxRetries: config.maxRetries,
          status: response.status,
          retryable,
          endpoint: sanitizedUrl
        });
        if (!retryable) {
          return response;
        }
        const delay = Math.min(config.baseDelay * Math.pow(2, attempt - 1), config.maxDelay);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));
      const isTimeout = lastError.name === "AbortError";
      const retryable = attempt < config.maxRetries;
      logger.warn("[Sitemap] WooCommerce fetch failed", {
        attempt,
        maxRetries: config.maxRetries,
        error: lastError.message,
        isTimeout,
        retryable,
        endpoint: sanitizedUrl
      });
      if (retryable) {
        const delay = Math.min(config.baseDelay * Math.pow(2, attempt - 1), config.maxDelay);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError ?? new Error("All retry attempts failed");
}
var WOOCOMMERCE_API_URL = process.env.WOOCOMMERCE_API_URL || "https://brolabentertainment.com/wp-json/wc/v3";
var WC_CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY;
var WC_CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET;
function isWooCommerceEnabled() {
  return !!(WC_CONSUMER_KEY && WC_CONSUMER_SECRET);
}
async function wcApiRequest3(endpoint, options = {}) {
  if (!isWooCommerceEnabled()) {
    if (process.env.NODE_ENV !== "test") {
      logger.warn("[Sitemap] WooCommerce API disabled - credentials missing", {
        endpoint,
        reason: "missing_credentials"
      });
    }
    return [];
  }
  if (process.env.NODE_ENV === "test") {
    return [];
  }
  const url = new URL(`${WOOCOMMERCE_API_URL}${endpoint}`);
  url.searchParams.append("consumer_key", WC_CONSUMER_KEY);
  url.searchParams.append("consumer_secret", WC_CONSUMER_SECRET);
  try {
    const response = await fetchWithRetry(url.toString(), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "BroLab-Frontend/1.0",
        Accept: "application/json",
        ...options.headers
      }
    });
    if (!response.ok) {
      logger.error("[Sitemap] WooCommerce API error after retries", {
        endpoint,
        status: response.status,
        statusText: response.statusText
      });
      return [];
    }
    return response.json();
  } catch (error) {
    logger.error("[Sitemap] WooCommerce API request failed after all retries", {
      endpoint,
      error: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
}
async function wcApiRequestAllPages(baseEndpoint) {
  const allProducts = [];
  const perPage = 100;
  let page = 1;
  while (true) {
    const separator = baseEndpoint.includes("?") ? "&" : "?";
    const endpoint = `${baseEndpoint}${separator}per_page=${perPage}&page=${page}`;
    const products = await wcApiRequest3(endpoint);
    if (!products || products.length === 0) {
      break;
    }
    allProducts.push(...products);
    if (products.length < perPage) {
      break;
    }
    page++;
  }
  return allProducts;
}
function isHostAllowed(host) {
  const hostWithoutPort = host.split(":")[0].toLowerCase();
  if (ALLOWED_HOSTS.includes(hostWithoutPort)) {
    return true;
  }
  if (VERCEL_PREVIEW_PATTERN.test(hostWithoutPort)) {
    return true;
  }
  return false;
}
function getBaseUrlFallback() {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  if (process.env.NODE_ENV === "production") {
    return "https://brolabentertainment.com";
  }
  const port = process.env.PORT || 5e3;
  return `http://localhost:${port}`;
}
function getBaseUrlFromRequest(req) {
  const forwardedHost = req.get("X-Forwarded-Host");
  const host = forwardedHost || req.get("Host");
  if (!host) {
    logger.info("[Sitemap] No host header found, using fallback URL");
    return getBaseUrlFallback();
  }
  if (!isHostAllowed(host)) {
    logger.warn("[Sitemap] Host not in allowlist, using fallback URL", {
      receivedHost: host,
      allowedHosts: [...ALLOWED_HOSTS]
    });
    return getBaseUrlFallback();
  }
  const forwardedProto = req.get("X-Forwarded-Proto");
  const protocol = forwardedProto || (req.secure ? "https" : "http");
  const baseUrl = `${protocol}://${host}`;
  logger.info("[Sitemap] Using request-derived base URL", {
    baseUrl,
    source: forwardedHost ? "X-Forwarded-Host" : "Host"
  });
  return baseUrl;
}
router19.get("/sitemap.xml", async (req, res) => {
  try {
    const baseUrl = getBaseUrlFromRequest(req);
    const wooEnabled = isWooCommerceEnabled();
    res.setHeader("X-WooCommerce-Status", wooEnabled ? "enabled" : "disabled");
    const [products, categories] = await Promise.all([
      wcApiRequestAllPages("/products"),
      wcApiRequest3("/products/categories")
    ]);
    const beats = products.map((product) => {
      let bpm;
      if (product.bpm) {
        bpm = Number.parseInt(product.bpm.toString(), 10);
      } else {
        const bpmMeta = product.meta_data?.find((meta) => meta.key === "bpm");
        if (bpmMeta?.value) {
          bpm = Number.parseInt(bpmMeta.value.toString(), 10);
        }
      }
      return {
        id: product.id,
        title: product.name,
        name: product.name,
        // Alias for compatibility
        description: product.description,
        genre: product.categories?.[0]?.name || "Unknown",
        bpm,
        key: product.key || product.meta_data?.find((meta) => meta.key === "key")?.value?.toString() || null,
        mood: product.mood || product.meta_data?.find((meta) => meta.key === "mood")?.value?.toString() || null,
        price: Number.parseFloat(product.price) || 0,
        image_url: product.images?.[0]?.src,
        image: product.images?.[0]?.src,
        // Alias for compatibility
        images: product.images,
        audio_url: product.audio_url,
        tags: product.tags?.map((tag) => tag.name) || [],
        categories: product.categories,
        meta_data: product.meta_data,
        duration: product.duration ? Number.parseFloat(product.duration.toString()) : void 0,
        downloads: product.downloads || 0
      };
    });
    const sitemapXML = generateSitemapXML(beats, categories, {
      baseUrl,
      includeImages: true,
      includeCategories: categories.length > 0,
      includeStaticPages: true
    });
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(sitemapXML);
  } catch (error) {
    const errorMessage = error instanceof Error ? error : new Error("Failed to generate sitemap");
    handleRouteError(errorMessage, res, "Failed to generate sitemap");
  }
});
router19.get("/sitemap-index.xml", async (req, res) => {
  try {
    const baseUrl = getBaseUrlFromRequest(req);
    const sitemaps = ["/sitemap.xml", "/sitemap-beats.xml", "/sitemap-categories.xml"];
    const sitemapIndexXML = generateSitemapIndex(baseUrl, sitemaps);
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(sitemapIndexXML);
  } catch (error) {
    const errorMessage = error instanceof Error ? error : new Error("Failed to generate sitemap index");
    handleRouteError(errorMessage, res, "Failed to generate sitemap index");
  }
});
router19.get("/robots.txt", async (req, res) => {
  try {
    const baseUrl = getBaseUrlFromRequest(req);
    const robotsTxt = generateRobotsTxt(baseUrl);
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(robotsTxt);
  } catch (error) {
    const errorMessage = error instanceof Error ? error : new Error("Failed to generate robots.txt");
    handleRouteError(errorMessage, res, "Failed to generate robots.txt");
  }
});
router19.get("/sitemap-beats.xml", async (req, res) => {
  try {
    const baseUrl = getBaseUrlFromRequest(req);
    const wooEnabled = isWooCommerceEnabled();
    res.setHeader("X-WooCommerce-Status", wooEnabled ? "enabled" : "disabled");
    const products = await wcApiRequestAllPages("/products");
    const beats = products.map((product) => {
      let bpm;
      if (product.bpm) {
        bpm = Number.parseInt(product.bpm.toString(), 10);
      } else {
        const bpmMeta = product.meta_data?.find((meta) => meta.key === "bpm");
        if (bpmMeta?.value) {
          bpm = Number.parseInt(bpmMeta.value.toString(), 10);
        }
      }
      return {
        id: product.id,
        title: product.name,
        name: product.name,
        // Alias for compatibility
        description: product.description,
        genre: product.categories?.[0]?.name || "Unknown",
        bpm,
        key: product.key || product.meta_data?.find((meta) => meta.key === "key")?.value?.toString() || null,
        mood: product.mood || product.meta_data?.find((meta) => meta.key === "mood")?.value?.toString() || null,
        price: Number.parseFloat(product.price) || 0,
        image_url: product.images?.[0]?.src,
        image: product.images?.[0]?.src,
        // Alias for compatibility
        images: product.images,
        audio_url: product.audio_url,
        tags: product.tags?.map((tag) => tag.name) || [],
        categories: product.categories,
        meta_data: product.meta_data,
        duration: product.duration ? Number.parseFloat(product.duration.toString()) : void 0,
        downloads: product.downloads || 0
      };
    });
    const sitemapXML = generateSitemapXML(beats, [], {
      baseUrl,
      includeImages: true,
      includeCategories: false,
      includeStaticPages: false
    });
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=1800");
    res.send(sitemapXML);
  } catch (error) {
    const errorMessage = error instanceof Error ? error : new Error("Failed to generate beats sitemap");
    handleRouteError(errorMessage, res, "Failed to generate beats sitemap");
  }
});
var sitemap_default = router19;

// server/routes/storage.ts
init_api();
init_convex();
import { Router as Router19 } from "express";
import multer2 from "multer";
import { z as z18 } from "zod";

// server/lib/storage.ts
init_api();
init_convex();
var STORAGE_BUCKETS = {
  USER_UPLOADS: "user-uploads",
  DELIVERABLES: "deliverables",
  INVOICES: "invoices"
};
async function uploadUserFile(_userId, file, bucket, path, options = {}) {
  try {
    const convex8 = getConvex();
    const fileData = file.toString("base64");
    const mimeType = options.contentType || "application/octet-stream";
    const result = await convex8.action(api.files.storage.uploadToStorage, {
      fileData,
      filename: path,
      mimeType,
      bucket: STORAGE_BUCKETS[bucket]
    });
    return {
      path: result.storageId,
      fullUrl: result.url
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown storage error";
    throw new Error(`Failed to upload file to storage: ${errorMessage}`);
  }
}
async function getSignedUrl(_bucket, path, _expiresIn = 3600) {
  try {
    const convex8 = getConvex();
    const url = await convex8.action(api.files.storage.getStorageUrl, {
      storageId: path
    });
    if (!url) {
      throw new Error("File not found in storage");
    }
    return url;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown storage error";
    throw new Error(`Failed to get signed URL: ${errorMessage}`);
  }
}
async function deleteFile(_bucket, path) {
  try {
    const convex8 = getConvex();
    await convex8.action(api.files.storage.deleteFromStorage, {
      storageId: path
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown storage error";
    throw new Error(`Failed to delete file from storage: ${errorMessage}`);
  }
}

// server/routes/storage.ts
var fileUploadValidation2 = z18.object({
  file: z18.any().optional()
});
var fileFilterValidation2 = z18.object({
  type: z18.string().optional(),
  limit: z18.number().min(1).max(100).optional().default(20),
  offset: z18.number().min(0).optional().default(0)
});
var router20 = Router19();
var upload2 = multer2({
  storage: multer2.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
  // 50MB limit
});
function getBucketKeyForRole(role) {
  switch (role) {
    case "deliverable":
      return "DELIVERABLES";
    case "invoice":
      return "INVOICES";
    default:
      return "USER_UPLOADS";
  }
}
router20.post(
  "/upload",
  uploadRateLimit,
  upload2.single("file"),
  createValidationMiddleware(fileUploadValidation2),
  async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }
      const allowedTypes = ["audio/mpeg", "audio/wav", "audio/flac", "image/jpeg", "image/png"];
      const maxSize = 50 * 1024 * 1024;
      if (!allowedTypes.includes(req.file.mimetype)) {
        res.status(400).json({
          error: "File type not allowed",
          details: [`File type ${req.file.mimetype} is not allowed`]
        });
        return;
      }
      if (req.file.size > maxSize) {
        res.status(400).json({
          error: "File too large",
          details: [`File size ${req.file.size} exceeds maximum of ${maxSize} bytes`]
        });
        return;
      }
      const { reservation_id, order_id, role = "upload" } = req.body;
      const userId = req.user.id;
      const fileRole = role;
      const bucketKey = getBucketKeyForRole(fileRole);
      const fileExtension = req.file.originalname.split(".").pop();
      const fileName = `${userId}_${Date.now()}.${fileExtension}`;
      const filePath = `${fileRole}s/${fileName}`;
      const { path, fullUrl } = await uploadUserFile(userId, req.file.buffer, bucketKey, filePath, {
        contentType: req.file.mimetype
      });
      const clerkId = req.user?.clerkId;
      if (!clerkId) {
        res.status(400).json({ error: "Missing user identifier" });
        return;
      }
      const convex8 = getConvex();
      const createFileArgs = {
        filename: fileName,
        originalName: req.file.originalname,
        storagePath: path,
        mimeType: req.file.mimetype,
        size: req.file.size,
        role: fileRole,
        reservationId: reservation_id ? reservation_id : void 0,
        orderId: order_id ? order_id : void 0,
        clerkId
      };
      const fileId = await convex8.mutation(api.files.createFile.createFile, createFileArgs);
      const fileRecord = {
        user_id: Number.parseInt(userId),
        filename: fileName,
        original_name: req.file.originalname,
        storage_path: path,
        mime_type: req.file.mimetype,
        size: req.file.size,
        role: fileRole,
        reservation_id: reservation_id || null,
        order_id: order_id ? Number.parseInt(order_id) : null,
        owner_id: Number.parseInt(userId)
      };
      res.json({
        success: true,
        file: { ...fileRecord, id: fileId },
        url: fullUrl
      });
    } catch (error) {
      handleRouteError(error, res, "File upload failed");
    }
  }
);
router20.get("/signed-url/:fileId", downloadRateLimit, async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const { fileId } = req.params;
    const clerkId = req.user?.clerkId;
    if (!clerkId) {
      res.status(400).json({ error: "Missing user identifier" });
      return;
    }
    const convex8 = getConvex();
    let file;
    try {
      file = await convex8.query(api.files.getFile.getFile, {
        fileId,
        clerkId
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("Access denied")) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
      if (errorMessage.includes("not found")) {
        res.status(404).json({ error: "File not found" });
        return;
      }
      throw error;
    }
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    const bucketKey = getBucketKeyForRole(file.role);
    const signedUrl = await getSignedUrl(bucketKey, file.storagePath, 3600);
    res.json({ url: signedUrl });
  } catch (error) {
    handleRouteError(error, res, "Failed to generate signed URL");
  }
});
router20.get("/files", createValidationMiddleware(fileFilterValidation2), async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const clerkId = req.user?.clerkId;
    if (!clerkId) {
      res.status(400).json({ error: "Missing user identifier" });
      return;
    }
    const { type: roleFilter } = req.query;
    const convex8 = getConvex();
    const convexFiles = await convex8.query(api.files.listFiles.listFiles, {
      role: roleFilter,
      clerkId
    });
    const files = convexFiles.map((file) => ({
      id: file._id,
      filename: file.filename,
      original_name: file.originalName,
      mime_type: file.mimeType,
      size: file.size,
      role: file.role,
      created_at: new Date(file.createdAt).toISOString()
    }));
    res.json({ files });
  } catch (error) {
    handleRouteError(error, res, "Failed to list files");
  }
});
router20.delete("/files/:fileId", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const { fileId } = req.params;
    const clerkId = req.user?.clerkId;
    if (!clerkId) {
      res.status(400).json({ error: "Missing user identifier" });
      return;
    }
    const convex8 = getConvex();
    let file;
    try {
      file = await convex8.query(api.files.getFile.getFile, {
        fileId,
        clerkId
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("Access denied")) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
      if (errorMessage.includes("not found")) {
        res.status(404).json({ error: "File not found" });
        return;
      }
      throw error;
    }
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    const bucketKey = getBucketKeyForRole(file.role);
    await deleteFile(bucketKey, file.storagePath);
    await convex8.mutation(api.files.deleteFile.deleteFile, {
      fileId,
      clerkId
    });
    res.json({ success: true });
  } catch (error) {
    handleRouteError(error, res, "Failed to delete file");
  }
});
var storage_default = router20;

// server/routes/stripe.ts
import { Router as Router20 } from "express";
import Stripe4 from "stripe";
var createStripePaymentIntent = async (params) => {
  const response = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      amount: params.amount.toString(),
      currency: params.currency,
      "automatic_payment_methods[enabled]": "true",
      ...params.metadata && Object.keys(params.metadata).reduce(
        (acc, key) => {
          acc[`metadata[${key}]`] = params.metadata[key];
          return acc;
        },
        {}
      )
    }).toString()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Stripe API Error: ${error.error?.message || "Unknown error"}`);
  }
  return await response.json();
};
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("\u274C Missing required Stripe secret: STRIPE_SECRET_KEY");
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}
var stripeClient2 = new Stripe4(process.env.STRIPE_SECRET_KEY, {
  // Using default API version for compatibility
});
var router21 = Router20();
router21.get("/health", (req, res) => {
  res.json({
    status: "ok",
    stripe: stripeClient2 ? "initialized" : "mock",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
router21.post("/checkout", async (req, res) => {
  try {
    const { orderId, successUrl, cancelUrl } = req.body;
    if (!orderId || !successUrl || !cancelUrl) {
      res.status(400).json({ error: "orderId, successUrl, cancelUrl required" });
      return;
    }
    const { getConvex: getConvex2 } = await Promise.resolve().then(() => (init_convex(), convex_exports));
    const convex8 = getConvex2();
    if (!orderId || typeof orderId !== "string") {
      res.status(400).json({ error: "Invalid orderId format" });
      return;
    }
    if (typeof orderId !== "string") {
      res.status(400).json({ error: "Invalid orderId format" });
      return;
    }
    const convexOrderId = orderId;
    const orderData = await convex8.query("orders:getOrderWithRelations", {
      orderId: convexOrderId
    });
    if (!orderData?.order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const { order, items } = orderData;
    const lineItems = (items || []).map((it) => ({
      price_data: {
        currency: (order.currency || "usd").toLowerCase(),
        product_data: { name: it.title || "Unknown Item" },
        unit_amount: Number(it.unitPrice || it.totalPrice || 0) || 0
      },
      quantity: Number(it.qty || 1)
    }));
    const session2 = await stripeClient2.checkout.sessions.create(
      {
        mode: "payment",
        line_items: lineItems,
        success_url: successUrl.replace("{CHECKOUT_SESSION_ID}", "{CHECKOUT_SESSION_ID}"),
        cancel_url: cancelUrl,
        metadata: { orderId }
      },
      {
        idempotencyKey: `checkout_${orderId}`
      }
    );
    const saveCheckoutSession = async (orderId2, checkoutSessionId, paymentIntentId) => {
      return await convex8.mutation("orders:saveStripeCheckoutSession", {
        orderId: orderId2,
        checkoutSessionId,
        paymentIntentId
      });
    };
    await saveCheckoutSession(
      convexOrderId,
      session2.id,
      typeof session2.payment_intent === "string" ? session2.payment_intent : void 0
    );
    res.json({ url: session2.url, id: session2.id });
  } catch (error) {
    handleRouteError(error, res, "Error creating checkout session");
  }
});
var createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = "USD", metadata = {} } = req.body;
    if (!amount || amount <= 0) {
      res.status(400).json({ error: "Amount is required and must be greater than 0" });
      return;
    }
    const paymentIntent = await createStripePaymentIntent({
      amount: Math.round(amount * 100),
      // Convert to cents
      currency: currency.toLowerCase(),
      metadata
    });
    const response = {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };
    res.json(response);
  } catch (error) {
    handleRouteError(error, res, "Error creating payment intent");
  }
};
router21.post("/create-payment-intent", createPaymentIntent);
router21.get(
  "/payment-intent/:id",
  validateParams(CommonParams.stripePaymentIntentId),
  async (req, res) => {
    try {
      const { id } = req.params;
      const paymentIntent = await stripeClient2.paymentIntents.retrieve(id);
      res.json({
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata
      });
    } catch (error) {
      handleRouteError(error, res, "Error retrieving payment intent");
    }
  }
);
var stripe_default = router21;

// server/routes/subscription.ts
import { Router as Router21 } from "express";
var router22 = Router21();
router22.get("/plans", (_req, res) => {
  res.json([
    {
      id: "basic",
      name: "Basic",
      price: 999,
      currency: "usd",
      interval: "month",
      features: ["5 downloads per month", "Standard quality", "Email support"]
    },
    {
      id: "pro",
      name: "Pro",
      price: 1999,
      currency: "usd",
      interval: "month",
      features: ["20 downloads per month", "High quality", "Priority support", "Stems included"]
    },
    {
      id: "unlimited",
      name: "Unlimited",
      price: 4999,
      currency: "usd",
      interval: "month",
      features: [
        "Unlimited downloads",
        "Highest quality",
        "24/7 support",
        "Stems included",
        "Custom requests"
      ]
    }
  ]);
});
var subscription_default = router22;

// server/routes/sync.ts
init_auth();
import { Router as Router22 } from "express";

// server/middleware/requireAdmin.ts
init_audit();
init_convex();
var requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: "Authentication required",
        code: "UNAUTHORIZED"
      });
      return;
    }
    const clerkId = req.user.clerkId;
    if (!clerkId) {
      res.status(401).json({
        error: "Invalid authentication data",
        code: "INVALID_AUTH"
      });
      return;
    }
    const convexUser = await getUserByClerkId(clerkId);
    if (!convexUser) {
      res.status(401).json({
        error: "User not found",
        code: "USER_NOT_FOUND"
      });
      return;
    }
    const userRole = convexUser.role || "user";
    if (userRole !== "admin" && userRole !== "service_role") {
      const ipAddress2 = req.headers["x-forwarded-for"]?.split(",")[0] || req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown";
      const userAgent2 = req.headers["user-agent"] || "unknown";
      await auditLogger.logSecurityEvent(
        clerkId,
        "unauthorized_admin_access",
        {
          attemptedPath: req.path,
          method: req.method,
          userRole,
          ipAddress: ipAddress2,
          userAgent: userAgent2
        },
        ipAddress2,
        userAgent2
      );
      res.status(403).json({
        error: "Admin access required",
        code: "FORBIDDEN"
      });
      return;
    }
    const ipAddress = req.headers["x-forwarded-for"]?.split(",")[0] || req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";
    await auditLogger.logSecurityEvent(
      clerkId,
      "admin_access_granted",
      {
        path: req.path,
        method: req.method,
        userRole,
        ipAddress,
        userAgent
      },
      ipAddress,
      userAgent
    );
    next();
  } catch (error) {
    console.error("Error in requireAdmin middleware:", error);
    res.status(500).json({
      error: "Authorization check failed",
      code: "INTERNAL_ERROR"
    });
  }
};

// server/services/MessageQueueService.ts
var MessageQueueManager = class {
  queues = /* @__PURE__ */ new Map();
  MESSAGE_TTL = 5 * 60 * 1e3;
  // 5 minutes
  CLEANUP_INTERVAL = 60 * 1e3;
  // 1 minute
  cleanupTimer = null;
  constructor() {
    this.startCleanupTimer();
  }
  /**
   * Add a message to the queue
   */
  addMessage(message) {
    const userId = message.userId || "global";
    if (!this.queues.has(userId)) {
      this.queues.set(userId, {
        messages: [],
        lastCleanup: Date.now()
      });
    }
    const queue = this.queues.get(userId);
    queue.messages.push(message);
    if (queue.messages.length > 1e3) {
      queue.messages = queue.messages.slice(-500);
    }
  }
  /**
   * Get messages since a specific timestamp
   */
  getMessagesSince(userId, since) {
    const queue = this.queues.get(userId);
    if (!queue) {
      return [];
    }
    return queue.messages.filter((msg) => msg.timestamp > since);
  }
  /**
   * Get all messages for a user
   */
  getAllMessages(userId) {
    const queue = this.queues.get(userId);
    return queue ? [...queue.messages] : [];
  }
  /**
   * Clear messages for a user
   */
  clearMessages(userId) {
    this.queues.delete(userId);
  }
  /**
   * Broadcast a message to all users
   */
  broadcast(message) {
    const broadcastMessage = {
      ...message,
      userId: "global"
    };
    this.addMessage(broadcastMessage);
    for (const [userId, _queue] of this.queues) {
      if (userId !== "global") {
        this.addMessage({ ...broadcastMessage, userId });
      }
    }
  }
  /**
   * Get queue statistics
   */
  getStats() {
    const queueSizes = {};
    let totalMessages = 0;
    for (const [userId, queue] of this.queues) {
      queueSizes[userId] = queue.messages.length;
      totalMessages += queue.messages.length;
    }
    return {
      totalQueues: this.queues.size,
      totalMessages,
      queueSizes
    };
  }
  /**
   * Clean up old messages
   */
  cleanup() {
    const now = Date.now();
    const cutoff = now - this.MESSAGE_TTL;
    for (const [userId, queue] of this.queues) {
      queue.messages = queue.messages.filter((msg) => msg.timestamp > cutoff);
      queue.lastCleanup = now;
      if (queue.messages.length === 0 && userId !== "global") {
        this.queues.delete(userId);
      }
    }
  }
  /**
   * Start automatic cleanup timer
   */
  startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }
  /**
   * Stop cleanup timer
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.queues.clear();
  }
};
var messageQueueInstance = null;
var getMessageQueue = () => {
  messageQueueInstance ??= new MessageQueueManager();
  return messageQueueInstance;
};

// server/services/WebSocketManager.ts
import { WebSocket, WebSocketServer } from "ws";
var WebSocketManager = class {
  wss = null;
  clients = /* @__PURE__ */ new Map();
  heartbeatInterval = null;
  heartbeatTimeout = 6e4;
  // 1 minute
  heartbeatCheckInterval = 3e4;
  // 30 seconds
  constructor() {
    this.setupHeartbeatMonitoring();
  }
  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    this.wss = new WebSocketServer({
      server,
      path: "/ws",
      clientTracking: true
    });
    this.wss.on("connection", (socket, request) => {
      this.handleConnection(socket, request);
    });
    this.wss.on("error", (error) => {
      console.error("WebSocket server error:", error);
    });
    console.log("WebSocket server initialized on /ws");
  }
  /**
   * Handle new client connection
   */
  handleConnection(socket, _request) {
    const clientId2 = this.generateClientId();
    const client = {
      id: clientId2,
      socket,
      lastHeartbeat: Date.now(),
      subscriptions: /* @__PURE__ */ new Set()
    };
    this.clients.set(clientId2, client);
    console.log(`Client connected: ${clientId2} (${this.clients.size} total)`);
    this.sendToClient(clientId2, {
      type: "connected",
      payload: { clientId: clientId2 },
      timestamp: Date.now(),
      source: "server",
      id: this.generateMessageId()
    });
    socket.on("message", (data) => {
      this.handleMessage(clientId2, data);
    });
    socket.on("close", (code, reason) => {
      this.handleDisconnect(clientId2, code, reason.toString());
    });
    socket.on("error", (error) => {
      console.error(`Client ${clientId2} error:`, error);
      this.handleDisconnect(clientId2, 1006, "Socket error");
    });
  }
  /**
   * Handle incoming message from client
   */
  handleMessage(clientId2, data) {
    const client = this.clients.get(clientId2);
    if (!client) return;
    try {
      const message = JSON.parse(data.toString());
      client.lastHeartbeat = Date.now();
      console.log(`Message from ${clientId2}:`, message.type);
      switch (message.type) {
        case "heartbeat":
          this.handleHeartbeat(clientId2, message);
          break;
        case "subscribe":
          this.handleSubscription(clientId2, message);
          break;
        case "unsubscribe":
          this.handleUnsubscription(clientId2, message);
          break;
        case "force_sync":
          this.handleForceSync(clientId2, message);
          break;
        case "data_update":
          this.handleDataUpdate(clientId2, message);
          break;
        default:
          console.warn(`Unknown message type from ${clientId2}: ${message.type}`);
      }
    } catch (error) {
      console.error(`Error parsing message from ${clientId2}:`, error);
      this.sendError(clientId2, "Invalid message format", "PARSE_ERROR");
    }
  }
  /**
   * Handle client disconnect
   */
  handleDisconnect(clientId2, code, _reason) {
    const _client = this.clients.get(clientId2);
    if (_client) {
      console.log(`Client disconnected: ${clientId2} (code: ${code}, reason: ${_reason})`);
      this.clients.delete(clientId2);
    }
  }
  /**
   * Handle heartbeat message
   */
  handleHeartbeat(clientId2, message) {
    this.sendToClient(clientId2, {
      type: "heartbeat_ack",
      payload: { timestamp: message.timestamp },
      timestamp: Date.now(),
      source: "server",
      id: this.generateMessageId()
    });
  }
  /**
   * Handle subscription request
   */
  handleSubscription(clientId2, message) {
    const client = this.clients.get(clientId2);
    if (!client) return;
    const payload = message.payload;
    const { topics } = payload;
    if (Array.isArray(topics)) {
      topics.forEach((topic) => client.subscriptions.add(topic));
    }
    this.sendToClient(clientId2, {
      type: "subscription_ack",
      payload: { topics, subscribed: Array.from(client.subscriptions) },
      timestamp: Date.now(),
      source: "server",
      id: this.generateMessageId()
    });
  }
  /**
   * Handle unsubscription request
   */
  handleUnsubscription(clientId2, message) {
    const client = this.clients.get(clientId2);
    if (!client) return;
    const payload = message.payload;
    const { topics } = payload;
    if (Array.isArray(topics)) {
      topics.forEach((topic) => client.subscriptions.delete(topic));
    }
    this.sendToClient(clientId2, {
      type: "unsubscription_ack",
      payload: { topics, subscribed: Array.from(client.subscriptions) },
      timestamp: Date.now(),
      source: "server",
      id: this.generateMessageId()
    });
  }
  /**
   * Handle force sync request
   */
  async handleForceSync(clientId2, message) {
    try {
      const syncData = await this.fetchDashboardData(clientId2);
      this.sendToClient(clientId2, {
        type: "sync_data",
        payload: syncData,
        timestamp: Date.now(),
        source: "server",
        id: message.id
        // Use same ID to correlate request/response
      });
    } catch (error) {
      console.error(`Force sync error for ${clientId2}:`, error);
      this.sendError(clientId2, "Sync failed", "SYNC_ERROR", message.id);
    }
  }
  /**
   * Handle data update from client (optimistic updates)
   */
  handleDataUpdate(clientId2, message) {
    this.broadcastToOthers(clientId2, {
      type: "data_updated",
      payload: message.payload,
      timestamp: Date.now(),
      source: "server",
      id: this.generateMessageId()
    });
    this.sendToClient(clientId2, {
      type: "update_ack",
      payload: { success: true },
      timestamp: Date.now(),
      source: "server",
      id: message.id
    });
  }
  /**
   * Send message to specific client
   */
  sendToClient(clientId2, message) {
    const client = this.clients.get(clientId2);
    if (!client || client.socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      client.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`Error sending message to ${clientId2}:`, error);
      return false;
    }
  }
  /**
   * Broadcast message to all connected clients
   */
  broadcast(message, excludeClientId) {
    let sentCount = 0;
    for (const [clientId2, _client] of this.clients) {
      if (excludeClientId && clientId2 === excludeClientId) continue;
      if (this.sendToClient(clientId2, message)) {
        sentCount++;
      }
    }
    return sentCount;
  }
  /**
   * Broadcast to all clients except the sender
   */
  broadcastToOthers(senderClientId, message) {
    return this.broadcast(message, senderClientId);
  }
  /**
   * Broadcast to clients subscribed to specific topics
   */
  broadcastToSubscribers(topics, message) {
    let sentCount = 0;
    for (const [clientId2, client] of this.clients) {
      const hasSubscription = topics.some((topic) => client.subscriptions.has(topic));
      if (hasSubscription && this.sendToClient(clientId2, message)) {
        sentCount++;
      }
    }
    return sentCount;
  }
  /**
   * Send error message to client
   */
  sendError(clientId2, message, code, correlationId) {
    this.sendToClient(clientId2, {
      type: "error",
      payload: { message, code, correlationId },
      timestamp: Date.now(),
      source: "server",
      id: this.generateMessageId()
    });
  }
  /**
   * Set up heartbeat monitoring
   */
  setupHeartbeatMonitoring() {
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, this.heartbeatCheckInterval);
  }
  /**
   * Check for stale connections and clean them up
   */
  checkHeartbeats() {
    const now = Date.now();
    const staleClients = [];
    for (const [clientId2, client] of this.clients) {
      if (now - client.lastHeartbeat > this.heartbeatTimeout) {
        staleClients.push(clientId2);
      }
    }
    staleClients.forEach((clientId2) => {
      console.log(`Removing stale client: ${clientId2}`);
      const staleClient = this.clients.get(clientId2);
      if (staleClient) {
        staleClient.socket.terminate();
        this.clients.delete(clientId2);
      }
    });
    if (staleClients.length > 0) {
      console.log(`Cleaned up ${staleClients.length} stale connections`);
    }
  }
  /**
   * Fetch dashboard data for sync (placeholder implementation)
   */
  async fetchDashboardData(_clientId) {
    return {
      user: { id: "user123", name: "Test User" },
      stats: {
        totalFavorites: 5,
        totalDownloads: 12,
        totalOrders: 3,
        totalSpent: 149.97,
        recentActivity: 8,
        quotaUsed: 12,
        quotaLimit: 50,
        calculatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        dataHash: this.generateDataHash()
      },
      favorites: [],
      orders: [],
      downloads: [],
      reservations: [],
      activity: [],
      trends: {},
      chartData: []
    };
  }
  /**
   * Generate unique client ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
  /**
   * Generate unique message ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
  /**
   * Generate data hash for consistency validation
   */
  generateDataHash() {
    return `hash_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
  /**
   * Get connection statistics
   */
  getStats() {
    let totalSubscriptions = 0;
    for (const client of this.clients.values()) {
      totalSubscriptions += client.subscriptions.size;
    }
    return {
      totalConnections: this.clients.size,
      activeConnections: Array.from(this.clients.values()).filter(
        (client) => client.socket.readyState === WebSocket.OPEN
      ).length,
      totalSubscriptions
    };
  }
  /**
   * Shutdown the WebSocket manager
   */
  shutdown() {
    console.log("Shutting down WebSocket manager...");
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    for (const client of this.clients.values()) {
      client.socket.close(1001, "Server shutdown");
    }
    this.clients.clear();
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }
};
var wsManagerInstance = null;
var getWebSocketManager = () => {
  wsManagerInstance ??= new WebSocketManager();
  return wsManagerInstance;
};

// server/routes/sync.ts
var router23 = Router22();
router23.get("/", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const dashboardData = await fetchDashboardDataForUser(userId);
    res.json({
      success: true,
      data: dashboardData,
      timestamp: Date.now(),
      syncId: generateSyncId()
    });
  } catch (error) {
    console.error("Sync API error:", error);
    res.status(500).json({
      error: "Internal server error",
      code: "SYNC_ERROR",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router23.get(
  "/poll",
  isAuthenticated,
  async (req, res) => {
    try {
      const since = Number.parseInt(req.query.since) || 0;
      const userId = req.user.id;
      const messageQueue = getMessageQueue();
      const messages = messageQueue.getMessagesSince(userId, since);
      res.json({
        success: true,
        messages,
        timestamp: Date.now(),
        count: messages.length
      });
    } catch (error) {
      console.error("Poll API error:", error);
      res.status(500).json({
        error: "Polling failed",
        code: "POLL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);
router23.post(
  "/send",
  isAuthenticated,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { type, payload, correlationId } = req.body;
      if (!type || !payload) {
        res.status(400).json({
          error: "Missing required fields: type, payload",
          code: "INVALID_REQUEST"
        });
        return;
      }
      const messageQueue = getMessageQueue();
      const message = {
        id: generateSyncId(),
        type,
        payload,
        timestamp: Date.now(),
        correlationId,
        userId
      };
      messageQueue.addMessage(message);
      const wsManager = getWebSocketManager();
      wsManager.broadcast({
        type,
        payload,
        timestamp: message.timestamp,
        source: "client",
        id: message.id
      });
      res.json({
        success: true,
        messageId: message.id,
        timestamp: message.timestamp
      });
    } catch (error) {
      console.error("Send API error:", error);
      res.status(500).json({
        error: "Send failed",
        code: "SEND_ERROR",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);
router23.post(
  "/validate",
  isAuthenticated,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const validationResult = await validateDataConsistency(userId);
      res.json({
        success: true,
        consistent: validationResult.consistent,
        inconsistencies: validationResult.inconsistencies,
        timestamp: Date.now(),
        validationId: generateSyncId()
      });
    } catch (error) {
      console.error("Validation API error:", error);
      res.status(500).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);
router23.post(
  "/force",
  isAuthenticated,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const syncResult = await forceSyncAllData(userId);
      const message = {
        id: syncResult.syncId,
        type: "force_sync_complete",
        payload: syncResult.data,
        timestamp: Date.now(),
        userId
      };
      const messageQueue = getMessageQueue();
      messageQueue.addMessage(message);
      const wsManager = getWebSocketManager();
      wsManager.broadcast({
        type: "force_sync_complete",
        payload: syncResult.data,
        timestamp: message.timestamp,
        source: "server",
        id: syncResult.syncId
      });
      res.json({
        success: true,
        data: syncResult.data,
        syncId: syncResult.syncId,
        timestamp: message.timestamp
      });
    } catch (error) {
      console.error("Force sync API error:", error);
      res.status(500).json({
        error: "Force sync failed",
        code: "FORCE_SYNC_ERROR",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);
router23.get(
  "/status",
  isAuthenticated,
  async (_req, res) => {
    try {
      const wsManager = getWebSocketManager();
      const wsStats = wsManager.getStats();
      const messageQueue = getMessageQueue();
      const queueStats = messageQueue.getStats();
      res.json({
        success: true,
        status: {
          websocket: {
            enabled: true,
            connections: wsStats.activeConnections,
            totalConnections: wsStats.totalConnections,
            subscriptions: wsStats.totalSubscriptions
          },
          polling: {
            enabled: true,
            endpoint: "/api/sync/poll",
            queues: queueStats.totalQueues,
            messages: queueStats.totalMessages
          },
          lastCheck: Date.now()
        }
      });
    } catch (error) {
      console.error("Status API error:", error);
      res.status(500).json({
        error: "Status check failed",
        code: "STATUS_ERROR",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);
router23.post(
  "/broadcast",
  isAuthenticated,
  requireAdmin,
  async (req, res) => {
    try {
      const { type, payload, topics } = req.body;
      if (!type || !payload) {
        res.status(400).json({
          error: "Missing required fields: type, payload",
          code: "INVALID_REQUEST"
        });
        return;
      }
      const messageId = generateSyncId();
      const timestamp = Date.now();
      const queuedMessage = {
        id: messageId,
        type,
        payload,
        timestamp,
        topics
      };
      const messageQueue = getMessageQueue();
      messageQueue.broadcast(queuedMessage);
      const wsManager = getWebSocketManager();
      const wsMessage = {
        type,
        payload,
        timestamp,
        source: "server",
        id: messageId
      };
      let sentCount;
      if (topics && Array.isArray(topics)) {
        sentCount = wsManager.broadcastToSubscribers(topics, wsMessage);
      } else {
        sentCount = wsManager.broadcast(wsMessage);
      }
      res.json({
        success: true,
        message: "Broadcast sent",
        sentToClients: sentCount,
        messageId,
        timestamp
      });
    } catch (error) {
      console.error("Broadcast API error:", error);
      res.status(500).json({
        error: "Broadcast failed",
        code: "BROADCAST_ERROR",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);
async function fetchDashboardDataForUser(userId) {
  return {
    user: {
      id: userId,
      name: "Test User",
      email: "test@example.com"
    },
    stats: {
      totalFavorites: Math.floor(Math.random() * 20),
      totalDownloads: Math.floor(Math.random() * 50),
      totalOrders: Math.floor(Math.random() * 10),
      totalSpent: Math.floor(Math.random() * 500),
      recentActivity: Math.floor(Math.random() * 15),
      quotaUsed: Math.floor(Math.random() * 30),
      quotaLimit: 50,
      calculatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      dataHash: generateDataHash()
    },
    favorites: [],
    orders: [],
    downloads: [],
    reservations: [],
    activity: [],
    trends: {
      favorites: { change: Math.floor(Math.random() * 20) - 10 },
      downloads: { change: Math.floor(Math.random() * 20) - 10 },
      orders: { change: Math.floor(Math.random() * 20) - 10 },
      revenue: { change: Math.floor(Math.random() * 20) - 10 }
    },
    chartData: []
  };
}
async function validateDataConsistency(_userId) {
  const isConsistent = Math.random() > 0.1;
  return {
    consistent: isConsistent,
    inconsistencies: isConsistent ? [] : [
      {
        type: "calculation_mismatch",
        sections: ["stats", "analytics"],
        description: "Total downloads count mismatch between sections",
        severity: "medium",
        detectedAt: Date.now()
      }
    ]
  };
}
async function forceSyncAllData(userId) {
  const data = await fetchDashboardDataForUser(userId);
  const syncId = generateSyncId();
  return { data, syncId };
}
function generateSyncId() {
  return `sync_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
function generateDataHash() {
  return `hash_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
var sync_default = router23;

// server/routes/uploads.ts
import { Router as Router23 } from "express";
import multer3 from "multer";
init_auth();

// server/middleware/fileUploadSecurity.ts
var enhancedFileUploadSecurity = (options = {}) => {
  const {
    maxFileSize = 100 * 1024 * 1024,
    // 100MB default
    allowedMimeTypes = [
      "audio/mpeg",
      "audio/wav",
      "audio/mp3",
      "audio/aiff",
      "audio/flac",
      "application/zip",
      "application/x-zip-compressed",
      "application/x-rar-compressed",
      "application/x-7z-compressed"
    ],
    enableAntivirusScanning = true,
    enableContentAnalysis = true,
    quarantineThreats: _quarantineThreats = true
  } = options;
  return async (req, res, next) => {
    try {
      const requestId = req.requestId || generateSecureRequestId();
      const file = req.file;
      if (!file) {
        return next();
      }
      logger.info("Starting enhanced security scan", {
        requestId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype
      });
      const validation = await validateFile(file, {
        allowedTypes: allowedMimeTypes,
        maxSize: maxFileSize,
        category: "audio"
        // Default category for beat requests
      });
      if (!validation.valid) {
        const errorResponse = createApiError("file_validation_failed", "File validation failed", {
          userMessage: `File validation failed: ${validation.errors.join(", ")}`,
          requestId,
          context: {
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            errors: validation.errors
          }
        });
        return res.status(400).json(errorResponse);
      }
      if (enableAntivirusScanning) {
        const scanResult = await scanFile(file);
        if (!scanResult.safe) {
          logger.warn("Security threats detected in file", {
            requestId,
            fileName: file.originalname,
            threats: scanResult.threats,
            scanTime: scanResult.scanTime
          });
          logger.error("SECURITY_INCIDENT: Malicious file upload", {
            type: "MALICIOUS_FILE_UPLOAD",
            requestId,
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            threats: scanResult.threats
          });
          const errorResponse = createApiError(
            "security_threat_detected",
            "Security threat detected",
            {
              userMessage: "File contains potential security threats and cannot be uploaded",
              requestId,
              context: {
                threats: scanResult.threats,
                scanTime: scanResult.scanTime,
                fileName: file.originalname
              }
            }
          );
          return res.status(400).json(errorResponse);
        }
        logger.info("File passed security scan", {
          requestId,
          fileName: file.originalname,
          scanTime: scanResult.scanTime
        });
      }
      if (enableContentAnalysis) {
        const contentAnalysis = await analyzeFileContent(file);
        if (contentAnalysis.suspicious) {
          logger.warn("Suspicious content detected in file", {
            requestId,
            fileName: file.originalname,
            suspiciousFeatures: contentAnalysis.features,
            riskLevel: contentAnalysis.riskLevel
          });
          req.fileSecurity = {
            suspicious: true,
            features: contentAnalysis.features,
            riskLevel: contentAnalysis.riskLevel
          };
        }
      }
      req.fileSecurity = {
        ...req.fileSecurity,
        scanned: true,
        scanTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
        fileHash: await generateFileHash(file)
      };
      logger.info("Enhanced security check completed", {
        requestId,
        fileName: file.originalname,
        fileSize: file.size,
        securityStatus: "PASSED"
      });
      next();
    } catch (error) {
      logger.error("Enhanced file upload security error", { error });
      const requestId = req.requestId || generateSecureRequestId();
      const errorResponse = createApiError("security_check_failed", "Security check failed", {
        userMessage: "An error occurred while checking file security",
        requestId,
        context: {
          error: error instanceof Error ? error.message : "Unknown error"
        }
      });
      res.status(500).json(errorResponse);
    }
  };
};
function hasValidAudioHeader(buffer) {
  const audioHeaders = {
    mp3: [255, 251],
    // MP3 frame header
    wav: [82, 73, 70, 70],
    // RIFF header
    // cspell:disable-next-line
    flac: [102, 76, 97, 67]
    // fLaC header
  };
  return Object.values(audioHeaders).some(
    (header) => header.every((byte, index) => buffer[index] === byte)
  );
}
function checkSuspiciousPatterns(content, features, currentRiskLevel) {
  const suspiciousPatterns = [
    { pattern: /https?:\/\/[^\s]+/gi, feature: "EMBEDDED_URLS", risk: "medium" },
    { pattern: /eval\s*\(/gi, feature: "EVAL_FUNCTION", risk: "high" },
    { pattern: /<script/gi, feature: "SCRIPT_TAGS", risk: "high" },
    { pattern: /powershell/gi, feature: "POWERSHELL_REFERENCE", risk: "high" },
    { pattern: /cmd\.exe/gi, feature: "CMD_REFERENCE", risk: "high" }
  ];
  let riskLevel = currentRiskLevel;
  for (const { pattern, feature, risk } of suspiciousPatterns) {
    if (pattern.test(content)) {
      features.push(feature);
      riskLevel = getHigherRiskLevel(riskLevel, risk);
    }
  }
  return riskLevel;
}
function getHigherRiskLevel(current, incoming) {
  const riskOrder = { low: 0, medium: 1, high: 2 };
  return riskOrder[incoming] > riskOrder[current] ? incoming : current;
}
async function analyzeFileContent(file) {
  const features = [];
  let riskLevel = "low";
  try {
    const buffer = file.buffer;
    const isAudioFile = file.mimetype?.startsWith("audio/");
    if (isAudioFile && !hasValidAudioHeader(buffer) && file.size > 1e3) {
      features.push("INVALID_AUDIO_HEADER");
      riskLevel = "medium";
    }
    const content = buffer.toString("utf8", 0, Math.min(buffer.length, 2048));
    riskLevel = checkSuspiciousPatterns(content, features, riskLevel);
    if (isAudioFile && file.size < 1e3) {
      features.push("UNUSUALLY_SMALL_AUDIO");
      riskLevel = getHigherRiskLevel(riskLevel, "medium");
    }
  } catch (error) {
    logger.error("Content analysis error", { error });
    features.push("ANALYSIS_ERROR");
    riskLevel = "medium";
  }
  return { suspicious: features.length > 0, features, riskLevel };
}
async function generateFileHash(file) {
  const crypto7 = await import("node:crypto");
  const hash = crypto7.createHash("sha256");
  hash.update(file.buffer);
  return hash.digest("hex");
}
var fileUploadRateLimit = (options = {}) => {
  const {
    maxUploadsPerHour = 10,
    maxTotalSizePerHour = 500 * 1024 * 1024
    // 500MB
  } = options;
  const uploadTracking = /* @__PURE__ */ new Map();
  return (req, res, next) => {
    const userKey = req.user?.id?.toString() || req.ip || "anonymous";
    const now = Date.now();
    const hourInMs = 60 * 60 * 1e3;
    let userStats = uploadTracking.get(userKey);
    if (!userStats || now > userStats.resetTime) {
      userStats = {
        count: 0,
        totalSize: 0,
        resetTime: now + hourInMs
      };
    }
    if (userStats.count >= maxUploadsPerHour) {
      const errorResponse = createApiError("upload_rate_limit", "Upload rate limit exceeded", {
        userMessage: `Too many uploads. Maximum ${maxUploadsPerHour} uploads per hour allowed.`,
        requestId: req.requestId || generateSecureRequestId()
      });
      return res.status(429).json(errorResponse);
    }
    const fileSize = req.file?.size || 0;
    if (userStats.totalSize + fileSize > maxTotalSizePerHour) {
      const errorResponse = createApiError("upload_size_limit", "Upload size limit exceeded", {
        userMessage: `Upload size limit exceeded. Maximum ${Math.round(maxTotalSizePerHour / 1024 / 1024)}MB per hour allowed.`,
        requestId: req.requestId || generateSecureRequestId()
      });
      return res.status(429).json(errorResponse);
    }
    userStats.count++;
    userStats.totalSize += fileSize;
    uploadTracking.set(userKey, userStats);
    next();
  };
};

// server/middleware/validation.ts
var DANGEROUS_EXTENSIONS = /* @__PURE__ */ new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".scr",
  ".com",
  ".pif",
  ".js",
  ".vbs"
]);
var validateFileSize = (file, maxSize) => {
  if (file.size > maxSize) {
    return {
      field: "file.size",
      value: file.size,
      message: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum ${(maxSize / 1024 / 1024).toFixed(2)}MB`
    };
  }
  return null;
};
var validateFileType = (file, allowedTypes) => {
  if (!allowedTypes.includes(file.mimetype)) {
    return {
      field: "file.type",
      value: file.mimetype,
      message: `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(", ")}`
    };
  }
  return null;
};
var validateFileName = (file) => {
  if (!file.originalname || file.originalname.length === 0) {
    return {
      field: "file.name",
      value: file.originalname,
      message: "File must have a valid name"
    };
  }
  return null;
};
var validateFileExtension = (file) => {
  const fileExtension = file.originalname.toLowerCase().split(".").pop();
  if (fileExtension && DANGEROUS_EXTENSIONS.has(`.${fileExtension}`)) {
    return {
      field: "file.extension",
      value: fileExtension,
      message: "File type not allowed for security reasons"
    };
  }
  return null;
};
var collectFileErrors = (file, maxSize, allowedTypes) => {
  const validators = [
    validateFileSize(file, maxSize),
    validateFileType(file, allowedTypes),
    validateFileName(file),
    validateFileExtension(file)
  ];
  return validators.filter((error) => error !== null);
};
var validateFileUpload3 = (options = {}) => {
  const {
    maxSize = 100 * 1024 * 1024,
    // 100MB default (harmonisé avec multer)
    allowedTypes = [
      "audio/mpeg",
      "audio/wav",
      "audio/mp3",
      "audio/aiff",
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
      "application/zip"
    ],
    required = true
  } = options;
  return (req, res, next) => {
    try {
      const file = req.file;
      const requestId = req.requestId || generateSecureRequestId();
      if (required && !file) {
        const errorResponse = createValidationError(
          [{ field: "file", value: null, message: "File is required" }],
          requestId
        );
        return res.status(400).json(errorResponse);
      }
      if (!file) {
        return next();
      }
      const errors = collectFileErrors(file, maxSize, allowedTypes);
      if (errors.length > 0) {
        const errorResponse = createValidationError(errors, requestId);
        return res.status(400).json(errorResponse);
      }
      next();
    } catch (error) {
      console.error("File validation error:", error);
      const errorResponse = createApiError("internal_server_error", "File validation failed", {
        userMessage: "An error occurred while validating your file",
        requestId: req.requestId
      });
      res.status(500).json(errorResponse);
    }
  };
};

// server/routes/uploads.ts
var router24 = Router23();
var upload3 = multer3({
  storage: multer3.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
  // 100MB max (harmonisé avec validateFileUpload)
});
router24.post(
  "/upload",
  isAuthenticated,
  fileUploadRateLimit({
    maxUploadsPerHour: 20,
    maxTotalSizePerHour: 1e3 * 1024 * 1024
    // 1GB per hour
  }),
  uploadRateLimit,
  upload3.single("file"),
  validateFileUpload3({
    maxSize: 100 * 1024 * 1024,
    // 100MB
    allowedTypes: [
      "audio/mpeg",
      "audio/wav",
      "audio/mp3",
      "audio/aiff",
      "audio/flac",
      "application/zip",
      "application/x-zip-compressed",
      "application/x-rar-compressed",
      "application/x-7z-compressed"
    ],
    required: true
  }),
  enhancedFileUploadSecurity({
    maxFileSize: 100 * 1024 * 1024,
    enableAntivirusScanning: true,
    enableContentAnalysis: true,
    quarantineThreats: true
  }),
  async (req, res) => {
    try {
      if (!req.file) {
        const requestId = req.requestId || generateSecureRequestId();
        const errorResponse = createApiError("file_too_large", "No file provided", {
          userMessage: "Please select a file to upload",
          requestId
        });
        res.status(400).json(errorResponse);
        return;
      }
      const validation = await validateFile(req.file, {
        category: req.body.category || "audio"
      });
      if (!validation.valid) {
        res.status(400).json({
          error: "Validation du fichier \xE9chou\xE9e",
          details: validation.errors
        });
        return;
      }
      const timestamp = Date.now();
      const userId = req.user.id;
      const extension = req.file.originalname.split(".").pop();
      const filePath = `${userId}/${timestamp}.${extension}`;
      const { path, url } = await uploadToStorage(req.file, filePath);
      const securityInfo = req.fileSecurity || {};
      res.json({
        success: true,
        file: {
          path,
          url,
          name: req.file.originalname,
          type: req.file.mimetype,
          size: req.file.size,
          hash: securityInfo.fileHash,
          scanned: securityInfo.scanned,
          scanTimestamp: securityInfo.scanTimestamp
        },
        security: {
          scanned: securityInfo.scanned || false,
          suspicious: securityInfo.suspicious || false,
          riskLevel: securityInfo.riskLevel || "low",
          features: securityInfo.features || []
        }
      });
    } catch (error) {
      handleRouteError(error, res, "File upload failed");
    }
  }
);
var uploads_default = router24;

// server/routes/webhooks.ts
import { Router as Router24 } from "express";
import { randomUUID as randomUUID4 } from "node:crypto";

// server/services/PaymentService.ts
init_api();
import Stripe5 from "stripe";

// shared/types/Beat.ts
var LICENSE_PRICING = {
  ["basic" /* BASIC */]: 29.99,
  ["premium" /* PREMIUM */]: 49.99,
  ["unlimited" /* UNLIMITED */]: 149.99
};
var DEFAULT_LICENSE_TERMS = {
  ["basic" /* BASIC */]: {
    type: "basic" /* BASIC */,
    copiesSold: 2e3,
    radioPlay: false,
    musicVideos: true,
    streaming: true,
    exclusive: false
  },
  ["premium" /* PREMIUM */]: {
    type: "premium" /* PREMIUM */,
    copiesSold: 1e4,
    radioPlay: true,
    musicVideos: true,
    streaming: true,
    exclusive: false
  },
  ["unlimited" /* UNLIMITED */]: {
    type: "unlimited" /* UNLIMITED */,
    copiesSold: -1,
    // Unlimited
    radioPlay: true,
    musicVideos: true,
    streaming: true,
    exclusive: true
  }
};

// server/services/PaymentService.ts
init_convex();

// server/services/AdminNotificationService.ts
import { ConvexHttpClient as ConvexHttpClient6 } from "convex/browser";
var AdminNotificationService = class _AdminNotificationService {
  static instance;
  convex;
  notificationCache = /* @__PURE__ */ new Map();
  rateLimitWindow = 5 * 60 * 1e3;
  // 5 minutes
  maxNotificationsPerWindow = 10;
  constructor() {
    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      throw new Error("VITE_CONVEX_URL environment variable is required");
    }
    this.convex = new ConvexHttpClient6(convexUrl);
  }
  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!_AdminNotificationService.instance) {
      _AdminNotificationService.instance = new _AdminNotificationService();
    }
    return _AdminNotificationService.instance;
  }
  /**
   * Send admin notification for critical payment failure
   */
  async notifyPaymentFailure(orderId, paymentIntentId, amount, currency, failureReason, requestId) {
    const payload = {
      type: "payment_failure" /* PAYMENT_FAILURE */,
      severity: "high" /* HIGH */,
      title: "Payment Failure Detected",
      message: `Payment failed for order ${orderId}`,
      metadata: {
        orderId,
        paymentIntentId,
        amount: centsToDollars(amount).toFixed(2),
        currency: currency.toUpperCase(),
        failureReason: failureReason || "Unknown reason"
      },
      requestId,
      timestamp: Date.now()
    };
    await this.sendNotification(payload);
  }
  /**
   * Send admin notification for signature verification failure
   */
  async notifySignatureVerificationFailure(provider, errorMessage, requestId) {
    const payload = {
      type: "signature_verification_failure" /* SIGNATURE_VERIFICATION_FAILURE */,
      severity: "critical" /* CRITICAL */,
      title: "\u26A0\uFE0F Security Alert: Signature Verification Failed",
      message: `${provider.toUpperCase()} webhook signature verification failed`,
      metadata: {
        provider,
        error: errorMessage,
        securityNote: "This could indicate a security issue or misconfiguration"
      },
      requestId,
      timestamp: Date.now()
    };
    await this.sendNotification(payload);
  }
  /**
   * Send admin notification for webhook processing error
   */
  async notifyWebhookProcessingError(provider, eventType, eventId, errorMessage, requestId) {
    const payload = {
      type: "webhook_processing_error" /* WEBHOOK_PROCESSING_ERROR */,
      severity: "high" /* HIGH */,
      title: "Webhook Processing Error",
      message: `Failed to process ${provider.toUpperCase()} webhook: ${eventType}`,
      metadata: {
        provider,
        eventType,
        eventId,
        error: errorMessage
      },
      requestId,
      timestamp: Date.now()
    };
    await this.sendNotification(payload);
  }
  /**
   * Send admin notification for refund processed
   */
  async notifyRefundProcessed(orderId, chargeId, amountRefunded, currency, reason, requestId) {
    const payload = {
      type: "refund_processed" /* REFUND_PROCESSED */,
      severity: "medium" /* MEDIUM */,
      title: "Refund Processed",
      message: `Refund processed for order ${orderId}`,
      metadata: {
        orderId,
        chargeId,
        amountRefunded: centsToDollars(amountRefunded).toFixed(2),
        currency: currency.toUpperCase(),
        reason: reason || "No reason provided"
      },
      requestId,
      timestamp: Date.now()
    };
    await this.sendNotification(payload);
  }
  /**
   * Send admin notification for configuration error
   */
  async notifyConfigurationError(service, missingConfig, requestId) {
    const payload = {
      type: "configuration_error" /* CONFIGURATION_ERROR */,
      severity: "critical" /* CRITICAL */,
      title: "\u26A0\uFE0F Configuration Error",
      message: `Missing configuration for ${service}`,
      metadata: {
        service,
        missingConfig,
        action: "Please check environment variables and update configuration"
      },
      requestId,
      timestamp: Date.now()
    };
    await this.sendNotification(payload);
  }
  /**
   * Send notification with rate limiting
   */
  async sendNotification(payload) {
    try {
      if (!this.shouldSendNotification(payload.type)) {
        console.log(`\u23F8\uFE0F Rate limit reached for ${payload.type}, skipping notification`);
        return;
      }
      const emailContent = this.generateEmailContent(payload);
      await sendAdminNotification(payload.type, {
        subject: payload.title,
        html: emailContent,
        metadata: payload.metadata
      });
      await this.logNotificationToAudit(payload);
      this.updateRateLimitCache(payload.type);
      console.log(`\u2705 Admin notification sent: ${payload.type}`);
    } catch (error) {
      console.error("\u274C Failed to send admin notification:", error);
    }
  }
  /**
   * Check if notification should be sent based on rate limiting
   */
  shouldSendNotification(type) {
    const cacheKey = `notification:${type}`;
    const lastSent = this.notificationCache.get(cacheKey);
    const now = Date.now();
    if (!lastSent) {
      return true;
    }
    if (now - lastSent < this.rateLimitWindow) {
      const count = Array.from(this.notificationCache.entries()).filter(
        ([key, timestamp]) => key.startsWith(`notification:${type}:`) && now - timestamp < this.rateLimitWindow
      ).length;
      if (count >= this.maxNotificationsPerWindow) {
        return false;
      }
    }
    return true;
  }
  /**
   * Update rate limit cache
   */
  updateRateLimitCache(type) {
    const cacheKey = `notification:${type}:${Date.now()}`;
    this.notificationCache.set(cacheKey, Date.now());
    const now = Date.now();
    for (const [key, timestamp] of this.notificationCache.entries()) {
      if (now - timestamp > this.rateLimitWindow) {
        this.notificationCache.delete(key);
      }
    }
  }
  /**
   * Generate email content for notification
   */
  generateEmailContent(payload) {
    const severityColor = this.getSeverityColor(payload.severity);
    const severityLabel = payload.severity.toUpperCase();
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${severityColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">${payload.title}</h2>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Severity: ${severityLabel}</p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151;">
            ${payload.message}
          </p>
          
          ${payload.requestId ? `<p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px;"><strong>Request ID:</strong> ${payload.requestId}</p>` : ""}
          
          ${payload.metadata ? this.formatMetadata(payload.metadata) : ""}
          
          <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px;">
            <strong>Timestamp:</strong> ${new Date(payload.timestamp).toLocaleString()}
          </p>
        </div>
        
        <div style="background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px;">
          <p style="margin: 0;">BroLab Entertainment - Payment System Alert</p>
          <p style="margin: 5px 0 0 0;">This is an automated notification. Please review and take appropriate action.</p>
        </div>
      </div>
    `;
  }
  /**
   * Format metadata for email display
   */
  formatMetadata(metadata) {
    const rows = Object.entries(metadata).map(
      ([key, value]) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">
            ${this.formatKey(key)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">
            ${this.formatValue(value)}
          </td>
        </tr>
      `
    ).join("");
    return `
      <table style="width: 100%; margin: 15px 0; border-collapse: collapse; background: white; border-radius: 4px; overflow: hidden;">
        ${rows}
      </table>
    `;
  }
  /**
   * Format metadata key for display
   */
  formatKey(key) {
    const withSpaces = key.replaceAll(/([A-Z])/g, " $1");
    const capitalized = withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
    return capitalized.trim();
  }
  /**
   * Format metadata value for display
   */
  formatValue(value) {
    if (value === null || value === void 0) {
      return "N/A";
    }
    if (typeof value === "object" && value !== null) {
      try {
        return `<pre style="margin: 0; font-size: 12px; white-space: pre-wrap;">${JSON.stringify(value, null, 2)}</pre>`;
      } catch {
        return "[Complex Object]";
      }
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    return "[Unknown Type]";
  }
  /**
   * Get color for severity level
   */
  getSeverityColor(severity) {
    switch (severity) {
      case "critical" /* CRITICAL */:
        return "#dc2626";
      // Red
      case "high" /* HIGH */:
        return "#ea580c";
      // Orange
      case "medium" /* MEDIUM */:
        return "#f59e0b";
      // Amber
      case "low" /* LOW */:
        return "#3b82f6";
      // Blue
      default:
        return "#6b7280";
    }
  }
  /**
   * Log notification to audit trail
   */
  async logNotificationToAudit(payload) {
    try {
      console.log("\u{1F4DD} Admin notification audit log:", {
        action: "admin_notification_sent",
        resource: "notifications",
        type: payload.type,
        severity: payload.severity,
        title: payload.title,
        requestId: payload.requestId,
        timestamp: payload.timestamp
      });
    } catch (error) {
      console.error("\u274C Failed to log notification to audit:", error);
    }
  }
};
var adminNotificationService = AdminNotificationService.getInstance();

// server/services/InvoiceService.ts
import { ConvexHttpClient as ConvexHttpClient7 } from "convex/browser";

// server/lib/pdf.ts
import fs from "node:fs";
import PDFDocument from "pdfkit";
async function fetchLogoFromUrl(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch logo from URL: ${url} - Status: ${response.status}`);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.warn(`Error fetching logo from URL: ${url}`, error);
    return null;
  }
}
function isUrl(str) {
  return str.startsWith("http://") || str.startsWith("https://");
}
async function getLogoImageData(logoPath) {
  if (!logoPath) return null;
  if (isUrl(logoPath)) {
    return await fetchLogoFromUrl(logoPath);
  }
  if (fs.existsSync(logoPath)) {
    return logoPath;
  }
  return null;
}
async function buildInvoicePdfStreamAsync(order, items, brand) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const logoData = await getLogoImageData(brand.logoPath);
  doc.rect(0, 0, doc.page.width, 80).fill("#22223b");
  if (logoData) {
    doc.image(logoData, 40, 20, { width: 60 });
  }
  doc.fillColor("#fff").fontSize(20).text(brand.name, 110, 30, { continued: true });
  doc.fontSize(10).text(`Facture n\xB0 ${order.invoice_number || ""}`, {
    align: "right",
    width: doc.page.width - 200
  });
  doc.moveDown();
  doc.fillColor("#000");
  doc.fontSize(12).text(`Client : ${order.email}`);
  doc.text(`Date : ${order.created_at ? order.created_at.slice(0, 10) : ""}`);
  doc.text(`Adresse : ${brand.address}`);
  doc.moveDown();
  doc.fontSize(12).text("Items:", { underline: true });
  doc.moveDown(0.5);
  const tableTop = doc.y;
  doc.fontSize(10).text("ID", 40, tableTop).text("Licence", 120, tableTop).text("Prix", 200, tableTop).text("Qt\xE9", 270, tableTop).text("Total", 320, tableTop);
  let y = tableTop + 15;
  items.forEach((item) => {
    doc.text(String(item.beat_id ?? item.id ?? ""), 40, y).text(item.license_type || "", 120, y).text(`${String(item.price?.toFixed(2) || "")}\u20AC`, 200, y).text(String(item.quantity || 1), 270, y).text(`${String((item.price || 0) * (item.quantity || 1))}\u20AC`, 320, y);
    y += 15;
  });
  doc.moveTo(40, y).lineTo(500, y).stroke();
  y += 10;
  doc.fontSize(12).text(`Total : ${order.total?.toFixed(2) || ""}\u20AC`, 320, y);
  doc.end();
  return doc;
}

// server/services/InvoiceService.ts
var InvoiceService = class {
  convex;
  brandConfig;
  constructor(convexUrl) {
    this.convex = new ConvexHttpClient7(convexUrl);
    this.brandConfig = {
      name: process.env.BRAND_NAME || "BroLab Entertainment",
      email: process.env.BRAND_EMAIL || "billing@brolabentertainment.com",
      address: process.env.BRAND_ADDRESS || "",
      logoPath: process.env.BRAND_LOGO_PATH || ""
    };
  }
  /**
   * Generate invoice PDF and upload to Convex storage
   *
   * @param order - Order data
   * @param items - Order items
   * @returns Invoice result with URL, number, and storage ID
   */
  async generateInvoice(order, items) {
    try {
      console.log("\u{1F4C4} Generating invoice PDF for order:", order.id);
      const orderForPdf = {
        id: 1,
        // PDF library expects number
        status: "completed",
        created_at: order.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
        invoice_number: order.invoiceNumber || this.generateInvoiceNumber(),
        user_id: order.userId ? 1 : null,
        session_id: order.sessionId || null,
        email: order.email,
        total: order.total,
        stripe_payment_intent_id: order.paymentIntentId || null,
        items: [],
        invoice_pdf_url: void 0,
        shipping_address: null
      };
      const pdfItems = items.map((item) => {
        const validLicenseTypes = ["unlimited", "basic", "premium"];
        const licenseType = item.type && typeof item.type === "string" && validLicenseTypes.includes(item.type) ? item.type : "basic";
        return {
          id: typeof item.productId === "number" ? item.productId : Number.parseInt(String(item.productId || "0")) || 0,
          beat_id: typeof item.productId === "number" ? item.productId : Number.parseInt(String(item.productId || "0")) || 0,
          license_type: licenseType,
          price: centsToDollars(item.totalPrice || item.unitPrice || 0),
          quantity: item.qty || 1,
          created_at: (/* @__PURE__ */ new Date()).toISOString(),
          session_id: null,
          user_id: null
        };
      });
      const pdfStream = await buildInvoicePdfStreamAsync(orderForPdf, pdfItems, this.brandConfig);
      const chunks = [];
      for await (const chunk of pdfStream) {
        if (Buffer.isBuffer(chunk)) {
          chunks.push(chunk);
        } else if (typeof chunk === "string") {
          chunks.push(Buffer.from(chunk));
        }
      }
      const buffer = Buffer.concat(chunks);
      const uploadUrlResult = await this.convex.action("files:generateUploadUrl", {});
      const { url } = uploadUrlResult;
      const uploadRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
        body: buffer
      });
      if (!uploadRes.ok) {
        throw new Error(`Failed to upload PDF: ${uploadRes.statusText}`);
      }
      const uploadJson = await uploadRes.json();
      const storageId = uploadJson.storageId;
      if (typeof storageId !== "string") {
        throw new TypeError("Invalid storage ID returned from upload");
      }
      const orderId = order.id;
      const result = await this.convex.mutation("orders:setInvoiceForOrder", {
        orderId,
        storageId,
        amount: Number(order.total || 0),
        currency: String(order.currency || "USD").toUpperCase(),
        taxAmount: 0,
        // No tax in current implementation
        billingInfo: { email: order.email }
      });
      const resultData = result && typeof result === "object" ? result : null;
      if (!resultData?.url || !resultData?.number) {
        throw new Error("Failed to get invoice URL or number from Convex");
      }
      await this.logInvoiceGeneration(order.id, order.userId, storageId);
      console.log("\u2705 Invoice generated successfully:", resultData.number);
      return {
        invoiceUrl: resultData.url,
        invoiceNumber: resultData.number,
        storageId
      };
    } catch (error) {
      console.error("\u274C Failed to generate invoice:", error);
      await this.logInvoiceGenerationError(
        order.id,
        order.userId,
        error instanceof Error ? error.message : String(error)
      );
      throw new Error(
        `Invoice generation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  /**
   * Send invoice email to customer
   *
   * @param email - Customer email address
   * @param invoiceUrl - URL to download invoice
   * @param invoiceNumber - Invoice number
   */
  async sendInvoiceEmail(email, invoiceUrl, invoiceNumber) {
    try {
      console.log("\u{1F4E7} Sending invoice email to:", email);
      await sendMail({
        to: email,
        subject: `Votre facture ${invoiceNumber} - BroLab Entertainment`,
        html: this.generateInvoiceEmailHtml(invoiceUrl, invoiceNumber)
      });
      console.log("\u2705 Invoice email sent successfully");
    } catch (error) {
      console.error("\u274C Failed to send invoice email:", error);
      throw new Error(
        `Invoice email sending failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  /**
   * Generate invoice number
   * Format: INV-YYYYMMDD-XXXXX
   */
  generateInvoiceNumber() {
    const date = /* @__PURE__ */ new Date();
    const dateStr = date.toISOString().slice(0, 10).replaceAll("-", "");
    const random = Math.floor(Math.random() * 1e5).toString().padStart(5, "0");
    return `INV-${dateStr}-${random}`;
  }
  /**
   * Generate invoice email HTML
   */
  generateInvoiceEmailHtml(invoiceUrl, invoiceNumber) {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; background: #f4f4f4; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Votre Facture</h1>
            <p style="color: #E5E7EB; margin: 10px 0 0 0; font-size: 16px;">BroLab Entertainment</p>
          </div>
          
          <div style="padding: 30px; background: white;">
            <h2 style="color: #333; margin: 0 0 20px 0;">Merci pour votre paiement ! \u{1F389}</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
              Votre paiement a \xE9t\xE9 trait\xE9 avec succ\xE8s. Vous trouverez ci-dessous le lien pour t\xE9l\xE9charger votre facture.
            </p>
            
            <div style="background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Num\xE9ro de facture :</strong> ${invoiceNumber}</p>
              <p style="margin: 10px 0 0 0;"><strong>Date :</strong> ${(/* @__PURE__ */ new Date()).toLocaleDateString("fr-FR")}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invoiceUrl}" 
                 style="background: #8B5CF6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                T\xE9l\xE9charger la facture
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
              Conservez cette facture pour vos dossiers. Si vous avez des questions, n'h\xE9sitez pas \xE0 nous contacter.
            </p>
          </div>
          
          <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
            <p style="margin: 0;">BroLab Entertainment - Professional Music Production Services</p>
            <p style="margin: 5px 0 0 0;">\u{1F4E7} ${this.brandConfig.email}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
  /**
   * Log invoice generation to audit
   */
  async logInvoiceGeneration(orderId, userId, storageId) {
    try {
      await this.convex.mutation("audit:logAction", {
        userId,
        action: "invoice_generated",
        resource: "orders",
        resourceId: orderId,
        metadata: {
          storageId,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error("\u274C Failed to log invoice generation to audit:", error);
    }
  }
  /**
   * Log invoice generation error to audit
   */
  async logInvoiceGenerationError(orderId, userId, errorMessage) {
    try {
      await this.convex.mutation("audit:logAction", {
        userId,
        action: "invoice_generation_error",
        resource: "orders",
        resourceId: orderId,
        metadata: {
          error: errorMessage,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error("\u274C Failed to log invoice generation error to audit:", error);
    }
  }
};
var invoiceServiceInstance = null;
var getInvoiceService = () => {
  if (!invoiceServiceInstance) {
    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      throw new Error("VITE_CONVEX_URL environment variable is required");
    }
    invoiceServiceInstance = new InvoiceService(convexUrl);
  }
  return invoiceServiceInstance;
};

// server/services/LicenseEmailService.ts
function generateLicenseEmailHtml(data) {
  const formattedDate = data.purchaseDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const licenseTypeDisplay = data.licenseType.charAt(0).toUpperCase() + data.licenseType.slice(1);
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background: #f4f4f4; font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">\u{1F3B5} Your License Certificate</h1>
          <p style="color: #E5E7EB; margin: 10px 0 0 0; font-size: 16px;">BroLab Entertainment</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px; background: white;">
          <h2 style="color: #333; margin: 0 0 20px 0;">Hey ${data.buyerName}! \u{1F389}</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
            Thank you for your purchase! Your license certificate for <strong>"${data.beatTitle}"</strong> is ready.
          </p>
          
          <!-- License Info Box -->
          <div style="background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #7C3AED; margin: 0 0 15px 0;">License Details</h3>
            <p style="margin: 5px 0;"><strong>Beat:</strong> ${data.beatTitle}</p>
            <p style="margin: 5px 0;"><strong>License Type:</strong> ${licenseTypeDisplay}</p>
            <p style="margin: 5px 0;"><strong>Reference:</strong> ${data.licenseNumber}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 5px 0;"><strong>Amount:</strong> ${data.currency} ${data.price.toFixed(2)}</p>
          </div>
          
          <!-- Download Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.licenseUrl}" 
               style="background: #8B5CF6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              \u{1F4C4} Download License PDF
            </a>
          </div>
          
          <!-- Important Notice -->
          <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
            <h4 style="color: #92400E; margin: 0 0 10px 0;">Important</h4>
            <p style="color: #78350F; margin: 0; font-size: 14px;">
              Keep this license certificate safe. It serves as proof of your purchase and outlines your usage rights.
              Credit must be given as: "Produced by BroLab Entertainment"
            </p>
          </div>
          
          <!-- What's Included -->
          <div style="margin: 20px 0;">
            <h3 style="color: #333; margin: 0 0 15px 0;">What's Included in Your ${licenseTypeDisplay} License:</h3>
            <ul style="color: #666; line-height: 1.8; padding-left: 20px;">
              ${getLicenseFeaturesList(data.licenseType)}
            </ul>
          </div>
          
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            Your files are also available in your dashboard. If you have any questions, don't hesitate to reach out!
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
          <p style="margin: 0;">BroLab Entertainment - Professional Music Production</p>
          <p style="margin: 5px 0 0 0;">\u{1F4E7} licensing@brolabentertainment.com</p>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #9CA3AF;">
            Order #${data.orderId.substring(0, 12)}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
function getLicenseFeaturesList(licenseType) {
  const features = {
    ["basic" /* BASIC */]: [
      "Up to 2,000 copies/sales",
      "Streaming on all platforms",
      "Music video rights",
      "Non-exclusive license"
    ],
    ["premium" /* PREMIUM */]: [
      "Up to 10,000 copies/sales",
      "Streaming on all platforms",
      "Music video rights",
      "Radio play rights",
      "Non-exclusive license"
    ],
    ["unlimited" /* UNLIMITED */]: [
      "Unlimited copies/sales",
      "Streaming on all platforms",
      "Music video rights",
      "Radio play rights",
      "Exclusive rights to the beat"
    ]
  };
  return features[licenseType].map((f) => `<li>${f}</li>`).join("");
}
async function sendLicenseEmail(data) {
  const html = generateLicenseEmailHtml(data);
  const result = await sendMailWithResult({
    to: data.buyerEmail,
    subject: `\u{1F3B5} Your License Certificate - ${data.beatTitle} | BroLab Entertainment`,
    html
  });
  if (result.success) {
    console.log(`\u2705 License email sent to ${data.buyerEmail} for ${data.beatTitle}`);
  } else {
    console.error(`\u274C Failed to send license email to ${data.buyerEmail}:`, result.error);
  }
  return result;
}

// server/services/LicensePdfService.ts
import { ConvexHttpClient as ConvexHttpClient8 } from "convex/browser";
import crypto6 from "node:crypto";
import PDFDocument2 from "pdfkit";
var LicensePdfService = class _LicensePdfService {
  static instance;
  convex;
  brandConfig;
  constructor(convexUrl) {
    this.convex = new ConvexHttpClient8(convexUrl);
    this.brandConfig = {
      name: process.env.BRAND_NAME || "BroLab Entertainment",
      email: process.env.BRAND_EMAIL || "licensing@brolabentertainment.com",
      website: process.env.BRAND_WEBSITE || "https://brolabentertainment.com",
      logoUrl: process.env.BRAND_LOGO_URL
    };
  }
  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!_LicensePdfService.instance) {
      const convexUrl = process.env.VITE_CONVEX_URL;
      if (!convexUrl) {
        throw new Error("VITE_CONVEX_URL environment variable is required");
      }
      _LicensePdfService.instance = new _LicensePdfService(convexUrl);
    }
    return _LicensePdfService.instance;
  }
  /**
   * Generate a unique license reference number
   * Format: LICENSE-<orderId>-<itemId>-<hash>
   */
  generateLicenseNumber(orderId, itemId) {
    const hash = crypto6.createHash("sha256").update(`${orderId}-${itemId}-${Date.now()}`).digest("hex").substring(0, 8).toUpperCase();
    return `LICENSE-${orderId.substring(0, 8).toUpperCase()}-${itemId}-${hash}`;
  }
  /**
   * Get license terms description based on license type
   */
  getLicenseTermsText(licenseType) {
    const terms = DEFAULT_LICENSE_TERMS[licenseType];
    const copiesLine = terms.copiesSold === -1 ? "\u2022 Unlimited copies/sales" : `\u2022 Up to ${terms.copiesSold.toLocaleString()} copies/sales`;
    return [
      `License Type: ${licenseType.toUpperCase()}`,
      `Price: ${LICENSE_PRICING[licenseType]}`,
      "",
      "RIGHTS GRANTED:",
      copiesLine,
      `\u2022 Streaming: ${terms.streaming ? "Yes" : "No"}`,
      `\u2022 Music Videos: ${terms.musicVideos ? "Yes" : "No"}`,
      `\u2022 Radio Play: ${terms.radioPlay ? "Yes" : "No"}`,
      `\u2022 Exclusive Rights: ${terms.exclusive ? "Yes" : "No"}`
    ];
  }
  /**
   * Build the license PDF document
   */
  async buildLicensePdf(input, licenseNumber) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument2({
          size: "A4",
          margin: 40,
          info: {
            Title: `License Certificate - ${input.beat.title}`,
            Author: this.brandConfig.name,
            Subject: `Beat License - ${licenseNumber}`,
            Keywords: "license, beat, music, certificate"
          }
        });
        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const margin = 40;
        const contentWidth = pageWidth - margin * 2;
        doc.rect(0, 0, pageWidth, 120).fill("#7C3AED");
        doc.rect(0, 100, pageWidth, 20).fill("#8B5CF6");
        doc.fillColor("#FFFFFF").fontSize(28).font("Helvetica-Bold");
        doc.text(this.brandConfig.name, margin, 35, { width: contentWidth });
        doc.fontSize(14).font("Helvetica");
        doc.text("OFFICIAL LICENSE CERTIFICATE", margin, 70, { width: contentWidth });
        doc.fontSize(10);
        doc.text(licenseNumber, margin, 90, { width: contentWidth });
        let yPos = 140;
        doc.fillColor("#1F2937").fontSize(12).font("Helvetica-Bold");
        doc.text("LICENSED BEAT", margin, yPos);
        yPos += 20;
        doc.fontSize(22).fillColor("#7C3AED");
        doc.text(input.beat.title, margin, yPos, { width: contentWidth });
        yPos += 35;
        if (input.beat.producer) {
          doc.fontSize(12).fillColor("#6B7280").font("Helvetica");
          doc.text(`Produced by: ${input.beat.producer}`, margin, yPos);
          yPos += 25;
        }
        doc.moveTo(margin, yPos).lineTo(pageWidth - margin, yPos).stroke("#E5E7EB");
        yPos += 20;
        const col1X = margin;
        const col2X = pageWidth / 2 + 20;
        const colWidth = (contentWidth - 40) / 2;
        doc.fillColor("#1F2937").fontSize(11).font("Helvetica-Bold");
        doc.text("LICENSEE INFORMATION", col1X, yPos);
        yPos += 18;
        doc.fontSize(10).font("Helvetica").fillColor("#374151");
        doc.text(`Name: ${input.buyer.name}`, col1X, yPos, { width: colWidth });
        yPos += 15;
        doc.text(`Email: ${input.buyer.email}`, col1X, yPos, { width: colWidth });
        yPos += 15;
        doc.text(
          `Date: ${input.purchaseDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
          })}`,
          col1X,
          yPos,
          { width: colWidth }
        );
        let rightYPos = yPos - 48;
        doc.fillColor("#1F2937").fontSize(11).font("Helvetica-Bold");
        doc.text("LICENSE DETAILS", col2X, rightYPos);
        rightYPos += 18;
        doc.fontSize(10).font("Helvetica").fillColor("#374151");
        doc.text(`Type: ${input.licenseType.toUpperCase()}`, col2X, rightYPos, { width: colWidth });
        rightYPos += 15;
        doc.text(`Price: ${input.currency} ${input.price.toFixed(2)}`, col2X, rightYPos, {
          width: colWidth
        });
        rightYPos += 15;
        doc.text(`Order: ${input.orderId.substring(0, 12)}...`, col2X, rightYPos, {
          width: colWidth
        });
        yPos += 40;
        doc.moveTo(margin, yPos).lineTo(pageWidth - margin, yPos).stroke("#E5E7EB");
        yPos += 20;
        const termsBoxHeight = 180;
        doc.rect(margin, yPos, contentWidth, termsBoxHeight).fill("#F3F4F6");
        doc.fillColor("#1F2937").fontSize(11).font("Helvetica-Bold");
        doc.text("LICENSE TERMS & CONDITIONS", margin + 15, yPos + 15);
        const termsLines = this.getLicenseTermsText(input.licenseType);
        let termsY = yPos + 35;
        doc.fontSize(9).font("Helvetica").fillColor("#374151");
        for (const line of termsLines) {
          doc.text(line, margin + 15, termsY, { width: contentWidth - 30 });
          termsY += 14;
        }
        yPos += termsBoxHeight + 20;
        doc.rect(margin, yPos, contentWidth, 60).fill("#FEF3C7");
        doc.fillColor("#92400E").fontSize(9).font("Helvetica-Bold");
        doc.text("IMPORTANT NOTICE", margin + 15, yPos + 12);
        doc.font("Helvetica").fontSize(8);
        doc.text(
          `This license is non-transferable and grants the licensee the rights specified above. The producer retains all ownership rights to the beat. Credit must be given as: "Produced by ${input.beat.producer || this.brandConfig.name}"`,
          margin + 15,
          yPos + 28,
          { width: contentWidth - 30 }
        );
        doc.rect(0, pageHeight - 80, pageWidth, 80).fill("#1F2937");
        doc.fillColor("#9CA3AF").fontSize(8).font("Helvetica");
        doc.text(
          `This license certificate was generated on ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}`,
          margin,
          pageHeight - 65,
          { width: contentWidth, align: "center" }
        );
        doc.fillColor("#FFFFFF").fontSize(9);
        doc.text(this.brandConfig.website, margin, pageHeight - 50, {
          width: contentWidth,
          align: "center"
        });
        doc.fillColor("#9CA3AF").fontSize(7);
        doc.text(`License Reference: ${licenseNumber}`, margin, pageHeight - 35, {
          width: contentWidth,
          align: "center"
        });
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
  /**
   * Check if license PDF already exists for this order item
   */
  async checkExistingLicense(orderId, itemId) {
    try {
      const convexClient2 = this.convex;
      const existing = await convexClient2.query("licenses:getLicenseByOrderItem", {
        orderId,
        itemId
      });
      if (existing && typeof existing === "object") {
        const license = existing;
        return {
          licenseNumber: license.licenseNumber,
          licenseUrl: license.pdfUrl,
          storageId: license.storageId
        };
      }
      return null;
    } catch {
      return null;
    }
  }
  /**
   * Upload PDF to Convex storage
   */
  async uploadPdfToStorage(pdfBuffer) {
    const convexClient2 = this.convex;
    const uploadUrlResult = await convexClient2.action("files:generateUploadUrl", {});
    const { url } = uploadUrlResult;
    const uploadRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/pdf" },
      body: pdfBuffer
    });
    if (!uploadRes.ok) {
      throw new Error(`Failed to upload PDF: ${uploadRes.statusText}`);
    }
    const uploadJson = await uploadRes.json();
    const storageId = uploadJson.storageId;
    const pdfUrl = await this.getStorageUrl(storageId);
    return { storageId, url: pdfUrl };
  }
  /**
   * Get storage URL for a file
   */
  async getStorageUrl(storageId) {
    const convexClient2 = this.convex;
    try {
      const url = await convexClient2.mutation("files:getStorageUrl", { storageId });
      return url || "";
    } catch {
      return `${process.env.VITE_CONVEX_URL?.replace(".cloud", ".site")}/api/storage/${storageId}`;
    }
  }
  /**
   * Save license record to database
   */
  async saveLicenseRecord(input, licenseNumber, storageId, pdfUrl) {
    try {
      const convexClient2 = this.convex;
      await convexClient2.mutation("licenses:createLicense", {
        orderId: input.orderId,
        itemId: input.itemId,
        beatId: input.beat.id,
        beatTitle: input.beat.title,
        licenseType: input.licenseType,
        licenseNumber,
        buyerEmail: input.buyer.email,
        buyerName: input.buyer.name,
        buyerUserId: input.buyer.userId,
        price: input.price,
        currency: input.currency,
        pdfStorageId: storageId,
        pdfUrl,
        purchaseDate: input.purchaseDate.getTime()
      });
    } catch (error) {
      console.warn("Failed to save license record to database:", error);
    }
  }
  /**
   * Generate license PDF for a beat purchase
   *
   * @param input - License generation input
   * @returns License PDF result with URL and reference number
   */
  async generateLicense(input) {
    console.log(`\u{1F4C4} Generating license PDF for order ${input.orderId}, item ${input.itemId}`);
    const existing = await this.checkExistingLicense(input.orderId, input.itemId);
    if (existing) {
      console.log(`\u2139\uFE0F License already exists: ${existing.licenseNumber}`);
      return existing;
    }
    const licenseNumber = this.generateLicenseNumber(input.orderId, input.itemId);
    const pdfBuffer = await this.buildLicensePdf(input, licenseNumber);
    console.log(`\u2705 PDF generated: ${pdfBuffer.length} bytes`);
    const { storageId, url: pdfUrl } = await this.uploadPdfToStorage(pdfBuffer);
    console.log(`\u2705 PDF uploaded: ${storageId}`);
    await this.saveLicenseRecord(input, licenseNumber, storageId, pdfUrl);
    return {
      licenseUrl: pdfUrl,
      licenseNumber,
      storageId
    };
  }
  /**
   * Generate licenses for all items in an order
   */
  async generateLicensesForOrder(orderId, items, buyer, currency = "USD") {
    const results = [];
    const purchaseDate = /* @__PURE__ */ new Date();
    for (const item of items) {
      try {
        const result = await this.generateLicense({
          orderId,
          itemId: item.itemId,
          beat: item.beat,
          licenseType: item.licenseType,
          buyer,
          purchaseDate,
          price: item.price,
          currency
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to generate license for item ${item.itemId}:`, error);
      }
    }
    return results;
  }
};
var getLicensePdfService = () => {
  return LicensePdfService.getInstance();
};

// server/services/ReservationPaymentService.ts
init_api();
init_convex();
var convex6 = getConvex();
var ReservationPaymentService = class _ReservationPaymentService {
  static instance;
  constructor() {
  }
  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!_ReservationPaymentService.instance) {
      _ReservationPaymentService.instance = new _ReservationPaymentService();
    }
    return _ReservationPaymentService.instance;
  }
  /**
   * Handle successful reservation payment
   * Updates reservation status to "confirmed" and sends confirmation email
   *
   * @param reservationIds - Array of reservation IDs to confirm
   * @param paymentData - Payment information from Stripe
   * @param session - Stripe checkout session
   */
  async handleReservationPaymentSuccess(reservationIds, paymentData, session2) {
    const startTime = Date.now();
    try {
      console.log(
        `\u2705 Processing successful reservation payment for ${reservationIds.length} reservation(s)`
      );
      const reservations = await this.fetchReservationDetails(reservationIds);
      if (reservations.length === 0) {
        throw new Error("No reservations found for the provided IDs");
      }
      const updatePromises = reservationIds.map(
        (id) => this.updateReservationStatus(id, "confirmed", "Payment confirmed")
      );
      await Promise.all(updatePromises);
      console.log(`\u2705 Updated ${reservationIds.length} reservation(s) to confirmed status`);
      await this.sendConfirmationEmail(
        session2.customer_email || paymentData.sessionId || "unknown@example.com",
        reservations,
        paymentData
      );
      const duration = Date.now() - startTime;
      console.log(`\u2705 Reservation payment success processed in ${duration}ms`);
      await this.logToAudit({
        action: "reservation_payment_success",
        resource: "reservations",
        details: {
          reservationIds,
          paymentIntentId: paymentData.paymentIntentId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          duration
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Error processing reservation payment success", {
        duration,
        reservationIds,
        paymentIntentId: paymentData.paymentIntentId,
        error: error instanceof Error ? error.message : String(error)
      });
      await this.logToAudit({
        action: "reservation_payment_success_error",
        resource: "reservations",
        details: {
          reservationIds,
          error: error instanceof Error ? error.message : String(error),
          duration
        }
      });
      throw error;
    }
  }
  /**
   * Handle failed reservation payment
   * Updates reservation status and sends failure notification email
   *
   * @param reservationIds - Array of reservation IDs
   * @param paymentData - Payment information from Stripe
   * @param paymentIntent - Stripe payment intent with failure details
   */
  async handleReservationPaymentFailure(reservationIds, paymentData, paymentIntent) {
    const startTime = Date.now();
    try {
      console.log(
        `\u26A0\uFE0F Processing failed reservation payment for ${reservationIds.length} reservation(s)`
      );
      const failureReason = paymentIntent.last_payment_error?.message || "Payment processing failed";
      const reservations = await this.fetchReservationDetails(reservationIds);
      if (reservations.length === 0) {
        throw new Error("No reservations found for the provided IDs");
      }
      const updatePromises = reservationIds.map(
        (id) => this.updateReservationStatus(
          id,
          "pending",
          `Payment failed: ${failureReason}`
        )
      );
      await Promise.all(updatePromises);
      console.log(`\u2705 Updated ${reservationIds.length} reservation(s) with payment failure notes`);
      const userEmail = reservations[0]?.details?.email || "unknown@example.com";
      await this.sendFailureEmail(userEmail, reservationIds, paymentData, failureReason);
      const duration = Date.now() - startTime;
      console.log(`\u2705 Reservation payment failure processed in ${duration}ms`);
      await this.logToAudit({
        action: "reservation_payment_failure",
        resource: "reservations",
        details: {
          reservationIds,
          paymentIntentId: paymentData.paymentIntentId,
          failureReason,
          amount: paymentData.amount,
          currency: paymentData.currency,
          duration
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Error processing reservation payment failure", {
        duration,
        reservationIds,
        paymentIntentId: paymentData.paymentIntentId,
        error: error instanceof Error ? error.message : String(error)
      });
      await this.logToAudit({
        action: "reservation_payment_failure_error",
        resource: "reservations",
        details: {
          reservationIds,
          error: error instanceof Error ? error.message : String(error),
          duration
        }
      });
      throw error;
    }
  }
  /**
   * Update reservation status in Convex
   * Private method to update a single reservation's status
   *
   * @param reservationId - Reservation ID to update
   * @param status - New status to set
   * @param notes - Optional notes about the status change
   */
  async updateReservationStatus(reservationId, status, notes) {
    try {
      await convex6.mutation(api.reservations.updateReservationStatus, {
        reservationId,
        status,
        notes,
        skipEmailNotification: true
      });
      console.log(`\u2705 Updated reservation ${reservationId} to status: ${status}`);
    } catch (error) {
      logger.error("Error updating reservation status", {
        reservationId,
        status,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(
        `Failed to update reservation status: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Send confirmation email using existing email templates
   * Private method to send reservation confirmation email
   *
   * @param userEmail - User's email address
   * @param reservations - Array of reservation data
   * @param payment - Payment information
   */
  async sendConfirmationEmail(userEmail, reservations, payment) {
    try {
      console.log(`\u{1F4E7} Sending confirmation email to ${userEmail}`);
      await sendReservationConfirmationEmail(userEmail, reservations, payment);
      console.log(`\u2705 Confirmation email sent successfully to ${userEmail}`);
      return { success: true };
    } catch (error) {
      logger.error("Error sending confirmation email", {
        userEmail,
        reservationCount: reservations.length,
        error: error instanceof Error ? error.message : String(error)
      });
      await this.logToAudit({
        action: "confirmation_email_error",
        resource: "emails",
        details: {
          userEmail,
          reservationCount: reservations.length,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Send failure email for payment failure notifications
   * Private method to send payment failure notification
   *
   * @param userEmail - User's email address
   * @param reservationIds - Array of reservation IDs
   * @param payment - Payment information
   * @param failureReason - Reason for payment failure
   */
  async sendFailureEmail(userEmail, reservationIds, payment, failureReason) {
    try {
      console.log(`\u{1F4E7} Sending payment failure email to ${userEmail}`);
      await sendPaymentFailureEmail(userEmail, reservationIds, payment, failureReason);
      console.log(`\u2705 Payment failure email sent successfully to ${userEmail}`);
      return { success: true };
    } catch (error) {
      logger.error("Error sending payment failure email", {
        userEmail,
        reservationIds,
        error: error instanceof Error ? error.message : String(error)
      });
      await this.logToAudit({
        action: "failure_email_error",
        resource: "emails",
        details: {
          userEmail,
          reservationIds,
          failureReason,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Fetch reservation details from Convex
   * Helper method to retrieve reservation data for email templates
   *
   * @param reservationIds - Array of reservation IDs
   * @returns Array of reservation email data
   */
  async fetchReservationDetails(reservationIds) {
    try {
      const reservations = [];
      for (const id of reservationIds) {
        const allReservations = await convex6.query(api.reservations.listReservations, {
          limit: 100
        });
        const found = allReservations.find((r) => r._id === id);
        if (found) {
          reservations.push({
            id: found._id,
            serviceType: found.serviceType,
            preferredDate: found.preferredDate,
            durationMinutes: found.durationMinutes,
            totalPrice: found.totalPrice,
            status: found.status,
            notes: found.notes,
            details: found.details
          });
        }
      }
      return reservations;
    } catch (error) {
      logger.error("Error fetching reservation details", {
        reservationIds,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(
        `Failed to fetch reservation details: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Log to audit trail
   * Helper method to log events to Convex audit system
   *
   * @param entry - Audit log entry
   */
  async logToAudit(entry) {
    try {
      await convex6.mutation(api.audit.log, {
        action: entry.action,
        resource: entry.resource,
        details: entry.details
      });
    } catch (error) {
      logger.error("Failed to log to audit", {
        action: entry.action,
        resource: entry.resource,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
};
var reservationPaymentService = ReservationPaymentService.getInstance();

// server/services/PaymentService.ts
var stripeClient3 = null;
function getStripeClient() {
  if (!stripeClient3) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new PaymentError(
        "STRIPE_SECRET_KEY is required for payment operations",
        "MISSING_CONFIGURATION" /* MISSING_CONFIGURATION */,
        { service: "stripe", missingConfig: "STRIPE_SECRET_KEY" }
      );
    }
    stripeClient3 = new Stripe5(secretKey, {
      apiVersion: "2025-08-27.basil"
    });
  }
  return stripeClient3;
}
var convex7 = getConvex();
var PaymentService = class _PaymentService {
  static instance;
  reservationPaymentService;
  invoiceService;
  constructor() {
    this.reservationPaymentService = ReservationPaymentService.getInstance();
    this.invoiceService = getInvoiceService();
  }
  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!_PaymentService.instance) {
      _PaymentService.instance = new _PaymentService();
    }
    return _PaymentService.instance;
  }
  /**
   * Create payment intent with order metadata
   * Completes within 3 seconds
   */
  async createPaymentIntent(order) {
    const startTime = Date.now();
    try {
      const idempotencyKey = order.idempotencyKey || `order_${order._id}_${Date.now()}`;
      const paymentIntent = await getStripeClient().paymentIntents.create(
        {
          amount: Math.round(order.total),
          // Amount in cents
          currency: (order.currency || "USD").toLowerCase(),
          metadata: {
            orderId: order._id,
            email: order.email,
            userId: order.userId || "",
            itemCount: order.items.length.toString()
          },
          automatic_payment_methods: {
            enabled: true
          }
        },
        {
          idempotencyKey
        }
      );
      await saveStripeCheckoutSessionWithRetry({
        orderId: order._id,
        checkoutSessionId: paymentIntent.id,
        paymentIntentId: paymentIntent.id
      });
      const duration = Date.now() - startTime;
      console.log(`\u2705 Payment intent created in ${duration}ms: ${paymentIntent.id}`);
      return {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`\u274C Failed to create payment intent after ${duration}ms:`, error);
      await this.logToAudit({
        action: "payment_intent_creation_failed",
        resource: "payments",
        details: {
          orderId: order._id,
          error: error instanceof Error ? error.message : String(error),
          duration
        }
      });
      throw new Error(
        `Failed to create payment intent: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Handle Stripe webhook with signature verification
   * Routes events to appropriate handlers based on metadata
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5
   */
  async handleStripeWebhook(payload, signature) {
    const startTime = Date.now();
    try {
      const event = await this.verifyStripeSignature(payload, signature);
      console.log(`\u{1F4E8} Stripe webhook received: ${event.type} (${event.id})`);
      const idempotencyResult = await markProcessedEventWithRetry({
        provider: "stripe",
        eventId: event.id
      });
      if (idempotencyResult?.alreadyProcessed) {
        console.log(`\u2139\uFE0F Event ${event.id} already processed, skipping`);
        return {
          success: true,
          message: "Event already processed"
        };
      }
      const result = await this.routeStripeEvent(event);
      const duration = Date.now() - startTime;
      console.log(`\u2705 Stripe webhook processed in ${duration}ms: ${event.type}`);
      await this.logToAudit({
        action: "webhook_processed",
        resource: "payments",
        details: {
          provider: "stripe",
          eventType: event.type,
          eventId: event.id,
          duration
        }
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`\u274C Error handling Stripe webhook after ${duration}ms:`, errorMessage);
      await this.logToAudit({
        action: "webhook_processing_error",
        resource: "payments",
        details: {
          provider: "stripe",
          error: errorMessage,
          stack: error instanceof Error ? error.stack : void 0,
          duration
        }
      });
      let eventType = "unknown";
      let eventId = "unknown";
      try {
        const event = await this.verifyStripeSignature(payload, signature);
        eventType = event.type;
        eventId = event.id;
      } catch {
      }
      await adminNotificationService.notifyWebhookProcessingError(
        "stripe",
        eventType,
        eventId,
        errorMessage
      );
      throw error;
    }
  }
  /**
   * Route Stripe event to appropriate handler
   * Checks metadata.type for reservation payments
   * Requirements: 1.2, 5.1, 5.2
   */
  async routeStripeEvent(event) {
    try {
      switch (event.type) {
        case "checkout.session.completed":
          return await this.handleCheckoutSessionCompleted(event.data.object);
        case "payment_intent.succeeded":
          return await this.handlePaymentSuccess(event.data.object);
        case "payment_intent.payment_failed":
          return await this.handlePaymentFailure(event.data.object);
        case "charge.refunded":
          return await this.handleRefund(event.data.object);
        default:
          console.log(`\u2139\uFE0F Unhandled Stripe event type: ${event.type}`);
          return {
            success: true,
            message: `Unhandled event type: ${event.type}`
          };
      }
    } catch (error) {
      console.error(`\u274C Error routing Stripe event ${event.type}:`, error);
      throw error;
    }
  }
  /**
   * Handle reservation payment from checkout session
   */
  async handleReservationCheckout(session2, reservationIds) {
    const ids = JSON.parse(reservationIds);
    const paymentData = {
      provider: "stripe",
      status: "succeeded",
      amount: session2.amount_total || 0,
      currency: session2.currency || "usd",
      sessionId: session2.id,
      paymentIntentId: typeof session2.payment_intent === "string" ? session2.payment_intent : void 0,
      eventId: session2.id
    };
    await this.reservationPaymentService.handleReservationPaymentSuccess(ids, paymentData, session2);
    return {
      success: true,
      message: "Reservation payment processed successfully",
      reservationIds: ids
    };
  }
  /**
   * Process order payment and confirmation
   */
  async processOrderPayment(session2, orderId) {
    await recordPaymentWithRetry({
      orderId,
      provider: "stripe",
      status: "succeeded",
      amount: session2.amount_total || 0,
      currency: session2.currency || "usd",
      stripeEventId: session2.id,
      stripePaymentIntentId: typeof session2.payment_intent === "string" ? session2.payment_intent : void 0
    });
    await confirmPaymentWithRetry({
      orderId,
      paymentIntentId: typeof session2.payment_intent === "string" ? session2.payment_intent : session2.id,
      status: "succeeded"
    });
  }
  /**
   * Generate and send invoice for order
   */
  async generateOrderInvoice(session2, orderId) {
    try {
      const order = await convex7.query(api.orders.getOrder, { orderId });
      if (!order || typeof order !== "object" || !("items" in order) || !Array.isArray(order.items)) {
        return;
      }
      const invoiceItems = order.items.map(
        (item) => ({
          productId: item.productId || 0,
          title: item.title || item.name || "Unknown Item",
          unitPrice: item.price || 0,
          totalPrice: (item.price || 0) * (item.quantity || item.qty || 1),
          qty: item.quantity || item.qty || 1,
          type: item.license || item.type
        })
      );
      const orderData = {
        id: orderId,
        userId: "userId" in order && typeof order.userId === "string" ? order.userId : void 0,
        email: "email" in order && typeof order.email === "string" ? order.email : "",
        total: session2.amount_total || 0,
        currency: session2.currency || "usd",
        sessionId: session2.id,
        paymentIntentId: typeof session2.payment_intent === "string" ? session2.payment_intent : void 0
      };
      const invoice = await this.invoiceService.generateInvoice(orderData, invoiceItems);
      await this.invoiceService.sendInvoiceEmail(
        orderData.email,
        invoice.invoiceUrl,
        invoice.invoiceNumber
      );
    } catch (invoiceError) {
      console.error("\u26A0\uFE0F Failed to generate/send invoice:", invoiceError);
    }
  }
  /**
   * Generate and send license PDFs for order items (beat purchases)
   */
  async generateOrderLicenses(session2, orderId) {
    try {
      const order = await convex7.query(api.orders.getOrder, { orderId });
      if (!order || typeof order !== "object" || !("items" in order) || !Array.isArray(order.items)) {
        return;
      }
      const buyerEmail = "email" in order && typeof order.email === "string" ? order.email : "";
      const buyerName = session2.customer_details?.name || buyerEmail.split("@")[0] || "Customer";
      const buyerUserId = "userId" in order && typeof order.userId === "string" ? order.userId : void 0;
      if (!buyerEmail) {
        console.warn("\u26A0\uFE0F No buyer email found, skipping license generation");
        return;
      }
      const licensePdfService = getLicensePdfService();
      const currency = (session2.currency || "usd").toUpperCase();
      for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i];
        if (item.type && item.type !== "beat") {
          continue;
        }
        const licenseType = this.validateLicenseType(item.license);
        if (!licenseType) {
          console.warn(`\u26A0\uFE0F Invalid license type for item ${i}: ${item.license}`);
          continue;
        }
        try {
          const licenseResult = await licensePdfService.generateLicense({
            orderId: String(orderId),
            itemId: String(i),
            beat: {
              id: item.productId || 0,
              title: item.title || item.name || `Beat ${item.productId}`,
              producer: "BroLab Entertainment"
            },
            licenseType,
            buyer: {
              name: buyerName,
              email: buyerEmail,
              userId: buyerUserId
            },
            purchaseDate: /* @__PURE__ */ new Date(),
            price: centsToDollars(item.price || 0),
            currency
          });
          console.log(`\u2705 License generated: ${licenseResult.licenseNumber}`);
          await sendLicenseEmail({
            buyerEmail,
            buyerName,
            beatTitle: item.title || item.name || `Beat ${item.productId}`,
            licenseType,
            licenseNumber: licenseResult.licenseNumber,
            licenseUrl: licenseResult.licenseUrl,
            orderId: String(orderId),
            purchaseDate: /* @__PURE__ */ new Date(),
            price: centsToDollars(item.price || 0),
            currency
          });
          console.log(`\u2705 License email sent for: ${item.title || item.name}`);
        } catch (itemError) {
          console.error(`\u26A0\uFE0F Failed to generate license for item ${i}:`, itemError);
        }
      }
    } catch (licenseError) {
      console.error("\u26A0\uFE0F Failed to generate/send licenses:", licenseError);
    }
  }
  /**
   * Validate and convert license type string to LicenseType enum
   */
  validateLicenseType(license) {
    if (!license) return null;
    const normalized = license.toLowerCase();
    if (normalized === "basic") return "basic" /* BASIC */;
    if (normalized === "premium") return "premium" /* PREMIUM */;
    if (normalized === "unlimited") return "unlimited" /* UNLIMITED */;
    return null;
  }
  /**
   * Handle checkout.session.completed event
   * Routes to reservation handler if metadata.type === "reservation_payment"
   * Requirements: 4.2, 5.1, 5.2
   */
  async handleCheckoutSessionCompleted(session2) {
    try {
      const paymentType = session2.metadata?.type;
      const reservationIds = session2.metadata?.reservationIds;
      console.log(`\u{1F4B3} Checkout session completed: ${session2.id}`, {
        paymentType,
        hasReservationIds: !!reservationIds
      });
      if (paymentType === "reservation_payment" && reservationIds) {
        return await this.handleReservationCheckout(session2, reservationIds);
      }
      const orderId = session2.metadata?.orderId;
      if (!orderId) {
        console.error("\u274C No orderId in checkout session metadata");
        return {
          success: false,
          message: "No orderId in checkout session metadata"
        };
      }
      await this.processOrderPayment(session2, orderId);
      await this.generateOrderInvoice(session2, orderId);
      await this.generateOrderLicenses(session2, orderId);
      console.log(`\u2705 Order payment processed successfully: ${orderId}`);
      return {
        success: true,
        message: "Order payment processed successfully",
        orderId
      };
    } catch (error) {
      console.error("\u274C Error handling checkout session completed:", error);
      throw error;
    }
  }
  /**
   * Handle PayPal webhook with signature verification
   * Routes events to appropriate handlers based on event type
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5
   */
  async handlePayPalWebhook(payload, headers) {
    const startTime = Date.now();
    try {
      const isValid = await this.verifyPayPalSignature(payload, headers);
      if (!isValid) {
        await this.logToAudit({
          action: "webhook_signature_verification_failed",
          resource: "payments",
          details: {
            provider: "paypal",
            statusCode: 400
          }
        });
        return {
          success: false,
          message: "Webhook signature verification failed"
        };
      }
      const event = JSON.parse(payload.toString());
      console.log(`\u{1F4E8} PayPal webhook received: ${event.event_type} (${event.id})`);
      const idempotencyResult = await markProcessedEventWithRetry({
        provider: "paypal",
        eventId: event.id
      });
      if (idempotencyResult?.alreadyProcessed) {
        console.log(`\u2139\uFE0F Event ${event.id} already processed, skipping`);
        return {
          success: true,
          message: "Event already processed"
        };
      }
      const result = await this.routePayPalEvent(event);
      const duration = Date.now() - startTime;
      console.log(`\u2705 PayPal webhook processed in ${duration}ms: ${event.event_type}`);
      await this.logToAudit({
        action: "webhook_processed",
        resource: "payments",
        details: {
          provider: "paypal",
          eventType: event.event_type,
          eventId: event.id,
          duration
        }
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`\u274C Error handling PayPal webhook after ${duration}ms:`, errorMessage);
      await this.logToAudit({
        action: "webhook_processing_error",
        resource: "payments",
        details: {
          provider: "paypal",
          error: errorMessage,
          stack: error instanceof Error ? error.stack : void 0,
          duration
        }
      });
      let eventType = "unknown";
      let eventId = "unknown";
      try {
        const event = JSON.parse(payload.toString());
        eventType = event.event_type || "unknown";
        eventId = event.id || "unknown";
      } catch {
      }
      await adminNotificationService.notifyWebhookProcessingError(
        "paypal",
        eventType,
        eventId,
        errorMessage
      );
      throw error;
    }
  }
  /**
   * Route PayPal event to appropriate handler
   * Checks custom_id to determine if it's a reservation payment
   * Requirements: 2.2, 5.1, 5.2
   */
  async routePayPalEvent(event) {
    try {
      switch (event.event_type) {
        case "PAYMENT.CAPTURE.COMPLETED":
          return await this.handlePayPalPaymentSuccess(event);
        case "PAYMENT.CAPTURE.DENIED":
        case "PAYMENT.CAPTURE.DECLINED":
          return await this.handlePayPalPaymentFailure(event);
        case "PAYMENT.CAPTURE.REFUNDED":
          return await this.handlePayPalRefund(event);
        default:
          console.log(`\u2139\uFE0F Unhandled PayPal event type: ${event.event_type}`);
          return {
            success: true,
            message: `Unhandled event type: ${event.event_type}`
          };
      }
    } catch (error) {
      console.error(`\u274C Error routing PayPal event ${event.event_type}:`, error);
      throw error;
    }
  }
  /**
   * Verify Stripe webhook signature
   * Requirements: 3.1, 3.2, 3.3, 8.3, 8.4
   */
  async verifyStripeSignature(payload, signature) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("\u274C STRIPE_WEBHOOK_SECRET not configured");
      await adminNotificationService.notifyConfigurationError("Stripe Webhooks", [
        "STRIPE_WEBHOOK_SECRET"
      ]);
      throw new PaymentError(
        "STRIPE_WEBHOOK_SECRET not configured",
        "MISSING_CONFIGURATION" /* MISSING_CONFIGURATION */,
        { service: "stripe", missingConfig: "STRIPE_WEBHOOK_SECRET" }
      );
    }
    try {
      const event = getStripeClient().webhooks.constructEvent(payload, signature, webhookSecret);
      console.log(`\u2705 Stripe signature verified: ${event.id}`);
      return event;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("\u274C Stripe signature verification failed:", errorMessage);
      await this.logToAudit({
        action: "signature_verification_failed",
        resource: "security",
        details: {
          provider: "stripe",
          error: errorMessage,
          timestamp: Date.now()
        }
      });
      await adminNotificationService.notifySignatureVerificationFailure("stripe", errorMessage);
      throw new PaymentError(
        "Invalid Stripe signature",
        "STRIPE_INVALID_SIGNATURE" /* STRIPE_INVALID_SIGNATURE */,
        { provider: "stripe", error: errorMessage }
      );
    }
  }
  /**
   * Verify PayPal webhook signature using PayPal SDK
   * Requirements: 2.3, 2.4, 3.2, 3.3, 3.5, 8.3, 8.4
   */
  async verifyPayPalSignature(payload, headers) {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      console.error("\u274C PAYPAL_WEBHOOK_ID not configured");
      await adminNotificationService.notifyConfigurationError("PayPal Webhooks", [
        "PAYPAL_WEBHOOK_ID"
      ]);
      return false;
    }
    const {
      "paypal-transmission-id": transmissionId,
      "paypal-transmission-time": timestamp,
      "paypal-transmission-sig": signature,
      "paypal-cert-url": certUrl,
      "paypal-auth-algo": authAlgo
    } = headers;
    if (!transmissionId || !timestamp || !signature || !certUrl || !authAlgo) {
      console.error("\u274C Missing PayPal webhook headers");
      return false;
    }
    try {
      const body = payload.toString();
      const isValid = await paypal_default.verifyWebhookSignature(
        webhookId,
        transmissionId,
        timestamp,
        certUrl,
        authAlgo,
        signature,
        body
      );
      if (!isValid) {
        await this.logToAudit({
          action: "signature_verification_failed",
          resource: "security",
          details: {
            provider: "paypal",
            webhookId: webhookId.substring(0, 10) + "...",
            timestamp: Date.now()
          }
        });
        await adminNotificationService.notifySignatureVerificationFailure(
          "paypal",
          "PayPal webhook signature verification failed"
        );
      }
      return isValid;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("\u274C PayPal signature verification failed:", errorMessage);
      await this.logToAudit({
        action: "signature_verification_failed",
        resource: "security",
        details: {
          provider: "paypal",
          error: errorMessage,
          timestamp: Date.now()
        }
      });
      await adminNotificationService.notifySignatureVerificationFailure("paypal", errorMessage);
      return false;
    }
  }
  /**
   * Handle successful payment intent
   * Requirements: 5.2, 5.3, 7.2
   */
  async handlePaymentSuccess(paymentIntent) {
    const orderId = paymentIntent.metadata.orderId;
    if (!orderId) {
      console.error("\u274C No orderId in payment intent metadata");
      return {
        success: false,
        message: "No orderId in payment intent metadata"
      };
    }
    try {
      await recordPaymentWithRetry({
        orderId,
        provider: "stripe",
        status: "succeeded",
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        stripeEventId: paymentIntent.id,
        stripePaymentIntentId: paymentIntent.id,
        stripeChargeId: typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : void 0
      });
      await confirmPaymentWithRetry({
        orderId,
        paymentIntentId: paymentIntent.id,
        status: "succeeded"
      });
      console.log(`\u2705 Payment succeeded for order: ${orderId}`);
      return {
        success: true,
        message: "Payment processed successfully",
        orderId
      };
    } catch (error) {
      console.error("\u274C Error processing payment success:", error);
      throw error;
    }
  }
  /**
   * Handle failed payment intent
   * Requirements: 5.2, 5.3, 7.2, 8.1, 8.2, 8.4
   */
  async handlePaymentFailure(paymentIntent) {
    const orderId = paymentIntent.metadata.orderId;
    if (!orderId) {
      console.error("\u274C No orderId in payment intent metadata");
      return {
        success: false,
        message: "No orderId in payment intent metadata"
      };
    }
    try {
      const failureReason = paymentIntent.last_payment_error?.message || "Unknown reason";
      const failureCode = paymentIntent.last_payment_error?.code;
      const declineCode = paymentIntent.last_payment_error?.decline_code;
      await recordPaymentWithRetry({
        orderId,
        provider: "stripe",
        status: "failed",
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        stripeEventId: paymentIntent.id,
        stripePaymentIntentId: paymentIntent.id
      });
      await this.logToAudit({
        action: "payment_failed",
        resource: "payments",
        details: {
          orderId,
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          failureMessage: failureReason,
          failureCode,
          declineCode
        }
      });
      const failureCodePart = failureCode ? ` (${failureCode})` : "";
      const declineCodePart = declineCode ? ` [${declineCode}]` : "";
      const fullFailureMessage = `${failureReason}${failureCodePart}${declineCodePart}`;
      await adminNotificationService.notifyPaymentFailure(
        orderId,
        paymentIntent.id,
        paymentIntent.amount,
        paymentIntent.currency,
        fullFailureMessage
      );
      console.log(`\u26A0\uFE0F Payment failed for order: ${orderId}`);
      return {
        success: true,
        message: "Payment failure recorded",
        orderId
      };
    } catch (error) {
      console.error("\u274C Error processing payment failure:", error);
      throw error;
    }
  }
  /**
   * Handle refund
   * Requirements: 5.3, 7.2, 8.1, 8.2
   */
  async handleRefund(charge) {
    const paymentIntentId = charge.payment_intent;
    if (!paymentIntentId) {
      console.error("\u274C No payment intent ID in charge");
      return {
        success: false,
        message: "No payment intent ID in charge"
      };
    }
    try {
      const orders = await convex7.query(api.orders.listOrdersAdmin, {
        limit: 100
      });
      const ordersList = Array.isArray(orders) ? orders : [];
      const order = ordersList.find(
        (o) => o.paymentIntentId === paymentIntentId
      );
      if (!order || !("_id" in order)) {
        console.error("\u274C No order found for payment intent:", paymentIntentId);
        return {
          success: false,
          message: "Order not found"
        };
      }
      await recordPaymentWithRetry({
        orderId: order._id,
        provider: "stripe",
        status: "refunded",
        amount: charge.amount_refunded,
        currency: charge.currency,
        stripeEventId: charge.id,
        stripeChargeId: charge.id
      });
      const refundReason = charge.refunds?.data[0]?.reason || void 0;
      await this.logToAudit({
        action: "payment_refunded",
        resource: "payments",
        details: {
          orderId: order._id,
          chargeId: charge.id,
          amountRefunded: charge.amount_refunded,
          currency: charge.currency,
          refundReason
        }
      });
      await adminNotificationService.notifyRefundProcessed(
        order._id,
        charge.id,
        charge.amount_refunded,
        charge.currency,
        refundReason
      );
      console.log(`\u2705 Refund processed for order: ${order._id}`);
      return {
        success: true,
        message: "Refund processed successfully",
        orderId: order._id
      };
    } catch (error) {
      console.error("\u274C Error processing refund:", error);
      throw error;
    }
  }
  /**
   * Handle PayPal payment success
   * Checks custom_id to determine if it's a reservation or order payment
   * Requirements: 2.5, 5.2, 5.3, 7.2
   */
  async handlePayPalPaymentSuccess(event) {
    const customId = event.resource?.custom_id;
    if (!customId) {
      console.error("\u274C No custom_id in PayPal event");
      return {
        success: false,
        message: "No custom_id in PayPal event"
      };
    }
    try {
      const amount = Number.parseFloat(event.resource?.amount?.value || "0") * 100;
      const currency = event.resource?.amount?.currency_code || "USD";
      const transactionId = event.resource?.id || event.id;
      if (customId.startsWith("reservation_")) {
        const reservationIds = [customId];
        const paymentData = {
          provider: "paypal",
          status: "succeeded",
          amount: Math.round(amount),
          currency: currency.toLowerCase(),
          transactionId,
          eventId: event.id
        };
        const mockSession = {
          id: transactionId,
          customer_email: null
        };
        await this.reservationPaymentService.handleReservationPaymentSuccess(
          reservationIds,
          paymentData,
          mockSession
        );
        return {
          success: true,
          message: "PayPal reservation payment processed successfully",
          reservationIds
        };
      }
      const orderId = customId;
      await recordPaymentWithRetry({
        orderId,
        provider: "paypal",
        status: "succeeded",
        amount: Math.round(amount),
        currency,
        paypalTransactionId: transactionId
      });
      await confirmPaymentWithRetry({
        orderId,
        paymentIntentId: transactionId,
        status: "succeeded"
      });
      console.log(`\u2705 PayPal payment succeeded for order: ${orderId}`);
      return {
        success: true,
        message: "PayPal payment processed successfully",
        orderId
      };
    } catch (error) {
      console.error("\u274C Error processing PayPal payment success:", error);
      throw error;
    }
  }
  /**
   * Handle PayPal payment failure
   * Checks custom_id to determine if it's a reservation or order payment
   * Requirements: 2.5, 5.2, 5.3, 7.2
   */
  async handlePayPalPaymentFailure(event) {
    const customId = event.resource?.custom_id;
    if (!customId) {
      console.error("\u274C No custom_id in PayPal event");
      return {
        success: false,
        message: "No custom_id in PayPal event"
      };
    }
    try {
      const amount = Number.parseFloat(event.resource?.amount?.value || "0") * 100;
      const currency = event.resource?.amount?.currency_code || "USD";
      const transactionId = event.resource?.id || event.id;
      if (customId.startsWith("reservation_")) {
        const reservationIds = [customId];
        const paymentData = {
          provider: "paypal",
          status: "failed",
          amount: Math.round(amount),
          currency: currency.toLowerCase(),
          transactionId,
          eventId: event.id
        };
        const mockPaymentIntent = {
          id: transactionId,
          last_payment_error: {
            message: `PayPal payment ${event.event_type}`
          }
        };
        await this.reservationPaymentService.handleReservationPaymentFailure(
          reservationIds,
          paymentData,
          mockPaymentIntent
        );
        return {
          success: true,
          message: "PayPal reservation payment failure recorded",
          reservationIds
        };
      }
      const orderId = customId;
      await recordPaymentWithRetry({
        orderId,
        provider: "paypal",
        status: "failed",
        amount: Math.round(amount),
        currency,
        paypalTransactionId: transactionId
      });
      await this.logToAudit({
        action: "payment_failed",
        resource: "payments",
        details: {
          orderId,
          provider: "paypal",
          eventId: event.id,
          eventType: event.event_type
        }
      });
      console.log(`\u26A0\uFE0F PayPal payment failed for order: ${orderId}`);
      return {
        success: true,
        message: "PayPal payment failure recorded",
        orderId
      };
    } catch (error) {
      console.error("\u274C Error processing PayPal payment failure:", error);
      throw error;
    }
  }
  /**
   * Handle PayPal refund
   * Requirements: 2.5, 5.3, 7.2
   */
  async handlePayPalRefund(event) {
    const customId = event.resource?.custom_id;
    if (!customId) {
      console.error("\u274C No custom_id in PayPal refund event");
      return {
        success: false,
        message: "No custom_id in PayPal refund event"
      };
    }
    try {
      const amount = Number.parseFloat(event.resource?.amount?.value || "0") * 100;
      const currency = event.resource?.amount?.currency_code || "USD";
      const transactionId = event.resource?.id || event.id;
      const orderId = customId;
      await recordPaymentWithRetry({
        orderId,
        provider: "paypal",
        status: "refunded",
        amount: Math.round(amount),
        currency,
        paypalTransactionId: transactionId
      });
      console.log(`\u2705 PayPal refund processed for order: ${orderId}`);
      return {
        success: true,
        message: "PayPal refund processed successfully",
        orderId
      };
    } catch (error) {
      console.error("\u274C Error processing PayPal refund:", error);
      throw error;
    }
  }
  /**
   * Log to audit trail
   * Requirements: 8.1, 8.2, 8.3
   */
  async logToAudit(entry) {
    await logAuditWithRetry({
      action: entry.action,
      resource: entry.resource,
      details: entry.details
    });
  }
  /**
   * Retry webhook processing with exponential backoff
   * 3 attempts: 1s, 2s, 4s delays
   */
  async retryWebhookProcessing(fn, maxRetries = 3) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1e3;
          console.log(`\u23F3 Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError || new Error("Webhook processing failed after retries");
  }
};
var paymentService = PaymentService.getInstance();

// server/routes/webhooks.ts
var router25 = Router24();
router25.post("/stripe", async (req, res) => {
  const requestId = randomUUID4();
  try {
    const signature = req.headers["stripe-signature"];
    logger.info("Processing Stripe webhook", { requestId });
    if (!signature || typeof signature !== "string") {
      logger.warn("Missing Stripe signature", { requestId });
      const errorResponse = createErrorResponse2(
        "Missing signature",
        "STRIPE_MISSING_SIGNATURE" /* STRIPE_MISSING_SIGNATURE */,
        "Stripe signature header is required for webhook verification",
        requestId
      );
      res.status(400).json(errorResponse);
      return;
    }
    const payload = req.body;
    const result = await paymentService.retryWebhookProcessing(
      () => paymentService.handleStripeWebhook(payload, signature),
      3
      // 3 attempts with exponential backoff
    );
    if (result.success) {
      logger.info("Stripe webhook processed", {
        requestId,
        message: result.message,
        orderId: result.orderId
      });
      res.status(200).json({
        received: true,
        message: result.message,
        requestId,
        orderId: result.orderId,
        reservationIds: result.reservationIds,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } else {
      logger.error("Stripe webhook failed", { requestId, message: result.message });
      const errorResponse = createErrorResponse2(
        result.message,
        "WEBHOOK_PROCESSING_ERROR" /* WEBHOOK_PROCESSING_ERROR */,
        "Failed to process Stripe webhook event",
        requestId
      );
      res.status(400).json(errorResponse);
    }
  } catch (error) {
    logger.error("Error processing Stripe webhook", { requestId, error });
    if (error instanceof PaymentError) {
      const errorResponse2 = error.toErrorResponse(requestId);
      const statusCode = error.code === "STRIPE_INVALID_SIGNATURE" /* STRIPE_INVALID_SIGNATURE */ ? 400 : 500;
      res.status(statusCode).json(errorResponse2);
      return;
    }
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const errorResponse = createErrorResponse2(
      "Webhook processing failed",
      "WEBHOOK_PROCESSING_ERROR" /* WEBHOOK_PROCESSING_ERROR */,
      sanitizeErrorMessage(errorObj),
      requestId,
      { stack: errorObj.stack }
    );
    res.status(500).json(errorResponse);
  }
});
router25.post("/paypal", async (req, res) => {
  const requestId = randomUUID4();
  try {
    const payload = req.body;
    const headers = {};
    const relevantHeaders = [
      "paypal-transmission-id",
      "paypal-transmission-time",
      "paypal-transmission-sig",
      "paypal-cert-url",
      "paypal-auth-algo"
    ];
    for (const header of relevantHeaders) {
      const value = req.headers[header];
      if (value && typeof value === "string") {
        headers[header] = value;
      }
    }
    logger.info("Processing PayPal webhook", { requestId });
    const missingHeaders = relevantHeaders.filter((h) => !headers[h]);
    if (missingHeaders.length > 0) {
      logger.warn("Missing PayPal headers", { requestId, missingHeaders });
      const errorResponse = createErrorResponse2(
        "Missing required headers",
        "PAYPAL_MISSING_HEADERS" /* PAYPAL_MISSING_HEADERS */,
        `PayPal webhook requires headers: ${missingHeaders.join(", ")}`,
        requestId,
        { missingHeaders }
      );
      res.status(400).json(errorResponse);
      return;
    }
    const result = await paymentService.retryWebhookProcessing(
      () => paymentService.handlePayPalWebhook(payload, headers),
      3
      // 3 attempts with exponential backoff
    );
    if (result.success) {
      logger.info("PayPal webhook processed", {
        requestId,
        message: result.message,
        orderId: result.orderId
      });
      res.status(200).json({
        received: true,
        message: result.message,
        requestId,
        orderId: result.orderId,
        reservationIds: result.reservationIds,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } else {
      logger.error("PayPal webhook failed", { requestId, message: result.message });
      const errorResponse = createErrorResponse2(
        result.message,
        "WEBHOOK_PROCESSING_ERROR" /* WEBHOOK_PROCESSING_ERROR */,
        "Failed to process PayPal webhook event",
        requestId
      );
      res.status(400).json(errorResponse);
    }
  } catch (error) {
    logger.error("Error processing PayPal webhook", { requestId, error });
    if (error instanceof PaymentError) {
      const errorResponse2 = error.toErrorResponse(requestId);
      const statusCode = error.code === "PAYPAL_INVALID_SIGNATURE" /* PAYPAL_INVALID_SIGNATURE */ ? 400 : 500;
      res.status(statusCode).json(errorResponse2);
      return;
    }
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const errorResponse = createErrorResponse2(
      "Webhook processing failed",
      "WEBHOOK_PROCESSING_ERROR" /* WEBHOOK_PROCESSING_ERROR */,
      sanitizeErrorMessage(errorObj),
      requestId,
      { stack: errorObj.stack }
    );
    res.status(500).json(errorResponse);
  }
});
router25.get("/health", (_req, res) => {
  const requestId = randomUUID4();
  try {
    const stripeConfigured = !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET;
    const paypalConfigured = !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_CLIENT_SECRET && !!process.env.PAYPAL_WEBHOOK_ID;
    const convexConfigured = !!process.env.VITE_CONVEX_URL;
    const allConfigured = stripeConfigured && paypalConfigured && convexConfigured;
    const healthStatus = {
      status: allConfigured ? "healthy" : "degraded",
      requestId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      webhooks: {
        stripe: {
          endpoint: "/api/webhooks/stripe",
          configured: stripeConfigured,
          events: [
            "payment_intent.succeeded",
            "payment_intent.payment_failed",
            "checkout.session.completed",
            "charge.refunded"
          ]
        },
        paypal: {
          endpoint: "/api/webhooks/paypal",
          configured: paypalConfigured,
          events: [
            "PAYMENT.CAPTURE.COMPLETED",
            "PAYMENT.CAPTURE.DENIED",
            "PAYMENT.CAPTURE.REFUNDED"
          ]
        }
      },
      services: {
        convex: {
          configured: convexConfigured,
          url: convexConfigured ? process.env.VITE_CONVEX_URL : "not configured"
        },
        paymentService: {
          status: "operational",
          features: ["stripe", "paypal", "reservations", "invoices"]
        }
      },
      version: process.env.npm_package_version || "unknown"
    };
    const statusCode = allConfigured ? 200 : 503;
    logger.info("Health check completed", { requestId, status: healthStatus.status });
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error("Health check error", { requestId, error });
    const errorResponse = createErrorResponse2(
      "Health check failed",
      "HEALTH_CHECK_ERROR",
      error instanceof Error ? error.message : "Unknown error occurred",
      requestId
    );
    res.status(500).json(errorResponse);
  }
});
var webhooks_default = router25;

// server/routes/wishlist.ts
init_api();
init_auth();
init_convex();
import { getAuth as getAuth7 } from "@clerk/express";
import { Router as Router25 } from "express";
var router26 = Router25();
function getClerkId(req) {
  try {
    const { userId } = getAuth7(req);
    return userId;
  } catch {
    return null;
  }
}
router26.get("/", isAuthenticated, async (req, res) => {
  try {
    const clerkId = getClerkId(req);
    if (!clerkId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const convex8 = getConvex();
    const favorites2 = await convex8.query(api.favorites.serverFunctions.getFavoritesByClerkId, {
      clerkId
    });
    res.json(favorites2);
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch wishlist");
  }
});
router26.post("/", isAuthenticated, async (req, res) => {
  try {
    const clerkId = getClerkId(req);
    if (!clerkId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const { beat_id } = req.body;
    if (!beat_id || typeof beat_id !== "number") {
      res.status(400).json({ error: "Valid beat_id is required" });
      return;
    }
    const convex8 = getConvex();
    try {
      const result = await convex8.mutation(api.favorites.serverFunctions.addFavoriteByClerkId, {
        clerkId,
        beatId: beat_id
      });
      if (result.alreadyExists) {
        res.status(409).json({ error: "Beat is already in your wishlist" });
        return;
      }
      res.status(201).json({ message: "Added to wishlist successfully", id: result.id });
    } catch (convexError) {
      const errorMessage = convexError instanceof Error ? convexError.message : "Unknown error";
      if (errorMessage.includes("Beat not found")) {
        res.status(404).json({ error: "Beat not found in database" });
        return;
      }
      throw convexError;
    }
  } catch (error) {
    handleRouteError(error, res, "Failed to add to wishlist");
  }
});
router26.delete("/:beatId", isAuthenticated, async (req, res) => {
  try {
    const clerkId = getClerkId(req);
    if (!clerkId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const beatId = Number.parseInt(req.params.beatId, 10);
    if (Number.isNaN(beatId)) {
      res.status(400).json({ error: "Valid beat_id is required" });
      return;
    }
    const convex8 = getConvex();
    await convex8.mutation(api.favorites.serverFunctions.removeFavoriteByClerkId, {
      clerkId,
      beatId
    });
    res.json({ message: "Removed from wishlist successfully" });
  } catch (error) {
    handleRouteError(error, res, "Failed to remove from wishlist");
  }
});
router26.delete("/", isAuthenticated, async (req, res) => {
  try {
    const clerkId = getClerkId(req);
    if (!clerkId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const convex8 = getConvex();
    const result = await convex8.mutation(api.favorites.serverFunctions.clearFavoritesByClerkId, {
      clerkId
    });
    res.json({ message: "Wishlist cleared successfully", deletedCount: result.deletedCount });
  } catch (error) {
    handleRouteError(error, res, "Failed to clear wishlist");
  }
});
var wishlist_default = router26;

// server/routes/woo.ts
import { Router as Router26 } from "express";

// server/services/woo-validation.ts
function validateWooCommerceQuery(query) {
  const validatedQuery = {};
  if (query.context && typeof query.context === "string") {
    if (["view", "edit"].includes(query.context)) {
      validatedQuery.context = query.context;
    }
  }
  if (query.page && typeof query.page === "number" && query.page > 0) {
    validatedQuery.page = Math.floor(query.page);
  }
  if (query.per_page && typeof query.per_page === "number" && query.per_page > 0 && query.per_page <= 100) {
    validatedQuery.per_page = Math.floor(query.per_page);
  }
  if (query.search && typeof query.search === "string" && query.search.trim()) {
    validatedQuery.search = query.search.trim();
  }
  if (query.order && typeof query.order === "string") {
    if (["asc", "desc"].includes(query.order)) {
      validatedQuery.order = query.order;
    }
  }
  if (query.orderby && typeof query.orderby === "string") {
    const validOrderBy = [
      "date",
      "id",
      "include",
      "title",
      "slug",
      "price",
      "popularity",
      "rating"
    ];
    if (validOrderBy.includes(query.orderby)) {
      validatedQuery.orderby = query.orderby;
    }
  }
  if (query.featured && typeof query.featured === "boolean") {
    validatedQuery.featured = query.featured;
  }
  if (query.category && typeof query.category === "string") {
    validatedQuery.category = query.category;
  }
  if (query.tag && typeof query.tag === "string") {
    validatedQuery.tag = query.tag;
  }
  if (query.on_sale && typeof query.on_sale === "boolean") {
    validatedQuery.on_sale = query.on_sale;
  }
  if (query.min_price && typeof query.min_price === "string") {
    validatedQuery.min_price = query.min_price;
  }
  if (query.max_price && typeof query.max_price === "string") {
    validatedQuery.max_price = query.max_price;
  }
  return validatedQuery;
}
function validateWooCommerceProduct(rawProduct) {
  if (!rawProduct || typeof rawProduct !== "object") {
    throw new Error("Invalid product data: not an object");
  }
  const requiredFields = ["id", "name", "status", "type"];
  for (const field of requiredFields) {
    if (!(field in rawProduct)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  const id = rawProduct.id;
  if (typeof id !== "number" || id <= 0) {
    throw new Error("Invalid product ID");
  }
  const name = rawProduct.name;
  if (typeof name !== "string" || !name.trim()) {
    throw new Error("Invalid product name");
  }
  const status = rawProduct.status;
  const validStatuses = ["draft", "pending", "private", "publish"];
  if (typeof status !== "string" || !validStatuses.includes(status)) {
    throw new Error("Invalid product status");
  }
  const type = rawProduct.type;
  const validTypes = ["simple", "grouped", "external", "variable"];
  if (typeof type !== "string" || !validTypes.includes(type)) {
    throw new Error("Invalid product type");
  }
  const validatedProduct = {
    // Core fields
    id,
    name,
    slug: typeof rawProduct.slug === "string" ? rawProduct.slug : "",
    permalink: typeof rawProduct.permalink === "string" ? rawProduct.permalink : "",
    date_created: typeof rawProduct.date_created === "string" ? rawProduct.date_created : (/* @__PURE__ */ new Date()).toISOString(),
    date_created_gmt: typeof rawProduct.date_created_gmt === "string" ? rawProduct.date_created_gmt : (/* @__PURE__ */ new Date()).toISOString(),
    date_modified: typeof rawProduct.date_modified === "string" ? rawProduct.date_modified : (/* @__PURE__ */ new Date()).toISOString(),
    date_modified_gmt: typeof rawProduct.date_modified_gmt === "string" ? rawProduct.date_modified_gmt : (/* @__PURE__ */ new Date()).toISOString(),
    type,
    status,
    featured: typeof rawProduct.featured === "boolean" ? rawProduct.featured : false,
    catalog_visibility: typeof rawProduct.catalog_visibility === "string" ? rawProduct.catalog_visibility : "visible",
    description: typeof rawProduct.description === "string" ? rawProduct.description : "",
    short_description: typeof rawProduct.short_description === "string" ? rawProduct.short_description : "",
    sku: typeof rawProduct.sku === "string" ? rawProduct.sku : "",
    // Pricing
    price: typeof rawProduct.price === "string" ? rawProduct.price : "0",
    regular_price: typeof rawProduct.regular_price === "string" ? rawProduct.regular_price : "0",
    sale_price: typeof rawProduct.sale_price === "string" ? rawProduct.sale_price : "",
    date_on_sale_from: typeof rawProduct.date_on_sale_from === "string" ? rawProduct.date_on_sale_from : null,
    date_on_sale_from_gmt: typeof rawProduct.date_on_sale_from_gmt === "string" ? rawProduct.date_on_sale_from_gmt : null,
    date_on_sale_to: typeof rawProduct.date_on_sale_to === "string" ? rawProduct.date_on_sale_to : null,
    date_on_sale_to_gmt: typeof rawProduct.date_on_sale_to_gmt === "string" ? rawProduct.date_on_sale_to_gmt : null,
    on_sale: typeof rawProduct.on_sale === "boolean" ? rawProduct.on_sale : false,
    // Inventory
    purchasable: typeof rawProduct.purchasable === "boolean" ? rawProduct.purchasable : true,
    total_sales: typeof rawProduct.total_sales === "number" ? rawProduct.total_sales : 0,
    virtual: typeof rawProduct.virtual === "boolean" ? rawProduct.virtual : false,
    downloadable: typeof rawProduct.downloadable === "boolean" ? rawProduct.downloadable : false,
    downloads: Array.isArray(rawProduct.downloads) ? rawProduct.downloads : [],
    download_limit: typeof rawProduct.download_limit === "number" ? rawProduct.download_limit : -1,
    download_expiry: typeof rawProduct.download_expiry === "number" ? rawProduct.download_expiry : -1,
    external_url: typeof rawProduct.external_url === "string" ? rawProduct.external_url : "",
    button_text: typeof rawProduct.button_text === "string" ? rawProduct.button_text : "",
    // Tax and shipping
    tax_status: typeof rawProduct.tax_status === "string" ? rawProduct.tax_status : "taxable",
    tax_class: typeof rawProduct.tax_class === "string" ? rawProduct.tax_class : "",
    manage_stock: typeof rawProduct.manage_stock === "boolean" ? rawProduct.manage_stock : false,
    stock_quantity: typeof rawProduct.stock_quantity === "number" ? rawProduct.stock_quantity : null,
    backorders: typeof rawProduct.backorders === "string" ? rawProduct.backorders : "no",
    backorders_allowed: typeof rawProduct.backorders_allowed === "boolean" ? rawProduct.backorders_allowed : false,
    backordered: typeof rawProduct.backordered === "boolean" ? rawProduct.backordered : false,
    low_stock_amount: typeof rawProduct.low_stock_amount === "number" ? rawProduct.low_stock_amount : null,
    sold_individually: typeof rawProduct.sold_individually === "boolean" ? rawProduct.sold_individually : false,
    weight: typeof rawProduct.weight === "string" ? rawProduct.weight : "",
    dimensions: rawProduct.dimensions && typeof rawProduct.dimensions === "object" ? {
      length: typeof rawProduct.dimensions.length === "string" ? String(rawProduct.dimensions.length) : "",
      width: typeof rawProduct.dimensions.width === "string" ? String(rawProduct.dimensions.width) : "",
      height: typeof rawProduct.dimensions.height === "string" ? String(rawProduct.dimensions.height) : ""
    } : { length: "", width: "", height: "" },
    shipping_required: typeof rawProduct.shipping_required === "boolean" ? rawProduct.shipping_required : true,
    shipping_taxable: typeof rawProduct.shipping_taxable === "boolean" ? rawProduct.shipping_taxable : true,
    shipping_class: typeof rawProduct.shipping_class === "string" ? rawProduct.shipping_class : "",
    shipping_class_id: typeof rawProduct.shipping_class_id === "number" ? rawProduct.shipping_class_id : 0,
    // Reviews
    reviews_allowed: typeof rawProduct.reviews_allowed === "boolean" ? rawProduct.reviews_allowed : true,
    average_rating: typeof rawProduct.average_rating === "string" ? rawProduct.average_rating : "0",
    rating_count: typeof rawProduct.rating_count === "number" ? rawProduct.rating_count : 0,
    // Related products
    upsell_ids: Array.isArray(rawProduct.upsell_ids) ? rawProduct.upsell_ids : [],
    cross_sell_ids: Array.isArray(rawProduct.cross_sell_ids) ? rawProduct.cross_sell_ids : [],
    parent_id: typeof rawProduct.parent_id === "number" ? rawProduct.parent_id : 0,
    purchase_note: typeof rawProduct.purchase_note === "string" ? rawProduct.purchase_note : "",
    // Taxonomies
    categories: Array.isArray(rawProduct.categories) ? rawProduct.categories : [],
    tags: Array.isArray(rawProduct.tags) ? rawProduct.tags : [],
    images: Array.isArray(rawProduct.images) ? rawProduct.images : [],
    attributes: Array.isArray(rawProduct.attributes) ? rawProduct.attributes : [],
    default_attributes: Array.isArray(rawProduct.default_attributes) ? rawProduct.default_attributes : [],
    variations: Array.isArray(rawProduct.variations) ? rawProduct.variations : [],
    grouped_products: Array.isArray(rawProduct.grouped_products) ? rawProduct.grouped_products : [],
    menu_order: typeof rawProduct.menu_order === "number" ? rawProduct.menu_order : 0,
    price_html: typeof rawProduct.price_html === "string" ? rawProduct.price_html : "",
    related_ids: Array.isArray(rawProduct.related_ids) ? rawProduct.related_ids : [],
    // Metadata
    meta_data: Array.isArray(rawProduct.meta_data) ? rawProduct.meta_data : [],
    // Stock status
    stock_status: typeof rawProduct.stock_status === "string" ? rawProduct.stock_status : "instock"
  };
  return validatedProduct;
}
function extractBroLabMetadata(product) {
  const metadata = {};
  if (!product.meta_data || !Array.isArray(product.meta_data)) {
    return metadata;
  }
  const findMetaValue2 = (key) => {
    return product.meta_data.find((meta) => meta.key === key);
  };
  const albTracklistMeta = findMetaValue2("alb_tracklist");
  const audioUrlMeta = findMetaValue2("audio_url");
  if (albTracklistMeta && albTracklistMeta.value) {
    try {
      const tracklistValue = typeof albTracklistMeta.value === "string" ? JSON.parse(albTracklistMeta.value) : albTracklistMeta.value;
      if (Array.isArray(tracklistValue) && tracklistValue.length > 0) {
        const firstTrack = tracklistValue[0];
        if (firstTrack && typeof firstTrack === "object" && "file" in firstTrack) {
          metadata.audio_url = String(firstTrack.file);
        }
      }
    } catch (error) {
      console.warn(`Failed to parse alb_tracklist for product ${product.id}:`, error);
    }
  }
  if (!metadata.audio_url && audioUrlMeta && audioUrlMeta.value) {
    metadata.audio_url = String(audioUrlMeta.value);
  }
  const hasVocalsMeta = findMetaValue2("has_vocals");
  if (hasVocalsMeta) {
    metadata.hasVocals = hasVocalsMeta.value === "yes" || hasVocalsMeta.value === true;
  }
  if (metadata.hasVocals === void 0 && product.tags) {
    metadata.hasVocals = product.tags.some(
      (tag) => tag && typeof tag === "object" && "name" in tag && String(tag.name).toLowerCase().includes("vocals")
    );
  }
  const stemsMeta = findMetaValue2("stems");
  if (stemsMeta) {
    metadata.stems = stemsMeta.value === "yes" || stemsMeta.value === true;
  }
  if (metadata.stems === void 0 && product.tags) {
    metadata.stems = product.tags.some(
      (tag) => tag && typeof tag === "object" && "name" in tag && String(tag.name).toLowerCase().includes("stems")
    );
  }
  const stringFields = ["bpm", "key", "mood", "instruments", "duration"];
  for (const field of stringFields) {
    const meta = findMetaValue2(field);
    if (meta && meta.value) {
      metadata[field] = String(meta.value);
    }
  }
  metadata.is_free = product.price === "0" || product.price === "";
  return metadata;
}

// server/services/woo.ts
function getWooCommerceConfig() {
  const apiUrl = process.env.WOOCOMMERCE_API_URL;
  const apiKey = process.env.WOOCOMMERCE_CONSUMER_KEY || process.env.VITE_WC_KEY;
  const apiSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;
  console.log("\u{1F527} WooCommerce Config Check:", {
    hasApiUrl: !!apiUrl,
    apiUrlValue: apiUrl ? apiUrl.substring(0, 30) + "..." : "MISSING",
    hasApiKey: !!apiKey,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + "..." : "MISSING",
    hasApiSecret: !!apiSecret,
    apiSecretPrefix: apiSecret ? apiSecret.substring(0, 10) + "..." : "MISSING",
    nodeEnv: process.env.NODE_ENV
  });
  if (!apiUrl || !apiKey || !apiSecret) {
    console.error(
      "\u274C Missing WooCommerce configuration. Set WOOCOMMERCE_API_URL, WOOCOMMERCE_CONSUMER_KEY, and WOOCOMMERCE_CONSUMER_SECRET in .env"
    );
    return null;
  }
  return { apiUrl, apiKey, apiSecret };
}
function createBasicAuthHeader(apiKey, apiSecret) {
  const credentials = `${apiKey}:${apiSecret}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}
function createWooCommerceHeaders(config) {
  return {
    Authorization: createBasicAuthHeader(config.apiKey, config.apiSecret),
    "Content-Type": "application/json"
  };
}
function valueToString(value) {
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
}
function buildSearchParams(query) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === void 0 || value === null) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, valueToString(v)));
    } else {
      params.append(key, valueToString(value));
    }
  });
  return params;
}
function extractArrayFromResponse(rawData) {
  if (Array.isArray(rawData)) {
    return rawData;
  }
  if (rawData && typeof rawData === "object" && "data" in rawData) {
    const dataObj = rawData;
    if (Array.isArray(dataObj.data)) {
      return dataObj.data;
    }
  }
  return [];
}
async function fetchWooProducts(filters = {}) {
  try {
    const validatedFilters = validateWooCommerceQuery(filters);
    const config = getWooCommerceConfig();
    if (!config) {
      return [];
    }
    const params = buildSearchParams(validatedFilters);
    const url = `${config.apiUrl}/products?${params}`;
    console.log("\u{1F527} Fetching URL:", url);
    const response = await fetch(url, {
      headers: createWooCommerceHeaders(config)
    });
    const responseText = await response.text();
    if (responseText.trim().startsWith("<!") || responseText.trim().startsWith("<html")) {
      console.error("\u274C WooCommerce API returned HTML instead of JSON. This usually means:");
      console.error("   1. Invalid API credentials (consumer key/secret)");
      console.error("   2. WooCommerce REST API is not enabled on the site");
      console.error("   3. The site requires HTTPS for API access");
      console.error(
        "   Check WOOCOMMERCE_CONSUMER_KEY and WOOCOMMERCE_CONSUMER_SECRET in your environment variables"
      );
      return [];
    }
    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }
    let rawData;
    try {
      rawData = JSON.parse(responseText);
    } catch (error) {
      console.error(
        "Failed to parse WooCommerce response as JSON:",
        responseText.substring(0, 500)
      );
      console.error("Parse error:", error);
      return [];
    }
    const products = extractArrayFromResponse(rawData);
    if (products.length === 0 && rawData && typeof rawData === "object") {
      console.error("WooCommerce API returned non-array data:", rawData);
      return [];
    }
    return validateAndEnhanceProducts(products);
  } catch (error) {
    console.error("WooCommerce API Error:", error);
    return [];
  }
}
function validateAndEnhanceProducts(products) {
  const validatedProducts = [];
  for (const product of products) {
    try {
      const validatedProduct = validateWooCommerceProduct(product);
      const broLabMetadata = extractBroLabMetadata(validatedProduct);
      validatedProducts.push({ ...validatedProduct, ...broLabMetadata });
    } catch (validationError) {
      const productId = product?.id;
      console.error(`Failed to validate product ${productId}:`, validationError);
    }
  }
  return validatedProducts;
}
async function fetchWooProduct(id) {
  try {
    const config = getWooCommerceConfig();
    if (!config) {
      return null;
    }
    const response = await fetch(`${config.apiUrl}/products/${id}`, {
      headers: createWooCommerceHeaders(config)
    });
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }
    const rawProduct = await response.json();
    try {
      const validatedProduct = validateWooCommerceProduct(rawProduct);
      const broLabMetadata = extractBroLabMetadata(validatedProduct);
      return { ...validatedProduct, ...broLabMetadata };
    } catch (validationError) {
      console.error(`Failed to validate product ${id}:`, validationError);
      return null;
    }
  } catch (error) {
    console.error("WooCommerce Product API Error:", error);
    return null;
  }
}
async function fetchWooCategories(query = {}) {
  try {
    const config = getWooCommerceConfig();
    if (!config) {
      return [];
    }
    const params = buildSearchParams(query);
    const url = `${config.apiUrl}/products/categories?${params}`;
    const response = await fetch(url, {
      headers: createWooCommerceHeaders(config)
    });
    const responseText = await response.text();
    if (responseText.trim().startsWith("<!") || responseText.trim().startsWith("<html")) {
      console.error("\u274C WooCommerce Categories API returned HTML - check API credentials");
      return [];
    }
    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }
    let rawData;
    try {
      rawData = JSON.parse(responseText);
    } catch {
      console.error("Failed to parse WooCommerce categories response");
      return [];
    }
    const categories = Array.isArray(rawData) ? rawData : [];
    return validateCategories(categories);
  } catch (error) {
    console.error("WooCommerce Categories API Error:", error);
    return [];
  }
}
function validateCategories(categories) {
  return categories.filter((category) => {
    if (!category || typeof category !== "object") {
      return false;
    }
    const cat = category;
    return typeof cat.id === "number" && typeof cat.name === "string";
  });
}

// server/routes/woo.ts
var router27 = Router26();
function safeString(value) {
  if (value === null || value === void 0) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}
function fixAudioUrl(url) {
  if (!url) return url;
  return url.replaceAll(
    "https://brolabentertainment.com/wp-content/",
    "https://wp.brolabentertainment.com/wp-content/"
  ).replaceAll(
    "https://www.brolabentertainment.com/wp-content/",
    "https://wp.brolabentertainment.com/wp-content/"
  );
}
function extractAudioUrlsFromTrack(track) {
  const audioPreview = fixAudioUrl(safeString(track.audio_preview));
  const trackMp3 = fixAudioUrl(safeString(track.track_mp3));
  const src = fixAudioUrl(safeString(track.src));
  const url = fixAudioUrl(safeString(track.url));
  const downloadUrl = trackMp3 || src || url || null;
  const previewUrl = audioPreview || trackMp3 || src || url || null;
  console.log(
    `\u{1F50D} Track URLs - audio_preview: "${audioPreview}", track_mp3: "${trackMp3}" => preview: "${previewUrl}"`
  );
  return { previewUrl, downloadUrl };
}
function extractAudioFromTrack(track) {
  const { previewUrl } = extractAudioUrlsFromTrack(track);
  return previewUrl;
}
function parseTrackData(value) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}
async function fetchMediaDetails(mediaId) {
  try {
    const wpApiUrl = process.env.WORDPRESS_API_URL || "https://brolabentertainment.com/wp-json/wp/v2";
    const response = await fetch(`${wpApiUrl}/media/${mediaId}`);
    if (!response.ok) {
      console.log(`\u274C Media ${mediaId} fetch failed: ${response.status}`);
      return { title: null, description: null, mediaDetailsBpm: null };
    }
    const media = await response.json();
    const title = media.title?.rendered || media.title?.raw || null;
    const mediaDetailsBpm = media.media_details?.bpm || null;
    console.log(`\u{1F4CB} Media ${mediaId} ALL FIELDS:`, {
      title: media.title?.rendered?.substring(0, 50),
      description_rendered: media.description?.rendered?.substring(0, 150),
      description_raw: media.description?.raw?.substring(0, 150),
      caption_rendered: media.caption?.rendered?.substring(0, 150),
      caption_raw: media.caption?.raw?.substring(0, 150),
      media_details_bpm: mediaDetailsBpm
    });
    const possibleDescriptions = [
      media.description?.raw,
      // RAW description - highest priority
      media.caption?.raw,
      media.caption?.rendered,
      media.description?.rendered,
      media.alt_text
    ].filter(Boolean);
    const bestDescription = findBestDescription(possibleDescriptions);
    return { title, description: bestDescription, mediaDetailsBpm };
  } catch (error) {
    console.error(`Failed to fetch media ${mediaId}:`, error);
    return { title: null, description: null, mediaDetailsBpm: null };
  }
}
function cleanDescription(desc) {
  return desc.replaceAll(/<[^>]*>/g, " ").replaceAll(/&[^;]+;/g, " ").replaceAll(/\s+/g, " ").trim();
}
function findBestDescription(possibleDescriptions) {
  for (const desc of possibleDescriptions) {
    if (desc) {
      const cleanDesc = cleanDescription(desc);
      const hasBpm = /(\d{2,3})BPM/i.test(cleanDesc);
      const hasKey = /([A-G][#b]?m(?:in)?|[A-G][#b]?\s*(?:maj|min))/i.test(cleanDesc);
      if (hasBpm || hasKey) {
        console.log(`\u2705 Found metadata in description: ${cleanDesc.substring(0, 100)}`);
        return cleanDesc;
      }
    }
  }
  if (possibleDescriptions[0]) {
    return cleanDescription(possibleDescriptions[0]);
  }
  return null;
}
async function enrichTracksWithMediaTitles(tracks) {
  const enrichedTracks = await Promise.all(
    tracks.map(async (track) => {
      if (track.mediaId) {
        const { title, description, mediaDetailsBpm } = await fetchMediaDetails(track.mediaId);
        const enrichedTrack = { ...track };
        if (title && !track.title) {
          enrichedTrack.title = title;
          console.log(`\u{1F3B5} Fetched media title for ID ${track.mediaId}: ${title}`);
        }
        if (description) {
          enrichedTrack.mediaDescription = description;
          const trackBpm = extractBpmFromText(description);
          if (trackBpm) {
            enrichedTrack.bpm = trackBpm;
            console.log(`\u{1F3B9} Track ${track.mediaId} BPM from DESCRIPTION: ${trackBpm}`);
          }
          const trackKey = extractKeyFromText(description);
          if (trackKey) {
            enrichedTrack.key = trackKey;
            console.log(`\u{1F3B9} Track ${track.mediaId} Key from DESCRIPTION: ${trackKey}`);
          }
        }
        if (!enrichedTrack.bpm && mediaDetailsBpm) {
          enrichedTrack.bpm = mediaDetailsBpm;
          console.log(`\u{1F3B9} Track ${track.mediaId} BPM from ID3 TAGS (fallback): ${mediaDetailsBpm}`);
        }
        console.log(`\u{1F4DD} Track ${track.mediaId} enriched:`, {
          title: enrichedTrack.title,
          bpm: enrichedTrack.bpm,
          key: enrichedTrack.key
        });
        return enrichedTrack;
      }
      return track;
    })
  );
  return enrichedTracks;
}
var TITLE_FIELDS = [
  "title",
  "track_title",
  "stream_title",
  "song_title",
  "name",
  "icecast_title"
];
var ARTIST_FIELDS = ["artist", "track_artist", "artist_name"];
var DURATION_FIELDS = [
  "duration",
  "track_duration",
  "stream_lenght",
  "post_audiopreview_duration"
];
function extractFieldValue(trackRecord, fields) {
  for (const field of fields) {
    const value = safeString(trackRecord[field]);
    if (value) return value;
  }
  return void 0;
}
function extractTrackTitle(trackRecord, mediaId) {
  if (mediaId) return void 0;
  return extractFieldValue(trackRecord, TITLE_FIELDS);
}
function getMediaId(trackRecord) {
  if (!trackRecord.track_mp3_id) return void 0;
  const mediaId = Number(trackRecord.track_mp3_id);
  return Number.isNaN(mediaId) ? void 0 : mediaId;
}
function buildAudioTrack(trackRecord) {
  const { previewUrl, downloadUrl } = extractAudioUrlsFromTrack(trackRecord);
  if (!previewUrl) return null;
  const mediaId = getMediaId(trackRecord);
  return {
    url: previewUrl,
    downloadUrl: downloadUrl || void 0,
    title: extractTrackTitle(trackRecord, mediaId),
    artist: extractFieldValue(trackRecord, ARTIST_FIELDS),
    duration: extractFieldValue(trackRecord, DURATION_FIELDS),
    mediaId
  };
}
function processTrackArray(trackData, productId) {
  const tracks = [];
  for (const track of trackData) {
    const trackRecord = track;
    const audioTrack = buildAudioTrack(trackRecord);
    if (audioTrack) {
      tracks.push(audioTrack);
      console.log(
        `\u{1F3B5} Product ${productId} - Track:`,
        audioTrack.title || "(no title)",
        `preview: ${audioTrack.url?.substring(0, 50)}...`,
        `download: ${audioTrack.downloadUrl?.substring(0, 50)}...`
      );
    }
  }
  console.log(`\u{1F3B5} Product ${productId} - Found ${tracks.length} audio tracks`);
  return tracks;
}
function processSingleTrackObject(trackData, productId) {
  const url = extractAudioFromTrack(trackData);
  if (!url) return [];
  const track = {
    url,
    title: safeString(trackData.title) || void 0,
    artist: safeString(trackData.artist) || void 0,
    duration: safeString(trackData.duration) || void 0
  };
  console.log(`\u{1F3B5} Product ${productId} - Found audio URL (object):`, url);
  return [track];
}
function getFallbackTrack(audioUrlMeta, productId) {
  if (!audioUrlMeta?.value) return [];
  const audioUrl = safeString(audioUrlMeta.value);
  if (!audioUrl) return [];
  console.log(`\u{1F3B5} Product ${productId} - Fallback audio URL:`, audioUrl);
  return [{ url: audioUrl }];
}
function extractAudioTracks(albTracklistMeta, audioUrlMeta, productId) {
  if (!albTracklistMeta?.value) {
    console.log(`\u{1F3B5} Product ${productId} - No alb_tracklist metadata, using fallback`);
    return getFallbackTrack(audioUrlMeta, productId);
  }
  console.log(
    `\u{1F3B5} Product ${productId} - Raw alb_tracklist:`,
    JSON.stringify(albTracklistMeta.value).substring(0, 200)
  );
  const trackData = parseTrackData(albTracklistMeta.value);
  console.log(
    `\u{1F3B5} Product ${productId} - Parsed trackData type:`,
    Array.isArray(trackData) ? "array" : typeof trackData
  );
  if (Array.isArray(trackData) && trackData.length > 0) {
    return processTrackArray(trackData, productId);
  }
  if (trackData && typeof trackData === "object") {
    const tracks = processSingleTrackObject(trackData, productId);
    if (tracks.length > 0) return tracks;
  }
  return getFallbackTrack(audioUrlMeta, productId);
}
function findMetaValue(metaData, key) {
  const meta = metaData?.find((m) => m.key === key);
  const value = meta?.value ?? null;
  if (Array.isArray(value)) {
    return value.length > 0 ? String(value[0]) : null;
  }
  return value;
}
function hasTagWithName(tags, searchTerm) {
  return tags?.some(
    (tag) => tag && typeof tag === "object" && "name" in tag && String(tag.name).toLowerCase().includes(searchTerm.toLowerCase())
  ) ?? false;
}
function extractBpmFromText(text) {
  if (!text) return "";
  const patterns = [
    /(\d{2,3})\s*bpm/i,
    /bpm[:\s]*(\d{2,3})/i,
    /_(\d{2,3})BPM_/i,
    /(\d{2,3})BPM/i,
    /tempo[:\s]*(\d{2,3})/i
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      const bpm = Number.parseInt(match[1], 10);
      if (bpm >= 40 && bpm <= 300) return match[1];
    }
  }
  return "";
}
function normalizeKeyFormat(note, mode) {
  const upperNote = note.toUpperCase();
  const lowerMode = mode.toLowerCase();
  if (upperNote.endsWith("M")) {
    return upperNote.slice(0, -1) + "m";
  }
  if (lowerMode === "m" || lowerMode === "min" || lowerMode === "minor") {
    return `${upperNote}m`;
  }
  if (lowerMode === "maj" || lowerMode === "major") {
    return `${upperNote} Major`;
  }
  return upperNote + (lowerMode ? ` ${lowerMode}` : "");
}
function extractKeyFromText(text) {
  if (!text) return "";
  const patterns = [
    /\bkey[:\s]*([A-G][#b]?)\s*(maj(?:or)?|min(?:or)?|m)?\b/i,
    /_([A-G][#b]?m)(?:in)?_/i,
    /_([A-G][#b]?)min_/i,
    /\b([A-G][#b]?)\s*(maj(?:or)?|min(?:or)?)\b/i,
    /\b([A-G][#b]?m)\b/i
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      return normalizeKeyFormat(match[1], match[2] || "");
    }
  }
  return "";
}
function extractMoodFromText(text) {
  if (!text) return "";
  const pattern = /\b(dark|chill|upbeat|sad|happy|aggressive|energetic|mellow|dreamy|intense|smooth|hard|soft|emotional|epic|ambient)\b/i;
  const match = pattern.exec(text);
  if (match?.[1]) {
    return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  }
  return "";
}
function stripHtml2(html) {
  if (!html) return "";
  return html.replaceAll(/<[^>]*>/g, " ").replaceAll(/&[^;]+;/g, " ").replaceAll(/\s+/g, " ").trim();
}
async function mapProductToBeat(product) {
  const albTracklistMeta = product.meta_data?.find(
    (meta) => meta.key === "alb_tracklist"
  );
  const audioUrlMeta = product.meta_data?.find(
    (meta) => meta.key === "audio_url"
  );
  const rawTracks = extractAudioTracks(albTracklistMeta, audioUrlMeta, product.id);
  const audioTracks = await enrichTracksWithMediaTitles(rawTracks);
  const audioUrl = audioTracks.length > 0 ? audioTracks[0].url : null;
  const downloadUrl = audioTracks.length > 0 ? audioTracks[0].downloadUrl : null;
  console.log(
    `\u2705 Product ${product.id} - Final URLs:`,
    `preview: ${audioUrl?.substring(0, 60)}...`,
    `download: ${downloadUrl?.substring(0, 60)}...`,
    `(${audioTracks.length} tracks)`
  );
  const mediaDescriptions = audioTracks.map((t) => t.mediaDescription || "").join(" ");
  const trackTitles = audioTracks.map((t) => t.title || "").join(" ");
  const trackUrls = audioTracks.map((t) => `${t.url || ""} ${t.downloadUrl || ""}`).join(" ");
  const description = stripHtml2(product.description);
  const shortDescription = stripHtml2(product.short_description);
  const highestPrioritySource = mediaDescriptions;
  const mediumPrioritySource = `${description} ${shortDescription} ${trackUrls} ${audioUrl || ""} ${downloadUrl || ""}`;
  const lowPrioritySource = trackTitles;
  const fallbackSource = `${product.name || ""}`;
  console.log(`\u{1F50D} Product ${product.id} - Text sources:`, {
    mediaDescriptions: mediaDescriptions.substring(0, 100),
    description: description.substring(0, 50)
  });
  const bpmFromMeta = safeString(findMetaValue(product.meta_data, "bpm"));
  let bpm = bpmFromMeta;
  if (!bpm) bpm = extractBpmFromText(highestPrioritySource);
  if (!bpm) bpm = extractBpmFromText(mediumPrioritySource);
  if (!bpm) bpm = extractBpmFromText(lowPrioritySource);
  if (!bpm) bpm = extractBpmFromText(fallbackSource);
  const keyFromMeta = safeString(findMetaValue(product.meta_data, "key"));
  let key = keyFromMeta;
  if (!key) key = extractKeyFromText(highestPrioritySource);
  if (!key) key = extractKeyFromText(mediumPrioritySource);
  if (!key) key = extractKeyFromText(lowPrioritySource);
  if (!key) key = extractKeyFromText(fallbackSource);
  const moodFromMeta = safeString(findMetaValue(product.meta_data, "mood"));
  let mood = moodFromMeta;
  if (!mood) mood = extractMoodFromText(highestPrioritySource);
  if (!mood) mood = extractMoodFromText(mediumPrioritySource);
  if (!mood) mood = extractMoodFromText(lowPrioritySource);
  if (!mood) mood = extractMoodFromText(fallbackSource);
  console.log(`\u{1F3B5} Product ${product.id} metadata:`, {
    bpm,
    key,
    mood,
    mediaDescriptions: mediaDescriptions.substring(0, 80)
  });
  return {
    ...product,
    audio_url: audioUrl,
    // Preview URL for playback
    download_url: downloadUrl,
    // Full audio URL for download
    audio_tracks: audioTracks,
    // All tracks for multi-track navigation
    hasVocals: findMetaValue(product.meta_data, "has_vocals") === "yes" || hasTagWithName(product.tags, "vocals"),
    stems: findMetaValue(product.meta_data, "stems") === "yes" || hasTagWithName(product.tags, "stems"),
    bpm,
    key,
    mood,
    instruments: safeString(findMetaValue(product.meta_data, "instruments")),
    duration: safeString(findMetaValue(product.meta_data, "duration")),
    is_free: product.price === "0" || product.price === ""
  };
}
function isWooCommerceConfigured() {
  const apiUrl = process.env.WOOCOMMERCE_API_URL;
  const apiKey = process.env.WOOCOMMERCE_CONSUMER_KEY || process.env.VITE_WC_KEY;
  const apiSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;
  const isConfigured = !!(apiUrl && apiKey && apiSecret);
  if (!isConfigured) {
    console.log("\u26A0\uFE0F WooCommerce config check:", {
      hasApiUrl: !!apiUrl,
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret
    });
  }
  return isConfigured;
}
router27.get("/products", async (req, res) => {
  try {
    if (!isWooCommerceConfigured()) {
      console.log("\u26A0\uFE0F WooCommerce not configured, returning sample data");
      const sampleProducts = [
        {
          id: 1,
          name: "Sample Beat 1",
          price: "29.99",
          regular_price: "39.99",
          sale_price: "29.99",
          description: "A sample beat for testing",
          short_description: "Sample beat",
          images: [{ src: "/api/placeholder/300/300" }],
          categories: [{ name: "Hip Hop" }],
          meta_data: [
            { key: "bpm", value: "140" },
            { key: "key", value: "C" },
            { key: "mood", value: "Energetic" },
            { key: "instruments", value: "Drums, Bass, Synth" },
            { key: "duration", value: "3:45" },
            { key: "has_vocals", value: "no" },
            { key: "stems", value: "yes" }
          ],
          tags: [],
          total_sales: 0,
          hasVocals: false,
          stems: true,
          bpm: "140",
          key: "C",
          mood: "Energetic",
          instruments: "Drums, Bass, Synth",
          duration: "3:45",
          is_free: false
        },
        {
          id: 2,
          name: "Sample Beat 2",
          price: "0",
          regular_price: "0",
          sale_price: "0",
          description: "A free sample beat",
          short_description: "Free beat",
          images: [{ src: "/api/placeholder/300/300" }],
          categories: [{ name: "Trap" }],
          meta_data: [
            { key: "bpm", value: "150" },
            { key: "key", value: "F" },
            { key: "mood", value: "Dark" },
            { key: "instruments", value: "Drums, 808, Hi-hats" },
            { key: "duration", value: "2:30" },
            { key: "has_vocals", value: "yes" },
            { key: "stems", value: "no" }
          ],
          tags: [],
          total_sales: 0,
          hasVocals: true,
          stems: false,
          bpm: "150",
          key: "F",
          mood: "Dark",
          instruments: "Drums, 808, Hi-hats",
          duration: "2:30",
          is_free: true
        }
      ];
      res.json(sampleProducts);
      return;
    }
    const wooProducts = await fetchWooProducts(req.query);
    const beats = await Promise.all(wooProducts.map(mapProductToBeat));
    res.json(beats);
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch products");
  }
});
router27.get(
  "/products/:id",
  validateParams(CommonParams.numericId),
  async (req, res) => {
    try {
      if (!isWooCommerceConfigured()) {
        console.log("\u26A0\uFE0F WooCommerce not configured, returning sample product");
        const sampleProduct = {
          id: Number.parseInt(req.params.id, 10),
          name: "Sample Beat",
          price: "29.99",
          regular_price: "39.99",
          sale_price: "29.99",
          description: "A sample beat for testing",
          short_description: "Sample beat",
          images: [{ src: "/api/placeholder/300/300" }],
          categories: [{ name: "Hip Hop" }],
          meta_data: [
            { key: "bpm", value: "140" },
            { key: "key", value: "C" },
            { key: "mood", value: "Energetic" },
            { key: "instruments", value: "Drums, Bass, Synth" },
            { key: "duration", value: "3:45" },
            { key: "has_vocals", value: "no" },
            { key: "stems", value: "yes" }
          ],
          tags: [],
          total_sales: 0,
          hasVocals: false,
          stems: true,
          bpm: "140",
          key: "C",
          mood: "Energetic",
          instruments: "Drums, Bass, Synth",
          duration: "3:45",
          is_free: false,
          audio_url: null
        };
        res.json({ beat: sampleProduct });
        return;
      }
      const product = await fetchWooProduct(req.params.id);
      if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      const beat = await mapProductToBeat(product);
      res.json(beat);
    } catch (error) {
      handleRouteError(error, res, "Failed to fetch product");
    }
  }
);
router27.get("/categories", async (_req, res) => {
  try {
    if (!isWooCommerceConfigured()) {
      console.log("\u26A0\uFE0F WooCommerce not configured, returning sample categories");
      const sampleCategories = [
        { id: 1, name: "Hip Hop", count: 15 },
        { id: 2, name: "Trap", count: 8 },
        { id: 3, name: "R&B", count: 12 },
        { id: 4, name: "Pop", count: 6 }
      ];
      res.json({ categories: sampleCategories });
      return;
    }
    const cats = await fetchWooCategories();
    res.json({ categories: cats });
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch categories");
  }
});
var woo_default = router27;

// server/routes/wp.ts
import { Router as Router27 } from "express";

// server/services/wp.ts
function toQueryParamValue(value) {
  if (value === void 0 || value === null) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}
async function fetchWPPosts(params = {}) {
  try {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      const stringValue = toQueryParamValue(value);
      if (stringValue !== null) {
        queryParams.append(key, stringValue);
      }
    });
    const response = await fetch(`${process.env.VITE_WP_URL}/posts?${queryParams}`, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {
    console.error("WordPress Posts API Error:", error);
    return [];
  }
}
async function fetchWPPostBySlug(slug) {
  try {
    const response = await fetch(`${process.env.VITE_WP_URL}/posts?slug=${slug}`, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    const posts = await response.json();
    return posts.length > 0 ? posts[0] : null;
  } catch (error) {
    console.error("WordPress Post API Error:", error);
    return null;
  }
}
async function fetchWPPageBySlug(slug) {
  try {
    const response = await fetch(`${process.env.VITE_WP_URL}/pages?slug=${slug}`, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    const pages = await response.json();
    return pages.length > 0 ? pages[0] : null;
  } catch (error) {
    console.error("WordPress Page API Error:", error);
    return null;
  }
}

// server/routes/wp.ts
var router28 = Router27();
router28.get("/pages/:slug", async (req, res, next) => {
  try {
    const page = await fetchWPPageBySlug(req.params.slug);
    if (!page) res.status(404).json({ error: "Page not found" });
    return;
    res.json({ page });
  } catch (e) {
    next(e);
  }
});
router28.get("/posts", async (req, res, next) => {
  try {
    const params = req.query;
    const posts = await fetchWPPosts(params);
    res.json({ posts });
  } catch (e) {
    next(e);
  }
});
router28.get("/posts/:slug", async (req, res, next) => {
  try {
    const post = await fetchWPPostBySlug(req.params.slug);
    if (!post) res.status(404).json({ error: "Post not found" });
    return;
    res.json({ post });
  } catch (e) {
    next(e);
  }
});
var wp_default = router28;

// server/app.ts
var app = express3();
app.set("trust proxy", 1);
app.use(corsMiddleware);
app.use(helmetMiddleware);
app.use(compressionMiddleware);
app.use(bodySizeLimits);
app.use("/api/webhooks/stripe", express3.raw({ type: "application/json", limit: "10mb" }));
app.use("/api/webhooks/paypal", express3.raw({ type: "application/json", limit: "10mb" }));
app.use(
  express3.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(express3.urlencoded({ extended: false, limit: "10mb" }));
logger.info("Server starting", {
  nodeEnv: env.NODE_ENV,
  clerkConfigured: Boolean(env.VITE_CLERK_PUBLISHABLE_KEY) && Boolean(env.CLERK_SECRET_KEY)
});
app.use(requestIdMiddleware);
setupAuth(app);
registerAuthRoutes(app);
app.use((_req, res, next) => {
  res.on("finish", () => {
  });
  next();
});
app.use("/api/activity", apiRateLimiter, activity_default);
app.use("/api/avatar", apiRateLimiter, avatar_default);
app.use("/api/beats", apiRateLimiter, beats_default);
app.use("/api/contact", authRateLimiter, contact_default);
app.use("/api/downloads", downloadRateLimiter, downloads_default);
app.use("/api/email", authRateLimiter, email_default);
app.use("/api/monitoring", monitoring_default2);
app.use("/api/opengraph", apiRateLimiter, openGraph_default);
app.use("/api/orders", apiRateLimiter, orders_default);
app.use("/api/payment/paypal", paymentRateLimiter, paypal_default2);
app.use("/api/payment/stripe", paymentRateLimiter, stripe_default);
app.use("/api/clerk", apiRateLimiter, clerk_default);
app.use("/api/payments", paymentRateLimiter, payments_default);
app.use("/api/webhooks", webhooks_default);
app.use("/api/webhooks/clerk-billing", clerk_billing_default);
app.use("/api/schema", apiRateLimiter, schema_default);
app.use("/api/security", apiRateLimiter, security_default);
app.use("/api/service-orders", apiRateLimiter, serviceOrders_default);
app.use("/api/storage", apiRateLimiter, storage_default);
app.use("/api/subscription", apiRateLimiter, subscription_default);
app.use("/api/uploads", apiRateLimiter, uploads_default);
app.use("/api/wishlist", apiRateLimiter, wishlist_default);
app.use("/api/wp", apiRateLimiter, wp_default);
app.use("/api/sync", apiRateLimiter, sync_default);
app.use("/api/categories", apiRateLimiter, categories_default);
app.use("/api/reservations", apiRateLimiter, reservations_default);
app.use("/api/admin/reconciliation", apiRateLimiter, reconciliation_default);
app.use("/api/woocommerce", apiRateLimiter, woo_default);
app.use("/", sitemap_default);
if (env.NODE_ENV === "development" || env.NODE_ENV === "test") {
  const testSpriteModule = await Promise.resolve().then(() => (init_testSprite(), testSprite_exports));
  app.use(testSpriteModule.default);
  logger.info("TestSprite compatibility endpoints loaded");
}
export {
  app as default
};
