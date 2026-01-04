import { z } from "zod";

// ================================
// RESERVATION VALIDATION SCHEMAS
// ================================

/**
 * Service type validation for BroLab Entertainment
 */
export const ServiceType = z.enum([
  "mixing",
  "mastering",
  "recording",
  "custom_beat",
  "consultation",
  "vocal_tuning",
  "beat_remake",
  "full_production",
]);

/**
 * Reservation status validation
 */
export const ReservationStatus = z.enum([
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
  "rescheduled",
]);

/**
 * Priority level validation
 */
export const PriorityLevel = z.enum(["standard", "priority", "rush", "emergency"]);

/**
 * Studio room validation
 */
export const StudioRoom = z.enum([
  "studio_a",
  "studio_b",
  "vocal_booth_1",
  "vocal_booth_2",
  "mixing_room",
  "mastering_suite",
  "remote", // For online services
]);

/**
 * Equipment requirements validation
 */
export const EquipmentRequirementsSchema = z.object({
  microphones: z.array(z.string()).optional(),
  instruments: z.array(z.string()).optional(),
  software: z.array(z.string()).optional(),
  specialRequests: z.string().max(500).optional(),
});

/**
 * Service details validation (varies by service type)
 */
export const ServiceDetailsSchema = z.object({
  // Recording details
  trackCount: z.number().min(1).max(100).optional(),
  estimatedDuration: z.number().min(30).max(480).optional(), // 30 minutes to 8 hours

  // Mixing/Mastering details
  stemCount: z.number().min(1).max(50).optional(),
  referenceTrack: z.string().url().optional(),
  targetLoudness: z.number().optional(),

  // Beat production details
  genre: z.string().max(50).optional(),
  bpm: z.number().min(60).max(200).optional(),
  key: z.string().max(10).optional(),
  mood: z.string().max(50).optional(),

  // File requirements
  deliveryFormat: z.enum(["wav", "mp3", "aiff", "flac"]).optional(),
  bitRate: z.enum(["16bit", "24bit", "32bit"]).optional(),
  sampleRate: z.enum(["44100", "48000", "96000", "192000"]).optional(),

  // Additional services
  includeStems: z.boolean().default(false),
  includeRevisions: z.number().min(0).max(5).default(2),
  rushDelivery: z.boolean().default(false),
});

/**
 * Client information validation
 */
export const ClientInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone number is required").max(20),

  // Professional details
  artistName: z.string().max(100).optional(),
  recordLabel: z.string().max(100).optional(),
  website: z.string().url().optional(),

  // Experience level
  experienceLevel: z.enum(["beginner", "intermediate", "advanced", "professional"]).optional(),

  // Previous client
  isPreviousClient: z.boolean().default(false),
  referralSource: z.string().max(100).optional(),
});

/**
 * Pricing information validation
 */
export const PricingInfoSchema = z.object({
  basePrice: z.number().min(0), // in cents
  additionalFees: z
    .array(
      z.object({
        name: z.string().max(100),
        amount: z.number().min(0),
        description: z.string().max(200).optional(),
      })
    )
    .default([]),

  discounts: z
    .array(
      z.object({
        name: z.string().max(100),
        amount: z.number().min(0),
        type: z.enum(["fixed", "percentage"]),
        description: z.string().max(200).optional(),
      })
    )
    .default([]),

  totalPrice: z.number().min(0), // in cents
  currency: z.enum(["USD", "EUR", "GBP", "CAD"]).default("USD"),

  // Payment terms
  depositRequired: z.boolean().default(false),
  depositAmount: z.number().min(0).optional(),
  paymentDueDate: z.string().datetime().optional(),
});

/**
 * Time slot validation
 */
export const TimeSlotSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  duration: z.number().min(30).max(480), // 30 minutes to 8 hours in minutes

  // Timezone handling
  timezone: z.string().default("UTC"),

  // Buffer time
  setupTime: z.number().min(0).max(60).default(15), // Setup time in minutes
  teardownTime: z.number().min(0).max(30).default(15), // Teardown time in minutes
});

/**
 * Complete reservation validation schema
 */
export const ReservationSchema = z.object({
  id: z.string().optional(),

  // Service information
  serviceType: ServiceType,
  status: ReservationStatus.default("pending"),
  priority: PriorityLevel.default("standard"),

  // Client information
  userId: z.string().optional(), // If user is registered
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
  notes: z.string().max(2000).optional(),
  internalNotes: z.string().max(1000).optional(), // Staff only

  // Files and attachments
  attachments: z
    .array(
      z.object({
        name: z.string().max(255),
        url: z.string().url(),
        type: z.enum(["audio", "document", "image", "other"]),
        size: z.number().positive(),
      })
    )
    .optional(),

  // Assignment
  assignedEngineer: z.string().max(100).optional(),
  assignedProducer: z.string().max(100).optional(),

  // Completion tracking
  deliverables: z
    .array(
      z.object({
        name: z.string().max(200),
        description: z.string().max(500).optional(),
        fileUrl: z.string().url().optional(),
        completedAt: z.string().datetime().optional(),
      })
    )
    .default([]),

  // Timestamps
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  confirmedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),

  // Metadata
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Reservation creation validation
 */
export const CreateReservationSchema = z.object({
  serviceType: ServiceType,

  // Client information
  clientInfo: z.object({
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    email: z.string().email(),
    phone: z.string().min(10).max(20),
    artistName: z.string().max(100).optional(),
    experienceLevel: z.enum(["beginner", "intermediate", "advanced", "professional"]).optional(),
    referralSource: z.string().max(100).optional(),
  }),

  // Preferred scheduling
  preferredDate: z.string().datetime(),
  preferredDuration: z.number().min(30).max(480),
  alternativeDates: z.array(z.string().datetime()).max(3).optional(),

  // Service requirements
  serviceDetails: z
    .object({
      trackCount: z.number().min(1).max(100).optional(),
      genre: z.string().max(50).optional(),
      bpm: z.number().min(60).max(200).optional(),
      deliveryFormat: z.enum(["wav", "mp3", "aiff", "flac"]).optional(),
      includeRevisions: z.number().min(0).max(5).default(2),
      rushDelivery: z.boolean().default(false),
    })
    .optional(),

  // Additional information
  notes: z.string().max(2000).optional(),
  budget: z.number().min(0).optional(), // in cents

  // Terms acceptance
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions",
  }),
});

/**
 * Reservation update validation
 */
export const UpdateReservationSchema = z.object({
  id: z.string().min(1, "Reservation ID is required"),

  status: ReservationStatus.optional(),
  timeSlot: TimeSlotSchema.optional(),
  studioRoom: StudioRoom.optional(),
  serviceDetails: ServiceDetailsSchema.optional(),
  notes: z.string().max(2000).optional(),
  internalNotes: z.string().max(1000).optional(),
  assignedEngineer: z.string().max(100).optional(),
  assignedProducer: z.string().max(100).optional(),
});

/**
 * Reservation filter validation for queries
 */
export const ReservationFilterSchema = z.object({
  serviceType: ServiceType.optional(),
  status: ReservationStatus.optional(),
  priority: PriorityLevel.optional(),
  studioRoom: StudioRoom.optional(),

  // Date range filters
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),

  // Assignment filters
  assignedEngineer: z.string().optional(),
  assignedProducer: z.string().optional(),

  // Client filters
  clientEmail: z.string().email().optional(),
  clientName: z.string().optional(),

  // Search
  search: z.string().max(100).optional(),

  // Pagination
  page: z.number().positive().default(1),
  limit: z.number().min(1).max(100).default(20),

  // Sorting
  sortBy: z.enum(["created_at", "start_time", "status", "service_type"]).default("start_time"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

/**
 * Availability check validation
 */
export const AvailabilityCheckSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  serviceType: ServiceType,
  studioRoom: StudioRoom.optional(),
  excludeReservationId: z.string().optional(), // For rescheduling
});

/**
 * Reschedule request validation
 */
export const RescheduleRequestSchema = z.object({
  reservationId: z.string().min(1, "Reservation ID is required"),
  newStartTime: z.string().datetime(),
  newDuration: z.number().min(30).max(480),
  reason: z.string().max(500).optional(),
  notifyClient: z.boolean().default(true),
});

// ================================
// VALIDATION UTILITIES
// ================================

/**
 * Validate reservation time slot
 */
export const validateTimeSlot = (
  startTime: string,
  duration: number,
  serviceType: string
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const start = new Date(startTime);
  const end = new Date(start.getTime() + duration * 60000);
  const now = new Date();

  // Must be in the future
  if (start <= now) {
    errors.push("Reservation must be scheduled for a future time");
  }

  // Business hours check (9 AM - 10 PM)
  const startHour = start.getHours();
  const endHour = end.getHours();

  if (startHour < 9 || startHour > 22) {
    errors.push("Reservations must start between 9 AM and 10 PM");
  }

  if (endHour > 22 || (endHour === 22 && end.getMinutes() > 0)) {
    errors.push("Reservations must end by 10 PM");
  }

  // Service-specific duration limits
  const durationLimits: Record<string, { min: number; max: number }> = {
    consultation: { min: 30, max: 120 },
    mixing: { min: 60, max: 480 },
    mastering: { min: 30, max: 240 },
    recording: { min: 120, max: 480 },
    custom_beat: { min: 60, max: 360 },
    vocal_tuning: { min: 30, max: 180 },
  };

  const limits = durationLimits[serviceType];
  if (limits) {
    if (duration < limits.min) {
      errors.push(`Minimum duration for ${serviceType} is ${limits.min} minutes`);
    }
    if (duration > limits.max) {
      errors.push(`Maximum duration for ${serviceType} is ${limits.max} minutes`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate service pricing
 */
export const validateServicePricing = (
  serviceType: string,
  duration: number,
  additionalServices: string[] = []
): number => {
  // Base pricing in cents - aligned with business-logic.ts SERVICE_HOURLY_RATES
  const basePricing: Record<string, number> = {
    consultation: 5000, // $50/hour (aligned with business-logic.ts)
    mixing: 7000, // $70/hour
    mastering: 5000, // $50/hour
    recording: 3000, // $30/hour
    custom_beat: 15000, // $150 flat rate
    vocal_tuning: 7500, // $75/hour
    beat_remake: 35000, // $350 flat rate
    full_production: 15000, // $150 flat rate
  };

  const hourlyRate = basePricing[serviceType] || 10000;
  const hours = duration / 60;

  let totalPrice = Math.ceil(hourlyRate * hours);

  // Additional service fees
  const additionalFees: Record<string, number> = {
    rush_delivery: 5000, // $50
    include_stems: 2500, // $25
    extra_revisions: 1500, // $15 per revision
    weekend_booking: 2500, // $25
  };

  additionalServices.forEach(service => {
    totalPrice += additionalFees[service] || 0;
  });

  return totalPrice;
};

/**
 * Validate studio room availability
 */
export const validateRoomForService = (serviceType: string, studioRoom: string): boolean => {
  const roomCapabilities: Record<string, string[]> = {
    studio_a: ["recording", "mixing", "full_production"],
    studio_b: ["recording", "mixing", "custom_beat"],
    vocal_booth_1: ["recording", "vocal_tuning"],
    vocal_booth_2: ["recording", "vocal_tuning"],
    mixing_room: ["mixing", "mastering", "custom_beat"],
    mastering_suite: ["mastering"],
    remote: ["consultation", "mixing", "mastering", "custom_beat"],
  };

  const capabilities = roomCapabilities[studioRoom];
  return capabilities ? capabilities.includes(serviceType) : false;
};

// ================================
// TYPE EXPORTS
// ================================

export type Reservation = z.infer<typeof ReservationSchema>;
export type CreateReservation = z.infer<typeof CreateReservationSchema>;
export type UpdateReservation = z.infer<typeof UpdateReservationSchema>;
export type ReservationFilter = z.infer<typeof ReservationFilterSchema>;
export type AvailabilityCheck = z.infer<typeof AvailabilityCheckSchema>;
export type RescheduleRequest = z.infer<typeof RescheduleRequestSchema>;
export type TimeSlot = z.infer<typeof TimeSlotSchema>;
export type ServiceDetails = z.infer<typeof ServiceDetailsSchema>;
export type ClientInfo = z.infer<typeof ClientInfoSchema>;
export type PricingInfo = z.infer<typeof PricingInfoSchema>;
export type EquipmentRequirements = z.infer<typeof EquipmentRequirementsSchema>;

export type ServiceTypeType = z.infer<typeof ServiceType>;
export type ReservationStatusType = z.infer<typeof ReservationStatus>;
export type PriorityLevelType = z.infer<typeof PriorityLevel>;
export type StudioRoomType = z.infer<typeof StudioRoom>;
