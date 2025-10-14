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
  async (req, res): Promise<void> => {
    try {
      console.log("🚀 Creating reservation with authentication");
      console.log("👤 Authenticated user:", {
        id: req.user?.id,
        clerkId:
          req.user?.clerkId && typeof req.user.clerkId === "string"
            ? `${req.user.clerkId.substring(0, 8)}...`
            : "undefined",
        email: req.user?.email,
      });
      console.log("📝 Request body:", {
        serviceType: req.body.serviceType,
        preferredDate: req.body.preferredDate,
        clientInfo: req.body.clientInfo,
      });

      // Validate that we have the required clerkId
      if (!req.user?.clerkId || typeof req.user.clerkId !== "string") {
        console.error("❌ Missing or invalid clerkId in authenticated user");
        res.status(400).json({
          error: "Authentication error: Missing user identifier. Please log out and log back in.",
        });
        return;
      }

      // Transform validated data to storage format
      const reservationData = {
        user_id: parseInt(req.user.id),
        clerkId: req.user.clerkId, // Use actual Clerk ID from authenticated user
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

      console.log("🔄 Creating reservation with data:", {
        ...reservationData,
        clerkId:
          typeof reservationData.clerkId === "string"
            ? `${reservationData.clerkId.substring(0, 8)}...`
            : "invalid",
      });

      // Create the reservation with the authenticated user
      const reservation = await storage.createReservation(reservationData);

      console.log("✅ Reservation created successfully:", {
        id: reservation.id,
        serviceType: reservation.service_type,
        status: reservation.status,
      });

      // Send confirmation email
      const emailContent = `
      <h2>Reservation Confirmation</h2>
      <p>Hello ${req.user!.username || req.user!.email || "User"},</p>
      <p>We have received your reservation for a ${reservation.service_type} session.</p>
      <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Date:</strong> ${new Date(reservation.preferred_date).toLocaleDateString("en-US")}</p>
        <p><strong>Time:</strong> ${new Date(reservation.preferred_date).toLocaleTimeString("en-US")}</p>
        <p><strong>Duration:</strong> ${reservation.duration_minutes} minutes</p>
        <p><strong>Price:</strong> $${(reservation.total_price / 100).toFixed(2)}</p>
        <p><strong>Reservation Number:</strong> ${reservation.id}</p>
      </div>
      <p>We will contact you shortly to confirm your time slot.</p>
      <p>Thank you for your trust!<br>The BroLab Team</p>
    `;

      try {
        await sendMail({
          to: req.user!.email,
          subject: "BroLab Reservation Confirmation",
          html: emailContent,
        });
        console.log("📧 Confirmation email sent successfully");
      } catch (emailError) {
        console.error("⚠️ Failed to send confirmation email:", emailError);
        // Don't fail the reservation if email fails
      }

      // Send admin notification for new reservation
      try {
        const user: User = {
          id: req.user!.clerkId || "unknown",
          email: req.user!.email,
          firstName: req.user!.firstName as string | undefined,
          lastName: req.user!.lastName as string | undefined,
          fullName:
            (req.user!.username as string) ||
            `${(req.user!.firstName as string) || ""} ${(req.user!.lastName as string) || ""}`.trim(),
        };

        const reservationData = {
          id: reservation.id.toString(),
          serviceType: reservation.service_type,
          preferredDate: reservation.preferred_date,
          durationMinutes: reservation.duration_minutes,
          totalPrice: reservation.total_price / 100, // Convert from cents
          status: reservation.status,
          notes: reservation.notes,
          details: {
            name: user.fullName || user.email,
            email: user.email,
            phone: req.body.clientInfo?.phone || "Not provided",
            requirements: req.body.notes || reservation.notes,
          },
        };

        await sendAdminReservationNotification(user, reservationData);
        console.log("📧 Admin notification sent successfully");
      } catch (adminEmailError) {
        console.error("⚠️ Failed to send admin notification:", adminEmailError);
        // Don't fail the reservation if admin email fails
      }

      res.status(201).json(reservation);
    } catch (error: unknown) {
      console.error("❌ Reservation creation failed:", error);

      // Enhanced error handling with specific error messages
      if (error instanceof Error) {
        if (error.message.includes("User not found")) {
          res.status(401).json({
            error: "Authentication error: User account not found. Please log out and log back in.",
            code: "USER_NOT_FOUND",
          });
          return;
        }
        if (error.message.includes("Authentication")) {
          res.status(401).json({
            error: "Authentication failed. Please ensure you are properly logged in.",
            code: "AUTH_FAILED",
          });
          return;
        }
        if (error.message.includes("clerkId")) {
          res.status(400).json({
            error: "Invalid user session. Please log out and log back in.",
            code: "INVALID_SESSION",
          });
          return;
        }
      }

      handleRouteError(error, res, "Failed to create reservation");
    }
  }
);

// Get user's reservations
router.get("/me", requireAuth, async (req, res): Promise<void> => {
  try {
    const reservations = await storage.getUserReservations(req.user!.id);
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
      const reservation = await storage.getReservation(req.params.id);
      if (!reservation) {
        res.status(404).json({ error: "Reservation not found" });
        return;
      }
      if (reservation.user_id !== parseInt(req.user!.id) && req.user!.role !== "service_role") {
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
  async (req, res): Promise<void> => {
    try {
      const reservation = await storage.getReservation(req.params.id);
      if (!reservation) {
        res.status(404).json({ error: "Reservation not found" });
        return;
      }
      if (reservation.user_id !== parseInt(req.user!.id) && req.user!.role !== "service_role") {
        res.status(403).json({ error: "Unauthorized" });
        return;
      }

      const updatedReservation = await storage.updateReservationStatus(
        req.params.id,
        req.body.status
      );

      // Send status update email
      const statusUpdateContent = `
        <h2>Mise à jour de votre réservation</h2>
        <p>Bonjour ${req.user!.username},</p>
        <p>Le statut de votre réservation pour ${updatedReservation.service_type} a été mis à jour.</p>
        <p><strong>Nouveau statut :</strong> ${req.body.status}</p>
        <p><strong>Date :</strong> ${new Date(updatedReservation.preferred_date).toLocaleDateString("fr-FR")}</p>
        <p><strong>Heure :</strong> ${new Date(updatedReservation.preferred_date).toLocaleTimeString("fr-FR")}</p>
      `;

      await sendMail({
        to: req.user!.email,
        subject: `Mise à jour de votre réservation - ${req.body.status}`,
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
    const reservation = await storage.getReservation(req.params.id);
    if (!reservation) {
      res.status(404).json({ error: "Reservation not found" });
      return;
    }
    if (reservation.user_id !== parseInt(req.user!.id) && req.user!.role !== "service_role") {
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
    if (req.user!.role !== "service_role") {
      res.status(403).json({ error: "Unauthorized. Admin access required." });
      return;
    }
    const startDate = new Date(req.params.start);
    const endDate = new Date(req.params.end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
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
