/**
 * Service Booking and Reservation Type Definitions for BroLab Entertainment
 *
 * This module contains all type definitions related to service bookings, reservations,
 * and studio services in the BroLab Entertainment marketplace platform.
 */

// ================================
// ENUMS
// ================================

/**
 * Types of services offered by BroLab Entertainment
 */
export enum ServiceType {
  MIXING = "mixing",
  MASTERING = "mastering",
  RECORDING = "recording",
  CUSTOM_BEAT = "custom_beat",
  CONSULTATION = "consultation",
  VOCAL_TUNING = "vocal_tuning",
  BEAT_LEASING = "beat_leasing",
  GHOST_PRODUCTION = "ghost_production",
}

/**
 * Reservation status throughout the booking lifecycle
 */
export enum ReservationStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  RESCHEDULED = "rescheduled",
  NO_SHOW = "no_show",
}

/**
 * Service quality levels
 */
export enum ServiceQuality {
  STANDARD = "standard",
  PREMIUM = "premium",
  PROFESSIONAL = "professional",
}

/**
 * Audio formats for service deliverables
 */
export enum ServiceAudioFormat {
  WAV = "wav",
  MP3 = "mp3",
  AIFF = "aiff",
  FLAC = "flac",
}

/**
 * Priority levels for rush orders
 */
export enum ServicePriority {
  NORMAL = "normal",
  RUSH = "rush",
  URGENT = "urgent",
}

/**
 * Communication preferences for service coordination
 */
export enum CommunicationPreference {
  EMAIL = "email",
  PHONE = "phone",
  VIDEO = "video",
  IN_PERSON = "in_person",
  MESSAGING = "messaging",
}

/**
 * Priority levels for reservations and services
 */
export enum Priority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

/**
 * Service delivery methods
 */
export enum DeliveryMethod {
  DIGITAL_DOWNLOAD = "digital_download",
  EMAIL = "email",
  CLOUD_STORAGE = "cloud_storage",
  PHYSICAL_MEDIA = "physical_media",
  IN_PERSON = "in_person",
}

// ================================
// CORE INTERFACES
// ================================

/**
 * Budget range for custom services
 */
export interface BudgetRange {
  /** Minimum budget */
  min: number;
  /** Maximum budget */
  max: number;
  /** Currency code */
  currency: string;
}

/**
 * Contact information for reservations
 */
export interface ContactInfo {
  /** Full name */
  name: string;
  /** Email address */
  email: string;
  /** Phone number */
  phone: string;
  /** Preferred communication method */
  communicationPreference: CommunicationPreference;
  /** Best time to contact */
  bestTimeToContact?: string;
  /** Timezone */
  timezone?: string;
}

/**
 * Project requirements and specifications
 */
export interface ProjectRequirements {
  /** Project description */
  description: string;
  /** Specific requirements */
  requirements: string;
  /** Reference links (tracks, examples, etc.) */
  referenceLinks?: string[];
  /** Project deadline */
  deadline: string;
  /** Budget range */
  budget: BudgetRange;
  /** Additional services needed */
  additionalServices?: ServiceType[];
  /** Special instructions */
  specialInstructions?: string;
}

/**
 * Service-specific details for different service types
 */
export interface ServiceDetails {
  /** Duration in minutes */
  duration: number;
  /** Number of tracks */
  tracks: number;
  /** Audio format preference */
  format: ServiceAudioFormat;
  /** Quality level */
  quality: ServiceQuality;
  /** Rush order flag */
  rush: boolean;
  /** Priority level */
  priority: ServicePriority;
  /** Additional notes */
  notes?: string;
  /** Delivery method preference */
  deliveryMethod: DeliveryMethod;
  /** Revision rounds included */
  revisions: number;
  /** Source files needed */
  sourceFilesRequired: boolean;
}

/**
 * Reservation details combining contact info and project requirements
 */
export interface ReservationDetails {
  /** Contact information */
  contact: ContactInfo;
  /** Project requirements */
  project: ProjectRequirements;
  /** Service-specific details */
  service: ServiceDetails;
}

/**
 * Service pricing information
 */
export interface ServicePricing {
  /** Base price */
  basePrice: number;
  /** Price per hour (if applicable) */
  hourlyRate?: number;
  /** Rush order surcharge */
  rushSurcharge?: number;
  /** Quality upgrade cost */
  qualityUpgrade?: number;
  /** Additional revision cost */
  revisionCost?: number;
  /** Currency */
  currency: string;
  /** Estimated total */
  estimatedTotal: number;
}

/**
 * Service availability slot
 */
export interface AvailabilitySlot {
  /** Slot start time */
  startTime: string;
  /** Slot end time */
  endTime: string;
  /** Whether slot is available */
  available: boolean;
  /** Service types available in this slot */
  serviceTypes: ServiceType[];
  /** Producer/engineer assigned */
  assignedTo?: {
    id: number;
    name: string;
    specialties: ServiceType[];
  };
}

/**
 * Service provider information
 */
export interface ServiceProvider {
  /** Provider ID */
  id: number;
  /** Provider name */
  name: string;
  /** Profile image */
  avatar?: string;
  /** Specialties */
  specialties: ServiceType[];
  /** Experience level */
  experienceLevel: "junior" | "senior" | "expert";
  /** Hourly rate */
  hourlyRate: number;
  /** Rating (1-5 stars) */
  rating?: number;
  /** Number of reviews */
  reviewCount?: number;
  /** Bio/description */
  bio?: string;
  /** Portfolio links */
  portfolio?: string[];
  /** Availability */
  availability?: AvailabilitySlot[];
}

/**
 * File attachment for reservations
 */
export interface ReservationFile {
  /** File ID */
  id: string;
  /** Original filename */
  filename: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** Storage URL */
  url: string;
  /** File purpose */
  purpose: "reference" | "source" | "deliverable" | "contract";
  /** Upload timestamp */
  uploadedAt: string;
}

/**
 * Reservation status change history
 */
export interface ReservationStatusHistory {
  /** History entry ID */
  id: number;
  /** Reservation ID */
  reservationId: string;
  /** Status that was set */
  status: ReservationStatus;
  /** Comment about the status change */
  comment?: string;
  /** When the status was changed */
  createdAt: string;
  /** Who made the change */
  changedBy?: {
    id: number;
    name: string;
    role: string;
  };
}

/**
 * Core Reservation interface
 */
export interface Reservation {
  /** Unique reservation identifier (UUID) */
  id: string;
  /** User ID if customer is registered */
  userId?: number;
  /** Service type being booked */
  serviceType: ServiceType;
  /** Current reservation status */
  status: ReservationStatus;
  /** Reservation details */
  details: ReservationDetails;
  /** Preferred date and time */
  preferredDate: string;
  /** Duration in minutes */
  durationMinutes: number;
  /** Total price */
  totalPrice: number;
  /** Pricing breakdown */
  pricing: ServicePricing;
  /** Assigned service provider */
  provider?: ServiceProvider;
  /** Additional notes */
  notes?: string;
  /** Attached files */
  files?: ReservationFile[];
  /** Status history */
  statusHistory?: ReservationStatusHistory[];
  /** When the reservation was created */
  createdAt: string;
  /** When the reservation was last updated */
  updatedAt: string;
  /** Scheduled start time (confirmed) */
  scheduledAt?: string;
  /** When the service was completed */
  completedAt?: string;
  /** Cancellation reason if cancelled */
  cancellationReason?: string;
  /** Cancellation timestamp */
  cancelledAt?: string;
}

/**
 * Reservation summary for listings and dashboards
 */
export interface ReservationSummary {
  /** Reservation ID */
  id: string;
  /** Service type */
  serviceType: ServiceType;
  /** Customer name */
  customerName: string;
  /** Customer email */
  customerEmail: string;
  /** Reservation status */
  status: ReservationStatus;
  /** Preferred date */
  preferredDate: string;
  /** Duration */
  durationMinutes: number;
  /** Total price */
  totalPrice: number;
  /** Creation date */
  createdAt: string;
  /** Provider name */
  providerName?: string;
}

/**
 * Reservation creation input
 */
export interface ReservationInput {
  /** User ID if authenticated */
  userId?: number;
  /** Service type */
  serviceType: ServiceType;
  /** Reservation details */
  details: ReservationDetails;
  /** Preferred date */
  preferredDate: string;
  /** Duration in minutes */
  durationMinutes: number;
  /** Total price */
  totalPrice: number;
  /** Additional notes */
  notes?: string;
  /** Preferred provider ID */
  preferredProviderId?: number;
}

/**
 * Reservation update input
 */
export interface ReservationUpdateInput {
  /** New status */
  status?: ReservationStatus;
  /** Status change comment */
  statusComment?: string;
  /** Updated details */
  details?: Partial<ReservationDetails>;
  /** New preferred date */
  preferredDate?: string;
  /** New duration */
  durationMinutes?: number;
  /** Updated price */
  totalPrice?: number;
  /** Updated notes */
  notes?: string;
  /** Assigned provider */
  providerId?: number;
  /** Scheduled time */
  scheduledAt?: string;
}

/**
 * Service order (simplified version for basic service requests)
 */
export interface ServiceOrder {
  /** Order ID */
  id: number;
  /** User ID */
  userId: number;
  /** Service type */
  serviceType: ServiceType;
  /** Service details */
  details: ServiceDetails;
  /** Estimated price */
  estimatedPrice: number;
  /** Order status */
  status: "pending" | "in_progress" | "completed" | "cancelled";
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Reservation search and filter criteria
 */
export interface ReservationSearchCriteria {
  /** Search query (name, email, ID) */
  query?: string;
  /** Filter by status */
  status?: ReservationStatus[];
  /** Filter by service type */
  serviceType?: ServiceType[];
  /** Filter by date range */
  dateRange?: {
    start: string;
    end: string;
  };
  /** Filter by price range */
  priceRange?: {
    min: number;
    max: number;
  };
  /** Filter by provider */
  providerId?: number;
  /** Filter by user */
  userId?: number;
  /** Sort criteria */
  sortBy?: "newest" | "oldest" | "date" | "price_high" | "price_low" | "status";
  /** Number of results per page */
  limit?: number;
  /** Page offset */
  offset?: number;
}

/**
 * Reservation search results
 */
export interface ReservationSearchResults {
  /** Array of matching reservations */
  reservations: ReservationSummary[];
  /** Total number of matching reservations */
  total: number;
  /** Current page */
  page: number;
  /** Number of results per page */
  limit: number;
  /** Whether there are more results */
  hasMore: boolean;
  /** Search criteria used */
  criteria: ReservationSearchCriteria;
}

/**
 * Reservation analytics and statistics
 */
export interface ReservationAnalytics {
  /** Total number of reservations */
  totalReservations: number;
  /** Reservations by status */
  reservationsByStatus: Record<ReservationStatus, number>;
  /** Reservations by service type */
  reservationsByService: Record<ServiceType, number>;
  /** Total revenue */
  totalRevenue: number;
  /** Average reservation value */
  averageValue: number;
  /** Completion rate */
  completionRate: number;
  /** Cancellation rate */
  cancellationRate: number;
  /** No-show rate */
  noShowRate: number;
  /** Time period for analytics */
  period: {
    start: string;
    end: string;
  };
}

// ================================
// CONSTANTS
// ================================

/** Service type display names */
export const SERVICE_TYPE_NAMES: Record<ServiceType, string> = {
  [ServiceType.MIXING]: "Audio Mixing",
  [ServiceType.MASTERING]: "Audio Mastering",
  [ServiceType.RECORDING]: "Studio Recording",
  [ServiceType.CUSTOM_BEAT]: "Custom Beat Production",
  [ServiceType.CONSULTATION]: "Music Consultation",
  [ServiceType.VOCAL_TUNING]: "Vocal Tuning & Editing",
  [ServiceType.BEAT_LEASING]: "Beat Leasing",
  [ServiceType.GHOST_PRODUCTION]: "Ghost Production",
} as const;

/** Default service durations in minutes */
export const DEFAULT_SERVICE_DURATIONS: Record<ServiceType, number> = {
  [ServiceType.MIXING]: 240, // 4 hours
  [ServiceType.MASTERING]: 120, // 2 hours
  [ServiceType.RECORDING]: 180, // 3 hours
  [ServiceType.CUSTOM_BEAT]: 360, // 6 hours
  [ServiceType.CONSULTATION]: 60, // 1 hour
  [ServiceType.VOCAL_TUNING]: 120, // 2 hours
  [ServiceType.BEAT_LEASING]: 30, // 30 minutes
  [ServiceType.GHOST_PRODUCTION]: 480, // 8 hours
} as const;

/** Base pricing for services (in USD) - aligned with business-logic.ts SERVICE_HOURLY_RATES */
export const BASE_SERVICE_PRICING: Record<ServiceType, number> = {
  [ServiceType.MIXING]: 70, // $70/hour
  [ServiceType.MASTERING]: 50, // $50/hour
  [ServiceType.RECORDING]: 30, // $30/hour
  [ServiceType.CUSTOM_BEAT]: 150, // $150 flat rate
  [ServiceType.CONSULTATION]: 50, // $50/hour
  [ServiceType.VOCAL_TUNING]: 75, // $75/hour
  [ServiceType.BEAT_LEASING]: 29.99, // $29.99 (Basic License price)
  [ServiceType.GHOST_PRODUCTION]: 500, // $500 flat rate
} as const;

/** Reservation status flow - valid transitions */
export const RESERVATION_STATUS_TRANSITIONS: Record<
  ReservationStatus,
  readonly ReservationStatus[]
> = {
  [ReservationStatus.PENDING]: [ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED],
  [ReservationStatus.CONFIRMED]: [
    ReservationStatus.IN_PROGRESS,
    ReservationStatus.RESCHEDULED,
    ReservationStatus.CANCELLED,
    ReservationStatus.NO_SHOW,
  ],
  [ReservationStatus.IN_PROGRESS]: [ReservationStatus.COMPLETED, ReservationStatus.CANCELLED],
  [ReservationStatus.COMPLETED]: [], // Terminal state
  [ReservationStatus.CANCELLED]: [], // Terminal state
  [ReservationStatus.RESCHEDULED]: [ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED],
  [ReservationStatus.NO_SHOW]: [ReservationStatus.RESCHEDULED, ReservationStatus.CANCELLED],
} as const;
