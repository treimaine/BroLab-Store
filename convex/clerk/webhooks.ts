import { httpAction } from "../_generated/server";

// Types pour les webhooks Clerk
interface ClerkWebhookEvent {
  type: string;
  data: any;
}

// Webhook principal pour Clerk
export const clerkWebhook = httpAction(async (ctx, request) => {
  try {
    console.log("🔄 Clerk webhook received");

    // Lire le corps de la requête
    const body = await request.text();
    const event = JSON.parse(body) as ClerkWebhookEvent;

    console.log("📦 Processing event:", event.type);

    // Traiter l'événement selon son type
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data);
        break;
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data);
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data);
        break;
      default:
        console.log("⚠️ Unhandled webhook type:", event.type);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("❌ Error processing Clerk webhook:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});

// Fonction pour traiter le checkout complété
async function handleCheckoutCompleted(data: any) {
  console.log("✅ Checkout completed:", data);

  // Extraire les métadonnées de la réservation
  const metadata = data.metadata;
  if (metadata && metadata.reservation_id) {
    console.log("✅ Reservation ID found:", metadata.reservation_id);
    // Ici vous pouvez ajouter la logique pour mettre à jour le statut
    // de la réservation dans votre base de données
  }
}

// Fonction pour traiter le paiement réussi
async function handlePaymentSucceeded(data: any) {
  console.log("✅ Payment succeeded:", data);

  // Traiter le paiement réussi
  // Ici vous pouvez ajouter la logique pour mettre à jour les statuts
  // ou créer des enregistrements de paiement
}

// Fonction pour traiter le paiement de facture réussi
async function handleInvoicePaymentSucceeded(data: any) {
  console.log("✅ Invoice payment succeeded:", data);

  // Traiter le paiement de facture réussi
  // Ici vous pouvez ajouter la logique pour les abonnements
}
