import { Router } from "express";
import { z } from "zod";
import { ReservationStatus } from "../../shared/schema";
import {
  CommonParams,
  CreateReservationSchema,
  createApiError,
  validateBody,
  validateParams,
} from "../../shared/validation/index";
import { isAuthenticated as requireAuth } from "../auth";
import { createValidationMiddleware as validateRequest } from "../lib/validation";
import { sendMail } from "../services/mail";
import { storage } from "../storage";
import { generateICS } from "../utils/calendar";

const router = Router();

// Create a new reservation - AVEC AUTHENTIFICATION ET VALIDATION
router.post("/", requireAuth, validateBody(CreateReservationSchema), async (req, res): Promise<void> => {
  try {
    console.log("🚀 Creating reservation with authentication");
    console.log("👤 Authenticated user:", req.user);
    console.log("📝 Request body:", req.body);

    // Créer la réservation avec l'utilisateur authentifié
    const reservation = await storage.createReservation({
      ...req.body,
      user_id: req.user!.id,
    });

    console.log("✅ Reservation created successfully:", reservation);

    // Envoyer l'email de confirmation
    const emailContent = `
      <h2>Confirmation de votre réservation</h2>
      <p>Bonjour ${req.user!.username},</p>
      <p>Nous avons bien reçu votre réservation pour une session ${reservation.service_type}.</p>
      <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Date :</strong> ${new Date(reservation.preferred_date).toLocaleDateString("fr-FR")}</p>
        <p><strong>Heure :</strong> ${new Date(reservation.preferred_date).toLocaleTimeString("fr-FR")}</p>
        <p><strong>Durée :</strong> ${reservation.duration_minutes} minutes</p>
        <p><strong>Prix :</strong> ${(reservation.total_price / 100).toFixed(2)}€</p>
        <p><strong>Numéro de réservation :</strong> ${reservation.id}</p>
      </div>
      <p>Nous vous contacterons prochainement pour confirmer votre créneau.</p>
      <p>Merci de votre confiance !<br>L'équipe BroLab</p>
    `;

    try {
      await sendMail({
        to: req.user!.email,
        subject: "Confirmation de votre réservation BroLab",
        html: emailContent,
      });
      console.log("📧 Confirmation email sent successfully");
    } catch (emailError) {
      console.error("⚠️ Failed to send confirmation email:", emailError);
      // Ne pas faire échouer la réservation si l'email échoue
    }

    res.status(201).json(reservation);
  } catch (error: unknown) {
    console.error("❌ Error creating reservation:", error);
    const requestId = (req as { requestId?: string }).requestId || `req_${Date.now()}`;

    const errorResponse = createApiError("reservation_conflict", "Failed to create reservation", {
      userMessage: "Unable to create your reservation. Please try again or contact support.",
      requestId,
    });

    res.status(500).json(errorResponse);
  }
});

// Get user's reservations
router.get("/me", requireAuth, async (req, res): Promise<void> => {
  try {
    const reservations = await storage.getUserReservations(req.user!.id);
    res.json(reservations);
  } catch (error: unknown) {
    console.error("Error fetching user reservations:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch reservations";
    res.status(500).json({ error: errorMessage });
  }
});

// Get a specific reservation
router.get("/:id", requireAuth, validateParams(CommonParams.id), async (req, res): Promise<void> => {
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
    console.error("Error fetching reservation:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch reservation";
    res.status(500).json({ error: errorMessage });
  }
});

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
      console.error("Error updating reservation status:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update reservation status";
      res.status(500).json({ error: errorMessage });
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
    console.error("Error generating calendar file:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate calendar file";
    res.status(500).json({ error: errorMessage });
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
    console.error("Error fetching reservations by date range:", error);
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : "Failed to fetch reservations" });
  }
});

export default router;
