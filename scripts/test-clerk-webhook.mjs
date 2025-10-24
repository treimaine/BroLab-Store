#!/usr/bin/env node

/**
 * Script pour tester le webhook Clerk après correction
 */

console.log("🧪 Test du webhook Clerk après correction\n");

async function testWebhookEndpoint() {
  console.log("1. 🔗 Test de l'endpoint webhook...");

  const webhookUrl = "https://amicable-lemming-546.convex.cloud/api/webhooks/clerk";

  try {
    // Test simple de l'endpoint (sans signature valide, mais pour voir s'il répond)
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "test",
        data: { id: "test" },
      }),
    });

    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${await response.text()}`);

    if (response.status === 400) {
      console.log("   ✅ Endpoint répond (erreur 400 attendue sans signature valide)");
    } else {
      console.log("   ⚠️  Réponse inattendue");
    }
  } catch (error) {
    console.error("   ❌ Erreur:", error.message);
  }
}

function showNextSteps() {
  console.log("\n🎯 Prochaines étapes:");
  console.log("1. Le webhook Convex est maintenant ACTIVÉ");
  console.log("2. L'endpoint est: https://amicable-lemming-546.convex.cloud/api/webhooks/clerk");
  console.log("3. Tester en se déconnectant/reconnectant");
  console.log("4. Vérifier dans Clerk Dashboard si les webhooks passent maintenant");

  console.log("\n📋 Checklist de validation:");
  console.log("□ Se déconnecter de l'application");
  console.log("□ Se reconnecter");
  console.log("□ Vérifier dans Clerk Dashboard → Webhooks → Logs");
  console.log("□ Chercher des événements 'session.created' avec status SUCCESS");
  console.log("□ Vérifier dans le dashboard si la date est mise à jour");

  console.log("\n🔍 Si les webhooks échouent encore:");
  console.log("1. Vérifier que CLERK_WEBHOOK_SECRET est configuré");
  console.log("2. Vérifier les logs Convex pour voir les erreurs");
  console.log("3. Tester avec l'outil de test intégré de Clerk");
}

function showClerkConfig() {
  console.log("\n⚙️  Configuration Clerk requise:");
  console.log("URL du webhook: https://amicable-lemming-546.convex.cloud/api/webhooks/clerk");
  console.log("Méthode: POST");
  console.log("Événements à cocher:");
  console.log("  ✅ user.created");
  console.log("  ✅ user.updated");
  console.log("  ✅ session.created");
  console.log("  ✅ session.ended (optionnel)");

  console.log("\n🔐 Variables d'environnement requises:");
  console.log("CLERK_WEBHOOK_SECRET=whsec_...");
  console.log("(Disponible dans Clerk Dashboard → Webhooks → Votre endpoint → Signing Secret)");
}

async function main() {
  console.log("🚀 Test du webhook Clerk - Correction de la synchronisation");
  console.log("=".repeat(70) + "\n");

  await testWebhookEndpoint();

  console.log("\n" + "=".repeat(70));
  showClerkConfig();

  console.log("\n" + "=".repeat(70));
  showNextSteps();

  console.log("\n✅ Correction appliquée !");
  console.log("🎯 Le webhook Clerk est maintenant activé et devrait traiter les événements");
  console.log("⚡ Testez en vous reconnectant pour voir si le problème est résolu");
}

main().catch(console.error);
