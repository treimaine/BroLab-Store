import { Router } from "express";
import { z } from "zod";
import { ReservationStatus } from "../../shared/schema";
import { isAuthenticated as requireAuth } from "../auth";
import { createValidationMiddleware as validateRequest } from "../lib/validation";
import { sendMail } from "../services/mail";
import { storage } from "../storage";
import { generateICS } from "../utils/calendar";

const router = Router();

// Create a new reservation - TEMPORAIREMENT SANS AUTHENTIFICATION ET SANS VALIDATION
router.post("/", async (req, res) => {
  try {
    // TEMPORAIRE: Générer un ID unique pour la réservation sans authentification
    const tempUserId = Math.floor(Math.random() * 1000000) + 1000000; // ID numérique temporaire
    const tempReservationId = `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log("🔧 Creating reservation without authentication and validation (temporary)");
    console.log("🔧 Request body:", req.body);
    console.log("🔧 Generated temp user ID:", tempUserId);
    console.log("🔧 Generated temp reservation ID:", tempReservationId);

    // TEMPORAIRE: Créer une réservation en mémoire au lieu d'utiliser la base de données
    const tempReservation = {
      id: tempReservationId,
      service_type: req.body.service_type || "mixing",
      details: {
        name: req.body.details?.name || "Test User",
        email: req.body.details?.email || "test@example.com",
        phone: req.body.details?.phone || "+33123456789",
        requirements: req.body.details?.requirements || "Test requirements",
        reference_links: req.body.details?.reference_links || [],
        trackCount: req.body.details?.trackCount || "1",
        genre: req.body.details?.genre || "Hip-Hop",
        specialRequests: req.body.details?.specialRequests || "",
      },
      preferred_date: req.body.preferred_date || new Date().toISOString(),
      duration_minutes: req.body.duration_minutes || 120,
      total_price: req.body.total_price || 7000,
      user_id: tempUserId,
      status: "pending",
      notes: req.body.notes || "Test reservation",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("✅ Temporary reservation created successfully:", tempReservation);

    // TEMPORAIRE: Pas d'email pour l'instant
    console.log("🔧 Skipping email confirmation (temporary mode)");

    res.status(201).json(tempReservation);
  } catch (error: any) {
    console.error("❌ Error creating reservation:", error);
    res.status(500).json({ error: error.message || "Failed to create reservation" });
  }
});

// Get user's reservations
router.get("/me", requireAuth, async (req, res) => {
  try {
    const reservations = await storage.getUserReservations(req.user!.id);
    res.json(reservations);
  } catch (error: any) {
    console.error("Error fetching user reservations:", error);
    res.status(500).json({ error: error.message || "Failed to fetch reservations" });
  }
});

// Get a specific reservation
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const reservation = await storage.getReservation(req.params.id);
    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }
    if (reservation.user_id !== req.user!.id && req.user!.role !== "service_role") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    res.json(reservation);
  } catch (error: any) {
    console.error("Error fetching reservation:", error);
    res.status(500).json({ error: error.message || "Failed to fetch reservation" });
  }
});

// Update reservation status
router.patch(
  "/:id/status",
  requireAuth,
  validateRequest(z.object({ status: z.enum(ReservationStatus) })),
  async (req, res) => {
    try {
      const reservation = await storage.getReservation(req.params.id);
      if (!reservation) {
        return res.status(404).json({ error: "Reservation not found" });
      }
      if (reservation.user_id !== req.user!.id && req.user!.role !== "service_role") {
        return res.status(403).json({ error: "Unauthorized" });
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
    } catch (error: any) {
      console.error("Error updating reservation status:", error);
      res.status(500).json({ error: error.message || "Failed to update reservation status" });
    }
  }
);

// Get reservation ICS file
router.get("/:id/calendar", requireAuth, async (req, res) => {
  try {
    const reservation = await storage.getReservation(req.params.id);
    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }
    if (reservation.user_id !== req.user!.id && req.user!.role !== "service_role") {
      return res.status(403).json({ error: "Unauthorized" });
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
  } catch (error: any) {
    console.error("Error generating calendar file:", error);
    res.status(500).json({ error: error.message || "Failed to generate calendar file" });
  }
});

// Get reservations by date range (admin only)
router.get("/range/:start/:end", requireAuth, async (req, res) => {
  try {
    if (req.user!.role !== "service_role") {
      return res.status(403).json({ error: "Unauthorized. Admin access required." });
    }
    const startDate = new Date(req.params.start);
    const endDate = new Date(req.params.end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    const reservations = await storage.getReservationsByDateRange(
      startDate.toISOString(),
      endDate.toISOString()
    );
    res.json(reservations);
  } catch (error: any) {
    console.error("Error fetching reservations by date range:", error);
    res.status(500).json({ error: error.message || "Failed to fetch reservations" });
  }
});

export default router;
