import type { FunctionReference } from "convex/server";
import { v } from "convex/values";
import { action } from "../_generated/server";

interface ReminderEmailPayload {
  userEmail: string;
  reservation: {
    id: string;
    serviceType: string;
    preferredDate: string;
    durationMinutes: number;
    totalPrice: number;
    status: string;
    notes?: string;
    details?: unknown;
  };
}

interface EmailResult {
  success: boolean;
  attempts: number;
  error?: string;
}

// Helper: Send reminder email with retry logic
async function sendReminderWithRetry(
  url: string,
  payload: ReminderEmailPayload,
  reservationId: string,
  maxRetries = 3
): Promise<EmailResult> {
  const baseDelay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `📧 Sending reminder email (attempt ${attempt}/${maxRetries}) for reservation ${reservationId}`
      );

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Email service responded with status ${response.status}`);
      }

      console.log(
        `✅ Reminder email sent successfully for reservation ${reservationId} on attempt ${attempt}`
      );
      return { success: true, attempts: attempt };
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(
        `❌ Failed to send reminder email for reservation ${reservationId} (attempt ${attempt}/${maxRetries}):`,
        errorMessage
      );

      if (isLastAttempt) {
        return { success: false, error: errorMessage, attempts: attempt };
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return { success: false, error: "Max retries exceeded", attempts: maxRetries };
}

// Helper: Log email failure to audit
async function logReminderFailure(
  ctx: { runMutation: (ref: FunctionReference<"mutation">, args: unknown) => Promise<unknown> },
  userId: string,
  reservationId: string,
  error: string,
  attempt: number,
  maxRetries: number
): Promise<void> {
  try {
    const auditRef = "audit:logActivity" as unknown as FunctionReference<"mutation">;
    await ctx.runMutation(auditRef, {
      userId,
      action: "email_send_failed",
      details: {
        reservationId,
        emailType: "reminder",
        attempt,
        maxRetries,
        error,
      },
    });
  } catch (auditError) {
    console.error("Failed to log email failure to audit:", auditError);
  }
}

export const sendReservationReminderEmail = action({
  args: {
    reservationId: v.id("reservations"),
  },
  handler: async (ctx, args) => {
    // Get reservation details
    const getReservationRef =
      "reservations/listReservations:getReservation" as unknown as FunctionReference<
        "query",
        "public"
      >;
    const reservation = await ctx.runQuery(getReservationRef, {
      reservationId: args.reservationId,
    });

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    // Get user email from the reservation details
    const userEmail = reservation.details?.email;
    if (!userEmail) {
      throw new Error("No email found in reservation details");
    }

    // Prepare email payload
    const payload: ReminderEmailPayload = {
      userEmail: userEmail,
      reservation: {
        id: reservation._id,
        serviceType: reservation.serviceType,
        preferredDate: reservation.preferredDate,
        durationMinutes: reservation.durationMinutes,
        totalPrice: reservation.totalPrice,
        status: reservation.status,
        notes: reservation.notes,
        details: reservation.details,
      },
    };

    const emailServiceUrl =
      process.env.EMAIL_SERVICE_URL ||
      "http://localhost:3000/api/internal/send-reservation-reminder";

    const result = await sendReminderWithRetry(emailServiceUrl, payload, args.reservationId);

    // Log failure if needed
    if (!result.success && result.error) {
      await logReminderFailure(
        ctx,
        reservation.userId,
        args.reservationId,
        result.error,
        result.attempts,
        3
      );
    }

    return result;
  },
});
