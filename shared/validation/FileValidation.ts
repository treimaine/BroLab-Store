/**
 * File Validation Schemas
 *
 * Centralized validation for file uploads, filters, and custom beat files.
 *
 * @module shared/validation/FileValidation
 */

import { z } from "zod";
import { validatePhoneNumber } from "./validators";

// ================================
// FILE UPLOAD SCHEMAS
// ================================

/**
 * Basic file upload validation
 */
export const fileUploadValidation = z.object({
  name: z.string().min(1, "Filename is required"),
  size: z.number().max(50 * 1024 * 1024, "File size exceeds 50MB limit"),
  type: z.string().min(1, "File type is required"),
  lastModified: z.number().optional(),
});

/**
 * File filter validation for beat browsing
 */
export const fileFilterValidation = z.object({
  genre: z.string().optional(),
  bpm: z
    .object({
      min: z.number().min(60).max(200),
      max: z.number().min(60).max(200),
    })
    .optional(),
  key: z.string().optional(),
  mood: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// ================================
// SERVICE ORDER SCHEMAS
// ================================

/**
 * Service order validation
 */
export const serviceOrderValidation = z.object({
  service_type: z.enum(["mixing", "mastering", "recording", "consultation"]),
  details: z.string().min(10, "Details must be at least 10 characters"),
  budget: z.number().min(50, "Minimum budget is $50"),
  deadline: z.string().datetime("Invalid deadline format"),
  contact_email: z.string().email("Invalid email address"),
  contact_phone: z.string().optional(),
});

// ================================
// MIXING & MASTERING SCHEMAS
// ================================

/**
 * Mixing & Mastering form validation schema
 */
export const mixingMasteringFormSchema = z.object({
  // Personal Information
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),

  email: z.string().email("Please enter a valid email address").max(255, "Email is too long"),

  phone: z.string().refine(phone => !phone || validatePhoneNumber(phone), {
    message: "Please enter a valid phone number",
  }),

  // Booking Details
  preferredDate: z
    .string()
    .min(1, "Please select a preferred date")
    .refine(
      date => {
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return selectedDate >= today;
      },
      {
        message: "Preferred date must be today or in the future",
      }
    ),

  timeSlot: z
    .string()
    .min(1, "Please select a time slot")
    .refine(
      slot => {
        const validSlots = [
          "9:00 AM",
          "10:00 AM",
          "11:00 AM",
          "1:00 PM",
          "2:00 PM",
          "3:00 PM",
          "4:00 PM",
        ];
        return validSlots.includes(slot);
      },
      {
        message: "Please select a valid time slot",
      }
    ),

  // Project Details
  projectDetails: z
    .string()
    .min(20, "Project details must be at least 20 characters")
    .max(2000, "Project details must be less than 2000 characters"),

  trackCount: z
    .string()
    .optional()
    .refine(count => !count || (Number.parseInt(count) >= 1 && Number.parseInt(count) <= 100), {
      message: "Track count must be between 1 and 100",
    }),

  genre: z.string().optional(),

  reference: z
    .string()
    .optional()
    .refine(ref => !ref || ref.length <= 500, {
      message: "Reference must be less than 500 characters",
    }),

  specialRequests: z
    .string()
    .optional()
    .refine(req => !req || req.length <= 1000, {
      message: "Special requests must be less than 1000 characters",
    }),
});

/**
 * Service selection validation
 */
export const serviceSelectionSchema = z.object({
  selectedService: z.enum(["mixing", "mastering", "mixing-mastering"], {
    errorMap: () => ({ message: "Please select a valid service" }),
  }),
});

/**
 * Combined form validation for submission
 */
export const mixingMasteringSubmissionSchema =
  mixingMasteringFormSchema.merge(serviceSelectionSchema);

// ================================
// CUSTOM BEAT REQUEST SCHEMAS
// ================================

/**
 * Custom Beat Request validation schema
 */
export const customBeatRequestSchema = z.object({
  // Basic beat specifications
  genre: z.string().min(1, "Genre is required"),
  subGenre: z.string().optional(),
  bpm: z.number().min(60, "BPM must be at least 60").max(200, "BPM must be at most 200"),
  key: z.string().min(1, "Key is required"),

  // Creative specifications
  mood: z.array(z.string()).min(1, "At least one mood is required"),
  instruments: z.array(z.string()).optional(),
  duration: z
    .number()
    .min(60, "Duration must be at least 60 seconds")
    .max(600, "Duration must be at most 10 minutes"),

  // Project details
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(2000, "Description must be less than 2000 characters"),
  referenceTrack: z.string().optional(),

  // Business details
  budget: z.number().min(50, "Minimum budget is $50").max(1000, "Maximum budget is $1000"),
  deadline: z
    .string()
    .optional()
    .refine(
      date => {
        if (!date) return true;
        const deadlineDate = new Date(date);
        const minDate = new Date();
        minDate.setDate(minDate.getDate() + 1);
        return deadlineDate >= minDate;
      },
      {
        message: "Deadline must be at least 1 day from today",
      }
    ),

  revisions: z.number().min(0).max(5, "Maximum 5 revisions allowed"),
  priority: z.enum(["standard", "priority", "express"]),
  additionalNotes: z
    .string()
    .max(1000, "Additional notes must be less than 1000 characters")
    .optional(),

  // File uploads
  uploadedFiles: z
    .array(
      z.object({
        name: z.string(),
        size: z.number().max(100 * 1024 * 1024, "Individual files must be under 100MB"),
        type: z.string(),
        lastModified: z.number().optional(),
      })
    )
    .optional()
    .refine(
      files => {
        if (!files) return true;
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        return totalSize <= 200 * 1024 * 1024; // 200MB total
      },
      {
        message: "Total file size must be under 200MB",
      }
    )
    .refine(
      files => {
        if (!files) return true;
        const fileNames = files.map(f => f.name.toLowerCase());
        const uniqueNames = new Set(fileNames);
        return uniqueNames.size === fileNames.length;
      },
      {
        message: "Duplicate file names are not allowed",
      }
    ),
});

/**
 * Enhanced file upload validation for custom beats
 */
export const customBeatFileValidation = z.object({
  name: z
    .string()
    .min(1, "Filename is required")
    .refine(
      name => {
        const lowerName = name.toLowerCase();
        const audioExtensions = [".mp3", ".wav", ".aiff", ".flac", ".m4a"];
        const archiveExtensions = [".zip", ".rar", ".7z"];
        const isAudio = audioExtensions.some(ext => lowerName.endsWith(ext));
        const isArchive = archiveExtensions.some(ext => lowerName.endsWith(ext));
        return isAudio || isArchive;
      },
      {
        message: "File must be an audio file or compressed archive",
      }
    ),
  size: z.number().max(100 * 1024 * 1024, "File size exceeds 100MB limit"),
  type: z.string().min(1, "File type is required"),
  lastModified: z.number().optional(),
});

// ================================
// TYPE EXPORTS
// ================================

export type FileUploadInput = z.infer<typeof fileUploadValidation>;
export type FileFilterInput = z.infer<typeof fileFilterValidation>;
export type ServiceOrderInput = z.infer<typeof serviceOrderValidation>;
export type MixingMasteringFormInput = z.infer<typeof mixingMasteringFormSchema>;
export type ServiceSelectionInput = z.infer<typeof serviceSelectionSchema>;
export type MixingMasteringSubmissionInput = z.infer<typeof mixingMasteringSubmissionSchema>;
export type CustomBeatRequestInput = z.infer<typeof customBeatRequestSchema>;
export type CustomBeatFileInput = z.infer<typeof customBeatFileValidation>;
