// Configuration PayPal côté client
// ✅ CORRECTION: Utilise approvalLink et gère correctement les paramètres PayPal
export const PAYPAL_CONFIG = {
  // Clé client PayPal Sandbox
  clientId:
    import.meta.env.VITE_PAYPAL_CLIENT_ID ||
    "AWxHC5SGhCObxTuGL0JoADJnAwZ5UreaaDGI1KYSyEk3S8Wg2Whjqh6oB6KsYmD_-QRHsevuKNf8gV9q",

  // Environnement (sandbox pour les tests)
  environment: "sandbox",

  // Devise par défaut
  currency: "EUR",

  // Configuration des boutons PayPal
  buttonStyle: {
    layout: "vertical",
    color: "blue",
    shape: "rect",
    label: "pay",
  },

  // Configuration des services
  services: {
    mixing: {
      name: "Mixing & Mastering",
      price: 99.99,
      description: "Service de mixing et mastering professionnel",
    },
    recording: {
      name: "Session d'Enregistrement",
      price: 149.99,
      description: "Session d'enregistrement en studio",
    },
    consultation: {
      name: "Consultation Production",
      price: 49.99,
      description: "Consultation en production musicale",
    },
  },
};

// Types pour PayPal
// ✅ CORRECTION: Types clarifiés pour éviter la confusion
export interface PayPalOrder {
  id: string; // ✅ CORRECTION: orderId PayPal (pas reservationId)
  status: string;
  approvalLink: string; // ✅ CORRECTION: approvalLink PayPal
}

export interface PayPalPaymentRequest {
  serviceType: string;
  amount: number;
  currency: string;
  description: string;
  reservationId: string; // ✅ CORRECTION: ID de réservation BroLab
  customerEmail: string;
}

export interface PayPalPaymentResponse {
  success: boolean;
  paymentUrl?: string; // ✅ CORRECTION: approvalLink PayPal
  orderId?: string; // ✅ CORRECTION: orderId PayPal (pas reservationId)
  error?: string;
}

// Configuration des webhooks (pour référence)
export const PAYPAL_WEBHOOK_EVENTS = [
  "PAYMENT.CAPTURE.COMPLETED",
  "PAYMENT.CAPTURE.DENIED",
  "PAYMENT.CAPTURE.REFUNDED",
  "PAYMENT.CAPTURE.PENDING",
];

// ✅ CORRECTION: Constantes pour les paramètres PayPal
export const PAYPAL_PARAMS = {
  // Paramètres de retour PayPal
  TOKEN: "token", // orderId PayPal
  PAYER_ID: "PayerID", // ID de l'acheteur PayPal
  
  // URLs de retour
  SUCCESS_URL: "/payment/success",
  CANCEL_URL: "/payment/cancel",
  ERROR_URL: "/payment/error", // ✅ CORRECTION: Ajout de l'URL d'erreur
  
  // Validation
  MIN_ORDER_ID_LENGTH: 10, // Longueur minimale d'un orderId PayPal
  MAX_AMOUNT: 10000, // Montant maximum en euros
  SUPPORTED_CURRENCIES: ["EUR", "USD"],
};

export default PAYPAL_CONFIG;
