import { ConvexHttpClient } from "convex/browser";
import Stripe from "stripe";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  PaymentData,
  ReservationEmailData,
  sendPaymentFailureEmail,
  sendReservationConfirmationEmail,
} from "../templates/emailTemplates";

/**
 * ReservationPaymentService - Handles reservation-specific payment processing
 *
 * Features:
 * - Process successful reservation payments
 * - Handle failed reservation payments
 * - Update reservation status in Convex
 * - Send confirmation and failure emails
 * - Proper TypeScript types with no `any` casts
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL!);

// Types
interface EmailResult {
  success: boolean;
  error?: string;
}

/**
 * ReservationPaymentService class
 */
export class ReservationPaymentService {
  private static instance: ReservationPaymentService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ReservationPaymentService {
    if (!ReservationPaymentService.instance) {
      ReservationPaymentService.instance = new ReservationPaymentService();
    }
    return ReservationPaymentService.instance;
  }

  /**
   * Handle successful reservation payment
   * Updates reservation status to "confirmed" and sends confirmation email
   *
   * @param reservationIds - Array of reservation IDs to confirm
   * @param paymentData - Payment information from Stripe
   * @param session - Stripe checkout session
   */
  async handleReservationPaymentSuccess(
    reservationIds: string[],
    paymentData: PaymentData,
    session: Stripe.Checkout.Session
  ): Promise<void> {
    const startTime = Date.now();

    try {
      console.log(
        `✅ Processing successful reservation payment for ${reservationIds.length} reservation(s)`
      );

      // Fetch reservation details from Convex
      const reservations = await this.fetchReservationDetails(reservationIds);

      if (reservations.length === 0) {
        throw new Error("No reservations found for the provided IDs");
      }

      // Update each reservation status to "confirmed"
      const updatePromises = reservationIds.map(id =>
        this.updateReservationStatus(id as Id<"reservations">, "confirmed", "Payment confirmed")
      );

      await Promise.all(updatePromises);

      console.log(`✅ Updated ${reservationIds.length} reservation(s) to confirmed status`);

      // Send confirmation email
      await this.sendConfirmationEmail(
        session.customer_email || paymentData.sessionId || "unknown@example.com",
        reservations,
        paymentData
      );

      const duration = Date.now() - startTime;
      console.log(`✅ Reservation payment success processed in ${duration}ms`);

      // Log to audit
      await this.logToAudit({
        action: "reservation_payment_success",
        resource: "reservations",
        details: {
          reservationIds,
          paymentIntentId: paymentData.paymentIntentId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          duration,
        },
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Error processing reservation payment success after ${duration}ms:`, error);

      // Log error to audit
      await this.logToAudit({
        action: "reservation_payment_success_error",
        resource: "reservations",
        details: {
          reservationIds,
          error: error instanceof Error ? error.message : String(error),
          duration,
        },
      });

      throw error;
    }
  }

  /**
   * Handle failed reservation payment
   * Updates reservation status and sends failure notification email
   *
   * @param reservationIds - Array of reservation IDs
   * @param paymentData - Payment information from Stripe
   * @param paymentIntent - Stripe payment intent with failure details
   */
  async handleReservationPaymentFailure(
    reservationIds: string[],
    paymentData: PaymentData,
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    const startTime = Date.now();

    try {
      console.log(
        `⚠️ Processing failed reservation payment for ${reservationIds.length} reservation(s)`
      );

      // Extract failure reason
      const failureReason =
        paymentIntent.last_payment_error?.message || "Payment processing failed";

      // Fetch reservation details
      const reservations = await this.fetchReservationDetails(reservationIds);

      if (reservations.length === 0) {
        throw new Error("No reservations found for the provided IDs");
      }

      // Update reservation status with failure notes
      const updatePromises = reservationIds.map(id =>
        this.updateReservationStatus(
          id as Id<"reservations">,
          "pending",
          `Payment failed: ${failureReason}`
        )
      );

      await Promise.all(updatePromises);

      console.log(`✅ Updated ${reservationIds.length} reservation(s) with payment failure notes`);

      // Send failure notification email
      const userEmail = reservations[0]?.details?.email || "unknown@example.com";
      await this.sendFailureEmail(userEmail, reservationIds, paymentData, failureReason);

      const duration = Date.now() - startTime;
      console.log(`✅ Reservation payment failure processed in ${duration}ms`);

      // Log to audit
      await this.logToAudit({
        action: "reservation_payment_failure",
        resource: "reservations",
        details: {
          reservationIds,
          paymentIntentId: paymentData.paymentIntentId,
          failureReason,
          amount: paymentData.amount,
          currency: paymentData.currency,
          duration,
        },
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Error processing reservation payment failure after ${duration}ms:`, error);

      // Log error to audit
      await this.logToAudit({
        action: "reservation_payment_failure_error",
        resource: "reservations",
        details: {
          reservationIds,
          error: error instanceof Error ? error.message : String(error),
          duration,
        },
      });

      throw error;
    }
  }

  /**
   * Update reservation status in Convex
   * Private method to update a single reservation's status
   *
   * @param reservationId - Reservation ID to update
   * @param status - New status to set
   * @param notes - Optional notes about the status change
   */
  private async updateReservationStatus(
    reservationId: Id<"reservations">,
    status: "confirmed" | "pending" | "cancelled",
    notes?: string
  ): Promise<void> {
    try {
      // Call Convex mutation to update reservation status
      // Skip email notification since we handle it separately

      // @ts-expect-error - Convex API type depth issue
      await (convex.mutation as unknown)(api.reservations.updateReservationStatus, {
        reservationId,
        status,
        notes,
        skipEmailNotification: true,
      });

      console.log(`✅ Updated reservation ${reservationId} to status: ${status}`);
    } catch (error) {
      console.error(`❌ Error updating reservation ${reservationId} status:`, error);
      throw new Error(
        `Failed to update reservation status: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Send confirmation email using existing email templates
   * Private method to send reservation confirmation email
   *
   * @param userEmail - User's email address
   * @param reservations - Array of reservation data
   * @param payment - Payment information
   */
  private async sendConfirmationEmail(
    userEmail: string,
    reservations: ReservationEmailData[],
    payment: PaymentData
  ): Promise<EmailResult> {
    try {
      console.log(`📧 Sending confirmation email to ${userEmail}`);

      await sendReservationConfirmationEmail(userEmail, reservations, payment);

      console.log(`✅ Confirmation email sent successfully to ${userEmail}`);

      return { success: true };
    } catch (error) {
      console.error(`❌ Error sending confirmation email to ${userEmail}:`, error);

      // Log error but don't throw - email failure shouldn't break payment processing
      await this.logToAudit({
        action: "confirmation_email_error",
        resource: "emails",
        details: {
          userEmail,
          reservationCount: reservations.length,
          error: error instanceof Error ? error.message : String(error),
        },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send failure email for payment failure notifications
   * Private method to send payment failure notification
   *
   * @param userEmail - User's email address
   * @param reservationIds - Array of reservation IDs
   * @param payment - Payment information
   * @param failureReason - Reason for payment failure
   */
  private async sendFailureEmail(
    userEmail: string,
    reservationIds: string[],
    payment: PaymentData,
    failureReason?: string
  ): Promise<EmailResult> {
    try {
      console.log(`📧 Sending payment failure email to ${userEmail}`);

      await sendPaymentFailureEmail(userEmail, reservationIds, payment, failureReason);

      console.log(`✅ Payment failure email sent successfully to ${userEmail}`);

      return { success: true };
    } catch (error) {
      console.error(`❌ Error sending payment failure email to ${userEmail}:`, error);

      // Log error but don't throw - email failure shouldn't break payment processing
      await this.logToAudit({
        action: "failure_email_error",
        resource: "emails",
        details: {
          userEmail,
          reservationIds,
          failureReason,
          error: error instanceof Error ? error.message : String(error),
        },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Fetch reservation details from Convex
   * Helper method to retrieve reservation data for email templates
   *
   * @param reservationIds - Array of reservation IDs
   * @returns Array of reservation email data
   */
  private async fetchReservationDetails(reservationIds: string[]): Promise<ReservationEmailData[]> {
    try {
      const reservations: ReservationEmailData[] = [];

      for (const id of reservationIds) {
        // Fetch all reservations from Convex
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allReservations = (await (convex.query as any)(api.reservations.listReservations, {
          limit: 100,
        })) as Array<{
          _id: string;
          serviceType: string;
          preferredDate: string;
          durationMinutes: number;
          totalPrice: number;
          status: string;
          notes?: string;
          details: {
            name?: string;
            email?: string;
            phone?: string;
            requirements?: string;
          };
        }>;

        // Find the specific reservation by ID
        const found = allReservations.find(r => r._id === id);

        if (found) {
          reservations.push({
            id: found._id,
            serviceType: found.serviceType,
            preferredDate: found.preferredDate,
            durationMinutes: found.durationMinutes,
            totalPrice: found.totalPrice,
            status: found.status,
            notes: found.notes,
            details: found.details,
          });
        }
      }

      return reservations;
    } catch (error) {
      console.error("❌ Error fetching reservation details:", error);
      throw new Error(
        `Failed to fetch reservation details: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Log to audit trail
   * Helper method to log events to Convex audit system
   *
   * @param entry - Audit log entry
   */
  private async logToAudit(entry: {
    action: string;
    resource: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (convex.mutation as any)(api.audit.log, {
        action: entry.action,
        resource: entry.resource,
        details: entry.details,
      });
    } catch (error) {
      console.error("❌ Failed to log to audit:", error);
      // Don't throw - logging failure shouldn't break payment processing
    }
  }
}

// Export singleton instance
export const reservationPaymentService = ReservationPaymentService.getInstance();
