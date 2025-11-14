#!/usr/bin/env node

/**
 * Test script pour vérifier que le webhook session.created fonctionne
 */

async function testSessionWebhook() {
  console.log("🧪 Test du webhook session.created...\n");

  // URL du webhook Convex en production
  const webhookUrl = "https://amicable-lemming-546.convex.cloud/api/webhooks/clerk";

  const testPayload = {
    type: "session.created",
    data: {
      user_id: "user_test_123",
      id: "sess_test_123",
      email_addresses: [
        {
          email_address: "test@example.com",
        },
      ],
      username: "testuser",
      first_name: "Test",
      last_name: "User",
      image_url: "https://example.com/avatar.jpg",
    },
  };

  try {
    console.log("📤 Envoi du webhook de test...");
    console.log(`URL: ${webhookUrl}`);
    console.log(`Payload:`, JSON.stringify(testPayload, null, 2));

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    });

    console.log(`\n📥 Réponse reçue: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const text = await response.text();
      console.log(`✅ Webhook traité avec succès !`);
      console.log(`Réponse: ${text}`);
      console.log(
        `\n🎯 Prochaine étape: Vérifier dans Convex Dashboard si une entrée activityLog a été créée`
      );
      console.log(`   → Action: "user_login"`);
      console.log(`   → UserId: devrait correspondre à l'utilisateur test`);
    } else {
      const errorText = await response.text();
      console.error(`❌ Erreur: ${errorText}`);
    }
  } catch (error) {
    console.error(`❌ Erreur lors du test:`, error);
  }
}

testSessionWebhook();
