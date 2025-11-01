import type { FunctionReference } from "convex/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { action } from "../_generated/server";

interface Reservation {
  _id: Id<"reservations">;
  userId: Id<"users">;
  serviceType: string;
  preferredDate: string;
  durationMinutes: number;
  totalPrice: number;
  status: string;
  notes?: string;
  details?: {
    email?: string;
    [key: string]: unknown;
  };
}

export const sendReservationStatusUpdateEmail = action({
  args: {
    reservationId: v.id("reservations"),
    oldStatus: v.string(),
    newStatus: v.string(),
  },
  handler: async (ctx, args) => {
    const reservation = await getReservationDetails(ctx, args.reservationId);
    const userEmail = validateReservationEmail(reservation);

    const emailServiceUrl =
      process.env.EMAIL_SERVICE_URL ||
      "http://localhost:3000/api/internal/send-reservation-status-email";

    return await sendEmailWithRetry(ctx, {
      emailServiceUrl,
      userEmail,
      reservation,
      oldStatus: args.oldStatus,
      newStatus: args.newStatus,
      reservationId: args.reservationId,
    });
  },
});

async function getReservationDetails(
  ctx: ActionCtx,
  reservationId: Id<"reservations">
): Promise<Reservation> {
  const getReservationRef =
    "reservations/listReservations:getReservation" as unknown as FunctionReference<
      "query",
      "public"
    >;
  const reservation = await ctx.runQuery(getReservationRef, { reservationId });

  if (!reservation) {
    throw new Error("Reservation not found");
  }

  if (!reservation.userId) {
    throw new Error("Reservation has no associated user");
  }

  return reservation as Reservation;
}

function validateReservationEmail(reservation: Reservation): string {
  const userEmail = reservation.details?.email;
  if (!userEmail) {
    throw new Error("No email found in reservation details");
  }
  return userEmail;
}

interface EmailRetryParams {
  emailServiceUrl: string;
  userEmail: string;
  reservation: Reservation;
  oldStatus: string;
  newStatus: string;
  reservationId: Id<"reservations">;
}

async function sendEmailWithRetry(
  ctx: ActionCtx,
  params: EmailRetryParams
): Promise<{ success: boolean; attempts: number; error?: string }> {
  const maxRetries = 3;
  const baseDelay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `📧 Sending status update email (attempt ${attempt}/${maxRetries}) for reservation ${params.reservationId}`
      );

      const response = await fetch(params.emailServiceUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
        },
        body: JSON.stringify({
          userEmail: params.userEmail,
          reservation: {
            id: params.reservation._id,
            serviceType: params.reservation.serviceType,
            preferredDate: params.reservation.preferredDate,
            durationMinutes: params.reservation.durationMinutes,
            totalPrice: params.reservation.totalPrice,
            status: params.reservation.status,
            notes: params.reservation.notes,
            details: params.reservation.details,
          },
          oldStatus: params.oldStatus,
          newStatus: params.newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error(`Email service responded with status ${response.status}`);
      }

      console.log(
        `✅ Status update email sent successfully for reservation ${params.reservationId} on attempt ${attempt}`
      );
      return { success: true, attempts: attempt };
    } catch (error) {
      const result = await handleEmailError(ctx, error, attempt, maxRetries, params);
      if (result) {
        return result;
      }

      // Continue to next retry
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return { success: false, error: "Max retries exceeded", attempts: maxRetries };
}

async function handleEmailError(
  ctx: ActionCtx,
  error: unknown,
  attempt: number,
  maxRetries: number,
  params: EmailRetryParams
): Promise<{ success: boolean; error: string; attempts: number } | null> {
  const isLastAttempt = attempt === maxRetries;
  const errorMessage = error instanceof Error ? error.message : String(error);

  console.error(
    `❌ Failed to send status update email for reservation ${params.reservationId} (attempt ${attempt}/${maxRetries}):`,
    errorMessage
  );

  await logEmailFailure(ctx, params, attempt, maxRetries, errorMessage);

  if (isLastAttempt) {
    return {
      success: false,
      error: errorMessage,
      attempts: attempt,
    };
  }

  return null;
}

async function logEmailFailure(
  ctx: ActionCtx,
  params: EmailRetryParams,
  attempt: number,
  maxRetries: number,
  errorMessage: string
): Promise<void> {
  try {
    const logActivityRef = "audit:logActivity" as unknown as FunctionReference<
      "mutation",
      "public"
    >;
    await ctx.runMutation(logActivityRef, {
      userId: params.reservation.userId,
      action: "email_send_failed",
      details: {
        reservationId: params.reservationId,
        emailType: "status_update",
        attempt,
        maxRetries,
        oldStatus: params.oldStatus,
        newStatus: params.newStatus,
        error: errorMessage,
      },
    });
  } catch (auditError) {
    console.error("Failed to log email failure to audit:", auditError);
  }
}
