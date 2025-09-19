/**
 * Dashboard Data Models
 * Comprehensive TypeScript interfaces for the unified dashboard system
 */

export interface DashboardUser {
  id: string;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  username?: string;
  role?: string;
  isActive?: boolean;
  lastLoginAt?: number;
  preferences?: UserPreferences;
  subscription?: SubscriptionInfo;
}

export interface UserPreferences {
  language: string;
  theme: "light" | "dark" | "auto";
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    marketing: boolean;
    updates: boolean;
  };
  privacy: {
    profileVisibility: "public" | "private" | "friends";
    showActivity: boolean;
    allowAnalytics: boolean;
  };
  audio: {
    defaultVolume: number;
    autoplay: boolean;
    quality: "low" | "medium" | "high";
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
    | "subscription_updated";
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
