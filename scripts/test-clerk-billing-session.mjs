#!/usr/bin/env node

/**
 * Test script pour vérifier que clerk-billing gère maintenant session.created
 */

async function testClerkBillingSession() {
  console.log("🧪 Test du webhook clerk-billing avec session.created...\n");

  // URL du webhook via ngrok (d'après votre capture d'écran)
  const webhookUrl = "https://sharell-untidying-kam.ngrok-free.dev/api/webhooks/clerk-billing";

  const testPayload = {
    type: "session.created",
    data: {
      user_id: "user_2qKjH3eS3IzeeqI9BRB57XCAF",
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
    console.log(`Event Type: ${testPayload.type}`);
    console.log(`User ID: ${testPayload.data.user_id}\n`);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    });

    console.log(`📥 Réponse reçue: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Webhook traité avec succès !`);
      console.log(`Réponse:`, JSON.stringify(result, null, 2));

      if (result.handled === "user_session") {
        console.log(`\n🎯 SUCCESS ! Le webhook session.created est maintenant géré !`);
        console.log(`\n📊 Prochaine étape: Vérifier dans Convex Dashboard`);
        console.log(`   → Table: activityLog`);
        console.log(`   → Action: "user_login"`);
        console.log(`   → UserId: devrait correspondre à votre utilisateur`);
        console.log(`   → Timestamp: devrait être récent (maintenant)`);
      }
    } else {
      const errorText = await response.text();
      console.error(`❌ Erreur: ${errorText}`);
    }
  } catch (error) {
    console.error(`❌ Erreur lors du test:`, error);
    console.log(`\n💡 Assurez-vous que:`);
    console.log(`   1. Le serveur Express est démarré (npm run server)`);
    console.log(`   2. ngrok est actif et pointe vers le bon port`);
    console.log(`   3. L'URL ngrok est à jour dans Clerk Dashboard`);
  }
}

testClerkBillingSession();
