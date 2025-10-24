#!/usr/bin/env node

/**
 * Test de l'endpoint Express webhook
 */

async function testExpressWebhook() {
  console.log("🧪 Test de l'endpoint Express webhook...\n");

  const url = "http://localhost:5000/api/webhooks/clerk";

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
      console.log(`\n✅ SUCCESS! L'endpoint Express fonctionne`);
      console.log(`🎯 Maintenant, mettez à jour l'URL dans Clerk Dashboard:`);
      console.log(`   ${url}`);
    } else if (response.status === 404) {
      console.log(`\n❌ ERREUR 404: Le serveur Express n'est pas démarré`);
      console.log(`🔧 Démarrez le serveur avec: npm run dev`);
    } else if (response.status === 500) {
      console.log(`\n⚠️  ERREUR 500: Problème dans le code du webhook`);
      console.log(`🔍 Vérifiez les logs du serveur Express`);
    } else {
      console.log(`\n❓ Réponse inattendue`);
    }
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      console.error(`\n❌ Connexion refusée: Le serveur Express n'est pas démarré`);
      console.log(`🚀 Démarrez le serveur avec: npm run dev`);
    } else {
      console.error(`\n❌ Erreur de connexion:`, error.message);
    }
  }
}

async function testHealthEndpoint() {
  console.log("\n🏥 Test de l'endpoint de santé...");

  const url = "http://localhost:5000/api/webhooks/test";

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, data);

    if (response.status === 200) {
      console.log(`   ✅ Endpoint de santé OK`);
    }
  } catch (error) {
    console.log(`   ❌ Endpoint de santé non accessible`);
  }
}

async function main() {
  console.log("🚀 Test de l'endpoint Express webhook");
  console.log("=".repeat(50) + "\n");

  await testExpressWebhook();
  await testHealthEndpoint();

  console.log("\n" + "=".repeat(50));
  console.log("📋 Instructions:");
  console.log("1. Si le serveur n'est pas démarré: npm run dev");
  console.log("2. Si ça fonctionne: Mettre à jour l'URL dans Clerk");
  console.log("3. URL à utiliser: http://localhost:5000/api/webhooks/clerk");
}

main().catch(console.error);
