/**
 * Dashboard Data Models for BroLab Entertainment
 *
 * This module contains comprehensive TypeScript interfaces for the unified
 * dashboard system, including user data, statistics, orders, downloads,
 * and analytics for the BroLab Entertainment marketplace platform.
 */

// ================================
// CORE DASHBOARD INTERFACES
// ================================

/**
 * Dashboard user information with preferences and subscription details
 */
export interface DashboardUser {
  /** Unique user identifier */
  id: string;
  /** Clerk authentication ID */
  clerkId: string;
  /** User email address */
  email: string;
  /** User's first name */
  firstName?: string;
  /** User's last name */
  lastName?: string;
  /** Profile image URL */
  imageUrl?: string;
  /** Username */
  username?: string;
  /** User role in the system */
  role?: string;
  /** Whether user account is active */
  isActive?: boolean;
  /** Last login timestamp */
  lastLoginAt?: number;
  /** User preferences */
  preferences?: UserPreferences;
  /** Subscription information */
  subscription?: SubscriptionInfo;
}

/**
 * User preferences for dashboard customization
 */
export interface UserPreferences {
  /** Preferred language code */
  language: string;
  /** Theme preference */
  theme: "light" | "dark" | "auto";
  /** Notification preferences */
  notifications: {
    /** Email notifications enabled */
    email: boolean;
    /** Push notifications enabled */
    push: boolean;
    /** SMS notifications enabled */
    sms: boolean;
    /** Marketing emails enabled */
    marketing: boolean;
    /** Product updates enabled */
    updates: boolean;
  };
  /** Privacy preferences */
  privacy: {
    /** Profile visibility level */
    profileVisibility: "public" | "private" | "friends";
    /** Show activity to others */
    showActivity: boolean;
    /** Allow analytics tracking */
    allowAnalytics: boolean;
  };
  /** Audio preferences */
  audio: {
    /** Default volume (0-100) */
    defaultVolume: number;
    /** Auto-play beats */
    autoplay: boolean;
    /** Audio quality preference */
    quality: "low" | "medium" | "high";
    /** Preferred download format */
    downloadFormat: "mp3" | "wav" | "flac";
  };
}

export interface SubscriptionInfo {
  id: string;
  planId: string;
  status: "active" | "cancelled" | "past_due" | "unpaid";
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd?: boolean;
  features: string[];
  downloadQuota: number;
  downloadUsed: number;
}

export interface UserStats {
  totalFavorites: number;
  totalDownloads: number;
  totalOrders: number;
  totalSpent: number; // Always in dollars
  recentActivity: number;
  quotaUsed: number;
  quotaLimit: number;
  monthlyDownloads: number;
  monthlyOrders: number;
  monthlyRevenue: number;
}

export interface Activity {
  id: string;
  type:
    | "favorite_added"
    | "favorite_removed"
    | "download"
    | "order_placed"
    | "reservation_made"
    | "subscription_updated"
    | "license_purchased"
    | "beat_played"
    | "beat_paused"
    | "beat_preview";
  description: string;
  timestamp: string;
  metadata: Record<string, any>;
  beatId?: string;
  beatTitle?: string;
  severity?: "info" | "warning" | "error" | "success";
}

export interface Favorite {
  id: string;
  beatId: number;
  beatTitle: string;
  beatArtist?: string;
  beatImageUrl?: string;
  beatGenre?: string;
  beatBpm?: number;
  beatPrice?: number; // In dollars
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber?: string;
  items: OrderItem[];
  total: number; // Always in dollars
  currency: string;
  status: OrderStatus;
  paymentMethod?: string;
  paymentStatus?: string;
  createdAt: string;
  updatedAt: string;
  invoiceUrl?: string;
}

export interface OrderItem {
  productId?: number;
  title: string;
  price?: number; // In dollars
  quantity?: number;
  license?: string;
  type?: string;
  sku?: string;
  metadata?: {
    beatGenre?: string;
    beatBpm?: number;
    beatKey?: string;
    downloadFormat?: string;
    licenseTerms?: string;
  };
}

export type OrderStatus =
  | "draft"
  | "pending"
  | "processing"
  | "paid"
  | "completed"
  | "cancelled"
  | "refunded"
  | "payment_failed";

export interface Download {
  id: string;
  beatId: number;
  beatTitle: string;
  beatArtist?: string;
  beatImageUrl?: string;
  fileSize?: number;
  format: "mp3" | "wav" | "flac";
  quality?: string;
  licenseType: string;
  downloadedAt: string;
  downloadCount: number;
  maxDownloads?: number;
  downloadUrl?: string;
  expiresAt?: string;
}

export interface Reservation {
  id: string;
  serviceType: "mixing" | "mastering" | "recording" | "consultation" | "custom_beat";
  preferredDate: string;
  duration: number; // in minutes
  totalPrice: number; // Always in dollars
  status: ReservationStatus;
  details: ReservationDetails;
  notes?: string;
  assignedTo?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export type ReservationStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";

export interface ReservationDetails {
  name: string;
  email: string;
  phone: string;
  requirements?: string;
  referenceLinks?: string[];
  projectDescription?: string;
  deadline?: string;
  budget?: {
    min: number;
    max: number;
    currency: string;
  };
  additionalServices?: string[];
  communicationPreference?: "email" | "phone" | "video";
}

export interface ChartDataPoint {
  date: string;
  orders: number;
  downloads: number;
  revenue: number; // Always in dollars
  favorites: number;
}

export interface TrendData {
  orders: TrendMetric;
  downloads: TrendMetric;
  revenue: TrendMetric;
  favorites: TrendMetric;
}

export interface TrendMetric {
  period: "7d" | "30d" | "90d" | "1y";
  value: number;
  change: number;
  changePercent: number;
  isPositive: boolean;
}

export interface DashboardData {
  user: DashboardUser;
  stats: UserStats;
  favorites: Favorite[];
  orders: Order[];
  downloads: Download[];
  reservations: Reservation[];
  activity: Activity[];
  chartData: ChartDataPoint[];
  trends: TrendData;
}

export interface DashboardError {
  type: "network_error" | "auth_error" | "data_error" | "realtime_error" | "validation_error";
  message: string;
  code?: string;
  retryable: boolean;
  retryCount: number;
  maxRetries: number;
}

export interface DashboardConfig {
  ui: {
    animationDuration: number;
    skeletonItems: number;
    maxActivityItems: number;
  };
  pagination: {
    ordersPerPage: number;
    downloadsPerPage: number;
    activityPerPage: number;
  };
  realtime: {
    reconnectInterval: number;
    maxRetries: number;
    heartbeatInterval: number;
  };
  features: {
    realtimeUpdates: boolean;
    analyticsCharts: boolean;
    advancedFilters: boolean;
  };
}

// Re-export sync types for convenience
export type {
  ConnectionStatus,
  ConsistentUserStats,
  CrossValidationResult,
  DashboardEvent,
  Inconsistency,
  MemoryStats,
  OptimisticUpdate,
  SyncError,
  SyncMetrics,
  SyncStatus,
  ValidationResult,
} from "./sync";
