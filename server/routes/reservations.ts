import type { Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { ReservationStatus } from "../../shared/schema";
import {
  CommonParams,
  CreateReservationSchema,
  validateBody,
  validateParams,
} from "../../shared/validation/index";
import { isAuthenticated as requireAuth } from "../auth";
import { createValidationMiddleware as validateRequest } from "../lib/validation";
import { sendMail } from "../services/mail";
import { storage } from "../storage";
import type { User } from "../templates/emailTemplates";
import { sendAdminReservationNotification } from "../templates/emailTemplates";
import { handleRouteError } from "../types/routes";
import { generateICS } from "../utils/calendar";

const router = Router();

// User type from auth middleware
interface AuthUser {
  id: string;
  clerkId?: string;
  username?: string;
  email: string;
  name?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
}

// Reservation type for email functions
interface ReservationData {
  id: string | number;
  service_type: string;
  preferred_date: string;
  duration_minutes: number;
  total_price: number;
  status: string;
  notes?: string | null;
}

// Helper function to get user display name
function getUserDisplayName(user: AuthUser): string {
  return String(user.username || user.email || "User");
}

// Helper function to send confirmation email
async function sendConfirmationEmail(
  userEmail: string,
  userName: string,
  reservation: ReservationData
): Promise<void> {
  const emailContent = `
    <h2>Reservation Confirmation</h2>
    <p>Hello ${userName},</p>
    <p>We have received your reservation for a ${reservation.service_type} session.</p>
    <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Date:</strong> ${new Date(reservation.preferred_date).toLocaleDateString("en-US")}</p>
      <p><strong>Time:</strong> ${new Date(reservation.preferred_date).toLocaleTimeString("en-US")}</p>
      <p><strong>Duration:</strong> ${reservation.duration_minutes} minutes</p>
      <p><strong>Price:</strong> ${(reservation.total_price / 100).toFixed(2)}</p>
      <p><strong>Reservation Number:</strong> ${reservation.id}</p>
    </div>
    <p>We will contact you shortly to confirm your time slot.</p>
    <p>Thank you for your trust!<br>The BroLab Team</p>
  `;

  await sendMail({
    to: userEmail,
    subject: "BroLab Reservation Confirmation",
    html: emailContent,
  });
}

// Helper function to send admin notification
async function sendAdminNotification(
  user: AuthUser,
  reservation: ReservationData,
  clientInfo: { phone?: string }
): Promise<void> {
  const adminUser: User = {
    id: user.clerkId || "unknown",
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.username || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
  };

  const reservationData = {
    id: reservation.id.toString(),
    serviceType: reservation.service_type,
    preferredDate: reservation.preferred_date,
    durationMinutes: reservation.duration_minutes,
    totalPrice: reservation.total_price / 100,
    status: reservation.status,
    notes: reservation.notes,
    details: {
      name: adminUser.fullName || adminUser.email,
      email: adminUser.email,
      phone: clientInfo?.phone || "Not provided",
      requirements: reservation.notes || undefined,
    },
  };

  await sendAdminReservationNotification(adminUser, reservationData);
}

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
    handleRouteError(
      error instanceof Error ? error : String(error),
      res,
      "Failed to fetch services"
    );
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
    handleRouteError(
      error instanceof Error ? error : String(error),
      res,
      "Failed to fetch public reservation info"
    );
  }
});

// Create a new reservation - WITH AUTHENTICATION AND VALIDATION
router.post(
  "/",
  requireAuth,
  validateBody(CreateReservationSchema),
  async (req, res): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      console.log("🚀 Creating reservation with authentication");
      console.log("👤 Authenticated user:", {
        id: user.id,
        clerkId:
          user.clerkId && typeof user.clerkId === "string"
            ? `${user.clerkId.substring(0, 8)}...`
            : "undefined",
        email: user.email,
      });

      // Validate that we have the required clerkId
      if (!user.clerkId || typeof user.clerkId !== "string") {
        console.error("❌ Missing or invalid clerkId in authenticated user");
        res.status(400).json({
          error: "Authentication error: Missing user identifier. Please log out and log back in.",
        });
        return;
      }

      // Transform validated data to storage format
      const reservationData = {
        user_id: Number.parseInt(user.id),
        clerkId: user.clerkId,
        service_type: req.body.serviceType,
        details: {
          name: `${req.body.clientInfo.firstName} ${req.body.clientInfo.lastName}`.trim(),
          email: req.body.clientInfo.email,
          phone: req.body.clientInfo.phone,
          requirements: req.body.notes || "",
          referenceLinks: [],
        },
        preferred_date: req.body.preferredDate,
        duration_minutes: req.body.preferredDuration,
        total_price: req.body.budget || 0,
        notes: req.body.notes || null,
      };

      const reservation = await storage.createReservation(reservationData);

      console.log("✅ Reservation created successfully:", {
        id: reservation.id,
        serviceType: reservation.service_type,
        status: reservation.status,
      });

      // Send confirmation email
      try {
        await sendConfirmationEmail(user.email, getUserDisplayName(user), reservation);
        console.log("📧 Confirmation email sent successfully");
      } catch (emailError) {
        console.error("⚠️ Failed to send confirmation email:", emailError);
      }

      // Send admin notification
      try {
        await sendAdminNotification(user, reservation, req.body.clientInfo);
        console.log("📧 Admin notification sent successfully");
      } catch (adminEmailError) {
        console.error("⚠️ Failed to send admin notification:", adminEmailError);
      }

      res.status(201).json(reservation);
    } catch (error: unknown) {
      console.error("❌ Reservation creation failed:", error);
      handleReservationError(error, res);
    }
  }
);

// Helper function to handle reservation errors
function handleReservationError(error: unknown, res: Response): void {
  if (!(error instanceof Error)) {
    handleRouteError(String(error), res, "Failed to create reservation");
    return;
  }

  const errorHandlers = [
    {
      keyword: "User not found",
      status: 401,
      code: "USER_NOT_FOUND",
      message: "Authentication error: User account not found. Please log out and log back in.",
    },
    {
      keyword: "Authentication",
      status: 401,
      code: "AUTH_FAILED",
      message: "Authentication failed. Please ensure you are properly logged in.",
    },
    {
      keyword: "clerkId",
      status: 400,
      code: "INVALID_SESSION",
      message: "Invalid user session. Please log out and log back in.",
    },
  ];

  for (const handler of errorHandlers) {
    if (error.message.includes(handler.keyword)) {
      res.status(handler.status).json({
        error: handler.message,
        code: handler.code,
      });
      return;
    }
  }

  handleRouteError(error, res, "Failed to create reservation");
}

// Get user's reservations
router.get("/me", requireAuth, async (req, res): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const reservations = await storage.getUserReservations(user.id);
    res.json(reservations);
  } catch (error: unknown) {
    handleRouteError(
      error instanceof Error ? error : String(error),
      res,
      "Failed to fetch user reservations"
    );
  }
});

// Get a specific reservation
router.get(
  "/:id",
  requireAuth,
  validateParams(CommonParams.id),
  async (req, res): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const reservation = await storage.getReservation(req.params.id);
      if (!reservation) {
        res.status(404).json({ error: "Reservation not found" });
        return;
      }
      if (reservation.user_id !== Number.parseInt(user.id) && user.role !== "service_role") {
        res.status(403).json({ error: "Unauthorized" });
        return;
      }
      res.json(reservation);
    } catch (error: unknown) {
      handleRouteError(
        error instanceof Error ? error : String(error),
        res,
        "Failed to fetch reservation"
      );
    }
  }
);

// Update reservation status
router.patch(
  "/:id/status",
  requireAuth,
  validateRequest(z.object({ status: z.enum(ReservationStatus) })),
  async (req, res): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const reservation = await storage.getReservation(req.params.id);
      if (!reservation) {
        res.status(404).json({ error: "Reservation not found" });
        return;
      }
      if (reservation.user_id !== Number.parseInt(user.id) && user.role !== "service_role") {
        res.status(403).json({ error: "Unauthorized" });
        return;
      }

      const updatedReservation = await storage.updateReservationStatus(
        req.params.id,
        req.body.status
      );

      // Send status update email
      const statusUpdateContent = `
        <h2>Reservation Status Update</h2>
        <p>Hello ${String(user.username)},</p>
        <p>The status of your reservation for ${updatedReservation.service_type} has been updated.</p>
        <p><strong>New Status:</strong> ${req.body.status}</p>
        <p><strong>Date:</strong> ${new Date(updatedReservation.preferred_date).toLocaleDateString("en-US")}</p>
        <p><strong>Time:</strong> ${new Date(updatedReservation.preferred_date).toLocaleTimeString("en-US")}</p>
      `;

      await sendMail({
        to: user.email,
        subject: `Reservation Status Update - ${req.body.status}`,
        html: statusUpdateContent,
      });

      res.json(updatedReservation);
    } catch (error: unknown) {
      handleRouteError(
        error instanceof Error ? error : String(error),
        res,
        "Failed to update reservation status"
      );
    }
  }
);

// Get reservation ICS file
router.get("/:id/calendar", requireAuth, async (req, res): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const reservation = await storage.getReservation(req.params.id);
    if (!reservation) {
      res.status(404).json({ error: "Reservation not found" });
      return;
    }
    if (reservation.user_id !== Number.parseInt(user.id) && user.role !== "service_role") {
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
    handleRouteError(
      error instanceof Error ? error : String(error),
      res,
      "Failed to generate calendar file"
    );
  }
});

// Get reservations by date range (admin only)
router.get("/range/:start/:end", requireAuth, async (req, res): Promise<void> => {
  try {
    const user = req.user;
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
    handleRouteError(
      error instanceof Error ? error : String(error),
      res,
      "Failed to fetch reservations by date range"
    );
  }
});

export default router;
