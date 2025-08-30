import { Client, Environment } from "@paypal/paypal-server-sdk";

// Configuration PayPal (sandbox ou production selon PAYPAL_MODE)
const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
const paypalMode = process.env.PAYPAL_MODE || "sandbox";

if (!clientId || !clientSecret) {
  throw new Error("PayPal credentials are not configured. Please check your .env file.");
}

console.log(`🔐 PayPal ${paypalMode.toUpperCase()} credentials loaded:`, {
  clientId: clientId ? `${clientId.substring(0, 8)}...` : "undefined",
  clientSecret: clientSecret ? `${clientSecret.substring(0, 8)}...` : "undefined",
  mode: paypalMode,
});

// Configuration de l'environnement (sandbox par défaut pour les tests)
const environment = paypalMode === "production" ? Environment.Production : Environment.Sandbox;

// Client PayPal avec credentials - Configuration pour v1.1.0 (LATEST)
export const paypalClient = new Client({
  environment,
  clientId,
  clientSecret,
} as any); // Type assertion nécessaire pour la compatibilité v1.1.0

// Configuration des webhooks
export const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID;

// ✅ CORRECTION: URLs de redirection vers les routes de capture PayPal
// PayPal renverra l'utilisateur vers /api/paypal/capture/:token
export const PAYPAL_RETURN_URL = `${process.env.SERVER_URL || "http://localhost:5000"}/api/paypal/capture`;
export const PAYPAL_CANCEL_URL = `${process.env.CLIENT_URL || "https://brolabentertainment.com"}/payment/cancel`;

// Configuration des devises supportées
export const SUPPORTED_CURRENCIES = ["EUR", "USD"];

// Configuration des plans de service
export const SERVICE_PLANS = {
  mixing: {
    name: "Mixing & Mastering",
    price: 99.99,
    currency: "EUR",
    description: "Service de mixing et mastering professionnel",
  },
  recording: {
    name: "Session d'Enregistrement",
    price: 149.99,
    currency: "EUR",
    description: "Session d'enregistrement en studio",
  },
  consultation: {
    name: "Consultation Production",
    price: 49.99,
    currency: "EUR",
    description: "Consultation en production musicale",
  },
};

export default {
  client: paypalClient,
  environment,
  webhookId: PAYPAL_WEBHOOK_ID,
  returnUrl: PAYPAL_RETURN_URL,
  cancelUrl: PAYPAL_CANCEL_URL,
  supportedCurrencies: SUPPORTED_CURRENCIES,
  servicePlans: SERVICE_PLANS,
};
