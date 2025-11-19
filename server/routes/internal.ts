import { Request, Response, Router } from "express";
import {
  sendAdminReservationNotification,
  sendPaymentConfirmationEmail,
  sendReservationReminderEmail,
  sendReservationStatusUpdateEmail,
  type ReservationEmailData,
  type User,
} from "../templates/emailTemplates";
import { handleRouteError } from "../types/routes";

const router = Router();

// Middleware to validate internal API key
const validateInternalApiKey = (req: Request, res: Response, next: () => void): void => {
  const authHeader = req.headers.authorization;
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) {
    console.error("INTERNAL_API_KEY not configured");
    res.status(500).json({ error: "Internal API key not configured" });
    return;
  }

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const providedKey = authHeader.substring(7); // Remove "Bearer " prefix
  if (providedKey !== expectedKey) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  next();
};

// Send reservation status update email
router.post(
  "/send-reservation-status-email",
  validateInternalApiKey,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userEmail, reservation, oldStatus, newStatus } = req.body;

      if (!userEmail || !reservation || !oldStatus || !newStatus) {
        res.status(400).json({
          error: "Missing required fields: userEmail, reservation, oldStatus, newStatus",
        });
        return;
      }

      const reservationData: ReservationEmailData = {
        id: reservation.id,
        serviceType: reservation.serviceType,
        preferredDate: reservation.preferredDate,
        durationMinutes: reservation.durationMinutes,
        totalPrice: reservation.totalPrice,
        status: reservation.status,
        notes: reservation.notes,
        details: reservation.details,
      };

      await sendReservationStatusUpdateEmail(userEmail, reservationData, oldStatus, newStatus);

      res.json({ success: true, message: "Status update email sent successfully" });
    } catch (error: unknown) {
      handleRouteError(error, res, "Failed to send reservation status update email");
    }
  }
);

// Send admin notification for new reservation
router.post(
  "/send-admin-notification",
  validateInternalApiKey,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { user, reservation } = req.body;

      if (!user || !reservation) {
        res.status(400).json({
          error: "Missing required fields: user, reservation",
        });
        return;
      }

      const userData: User = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
      };

      const reservationData: ReservationEmailData = {
        id: reservation.id,
        serviceType: reservation.serviceType,
        preferredDate: reservation.preferredDate,
        durationMinutes: reservation.durationMinutes,
        totalPrice: reservation.totalPrice,
        status: reservation.status,
        notes: reservation.notes,
        details: reservation.details,
      };

      await sendAdminReservationNotification(userData, reservationData);

      res.json({ success: true, message: "Admin notification sent successfully" });
    } catch (error: unknown) {
      handleRouteError(error, res, "Failed to send admin notification");
    }
  }
);

// Send payment confirmation email
router.post(
  "/send-payment-confirmation",
  validateInternalApiKey,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userEmail, reservations, payment } = req.body;

      if (!userEmail || !reservations || !payment) {
        res.status(400).json({
          error: "Missing required fields: userEmail, reservations, payment",
        });
        return;
      }

      const reservationData: ReservationEmailData[] = reservations.map((r: any) => ({
        id: r.id,
        serviceType: r.serviceType,
        preferredDate: r.preferredDate,
        durationMinutes: r.durationMinutes,
        totalPrice: r.totalPrice,
        status: r.status,
        notes: r.notes,
        details: r.details,
      }));

      const paymentData = {
        amount: payment.amount,
        currency: payment.currency,
        paymentIntentId: payment.paymentIntentId,
        sessionId: payment.sessionId,
        paymentMethod: payment.paymentMethod,
      };

      await sendPaymentConfirmationEmail(userEmail, reservationData, paymentData);

      res.json({ success: true, message: "Payment confirmation email sent successfully" });
    } catch (error: unknown) {
      handleRouteError(error, res, "Failed to send payment confirmation email");
    }
  }
);

// Send reservation reminder email
router.post(
  "/send-reservation-reminder",
  validateInternalApiKey,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userEmail, reservation } = req.body;

      if (!userEmail || !reservation) {
        res.status(400).json({
          error: "Missing required fields: userEmail, reservation",
        });
        return;
      }

      const reservationData: ReservationEmailData = {
        id: reservation.id,
        serviceType: reservation.serviceType,
        preferredDate: reservation.preferredDate,
        durationMinutes: reservation.durationMinutes,
        totalPrice: reservation.totalPrice,
        status: reservation.status,
        notes: reservation.notes,
        details: reservation.details,
      };

      await sendReservationReminderEmail(userEmail, reservationData);

      res.json({ success: true, message: "Reservation reminder email sent successfully" });
    } catch (error: unknown) {
      handleRouteError(error, res, "Failed to send reservation reminder email");
    }
  }
);

export default router;
