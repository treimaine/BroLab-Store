/**
 * Convex Reservation Document Type Definitions
 *
 * This module contains type definitions for reservation documents as stored in Convex,
 * matching the schema definition in convex/schema.ts
 */

import { Id } from "../../convex/_generated/dataModel";

/**
 * Budget range for reservations
 */
export interface ConvexReservationBudget {
  min: number;
  max: number;
  currency: string;
}

/**
 * Reservation details as stored in Convex
 */
export interface ConvexReservationDetails {
  name: string;
  email: string;
  phone: string;
  requirements?: string;
  referenceLinks?: string[];
  projectDescription?: string;
  deadline?: string;
  budget?: ConvexReservationBudget;
  additionalServices?: string[];
  communicationPreference?: "email" | "phone" | "video";
}

/**
 * Convex reservation document structure
 * This matches the schema definition in convex/schema.ts
 */
export interface ConvexReservationDocument {
  _id: Id<"reservations">;
  _creationTime: number;
  userId?: Id<"users">;
  serviceType: string;
  status: string;
  details: ConvexReservationDetails;
  preferredDate: string;
  durationMinutes: number;
  totalPrice: number;
  notes?: string;
  assignedTo?: Id<"users">;
  priority?: string;
  completedAt?: number;
  cancelledAt?: number;
  cancellationReason?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Type guard to check if an object is a ConvexReservationDocument
 */
export function isConvexReservationDocument(obj: unknown): obj is ConvexReservationDocument {
  if (!obj || typeof obj !== "object") return false;

  const reservation = obj as Record<string, unknown>;

  return (
    typeof reservation._id === "string" &&
    typeof reservation.serviceType === "string" &&
    typeof reservation.status === "string" &&
    typeof reservation.details === "object" &&
    reservation.details !== null &&
    typeof reservation.preferredDate === "string" &&
    typeof reservation.durationMinutes === "number" &&
    typeof reservation.totalPrice === "number" &&
    typeof reservation.createdAt === "number" &&
    typeof reservation.updatedAt === "number"
  );
}

/**
 * Convert ConvexReservationDocument to ReservationEmailData format
 */
export function convertToReservationEmailData(reservation: ConvexReservationDocument): {
  id: string;
  serviceType: string;
  preferredDate: string;
  durationMinutes: number;
  totalPrice: number;
  status: string;
  notes?: string | null;
  details: {
    name?: string;
    email?: string;
    phone?: string;
    requirements?: string;
  };
} {
  return {
    id: reservation._id,
    serviceType: reservation.serviceType,
    preferredDate: reservation.preferredDate,
    durationMinutes: reservation.durationMinutes,
    totalPrice: reservation.totalPrice,
    status: reservation.status,
    notes: reservation.notes || null,
    details: {
      name: reservation.details.name,
      email: reservation.details.email,
      phone: reservation.details.phone,
      requirements: reservation.details.requirements,
    },
  };
}
