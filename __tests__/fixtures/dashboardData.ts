/**
 * Test Fixtures for Dashboard Data Validation
 *
 * Provides static test data with predictable values for testing
 * the data validation infrastructure without time-based dependencies.
 */

import type { ConsistencyCheckOptions } from "../../client/src/utils/dataConsistency";
import type {
  Activity,
  ChartDataPoint,
  DashboardData,
  DashboardUser,
  Download,
  Favorite,
  Order,
  Reservation,
  TrendData,
  UserStats,
} from "../../shared/types/dashboard";

// ================================
// TEST USER DATA
// ================================

export const testUser: DashboardUser = {
  id: "test-user-123",
  clerkId: "clerk_test_123",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  imageUrl: "https://example.com/avatar.jpg",
  username: "testuser",
  role: "user",
  isActive: true,
  lastLoginAt: Date.now() - 3600000, // 1 hour ago
};

// ================================
// TEST STATS DATA
// ================================

/**
 * Test stats with static values that don't depend on current date/time
 * Uses test-hash for hash validation in test environments
 */
export const testStats: UserStats = {
  totalFavorites: 5,
  totalDownloads: 10,
  totalOrders: 3,
  totalSpent: 129.97, // 3 orders: $29.99 + $49.99 + $49.99
  recentActivity: 8,
  quotaUsed: 10,
  quotaLimit: 50,
  monthlyDownloads: 4, // Static value for test environment
  monthlyOrders: 2, // Static value for test environment
  monthlyRevenue: 99.98, // Static value for test environment
};

// ================================
// TEST FAVORITES DATA
// ================================

export const testFavorites: Favorite[] = [
  {
    id: "fav-1",
    beatId: 101,
    beatTitle: "Summer Vibes",
    beatArtist: "Producer A",
    beatGenre: "Hip Hop",
    beatBpm: 120,
    beatPrice: 29.99,
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "fav-2",
    beatId: 102,
    beatTitle: "Dark Trap",
    beatArtist: "Producer B",
    beatGenre: "Trap",
    beatBpm: 140,
    beatPrice: 49.99,
    createdAt: "2024-01-16T11:00:00Z",
  },
  {
    id: "fav-3",
    beatId: 103,
    beatTitle: "Chill Lofi",
    beatArtist: "Producer C",
    beatGenre: "Lofi",
    beatBpm: 85,
    beatPrice: 29.99,
    createdAt: "2024-01-17T12:00:00Z",
  },
  {
    id: "fav-4",
    beatId: 104,
    beatTitle: "Energetic Pop",
    beatArtist: "Producer D",
    beatGenre: "Pop",
    beatBpm: 128,
    beatPrice: 49.99,
    createdAt: "2024-01-18T13:00:00Z",
  },
  {
    id: "fav-5",
    beatId: 105,
    beatTitle: "Ambient Dreams",
    beatArtist: "Producer E",
    beatGenre: "Ambient",
    beatBpm: 90,
    beatPrice: 29.99,
    createdAt: "2024-01-19T14:00:00Z",
  },
];

// ================================
// TEST ORDERS DATA
// ================================

export const testOrders: Order[] = [
  {
    id: "order-1",
    orderNumber: "ORD-001",
    items: [
      {
        productId: 101,
        title: "Summer Vibes - Basic License",
        price: 29.99,
        quantity: 1,
        license: "basic",
        type: "beat",
      },
    ],
    total: 29.99,
    currency: "USD",
    status: "completed",
    paymentMethod: "stripe",
    paymentStatus: "paid",
    createdAt: "2024-01-20T10:00:00Z",
    updatedAt: "2024-01-20T10:05:00Z",
  },
  {
    id: "order-2",
    orderNumber: "ORD-002",
    items: [
      {
        productId: 102,
        title: "Dark Trap - Premium License",
        price: 49.99,
        quantity: 1,
        license: "premium",
        type: "beat",
      },
    ],
    total: 49.99,
    currency: "USD",
    status: "completed",
    paymentMethod: "paypal",
    paymentStatus: "paid",
    createdAt: "2024-01-21T11:00:00Z",
    updatedAt: "2024-01-21T11:10:00Z",
  },
  {
    id: "order-3",
    orderNumber: "ORD-003",
    items: [
      {
        productId: 104,
        title: "Energetic Pop - Premium License",
        price: 49.99,
        quantity: 1,
        license: "premium",
        type: "beat",
      },
    ],
    total: 49.99,
    currency: "USD",
    status: "completed",
    paymentMethod: "stripe",
    paymentStatus: "paid",
    createdAt: "2024-01-22T12:00:00Z",
    updatedAt: "2024-01-22T12:08:00Z",
  },
];

// ================================
// TEST DOWNLOADS DATA
// ================================

export const testDownloads: Download[] = [
  {
    id: "download-1",
    beatId: 101,
    beatTitle: "Summer Vibes",
    beatArtist: "Producer A",
    format: "mp3",
    quality: "high",
    licenseType: "basic",
    downloadedAt: "2024-01-20T10:10:00Z",
    downloadCount: 1,
    maxDownloads: 5,
  },
  {
    id: "download-2",
    beatId: 101,
    beatTitle: "Summer Vibes",
    beatArtist: "Producer A",
    format: "wav",
    quality: "high",
    licenseType: "basic",
    downloadedAt: "2024-01-20T10:15:00Z",
    downloadCount: 2,
    maxDownloads: 5,
  },
  {
    id: "download-3",
    beatId: 102,
    beatTitle: "Dark Trap",
    beatArtist: "Producer B",
    format: "mp3",
    quality: "high",
    licenseType: "premium",
    downloadedAt: "2024-01-21T11:15:00Z",
    downloadCount: 1,
    maxDownloads: 10,
  },
  {
    id: "download-4",
    beatId: 102,
    beatTitle: "Dark Trap",
    beatArtist: "Producer B",
    format: "wav",
    quality: "high",
    licenseType: "premium",
    downloadedAt: "2024-01-21T11:20:00Z",
    downloadCount: 2,
    maxDownloads: 10,
  },
  {
    id: "download-5",
    beatId: 103,
    beatTitle: "Chill Lofi",
    beatArtist: "Producer C",
    format: "mp3",
    quality: "high",
    licenseType: "basic",
    downloadedAt: "2024-01-23T09:00:00Z",
    downloadCount: 1,
    maxDownloads: 5,
  },
  {
    id: "download-6",
    beatId: 104,
    beatTitle: "Energetic Pop",
    beatArtist: "Producer D",
    format: "mp3",
    quality: "high",
    licenseType: "premium",
    downloadedAt: "2024-01-22T12:15:00Z",
    downloadCount: 1,
    maxDownloads: 10,
  },
  {
    id: "download-7",
    beatId: 104,
    beatTitle: "Energetic Pop",
    beatArtist: "Producer D",
    format: "wav",
    quality: "high",
    licenseType: "premium",
    downloadedAt: "2024-01-22T12:20:00Z",
    downloadCount: 2,
    maxDownloads: 10,
  },
  {
    id: "download-8",
    beatId: 105,
    beatTitle: "Ambient Dreams",
    beatArtist: "Producer E",
    format: "mp3",
    quality: "medium",
    licenseType: "basic",
    downloadedAt: "2024-01-24T08:00:00Z",
    downloadCount: 1,
    maxDownloads: 5,
  },
  {
    id: "download-9",
    beatId: 101,
    beatTitle: "Summer Vibes",
    beatArtist: "Producer A",
    format: "mp3",
    quality: "high",
    licenseType: "basic",
    downloadedAt: "2024-01-25T10:00:00Z",
    downloadCount: 3,
    maxDownloads: 5,
  },
  {
    id: "download-10",
    beatId: 102,
    beatTitle: "Dark Trap",
    beatArtist: "Producer B",
    format: "flac",
    quality: "lossless",
    licenseType: "premium",
    downloadedAt: "2024-01-26T11:00:00Z",
    downloadCount: 3,
    maxDownloads: 10,
  },
];

// ================================
// TEST RESERVATIONS DATA
// ================================

export const testReservations: Reservation[] = [
  {
    id: "reservation-1",
    serviceType: "mixing",
    preferredDate: "2024-02-01T14:00:00Z",
    duration: 120,
    totalPrice: 150,
    status: "confirmed",
    details: {
      name: "Test User",
      email: "test@example.com",
      phone: "+1234567890",
      requirements: "Need professional mixing for 5 tracks",
      projectDescription: "Hip hop album project",
    },
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "reservation-2",
    serviceType: "mastering",
    preferredDate: "2024-02-05T10:00:00Z",
    duration: 60,
    totalPrice: 100,
    status: "pending",
    details: {
      name: "Test User",
      email: "test@example.com",
      phone: "+1234567890",
      requirements: "Mastering for single track",
      projectDescription: "Pop single release",
    },
    createdAt: "2024-01-18T11:00:00Z",
    updatedAt: "2024-01-18T11:00:00Z",
  },
];

// ================================
// TEST ACTIVITY DATA
// ================================

export const testActivity: Activity[] = [
  {
    id: "activity-1",
    type: "favorite_added",
    description: "Added Summer Vibes to favorites",
    timestamp: "2024-01-15T10:00:00Z",
    metadata: { beatId: 101 },
    beatId: "101",
    beatTitle: "Summer Vibes",
    severity: "info",
  },
  {
    id: "activity-2",
    type: "order_placed",
    description: "Placed order ORD-001",
    timestamp: "2024-01-20T10:00:00Z",
    metadata: { orderId: "order-1", total: 29.99 },
    severity: "success",
  },
  {
    id: "activity-3",
    type: "download",
    description: "Downloaded Summer Vibes (MP3)",
    timestamp: "2024-01-20T10:10:00Z",
    metadata: { beatId: 101, format: "mp3" },
    beatId: "101",
    beatTitle: "Summer Vibes",
    severity: "info",
  },
  {
    id: "activity-4",
    type: "favorite_added",
    description: "Added Dark Trap to favorites",
    timestamp: "2024-01-16T11:00:00Z",
    metadata: { beatId: 102 },
    beatId: "102",
    beatTitle: "Dark Trap",
    severity: "info",
  },
  {
    id: "activity-5",
    type: "order_placed",
    description: "Placed order ORD-002",
    timestamp: "2024-01-21T11:00:00Z",
    metadata: { orderId: "order-2", total: 49.99 },
    severity: "success",
  },
  {
    id: "activity-6",
    type: "download",
    description: "Downloaded Dark Trap (MP3)",
    timestamp: "2024-01-21T11:15:00Z",
    metadata: { beatId: 102, format: "mp3" },
    beatId: "102",
    beatTitle: "Dark Trap",
    severity: "info",
  },
  {
    id: "activity-7",
    type: "reservation_made",
    description: "Booked mixing service",
    timestamp: "2024-01-15T09:00:00Z",
    metadata: { reservationId: "reservation-1", serviceType: "mixing" },
    severity: "success",
  },
  {
    id: "activity-8",
    type: "order_placed",
    description: "Placed order ORD-003",
    timestamp: "2024-01-22T12:00:00Z",
    metadata: { orderId: "order-3", total: 49.99 },
    severity: "success",
  },
];

// ================================
// TEST CHART DATA
// ================================

export const testChartData: ChartDataPoint[] = [
  {
    date: "2024-01-15",
    orders: 0,
    downloads: 0,
    revenue: 0,
    favorites: 1,
  },
  {
    date: "2024-01-16",
    orders: 0,
    downloads: 0,
    revenue: 0,
    favorites: 1,
  },
  {
    date: "2024-01-20",
    orders: 1,
    downloads: 2,
    revenue: 29.99,
    favorites: 0,
  },
  {
    date: "2024-01-21",
    orders: 1,
    downloads: 2,
    revenue: 49.99,
    favorites: 0,
  },
  {
    date: "2024-01-22",
    orders: 1,
    downloads: 2,
    revenue: 49.99,
    favorites: 0,
  },
];

// ================================
// TEST TREND DATA
// ================================

export const testTrends: TrendData = {
  orders: {
    period: "30d",
    value: 3,
    change: 1,
    changePercent: 50,
    isPositive: true,
  },
  downloads: {
    period: "30d",
    value: 10,
    change: 3,
    changePercent: 42.86,
    isPositive: true,
  },
  revenue: {
    period: "30d",
    value: 129.97,
    change: 29.99,
    changePercent: 30,
    isPositive: true,
  },
  favorites: {
    period: "30d",
    value: 5,
    change: 2,
    changePercent: 66.67,
    isPositive: true,
  },
};

// ================================
// COMPLETE TEST DASHBOARD DATA
// ================================

/**
 * Complete test dashboard data with all sections populated
 * Uses static values that don't depend on current date/time
 * Perfect for testing validation logic without false positives
 */
export const testDashboardData: DashboardData = {
  user: testUser,
  stats: testStats,
  favorites: testFavorites,
  orders: testOrders,
  downloads: testDownloads,
  reservations: testReservations,
  activity: testActivity,
  chartData: testChartData,
  trends: testTrends,
};

// ================================
// TEST CONSISTENCY CHECKER OPTIONS
// ================================

/**
 * Pre-configured ConsistencyChecker options for test environments
 * Skips time-based validations and allows test hash values
 */
export const testConsistencyCheckOptions: ConsistencyCheckOptions = {
  environment: "test",
  skipTimeBasedValidations: true,
  skipHashValidation: false,
  allowTestHashes: true,
};

/**
 * Factory function to create test-friendly ConsistencyChecker options
 * @param overrides - Optional overrides for specific options
 * @returns ConsistencyCheckOptions configured for testing
 */
export function createTestConsistencyOptions(
  overrides?: Partial<ConsistencyCheckOptions>
): ConsistencyCheckOptions {
  return {
    ...testConsistencyCheckOptions,
    ...overrides,
  };
}

// ================================
// DATA BUILDERS FOR CUSTOM TESTS
// ================================

/**
 * Create a custom dashboard data object with overrides
 * Useful for testing specific scenarios
 */
export function createTestDashboardData(overrides?: Partial<DashboardData>): DashboardData {
  return {
    ...testDashboardData,
    ...overrides,
  };
}

/**
 * Create test dashboard data with inconsistent stats
 * Useful for testing validation error detection
 */
export function createInconsistentDashboardData(): DashboardData {
  return {
    ...testDashboardData,
    stats: {
      ...testStats,
      totalFavorites: 10, // Inconsistent with favorites array length (5)
      totalDownloads: 5, // Inconsistent with downloads array length (10)
      totalOrders: 5, // Inconsistent with orders array length (3)
      totalSpent: 200, // Inconsistent with actual order totals (129.97)
    },
  };
}

/**
 * Create test dashboard data with duplicate entries
 * Useful for testing duplicate detection
 */
export function createDuplicateDashboardData(): DashboardData {
  return {
    ...testDashboardData,
    favorites: [
      ...testFavorites,
      { ...testFavorites[0] }, // Duplicate first favorite
    ],
    orders: [
      ...testOrders,
      { ...testOrders[0] }, // Duplicate first order
    ],
  };
}

/**
 * Create minimal dashboard data for basic tests
 * Contains only required fields with minimal data
 */
export function createMinimalDashboardData(): DashboardData {
  return {
    user: testUser,
    stats: {
      totalFavorites: 0,
      totalDownloads: 0,
      totalOrders: 0,
      totalSpent: 0,
      recentActivity: 0,
      quotaUsed: 0,
      quotaLimit: 50,
      monthlyDownloads: 0,
      monthlyOrders: 0,
      monthlyRevenue: 0,
    },
    favorites: [],
    orders: [],
    downloads: [],
    reservations: [],
    activity: [],
    chartData: [],
    trends: {
      orders: {
        period: "30d",
        value: 0,
        change: 0,
        changePercent: 0,
        isPositive: false,
      },
      downloads: {
        period: "30d",
        value: 0,
        change: 0,
        changePercent: 0,
        isPositive: false,
      },
      revenue: {
        period: "30d",
        value: 0,
        change: 0,
        changePercent: 0,
        isPositive: false,
      },
      favorites: {
        period: "30d",
        value: 0,
        change: 0,
        changePercent: 0,
        isPositive: false,
      },
    },
  };
}
