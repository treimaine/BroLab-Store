import { PayPalPaymentRequest, PayPalPaymentResponse } from "../config/paypal";

/**
 * Service PayPal côté client
 * Gère les appels API vers le serveur pour les paiements PayPal
 * ✅ CORRECTION: Utilise approvalLink et gère correctement les paramètres PayPal
 */
export class PayPalClientService {
  private static readonly API_BASE = "/api/payment/paypal";

  /**
   * Crée une commande PayPal pour le paiement d'une réservation
   * ✅ CORRECTION: Utilise approvalLink au lieu de paymentUrl
   */
  static async createPaymentOrder(
    paymentRequest: PayPalPaymentRequest,
    authHeaders: HeadersInit
  ): Promise<PayPalPaymentResponse> {
    try {
      console.log("🚀 Creating PayPal payment order:", paymentRequest);

      const response = await fetch(`${this.API_BASE}/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(paymentRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("✅ PayPal order created successfully:", result);

      // ✅ CORRECTION: Utiliser approvalLink au lieu de paymentUrl
      return {
        success: true,
        paymentUrl: result.approvalLink, // ✅ CORRECTION: approvalLink PayPal
        orderId: result.orderId,
      };
    } catch (error) {
      console.error("❌ Error creating PayPal order:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create PayPal order",
      };
    }
  }

  /**
   * Capture un paiement PayPal après approbation
   * ✅ CORRECTION: Utilise l'orderId PayPal (token) pour la capture
   */
  static async capturePayment(
    orderId: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      console.log("🎯 Capturing PayPal payment for order:", orderId);

      // ✅ CORRECTION: orderId est le token PayPal, pas le reservationId
      if (!orderId || orderId.length < 10) {
        throw new Error("Invalid PayPal order ID");
      }

      const response = await fetch(`${this.API_BASE}/capture-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("✅ Payment captured successfully:", result);

      return {
        success: true,
        transactionId: result.transactionId,
      };
    } catch (error) {
      console.error("❌ Error capturing payment:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to capture payment",
      };
    }
  }

  /**
   * Obtient les détails d'une commande PayPal
   * ✅ CORRECTION: Utilise l'orderId PayPal
   */
  static async getOrderDetails(orderId: string): Promise<any> {
    try {
      console.log("📋 Getting PayPal order details:", orderId);

      // ✅ CORRECTION: orderId est le token PayPal
      if (!orderId || orderId.length < 10) {
        throw new Error("Invalid PayPal order ID");
      }

      const response = await fetch(`${this.API_BASE}/order/${orderId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.order;
    } catch (error) {
      console.error("❌ Error getting order details:", error);
      throw error;
    }
  }

  /**
   * Vérifie la santé du service PayPal
   */
  static async checkHealth(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch(`${this.API_BASE}/health`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      console.error("❌ PayPal service health check failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }

  /**
   * Redirige vers PayPal pour le paiement
   * ✅ CORRECTION: Utilise l'approvalLink PayPal direct
   */
  static redirectToPayPal(approvalLink: string): void {
    try {
      console.log("🔄 Redirecting to PayPal:", approvalLink);

      // ✅ CORRECTION: Vérifier que c'est bien une URL PayPal
      if (!approvalLink.includes("paypal.com")) {
        throw new Error("Invalid PayPal approval link");
      }

      window.location.href = approvalLink;
    } catch (error) {
      console.error("❌ Error redirecting to PayPal:", error);
      throw error;
    }
  }

  /**
   * Gère le retour de PayPal après paiement
   * ✅ CORRECTION: Utilise le token PayPal (orderId) pour la capture
   */
  static async handlePayPalReturn(
    token: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      console.log("🔄 Handling PayPal return with token:", token);

      // ✅ CORRECTION: token est l'orderId PayPal, pas le reservationId
      if (!token || token.length < 10) {
        throw new Error("Invalid PayPal token");
      }

      // Capture le paiement avec le token retourné
      const result = await this.capturePayment(token);

      if (result.success) {
        console.log("✅ PayPal payment completed successfully");
        return result;
      } else {
        console.error("❌ PayPal payment failed:", result.error);
        return result;
      }
    } catch (error) {
      console.error("❌ Error handling PayPal return:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to handle PayPal return",
      };
    }
  }

  /**
   * Valide les données de paiement avant envoi
   * ✅ CORRECTION: Validation renforcée
   */
  static validatePaymentRequest(paymentRequest: PayPalPaymentRequest): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!paymentRequest.serviceType) {
      errors.push("Service type is required");
    }

    if (!paymentRequest.amount || paymentRequest.amount <= 0) {
      errors.push("Valid amount is required");
    }

    if (!paymentRequest.currency) {
      errors.push("Currency is required");
    }

    if (!paymentRequest.description) {
      errors.push("Description is required");
    }

    if (!paymentRequest.reservationId) {
      errors.push("Reservation ID is required");
    }

    if (!paymentRequest.customerEmail) {
      errors.push("Customer email is required");
    }

    // ✅ CORRECTION: Validation supplémentaire
    if (paymentRequest.amount > 10000) {
      errors.push("Amount exceeds maximum limit");
    }

    if (!["EUR", "USD"].includes(paymentRequest.currency.toUpperCase())) {
      errors.push("Unsupported currency");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default PayPalClientService;
