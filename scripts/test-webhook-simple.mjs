#!/usr/bin/env node

/**
 * Test simple de l'endpoint webhook
 */

async function testWebhook() {
  console.log("🧪 Test de l'endpoint webhook simplifié...\n");

  const url = "https://amicable-lemming-546.convex.cloud/api/webhooks/clerk";

  const testPayload = {
    type: "session.created",
    data: {
      id: "test_session_123",
      user_id: "user_test_456",
    },
  };

  try {
    console.log(`📡 Envoi vers: ${url}`);
    console.log(`📦 Payload:`, JSON.stringify(testPayload, null, 2));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    });

    console.log(`\n📊 Résultat:`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Status Text: ${response.statusText}`);

    const responseText = await response.text();
    console.log(`   Response: ${responseText}`);

    if (response.status === 200) {
      console.log(`\n✅ SUCCESS! L'endpoint fonctionne`);
      console.log(`🎯 Maintenant, mettez à jour l'URL dans Clerk Dashboard`);
    } else if (response.status === 404) {
      console.log(`\n❌ ERREUR 404: L'endpoint n'existe pas`);
      console.log(`🔧 Vérifiez que le déploiement Convex a réussi`);
    } else if (response.status === 500) {
      console.log(`\n⚠️  ERREUR 500: Problème dans le code du webhook`);
      console.log(`🔍 Vérifiez les logs Convex pour plus de détails`);
    } else {
      console.log(`\n❓ Réponse inattendue`);
    }
  } catch (error) {
    console.error(`\n❌ Erreur de connexion:`, error.message);
  }
}

testWebhook();
