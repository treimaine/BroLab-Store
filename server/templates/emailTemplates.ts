/**
 * Consolidated Email Templates for BroLab Entertainment
 *
 * This file contains all email templates and related functionality for:
 * - User authentication (verification, password reset)
 * - Order confirmations and subscriptions
 * - Reservation system (confirmations, status updates, reminders)
 * - Payment notifications (success, failure)
 * - Admin notifications
 */

import { formatCurrencyDisplay } from "../../shared/utils/currency";
import { logger } from "../lib/logger";

// Type definitions
export interface PaymentData {
  amount: number;
  currency: string;
  paymentIntentId?: string;
  sessionId?: string;
  paymentMethod?: string;
}

export interface ReservationEmailData {
  id: string;
  serviceType: string;
  preferredDate: string;
  durationMinutes: number;
  totalPrice: number;
  status: string;
  notes?: string | null;
  details: {
    name?: string;
    email?: string;
    phone?: string;
    requirements?: string;
  };
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}

// Base email styling constants
const EMAIL_STYLES = {
  container: "font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;",
  header:
    "background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; text-align: center;",
  headerTitle: "color: white; margin: 0; font-size: 28px;",
  headerSubtitle: "color: #E5E7EB; margin: 10px 0 0 0; font-size: 16px;",
  content: "padding: 30px; background: white;",
  footer:
    "background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;",
  button:
    "background: #8B5CF6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;",
  infoBox: "background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0;",
  successBox:
    "background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;",
  warningBox:
    "background: #FFF7ED; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;",
  errorBox:
    "background: #FEF2F2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444;",
};

/**
 * Format service type for display
 */
const formatServiceType = (serviceType: string): string => {
  const serviceNames: Record<string, string> = {
    mixing_mastering: "Mixing & Mastering",
    recording_session: "Recording Session",
    custom_beat: "Custom Beat Production",
    production_consultation: "Production Consultation",
  };

  if (serviceNames[serviceType]) {
    return serviceNames[serviceType];
  }

  // Use replaceAll for better performance and clarity
  return serviceType.replaceAll("_", " ").replaceAll(/\b\w/g, letter => letter.toUpperCase());
};

/**
 * Generate base email template wrapper
 */
const generateEmailWrapper = (
  title: string,
  subtitle: string,
  content: string,
  footerText?: string
): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background: #f4f4f4;">
      <div style="${EMAIL_STYLES.container}">
        <div style="${EMAIL_STYLES.header}">
          <h1 style="${EMAIL_STYLES.headerTitle}">${title}</h1>
          <p style="${EMAIL_STYLES.headerSubtitle}">${subtitle}</p>
        </div>
        
        <div style="${EMAIL_STYLES.content}">
          ${content}
        </div>
        
        <div style="${EMAIL_STYLES.footer}">
          <p style="margin: 0;">BroLab Entertainment - Professional Music Production Services</p>
          ${footerText ? `<p style="margin: 5px 0 0 0;">${footerText}</p>` : ""}
        </div>
      </div>
    </body>
    </html>
  `;
};

// ============================================================================
// AUTHENTICATION EMAIL TEMPLATES
// ============================================================================

export const emailTemplates = {
  /**
   * Email verification template
   */
  verifyEmail: (verificationLink: string, username: string) => ({
    subject: "Vérifiez votre adresse email - BroLab Entertainment",
    html: generateEmailWrapper(
      "BroLab Entertainment",
      "Vérifiez votre compte",
      `
        <h2 style="color: #333; margin: 0 0 20px 0;">Salut ${username} ! 👋</h2>
        <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
          Bienvenue sur BroLab Entertainment ! Pour terminer votre inscription et accéder à votre compte, veuillez vérifier votre adresse email.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="${EMAIL_STYLES.button}">
            Vérifier mon email
          </a>
        </div>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          Ce lien expirera dans 24 heures. Si vous n'avez pas créé de compte, ignorez cet email.
        </p>
      `,
      "Votre destination pour les beats de qualité"
    ),
  }),

  /**
   * Password reset template
   */
  resetPassword: (resetLink: string, username: string) => ({
    subject: "Réinitialisation de votre mot de passe - BroLab Entertainment",
    html: generateEmailWrapper(
      "BroLab Entertainment",
      "Réinitialisation du mot de passe",
      `
        <h2 style="color: #333; margin: 0 0 20px 0;">Réinitialisation du mot de passe</h2>
        <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
          Salut ${username}, vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background: #EF4444; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Réinitialiser mon mot de passe
          </a>
        </div>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          Ce lien expirera dans 15 minutes. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
        </p>
      `,
      "Sécurité de votre compte"
    ),
  }),

  /**
   * Order confirmation template
   */
  orderConfirmation: (orderDetails: {
    orderNumber: string;
    customerName: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    downloadLink?: string;
  }) => ({
    subject: `Commande confirmée #${orderDetails.orderNumber} - BroLab Entertainment`,
    html: generateEmailWrapper(
      "Commande confirmée ! 🎉",
      "Votre achat a été traité avec succès",
      `
        <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
          Merci ${orderDetails.customerName} pour votre achat ! Votre commande a été traitée avec succès.
        </p>
        <div style="${EMAIL_STYLES.infoBox}">
          <p style="margin: 0;"><strong>Numéro de commande :</strong> ${orderDetails.orderNumber}</p>
          <p style="margin: 10px 0 0 0;"><strong>Total :</strong> ${orderDetails.total}€</p>
        </div>
        <p style="color: #666; line-height: 1.6;">
          Vos fichiers sont maintenant disponibles dans votre compte. Connectez-vous pour les télécharger.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://brolabentertainment.com/dashboard" style="${EMAIL_STYLES.button}">
            Accéder à mes téléchargements
          </a>
        </div>
      `,
      "Merci pour votre confiance"
    ),
  }),

  /**
   * Subscription confirmation template
   */
  subscriptionConfirmation: (subscriptionDetails: {
    planName: string;
    customerName: string;
    billingCycle: string;
    nextBillingDate: string;
    features: string[];
  }) => ({
    subject: `Abonnement activé - ${subscriptionDetails.planName} - BroLab Entertainment`,
    html: generateEmailWrapper(
      "Abonnement activé ! ⭐",
      "Votre plan est maintenant actif",
      `
        <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
          Félicitations ${subscriptionDetails.customerName} ! Votre abonnement ${subscriptionDetails.planName} est maintenant actif.
        </p>
        <div style="${EMAIL_STYLES.infoBox}">
          <p style="margin: 0;"><strong>Plan :</strong> ${subscriptionDetails.planName}</p>
          <p style="margin: 10px 0 0 0;"><strong>Cycle :</strong> ${subscriptionDetails.billingCycle}</p>
          <p style="margin: 10px 0 0 0;"><strong>Prochaine facture :</strong> ${subscriptionDetails.nextBillingDate}</p>
        </div>
        <p style="color: #666; line-height: 1.6;">
          Profitez de tous les avantages de votre abonnement dès maintenant !
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://brolabentertainment.com/membership" style="background: #F59E0B; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Gérer mon abonnement
          </a>
        </div>
      `,
      "Votre partenaire musical"
    ),
  }),
};

// ============================================================================
// RESERVATION EMAIL TEMPLATES
// ============================================================================

/**
 * Generate reservation confirmation email template
 */
export const generateReservationConfirmationEmail = (
  reservations: ReservationEmailData[],
  payment?: PaymentData
): string => {
  const reservationsList = reservations
    .map(reservation => {
      const date = new Date(reservation.preferredDate);
      return `
        <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 10px 0;">
          <h3 style="color: #8B5CF6; margin: 0 0 10px 0;">${formatServiceType(reservation.serviceType)}</h3>
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

  // Extract payment section generation to avoid nested ternary
  let paymentSection = "";
  if (payment) {
    const transactionIdSection = payment.paymentIntentId
      ? `<p><strong>Transaction ID:</strong> ${payment.paymentIntentId}</p>`
      : "";

    paymentSection = `
    <div style="${EMAIL_STYLES.infoBox}">
      <h3 style="color: #8B5CF6; margin: 0 0 10px 0;">Payment Information</h3>
      <p><strong>Amount Paid:</strong> ${formatCurrencyDisplay(payment.amount, { currency: payment.currency })}</p>
      <p><strong>Payment Method:</strong> ${payment.paymentMethod || "Card"}</p>
      ${transactionIdSection}
    </div>
  `;
  }

  return generateEmailWrapper(
    "Payment Confirmed!",
    `Your reservation${reservations.length > 1 ? "s are" : " is"} now confirmed`,
    `
      <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
        Thank you for your payment! Your reservation${reservations.length > 1 ? "s have" : " has"} been confirmed and we're excited to work with you.
      </p>
      
      <h2 style="color: #8B5CF6; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px;">Reservation Details</h2>
      ${reservationsList}
      
      ${paymentSection}
      
      <div style="${EMAIL_STYLES.successBox}">
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
    `,
    "This is an automated confirmation email. Please do not reply to this message."
  );
};
/**
 * Generate payment failure email template
 */
export const generatePaymentFailureEmail = (
  reservationIds: string[],
  payment: PaymentData,
  failureReason?: string
): string => {
  return generateEmailWrapper(
    "Payment Failed",
    "We couldn't process your reservation payment",
    `
      <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
        We're sorry, but we encountered an issue processing your payment for your reservation${reservationIds.length > 1 ? "s" : ""}. 
        Don't worry - your reservation${reservationIds.length > 1 ? "s are" : " is"} still held for you.
      </p>
      
      <div style="${EMAIL_STYLES.errorBox}">
        <h3 style="color: #DC2626; margin: 0 0 10px 0;">Payment Details</h3>
        <p><strong>Amount:</strong> ${formatCurrencyDisplay(payment.amount, { currency: payment.currency })}</p>
        ${payment.paymentIntentId ? `<p><strong>Payment Intent ID:</strong> ${payment.paymentIntentId}</p>` : ""}
        <p><strong>Failure Reason:</strong> ${failureReason || "Payment processing failed"}</p>
      </div>
      
      <div style="${EMAIL_STYLES.infoBox}">
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
           style="${EMAIL_STYLES.button}">
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
    `,
    `Your reservation${reservationIds.length > 1 ? "s are" : " is"} held for 24 hours while you resolve the payment issue.`
  );
};

/**
 * Generate reservation status update email template
 */
export const generateReservationStatusUpdateEmail = (
  reservation: ReservationEmailData,
  oldStatus: string,
  newStatus: string
): string => {
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

  return generateEmailWrapper(
    "Reservation Update",
    "Your reservation status has been updated",
    `
      <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
        ${statusMessages[newStatus] || "We wanted to let you know that your reservation status has been updated."}
      </p>
      
      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #8B5CF6; margin: 0 0 15px 0;">${formatServiceType(reservation.serviceType)}</h3>
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
      
      <div style="${EMAIL_STYLES.infoBox}">
        <h3 style="color: #8B5CF6; margin: 0 0 10px 0;">Status Update</h3>
        <p><strong>Previous Status:</strong> <span style="color: ${statusColors[oldStatus] || "#6B7280"}; font-weight: bold;">${oldStatus.toUpperCase()}</span></p>
        <p><strong>New Status:</strong> <span style="color: ${statusColors[newStatus] || "#6B7280"}; font-weight: bold;">${newStatus.toUpperCase()}</span></p>
        ${reservation.notes ? `<p><strong>Notes:</strong> ${reservation.notes}</p>` : ""}
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
        <p style="color: #6B7280; margin-bottom: 10px;">Questions about your reservation?</p>
        <p style="color: #8B5CF6; font-weight: bold;">
          � c3ontact@brolabentertainment.com<br>
          📞 +33 (0)1 XX XX XX XX
        </p>
      </div>
    `
  );
};

/**
 * Generate admin notification email template
 */
export const generateAdminNotificationEmail = (
  user: User,
  reservation: ReservationEmailData
): string => {
  const date = new Date(reservation.preferredDate);
  const userName =
    user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown User";

  return generateEmailWrapper(
    "🔔 New Reservation",
    "A new reservation has been created",
    `
      <div style="${EMAIL_STYLES.warningBox}">
        <h3 style="color: #D97706; margin: 0 0 15px 0;">Reservation Details</h3>
        <p><strong>Service:</strong> ${formatServiceType(reservation.serviceType)}</p>
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
      
      <div style="${EMAIL_STYLES.infoBox}">
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
           style="${EMAIL_STYLES.button}">
          View Reservation
        </a>
      </div>
    `,
    "Admin Notification System"
  );
};

/**
 * Generate reservation reminder email template
 */
export const generateReservationReminderEmail = (reservation: ReservationEmailData): string => {
  const date = new Date(reservation.preferredDate);

  return generateEmailWrapper(
    "⏰ Session Reminder",
    "Your session is tomorrow!",
    `
      <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
        This is a friendly reminder that your session is scheduled for tomorrow. We're excited to work with you!
      </p>
      
      <div style="${EMAIL_STYLES.warningBox}">
        <h3 style="color: #D97706; margin: 0 0 15px 0;">${formatServiceType(reservation.serviceType)}</h3>
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
      
      <div style="${EMAIL_STYLES.infoBox}">
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
    `,
    "We look forward to seeing you tomorrow!"
  );
};

/**
 * Generate payment confirmation email template
 */
export const generatePaymentConfirmationEmail = (
  reservations: ReservationEmailData[],
  payment: PaymentData
): string => {
  const reservationsList = reservations
    .map(reservation => {
      const date = new Date(reservation.preferredDate);
      return `
        <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 10px 0;">
          <h4 style="color: #8B5CF6; margin: 0 0 10px 0;">${formatServiceType(reservation.serviceType)}</h4>
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

  return generateEmailWrapper(
    "💳 Payment Confirmed!",
    "Your payment has been processed successfully",
    `
      <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
        Thank you! Your payment has been processed successfully. Your reservation${reservations.length > 1 ? "s are" : " is"} now fully confirmed.
      </p>
      
      <div style="${EMAIL_STYLES.successBox}">
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
    `,
    "Keep this email as your payment receipt."
  );
};

// ============================================================================
// EMAIL SENDING FUNCTIONS (Enhanced with service integration)
// ============================================================================

import { reservationEmailService } from "../services/ReservationEmailService";

/**
 * Send reservation confirmation email using enhanced service
 */
export const sendReservationConfirmationEmail = async (
  userEmail: string,
  reservations: ReservationEmailData[],
  payment?: PaymentData
): Promise<void> => {
  const user: User = {
    id: "unknown",
    email: userEmail,
    fullName: reservations[0]?.details?.name || "User",
  };

  const result = await reservationEmailService.sendReservationConfirmation(
    user,
    reservations,
    payment
  );

  if (!result.success) {
    logger.error("Failed to send reservation confirmation email", {
      error: result.error,
      reservationCount: reservations.length,
    });
    throw new Error(`Email sending failed: ${result.error}`);
  }

  logger.info("Reservation confirmation email sent successfully", {
    attempts: result.attempts,
    hasReservationId: !!reservations[0]?.id,
    reservationCount: reservations.length,
  });
};

/**
 * Send payment failure notification email using enhanced service
 */
export const sendPaymentFailureEmail = async (
  userEmail: string,
  reservationIds: string[],
  payment: PaymentData,
  failureReason?: string
): Promise<void> => {
  const user: User = {
    id: "unknown",
    email: userEmail,
  };

  const result = await reservationEmailService.sendPaymentFailure(
    user,
    reservationIds,
    payment,
    failureReason
  );

  if (!result.success) {
    logger.error("Failed to send payment failure email", {
      error: result.error,
      reservationIdCount: reservationIds.length,
    });
    throw new Error(`Email sending failed: ${result.error}`);
  }

  logger.info("Payment failure email sent successfully", {
    attempts: result.attempts,
    reservationIdCount: reservationIds.length,
  });
};

/**
 * Send reservation status update email using enhanced service
 */
export const sendReservationStatusUpdateEmail = async (
  userEmail: string,
  reservation: ReservationEmailData,
  oldStatus: string,
  newStatus: string
): Promise<void> => {
  const user: User = {
    id: "unknown",
    email: userEmail,
    fullName: reservation.details?.name || "User",
  };

  const result = await reservationEmailService.sendStatusUpdate(
    user,
    reservation,
    oldStatus,
    newStatus
  );

  if (!result.success) {
    logger.error("Failed to send status update email", {
      error: result.error,
      reservationId: reservation.id,
      oldStatus,
      newStatus,
    });
    throw new Error(`Email sending failed: ${result.error}`);
  }

  logger.info("Status update email sent successfully", {
    attempts: result.attempts,
    hasReservationId: !!reservation.id,
    oldStatus,
    newStatus,
  });
};

/**
 * Send admin notification for new reservation
 */
export const sendAdminReservationNotification = async (
  user: User,
  reservation: ReservationEmailData
): Promise<void> => {
  const result = await reservationEmailService.sendAdminNotification(user, reservation);

  if (!result.success) {
    logger.error("Failed to send admin notification email", {
      error: result.error,
      reservationId: reservation.id,
      userId: user.id,
    });
    throw new Error(`Email sending failed: ${result.error}`);
  }

  logger.info("Admin notification email sent successfully", {
    attempts: result.attempts,
    hasReservationId: !!reservation.id,
    userId: user.id,
  });
};

/**
 * Send payment confirmation email
 */
export const sendPaymentConfirmationEmail = async (
  userEmail: string,
  reservations: ReservationEmailData[],
  payment: PaymentData
): Promise<void> => {
  const user: User = {
    id: "unknown",
    email: userEmail,
    fullName: reservations[0]?.details?.name || "User",
  };

  const result = await reservationEmailService.sendPaymentConfirmation(user, reservations, payment);

  if (!result.success) {
    logger.error("Failed to send payment confirmation email", {
      error: result.error,
      reservationCount: reservations.length,
    });
    throw new Error(`Email sending failed: ${result.error}`);
  }

  logger.info("Payment confirmation email sent successfully", {
    attempts: result.attempts,
    hasReservationId: !!reservations[0]?.id,
    reservationCount: reservations.length,
  });
};

/**
 * Send reservation reminder email (24 hours before)
 */
export const sendReservationReminderEmail = async (
  userEmail: string,
  reservation: ReservationEmailData
): Promise<void> => {
  const user: User = {
    id: "unknown",
    email: userEmail,
    fullName: reservation.details?.name || "User",
  };

  const result = await reservationEmailService.sendReservationReminder(user, reservation);

  if (!result.success) {
    logger.error("Failed to send reservation reminder email", {
      error: result.error,
      reservationId: reservation.id,
    });
    throw new Error(`Email sending failed: ${result.error}`);
  }

  logger.info("Reservation reminder email sent successfully", {
    attempts: result.attempts,
    hasReservationId: !!reservation.id,
    reservationId: reservation.id,
  });
};

// Export default for backward compatibility
export default emailTemplates;
