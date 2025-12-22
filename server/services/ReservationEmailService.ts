import { formatCurrencyDisplay } from "../../shared/utils/currency";
import { PaymentData, ReservationEmailData, User } from "../templates/emailTemplates";
import { EmailDeliveryResult, EmailRetryOptions, sendMailWithResult } from "./mail";

export interface EmailServiceOptions {
  retryOptions?: EmailRetryOptions;
  adminEmails?: string[];
  fromEmail?: string;
}

/**
 * Enhanced email service for reservation system with comprehensive notifications
 */
export class ReservationEmailService {
  private options: EmailServiceOptions;

  constructor(options: EmailServiceOptions = {}) {
    this.options = {
      retryOptions: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffFactor: 2,
      },
      adminEmails: process.env.ADMIN_EMAILS?.split(",") || ["contact@brolabentertainment.com"],
      fromEmail: process.env.DEFAULT_FROM || "BroLab <contact@brolabentertainment.com>",
      ...options,
    };
  }

  /**
   * Send reservation confirmation email to user
   */
  async sendReservationConfirmation(
    user: User,
    reservations: ReservationEmailData[],
    payment?: PaymentData
  ): Promise<EmailDeliveryResult> {
    const emailContent = this.generateReservationConfirmationEmail(reservations, payment);

    return await sendMailWithResult(
      {
        to: user.email,
        subject: `🎵 Reservation Confirmed - BroLab Entertainment`,
        html: emailContent,
        from: this.options.fromEmail,
      },
      this.options.retryOptions
    );
  }

  /**
   * Send admin notification for new reservation
   */
  async sendAdminNotification(
    user: User,
    reservation: ReservationEmailData
  ): Promise<EmailDeliveryResult> {
    const emailContent = this.generateAdminNotificationEmail(user, reservation);

    return await sendMailWithResult(
      {
        to: this.options.adminEmails!,
        subject: `🔔 New Reservation - ${reservation.serviceType} - BroLab Entertainment`,
        html: emailContent,
        from: this.options.fromEmail,
      },
      this.options.retryOptions
    );
  }

  /**
   * Send status update email to user
   */
  async sendStatusUpdate(
    user: User,
    reservation: ReservationEmailData,
    oldStatus: string,
    newStatus: string
  ): Promise<EmailDeliveryResult> {
    const emailContent = this.generateStatusUpdateEmail(reservation, oldStatus, newStatus);

    return await sendMailWithResult(
      {
        to: user.email,
        subject: `📅 Reservation Status Update - ${newStatus.toUpperCase()} - BroLab Entertainment`,
        html: emailContent,
        from: this.options.fromEmail,
      },
      this.options.retryOptions
    );
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmation(
    user: User,
    reservations: ReservationEmailData[],
    payment: PaymentData
  ): Promise<EmailDeliveryResult> {
    const emailContent = this.generatePaymentConfirmationEmail(reservations, payment);

    return await sendMailWithResult(
      {
        to: user.email,
        subject: `💳 Payment Confirmed - BroLab Entertainment`,
        html: emailContent,
        from: this.options.fromEmail,
      },
      this.options.retryOptions
    );
  }

  /**
   * Send payment failure notification
   */
  async sendPaymentFailure(
    user: User,
    reservationIds: string[],
    payment: PaymentData,
    failureReason?: string
  ): Promise<EmailDeliveryResult> {
    const emailContent = this.generatePaymentFailureEmail(reservationIds, payment, failureReason);

    return await sendMailWithResult(
      {
        to: user.email,
        subject: `⚠️ Payment Failed - BroLab Entertainment`,
        html: emailContent,
        from: this.options.fromEmail,
      },
      this.options.retryOptions
    );
  }

  /**
   * Send reservation reminder email (24 hours before)
   */
  async sendReservationReminder(
    user: User,
    reservation: ReservationEmailData
  ): Promise<EmailDeliveryResult> {
    const emailContent = this.generateReminderEmail(reservation);

    return await sendMailWithResult(
      {
        to: user.email,
        subject: `⏰ Reminder: Your session is tomorrow - BroLab Entertainment`,
        html: emailContent,
        from: this.options.fromEmail,
      },
      this.options.retryOptions
    );
  }

  /**
   * Generate reservation confirmation email template
   */
  private generateReservationConfirmationEmail(
    reservations: ReservationEmailData[],
    payment?: PaymentData
  ): string {
    const reservationsList = reservations
      .map(reservation => {
        const date = new Date(reservation.preferredDate);
        return `
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <h3 style="color: #8B5CF6; margin: 0 0 10px 0;">${this.formatServiceType(reservation.serviceType)}</h3>
            <p><strong>Date:</strong> ${date.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</p>
            <p><strong>Time:</strong> ${date.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}</p>
            <p><strong>Duration:</strong> ${reservation.durationMinutes} minutes</p>
            <p><strong>Status:</strong> <span style="color: #10B981; font-weight: bold;">CONFIRMED</span></p>
            ${reservation.notes ? `<p><strong>Notes:</strong> ${reservation.notes}</p>` : ""}
          </div>
        `;
      })
      .join("");

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Reservation Confirmed!</h1>
          <p style="color: #E5E7EB; margin: 10px 0 0 0; font-size: 16px;">Your reservation${reservations.length > 1 ? "s are" : " is"} now confirmed</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Thank you for choosing BroLab Entertainment! Your reservation${reservations.length > 1 ? "s have" : " has"} been confirmed and we're excited to work with you.
          </p>
          
          <h2 style="color: #8B5CF6; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px;">Reservation Details</h2>
          ${reservationsList}
          
          ${
            payment
              ? `
          <div style="background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8B5CF6; margin: 0 0 10px 0;">Payment Information</h3>
            <p><strong>Amount:</strong> ${formatCurrencyDisplay(payment.amount, { currency: payment.currency })}</p>
            <p><strong>Payment Method:</strong> ${payment.paymentMethod || "Card"}</p>
            ${payment.paymentIntentId ? `<p><strong>Transaction ID:</strong> ${payment.paymentIntentId}</p>` : ""}
          </div>
          `
              : ""
          }
          
          <div style="background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #059669; margin: 0 0 10px 0;">What's Next?</h3>
            <ul style="color: #374151; padding-left: 20px;">
              <li>We'll contact you 24-48 hours before your session to confirm details</li>
              <li>Please arrive 10 minutes early to your scheduled session</li>
              <li>Bring any reference materials or files you'd like to work with</li>
              <li>If you need to reschedule, please contact us at least 24 hours in advance</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
            <p style="color: #6B7280; margin-bottom: 10px;">Questions? We're here to help!</p>
            <p style="color: #8B5CF6; font-weight: bold;">
              📧 contact@brolabentertainment.com<br>
              📞 +33 (0)1 XX XX XX XX
            </p>
          </div>
        </div>
        
        <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
          <p>BroLab Entertainment - Professional Music Production Services</p>
          <p>This is an automated confirmation email. Please do not reply to this message.</p>
        </div>
      </div>
    `;
  }

  /**
   * Generate admin notification email template
   */
  private generateAdminNotificationEmail(user: User, reservation: ReservationEmailData): string {
    const date = new Date(reservation.preferredDate);
    const userName =
      user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown User";

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🔔 New Reservation</h1>
          <p style="color: #FEF3C7; margin: 10px 0 0 0; font-size: 16px;">A new reservation has been created</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <div style="background: #FFF7ED; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
            <h3 style="color: #D97706; margin: 0 0 15px 0;">Reservation Details</h3>
            <p><strong>Service:</strong> ${this.formatServiceType(reservation.serviceType)}</p>
            <p><strong>Client:</strong> ${userName}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Phone:</strong> ${reservation.details.phone || "Not provided"}</p>
            <p><strong>Date:</strong> ${date.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</p>
            <p><strong>Time:</strong> ${date.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}</p>
            <p><strong>Duration:</strong> ${reservation.durationMinutes} minutes</p>
            <p><strong>Price:</strong> €${reservation.totalPrice}</p>
            <p><strong>Status:</strong> ${reservation.status.toUpperCase()}</p>
            ${reservation.notes ? `<p><strong>Notes:</strong> ${reservation.notes}</p>` : ""}
            ${reservation.details.requirements ? `<p><strong>Requirements:</strong> ${reservation.details.requirements}</p>` : ""}
          </div>
          
          <div style="background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8B5CF6; margin: 0 0 10px 0;">Action Required</h3>
            <ul style="color: #374151; padding-left: 20px;">
              <li>Review the reservation details and confirm availability</li>
              <li>Contact the client if additional information is needed</li>
              <li>Update the reservation status in the admin panel</li>
              <li>Prepare any necessary materials for the session</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || "https://brolabentertainment.com"}/admin/reservations/${reservation.id}" 
               style="background: #8B5CF6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              View Reservation
            </a>
          </div>
        </div>
        
        <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
          <p>BroLab Entertainment - Admin Notification System</p>
        </div>
      </div>
    `;
  }

  /**
   * Generate status update email template
   */
  private generateStatusUpdateEmail(
    reservation: ReservationEmailData,
    oldStatus: string,
    newStatus: string
  ): string {
    const date = new Date(reservation.preferredDate);
    const statusColors: Record<string, string> = {
      pending: "#F59E0B",
      confirmed: "#10B981",
      in_progress: "#3B82F6",
      completed: "#8B5CF6",
      cancelled: "#EF4444",
    };

    const statusMessages: Record<string, string> = {
      confirmed: "Your reservation has been confirmed! We're looking forward to working with you.",
      in_progress:
        "Your session is currently in progress. We're working hard to deliver exceptional results!",
      completed: "Your session has been completed! We hope you're satisfied with the results.",
      cancelled:
        "Your reservation has been cancelled. If this was unexpected, please contact us immediately.",
    };

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Reservation Update</h1>
          <p style="color: #E5E7EB; margin: 10px 0 0 0; font-size: 16px;">Your reservation status has been updated</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            ${statusMessages[newStatus] || "We wanted to let you know that your reservation status has been updated."}
          </p>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8B5CF6; margin: 0 0 15px 0;">${this.formatServiceType(reservation.serviceType)}</h3>
            <p><strong>Date:</strong> ${date.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</p>
            <p><strong>Time:</strong> ${date.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}</p>
            <p><strong>Duration:</strong> ${reservation.durationMinutes} minutes</p>
          </div>
          
          <div style="background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8B5CF6; margin: 0 0 10px 0;">Status Update</h3>
            <p><strong>Previous Status:</strong> <span style="color: ${statusColors[oldStatus] || "#6B7280"}; font-weight: bold;">${oldStatus.toUpperCase()}</span></p>
            <p><strong>New Status:</strong> <span style="color: ${statusColors[newStatus] || "#6B7280"}; font-weight: bold;">${newStatus.toUpperCase()}</span></p>
            ${reservation.notes ? `<p><strong>Notes:</strong> ${reservation.notes}</p>` : ""}
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
            <p style="color: #6B7280; margin-bottom: 10px;">Questions about your reservation?</p>
            <p style="color: #8B5CF6; font-weight: bold;">
              📧 contact@brolabentertainment.com<br>
              📞 +33 (0)1 XX XX XX XX
            </p>
          </div>
        </div>
        
        <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
          <p>BroLab Entertainment - Professional Music Production Services</p>
        </div>
      </div>
    `;
  }

  /**
   * Generate payment confirmation email template
   */
  private generatePaymentConfirmationEmail(
    reservations: ReservationEmailData[],
    payment: PaymentData
  ): string {
    const reservationsList = reservations
      .map(reservation => {
        const date = new Date(reservation.preferredDate);
        return `
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <h4 style="color: #8B5CF6; margin: 0 0 10px 0;">${this.formatServiceType(reservation.serviceType)}</h4>
            <p><strong>Date:</strong> ${date.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</p>
            <p><strong>Time:</strong> ${date.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}</p>
          </div>
        `;
      })
      .join("");

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">💳 Payment Confirmed!</h1>
          <p style="color: #D1FAE5; margin: 10px 0 0 0; font-size: 16px;">Your payment has been processed successfully</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Thank you! Your payment has been processed successfully. Your reservation${reservations.length > 1 ? "s are" : " is"} now fully confirmed.
          </p>
          
          <div style="background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
            <h3 style="color: #059669; margin: 0 0 10px 0;">Payment Details</h3>
            <p><strong>Amount Paid:</strong> ${formatCurrencyDisplay(payment.amount, { currency: payment.currency })}</p>
            <p><strong>Payment Method:</strong> ${payment.paymentMethod || "Card"}</p>
            ${payment.paymentIntentId ? `<p><strong>Transaction ID:</strong> ${payment.paymentIntentId}</p>` : ""}
            <p><strong>Status:</strong> <span style="color: #10B981; font-weight: bold;">PAID</span></p>
          </div>
          
          <h3 style="color: #8B5CF6; margin: 20px 0 10px 0;">Confirmed Reservations</h3>
          ${reservationsList}
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
            <p style="color: #6B7280; margin-bottom: 10px;">Need help or have questions?</p>
            <p style="color: #8B5CF6; font-weight: bold;">
              📧 contact@brolabentertainment.com<br>
              📞 +33 (0)1 XX XX XX XX
            </p>
          </div>
        </div>
        
        <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
          <p>BroLab Entertainment - Professional Music Production Services</p>
          <p>Keep this email as your payment receipt.</p>
        </div>
      </div>
    `;
  }

  /**
   * Generate payment failure email template
   */
  private generatePaymentFailureEmail(
    reservationIds: string[],
    payment: PaymentData,
    failureReason?: string
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Payment Failed</h1>
          <p style="color: #FEE2E2; margin: 10px 0 0 0; font-size: 16px;">We couldn't process your payment</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            We're sorry, but we encountered an issue processing your payment for your reservation${reservationIds.length > 1 ? "s" : ""}. 
            Don't worry - your reservation${reservationIds.length > 1 ? "s are" : " is"} still held for you.
          </p>
          
          <div style="background: #FEF2F2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444;">
            <h3 style="color: #DC2626; margin: 0 0 10px 0;">Payment Details</h3>
            <p><strong>Amount:</strong> ${formatCurrencyDisplay(payment.amount, { currency: payment.currency })}</p>
            ${payment.paymentIntentId ? `<p><strong>Payment Intent ID:</strong> ${payment.paymentIntentId}</p>` : ""}
            <p><strong>Failure Reason:</strong> ${failureReason || "Payment processing failed"}</p>
          </div>
          
          <div style="background: #F0F9FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0369A1; margin: 0 0 10px 0;">What You Can Do</h3>
            <ul style="color: #374151; padding-left: 20px;">
              <li>Check that your payment method has sufficient funds</li>
              <li>Verify your card details are correct</li>
              <li>Try a different payment method</li>
              <li>Contact your bank if the issue persists</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || "https://brolabentertainment.com"}/checkout" 
               style="background: #8B5CF6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Try Payment Again
            </a>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
            <p style="color: #6B7280; margin-bottom: 10px;">Need help? We're here for you!</p>
            <p style="color: #8B5CF6; font-weight: bold;">
              📧 contact@brolabentertainment.com<br>
              📞 +33 (0)1 XX XX XX XX
            </p>
          </div>
        </div>
        
        <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
          <p>BroLab Entertainment - Professional Music Production Services</p>
          <p>Your reservation${reservationIds.length > 1 ? "s are" : " is"} held for 24 hours while you resolve the payment issue.</p>
        </div>
      </div>
    `;
  }

  /**
   * Generate reminder email template
   */
  private generateReminderEmail(reservation: ReservationEmailData): string {
    const date = new Date(reservation.preferredDate);
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">⏰ Session Reminder</h1>
          <p style="color: #FEF3C7; margin: 10px 0 0 0; font-size: 16px;">Your session is tomorrow!</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            This is a friendly reminder that your session is scheduled for tomorrow. We're excited to work with you!
          </p>
          
          <div style="background: #FFF7ED; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
            <h3 style="color: #D97706; margin: 0 0 15px 0;">${this.formatServiceType(reservation.serviceType)}</h3>
            <p><strong>Date:</strong> ${date.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</p>
            <p><strong>Time:</strong> ${date.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}</p>
            <p><strong>Duration:</strong> ${reservation.durationMinutes} minutes</p>
            ${reservation.notes ? `<p><strong>Notes:</strong> ${reservation.notes}</p>` : ""}
          </div>
          
          <div style="background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8B5CF6; margin: 0 0 10px 0;">Preparation Checklist</h3>
            <ul style="color: #374151; padding-left: 20px;">
              <li>Arrive 10 minutes early to get settled</li>
              <li>Bring any reference materials or inspiration tracks</li>
              <li>Have your project files ready (if applicable)</li>
              <li>Bring headphones if you have a preferred pair</li>
              <li>Come with an open mind and creative energy!</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
            <p style="color: #6B7280; margin-bottom: 10px;">Need to reschedule or have questions?</p>
            <p style="color: #8B5CF6; font-weight: bold;">
              📧 contact@brolabentertainment.com<br>
              📞 +33 (0)1 XX XX XX XX
            </p>
          </div>
        </div>
        
        <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
          <p>BroLab Entertainment - Professional Music Production Services</p>
          <p>We look forward to seeing you tomorrow!</p>
        </div>
      </div>
    `;
  }

  /**
   * Format service type for display
   */
  private formatServiceType(serviceType: string): string {
    const serviceNames: Record<string, string> = {
      mixing_mastering: "Mixing & Mastering",
      recording_session: "Recording Session",
      custom_beat: "Custom Beat Production",
      production_consultation: "Production Consultation",
    };

    return (
      serviceNames[serviceType] ||
      serviceType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
    );
  }
}

// Export singleton instance
export const reservationEmailService = new ReservationEmailService();
