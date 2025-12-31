import { Request, Response, Router } from "express";
import { z } from "zod";
import type { ReservationStatusEnum, ServiceTypeEnum } from "../../shared/schema";
import { ReservationStatus } from "../../shared/schema";
import { centsToDollars } from "../../shared/utils/currency";
import type { CreateReservation } from "../../shared/validation/ReservationValidation";
import {
  CommonParams,
  CreateReservationSchema,
  validateBody,
  validateParams,
} from "../../shared/validation/index";
import { isAuthenticated as requireAuth } from "../auth";
import { logger } from "../lib/logger";
import { createValidationMiddleware as validateRequest } from "../lib/validation";
import { sendMail } from "../services/mail";
import { storage } from "../storage";
import type { User } from "../templates/emailTemplates";
import { sendAdminReservationNotification } from "../templates/emailTemplates";
import { handleRouteError } from "../types/routes";
import { generateICS } from "../utils/calendar";

const router = Router();

// ============================================================================
// Helper Types & Functions - Extracted to reduce cognitive complexity
// ============================================================================

interface ReservationUser {
  id: string;
  clerkId?: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

interface TypedReservationRequest extends Request {
  user?: ReservationUser & Record<string, unknown>;
  body: CreateReservation;
}

interface StatusUpdateRequest extends Request {
  user?: ReservationUser & Record<string, unknown>;
  body: { status: ReservationStatusEnum };
}

/**
 * Get display name for user in emails
 */
function getUserDisplayName(user: ReservationUser): string {
  if (user.username && typeof user.username === "string") {
    return user.username;
  }
  if (user.email && typeof user.email === "string") {
    return user.email;
  }
  return "User";
}

/**
 * Build confirmation email HTML content
 */
function buildConfirmationEmailContent(
  user: ReservationUser,
  reservation: {
    service_type: string;
    preferred_date: string;
    duration_minutes: number;
    total_price: number;
    id: string;
  }
): string {
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

/**
 * Send confirmation email to user (non-blocking)
 */
async function sendConfirmationEmail(
  userEmail: string,
  reservation: {
    service_type: string;
    preferred_date: string;
    duration_minutes: number;
    total_price: number;
    id: string;
  },
  user: ReservationUser
): Promise<void> {
  try {
    // Validate email before attempting to send
    if (!userEmail || userEmail.trim() === "") {
      logger.warn("Cannot send confirmation email: No recipient email provided", {
        reservationId: reservation.id,
      });
      return;
    }

    const emailContent = buildConfirmationEmailContent(user, reservation);
    await sendMail({
      to: userEmail,
      subject: "BroLab Reservation Confirmation",
      html: emailContent,
    });
    logger.info("Confirmation email sent", { reservationId: reservation.id });
  } catch (emailError) {
    logger.error("Failed to send confirmation email", {
      reservationId: reservation.id,
      error: emailError,
    });
  }
}

/**
 * Send admin notification for new reservation (non-blocking)
 */
async function sendAdminNotification(
  user: ReservationUser,
  reservation: {
    service_type: string;
    preferred_date: string;
    duration_minutes: number;
    total_price: number;
    id: string;
    status: string;
    notes?: string | null;
  },
  clientPhone: string,
  notes?: string
): Promise<void> {
  try {
    const fullName =
      user.username || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;

    const adminUser: User = {
      id: user.clerkId || "unknown",
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName,
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
        requirements: notes || reservation.notes || undefined,
      },
    };

    await sendAdminReservationNotification(adminUser, reservationData);
    logger.info("Admin notification sent", { reservationId: reservation.id });
  } catch (adminEmailError) {
    logger.error("Failed to send admin notification", {
      reservationId: reservation.id,
      error: adminEmailError,
    });
  }
}

/**
 * Handle specific reservation creation errors
 */
function handleReservationError(error: unknown, res: Response): boolean {
  if (error instanceof Error) {
    if (error.message.includes("User not found")) {
      res.status(401).json({
        error: "Authentication error: User account not found. Please log out and log back in.",
        code: "USER_NOT_FOUND",
      });
      return true;
    }
    if (error.message.includes("Authentication")) {
      res.status(401).json({
        error: "Authentication failed. Please ensure you are properly logged in.",
        code: "AUTH_FAILED",
      });
      return true;
    }
    if (error.message.includes("clerkId")) {
      res.status(400).json({
        error: "Invalid user session. Please log out and log back in.",
        code: "INVALID_SESSION",
      });
      return true;
    }
  }
  return false;
}

/**
 * Check if user has access to a reservation
 */
function hasReservationAccess(
  reservationUserId: number | null | undefined,
  user: ReservationUser
): boolean {
  if (user.role === "service_role") return true;
  if (reservationUserId == null) return false;
  return reservationUserId === Number.parseInt(user.id, 10);
}

/**
 * Extract user data from authenticated request
 */
function extractUserFromRequest(req: Request): ReservationUser | null {
  const reqWithUser = req as Request & { user?: ReservationUser & Record<string, unknown> };
  const user = reqWithUser.user;
  if (!user) return null;

  return {
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    username: user.username,
    firstName: typeof user.firstName === "string" ? user.firstName : undefined,
    lastName: typeof user.lastName === "string" ? user.lastName : undefined,
    role: user.role,
  };
}

// ============================================================================
// Routes
// ============================================================================

// Public endpoint - Get available services (no auth required)
router.get("/services", async (_req, res) => {
  try {
    const services = [
      {
        id: 1,
        name: "Recording Sessions",
        description: "Professional recording sessions with state-of-the-art equipment",
        basePrice: 150,
        duration: "2-4 hours",
      },
      {
        id: 2,
        name: "Mixing & Mastering",
        description: "Professional mixing and mastering services for your tracks",
        basePrice: 200,
        duration: "3-5 hours",
      },
      {
        id: 3,
        name: "Custom Beats",
        description: "Custom beat production tailored to your style",
        basePrice: 100,
        duration: "1-2 hours",
      },
      {
        id: 4,
        name: "Production Consultation",
        description: "Expert guidance on music production and arrangement",
        basePrice: 75,
        duration: "1 hour",
      },
    ];
    res.json(services);
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to fetch services");
  }
});

// Public endpoint - Get public reservations info (no auth required)
router.get("/public", async (_req, res) => {
  try {
    const publicInfo = {
      availableServices: 4,
      totalReservations: 42,
      availableSlots: 12,
      nextAvailableDate: "2024-01-20",
    };
    res.json(publicInfo);
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to fetch public reservation info");
  }
});

// Create a new reservation - WITH AUTHENTICATION AND VALIDATION
router.post(
  "/",
  requireAuth,
  validateBody(CreateReservationSchema),
  async (req: TypedReservationRequest, res): Promise<void> => {
    try {
      const user = extractUserFromRequest(req);
      if (!user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const body = req.body;

      logger.info("Creating reservation with authentication", {
        userId: user.id,
        serviceType: body.serviceType,
      });

      // Validate that we have the required clerkId
      if (!user.clerkId || typeof user.clerkId !== "string") {
        logger.error("Missing or invalid clerkId in authenticated user", { userId: user.id });
        res.status(400).json({
          error: "Authentication error: Missing user identifier. Please log out and log back in.",
        });
        return;
      }

      // Transform validated data to storage format
      // Map extended service types to base service types for storage compatibility
      const serviceTypeMap: Record<string, ServiceTypeEnum> = {
        mixing: "mixing",
        mastering: "mastering",
        recording: "recording",
        custom_beat: "custom_beat",
        consultation: "consultation",
        vocal_tuning: "mixing", // Map to mixing
        beat_remake: "custom_beat", // Map to custom_beat
        full_production: "recording", // Map to recording
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
          referenceLinks: [],
        },
        preferred_date: body.preferredDate,
        duration_minutes: body.preferredDuration,
        total_price: body.budget || 0,
        notes: body.notes || null,
      };

      logger.info("Creating reservation with data", {
        userId: user.id,
        serviceType: reservationData.service_type,
      });

      // Create the reservation with the authenticated user
      const reservation = await storage.createReservation(reservationData);

      logger.info("Reservation created successfully", {
        reservationId: reservation.id,
        serviceType: reservation.service_type,
        status: reservation.status,
      });

      // Determine the best email to use for confirmation
      // Priority: user.email from auth > clientInfo.email from form
      const confirmationEmail =
        user.email && user.email.trim() !== "" ? user.email : body.clientInfo?.email;

      // Send emails asynchronously (non-blocking)
      if (confirmationEmail) {
        void sendConfirmationEmail(confirmationEmail, reservation, user);
      } else {
        logger.warn("No email available for confirmation - skipping user email", {
          reservationId: reservation.id,
        });
      }
      void sendAdminNotification(user, reservation, body.clientInfo?.phone, body.notes);

      res.status(201).json(reservation);
    } catch (error: unknown) {
      logger.error("Reservation creation failed", { error });

      if (handleReservationError(error, res)) {
        return;
      }

      handleRouteError(error, res, "Failed to create reservation");
    }
  }
);

// Get user's reservations
router.get("/me", requireAuth, async (req, res): Promise<void> => {
  try {
    const user = extractUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const reservations = await storage.getUserReservations(user.id);
    res.json(reservations);
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to fetch user reservations");
  }
});

// Get a specific reservation
router.get(
  "/:id",
  requireAuth,
  validateParams(CommonParams.id),
  async (req, res): Promise<void> => {
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
    } catch (error: unknown) {
      handleRouteError(error, res, "Failed to fetch reservation");
    }
  }
);

// Update reservation status
router.patch(
  "/:id/status",
  requireAuth,
  validateRequest(z.object({ status: z.enum(ReservationStatus) })),
  async (req: StatusUpdateRequest, res): Promise<void> => {
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

      // Send status update email
      const displayName = getUserDisplayName(user);
      const formattedDate = new Date(updatedReservation.preferred_date).toLocaleDateString("fr-FR");
      const formattedTime = new Date(updatedReservation.preferred_date).toLocaleTimeString("fr-FR");

      const statusUpdateContent = `
        <h2>Mise à jour de votre réservation</h2>
        <p>Bonjour ${displayName},</p>
        <p>Le statut de votre réservation pour ${updatedReservation.service_type} a été mis à jour.</p>
        <p><strong>Nouveau statut :</strong> ${body.status}</p>
        <p><strong>Date :</strong> ${formattedDate}</p>
        <p><strong>Heure :</strong> ${formattedTime}</p>
      `;

      await sendMail({
        to: user.email,
        subject: `Mise à jour de votre réservation - ${body.status}`,
        html: statusUpdateContent,
      });

      res.json(updatedReservation);
    } catch (error: unknown) {
      handleRouteError(error, res, "Failed to update reservation status");
    }
  }
);

// Get reservation ICS file
router.get("/:id/calendar", requireAuth, async (req, res): Promise<void> => {
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
      durationMinutes: reservation.duration_minutes,
    });

    res.setHeader("Content-Type", "text/calendar");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="reservation-${reservation.id}.ics"`
    );
    res.send(icsContent);
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to generate calendar file");
  }
});

// Get reservations by date range (admin only)
router.get("/range/:start/:end", requireAuth, async (req, res): Promise<void> => {
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
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to fetch reservations by date range");
  }
});

export default router;
