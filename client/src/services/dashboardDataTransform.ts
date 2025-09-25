/**
 * Dashboard Data Transformation Service
 *
 * Handles all data transformation logic for the dashboard, providing
 * clean separation between raw API data and typed business objects.
 *
 * This service ensures type safety and consistent data structure
 * across the dashboard components.
 */

import type {
  Activity,
  Download as DashboardDownload,
  Favorite,
  Order,
  OrderItem,
  OrderStatus,
  Reservation,
  ReservationStatus,
} from "../../../shared/types/dashboard";

// ================================
// RAW DATA INTERFACES
// ================================

/**
 * Raw order data from various sources (Convex, Stripe, etc.)
 */
interface RawOrderData {
  id?: string;
  _id?: string;
  orderNumber?: string;
  items?: unknown[];
  total?: number;
  amount?: number;
  currency?: string;
  status?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
  invoiceUrl?: string;
}

/**
 * Raw reservation data from various sources
 */
interface RawReservationData {
  id?: string;
  _id?: string;
  serviceType?: string;
  service_type?: string;
  preferredDate?: string;
  preferred_date?: string;
  duration?: number;
  duration_minutes?: number;
  durationMinutes?: number;
  totalPrice?: number;
  total_price?: number;
  status?: string;
  details?: {
    name?: string;
    email?: string;
    phone?: string;
    requirements?: string;
  };
  name?: string;
  email?: string;
  phone?: string;
  requirements?: string;
  notes?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

/**
 * Raw activity data from various sources
 */
interface RawActivityData {
  id?: string;
  type?: string;
  description?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
  beatId?: string;
  beatTitle?: string;
  severity?: string;
}

/**
 * Raw favorite data from various sources
 */
interface RawFavoriteData {
  id?: string;
  beatId?: number;
  beatTitle?: string;
  beatArtist?: string;
  beatImageUrl?: string;
  beatGenre?: string;
  beatBpm?: number;
  beatPrice?: number;
  createdAt?: string | number;
}

/**
 * Raw order item data
 */
interface RawOrderItemData {
  productId?: number;
  title?: string;
  name?: string;
  price?: number;
  quantity?: number;
  license?: string;
  type?: string;
  sku?: string;
  metadata?: Record<string, unknown>;
}

// ================================
// TRANSFORMATION FUNCTIONS
// ================================

/**
 * Transform raw order item data to typed OrderItem
 */
export const transformOrderItem = (item: RawOrderItemData): OrderItem => ({
  productId: item.productId,
  title: item.title || item.name || "Unknown Product",
  price: item.price,
  quantity: item.quantity,
  license: item.license,
  type: item.type,
  sku: item.sku,
  metadata: item.metadata as OrderItem["metadata"],
});

/**
 * Transform raw order data to typed Order
 */
export const transformOrderData = (orderRaw: RawOrderData): Order => ({
  id: orderRaw?.id || orderRaw?._id || `order-${Date.now()}`,
  orderNumber: orderRaw?.orderNumber,
  items: (orderRaw?.items || []).map((item: unknown) =>
    transformOrderItem(item as RawOrderItemData)
  ),
  total: orderRaw?.total || orderRaw?.amount || 0,
  currency: orderRaw?.currency || "USD",
  status: (orderRaw?.status || "pending") as OrderStatus,
  paymentMethod: orderRaw?.paymentMethod,
  paymentStatus: orderRaw?.paymentStatus,
  createdAt:
    typeof orderRaw?.createdAt === "number"
      ? new Date(orderRaw.createdAt).toISOString()
      : orderRaw?.createdAt || new Date().toISOString(),
  updatedAt:
    typeof orderRaw?.updatedAt === "number"
      ? new Date(orderRaw.updatedAt).toISOString()
      : orderRaw?.updatedAt || new Date().toISOString(),
  invoiceUrl: orderRaw?.invoiceUrl,
});

/**
 * Transform raw reservation data to typed Reservation
 */
export const transformReservationData = (r: RawReservationData): Reservation => ({
  id: r.id || r._id || `res-${Date.now()}`,
  serviceType: (r.serviceType || r.service_type || "mixing") as Reservation["serviceType"],
  preferredDate: r.preferredDate || r.preferred_date || new Date().toISOString(),
  duration: r.duration || r.duration_minutes || r.durationMinutes || 60,
  totalPrice: r.totalPrice || r.total_price || 0,
  status: (r.status || "pending") as ReservationStatus,
  details: {
    name: r.details?.name || r.name || "",
    email: r.details?.email || r.email || "",
    phone: r.details?.phone || r.phone || "",
    requirements: r.details?.requirements || r.requirements || "",
  },
  notes: r.notes,
  createdAt: r.createdAt || r.created_at || new Date().toISOString(),
  updatedAt: r.updatedAt || r.updated_at || new Date().toISOString(),
});

/**
 * Transform raw activity data to typed Activity
 */
export const transformActivityData = (a: RawActivityData): Activity => ({
  id: a.id || `activity-${Date.now()}`,
  type: (a.type || "download") as Activity["type"],
  description: a.description || "",
  timestamp: a.timestamp || new Date().toISOString(),
  metadata: a.metadata || {},
  beatId: a.beatId,
  beatTitle: a.beatTitle,
  severity: (a.severity || "info") as Activity["severity"],
});

/**
 * Transform raw favorite data to typed Favorite
 */
export const transformFavoriteData = (f: RawFavoriteData): Favorite => ({
  id: f.id || `fav-${f.beatId}`,
  beatId: f.beatId || 0,
  beatTitle: f.beatTitle || `Beat ${f.beatId}`,
  beatArtist: f.beatArtist,
  beatImageUrl: f.beatImageUrl,
  beatGenre: f.beatGenre,
  beatBpm: f.beatBpm,
  beatPrice: f.beatPrice,
  createdAt:
    typeof f.createdAt === "number"
      ? new Date(f.createdAt).toISOString()
      : f.createdAt || new Date().toISOString(),
});

/**
 * Transform raw download data to typed Download with metadata enrichment
 */
export const transformDownloadData = (
  d: DashboardDownload,
  beatMetadata?: Record<number, { title?: string }>
): DashboardDownload => ({
  id: d.id || `download-${d.beatId}`,
  beatId: d.beatId,
  beatTitle: beatMetadata?.[Number(d.beatId)]?.title || d.beatTitle || `Beat ${d.beatId}`,
  beatArtist: d.beatArtist,
  beatImageUrl: d.beatImageUrl,
  fileSize: typeof d.fileSize === "number" ? d.fileSize : 0,
  format: d.format as "mp3" | "wav" | "flac",
  quality: d.quality || "320kbps",
  licenseType: d.licenseType || "Basic",
  downloadedAt: d.downloadedAt || new Date().toISOString(),
  downloadCount: d.downloadCount || 0,
  maxDownloads: d.maxDownloads,
  downloadUrl: d.downloadUrl || "",
  expiresAt: d.expiresAt,
});

// ================================
// BATCH TRANSFORMATION FUNCTIONS
// ================================

/**
 * Transform array of raw orders to typed Orders
 */
export const transformOrdersData = (orders: unknown[]): Order[] => {
  return orders.map(order => transformOrderData(order as RawOrderData));
};

/**
 * Transform array of raw reservations to typed Reservations
 */
export const transformReservationsData = (reservations: unknown[]): Reservation[] => {
  return reservations.map(reservation =>
    transformReservationData(reservation as RawReservationData)
  );
};

/**
 * Transform array of raw activities to typed Activities
 */
export const transformActivitiesData = (activities: unknown[]): Activity[] => {
  return activities.map(activity => transformActivityData(activity as RawActivityData));
};

/**
 * Transform array of raw favorites to typed Favorites
 */
export const transformFavoritesData = (favorites: unknown[]): Favorite[] => {
  return favorites.map(favorite => transformFavoriteData(favorite as RawFavoriteData));
};

/**
 * Transform array of raw downloads to typed Downloads with metadata enrichment
 */
export const transformDownloadsData = (
  downloads: DashboardDownload[],
  beatMetadata?: Record<number, { title?: string }>
): DashboardDownload[] => {
  return downloads.map(download => transformDownloadData(download, beatMetadata));
};

/**
 * Transform downloads data specifically for DownloadsTable component
 * Ensures all required fields are present and properly typed
 */
export const transformDownloadsForTable = (
  downloads: DashboardDownload[],
  beatMetadata?: Record<number, { title?: string }>
): Array<{
  id: string;
  beatTitle: string;
  artist?: string;
  fileSize: number;
  format: "mp3" | "wav" | "flac";
  quality: string;
  downloadedAt: string;
  downloadCount: number;
  maxDownloads?: number;
  licenseType?: string;
  downloadUrl: string;
  isExpired?: boolean;
  expiresAt?: string;
}> => {
  return downloads.map(d => ({
    id: d.id || `download-${d.beatId}`,
    beatTitle: beatMetadata?.[Number(d.beatId)]?.title || d.beatTitle || `Beat ${d.beatId}`,
    artist: d.beatArtist,
    fileSize: typeof d.fileSize === "number" ? d.fileSize : 0, // Always a number
    format: d.format as "mp3" | "wav" | "flac",
    quality: d.quality || "320kbps",
    downloadedAt: d.downloadedAt || new Date().toISOString(),
    downloadCount: d.downloadCount || 0,
    maxDownloads: d.maxDownloads,
    licenseType: d.licenseType || "Basic",
    downloadUrl: d.downloadUrl || "",
    isExpired: d.expiresAt ? new Date(d.expiresAt) < new Date() : false,
    expiresAt: d.expiresAt,
  }));
};

// ================================
// VALIDATION HELPERS
// ================================

/**
 * Validate if data is a valid order object
 */
export const isValidOrderData = (data: unknown): data is RawOrderData => {
  return (
    typeof data === "object" &&
    data !== null &&
    (typeof (data as RawOrderData).id === "string" ||
      typeof (data as RawOrderData)._id === "string")
  );
};

/**
 * Validate if data is a valid reservation object
 */
export const isValidReservationData = (data: unknown): data is RawReservationData => {
  return (
    typeof data === "object" &&
    data !== null &&
    (typeof (data as RawReservationData).id === "string" ||
      typeof (data as RawReservationData)._id === "string")
  );
};

/**
 * Validate if data is a valid activity object
 */
export const isValidActivityData = (data: unknown): data is RawActivityData => {
  return (
    typeof data === "object" && data !== null && typeof (data as RawActivityData).type === "string"
  );
};

/**
 * Validate if data is a valid favorite object
 */
export const isValidFavoriteData = (data: unknown): data is RawFavoriteData => {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as RawFavoriteData).beatId === "number"
  );
};
