#!/usr/bin/env node

/**
 * Script de diagnostic détaillé pour les webhooks Clerk
 */

console.log("🔍 Diagnostic détaillé des webhooks Clerk\n");

async function testWebhookEndpoint() {
  console.log("1. 🌐 Test de connectivité de l'endpoint...");

  const devUrl = "https://agile-boar-163.convex.cloud/api/webhooks/clerk";
  const prodUrl = "https://amicable-lemming-546.convex.cloud/api/webhooks/clerk";

  const urls = [
    { name: "Développement", url: devUrl },
    { name: "Production", url: prodUrl },
  ];

  for (const { name, url } of urls) {
    console.log(`\n   Testing ${name}: ${url}`);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "test",
          data: { id: "test" },
        }),
      });

      const responseText = await response.text();
      console.log(`   Status: ${response.status}`);
      console.log(`   Response: ${responseText}`);

      if (response.status === 400 && responseText.includes("Missing svix headers")) {
        console.log(`   ✅ ${name} - Endpoint fonctionne (erreur attendue sans headers svix)`);
      } else if (
        response.status === 500 &&
        responseText.includes("Webhook secret not configured")
      ) {
        console.log(`   ⚠️  ${name} - CLERK_WEBHOOK_SECRET manquant`);
      } else if (response.status === 404) {
        console.log(`   ❌ ${name} - Endpoint non trouvé`);
      } else {
        console.log(`   ❓ ${name} - Réponse inattendue`);
      }
    } catch (error) {
      console.log(`   ❌ ${name} - Erreur: ${error.message}`);
    }
  }
}

function checkClerkConfiguration() {
  console.log("\n2. 📋 Configuration Clerk requise:");

  console.log("\n   URLs possibles pour votre webhook:");
  console.log("   🔧 Développement: https://agile-boar-163.convex.cloud/api/webhooks/clerk");
  console.log("   🚀 Production: https://amicable-lemming-546.convex.cloud/api/webhooks/clerk");

  console.log("\n   Événements à configurer dans Clerk:");
  console.log("   ✅ user.created");
  console.log("   ✅ user.updated");
  console.log("   ✅ session.created");
  console.log("   ✅ session.ended (optionnel)");

  console.log("\n   Variables d'environnement Convex requises:");
  console.log("   CLERK_WEBHOOK_SECRET=whsec_...");
}

function analyzeFailureReasons() {
  console.log("\n3. 🔍 Causes possibles des échecs:");

  const causes = [
    {
      cause: "URL incorrecte dans Clerk",
      description: "L'URL configurée dans Clerk ne correspond pas à votre déploiement",
      solution: "Vérifier que l'URL dans Clerk Dashboard correspond à votre environnement",
    },
    {
      cause: "CLERK_WEBHOOK_SECRET manquant",
      description: "La variable d'environnement n'est pas configurée dans Convex",
      solution:
        "Ajouter CLERK_WEBHOOK_SECRET dans Convex Dashboard → Settings → Environment Variables",
    },
    {
      cause: "Secret incorrect",
      description: "Le secret configuré ne correspond pas à celui de Clerk",
      solution: "Copier le bon secret depuis Clerk Dashboard → Webhooks → Signing Secret",
    },
    {
      cause: "Problème de déploiement",
      description: "Les changements ne sont pas déployés sur le bon environnement",
      solution: "Redéployer avec 'npx convex deploy'",
    },
    {
      cause: "Timeout réseau",
      description: "Clerk n'arrive pas à joindre votre endpoint dans les temps",
      solution: "Vérifier la latence et optimiser le webhook",
    },
  ];

  causes.forEach((item, index) => {
    console.log(`\n   ${index + 1}. ${item.cause}`);
    console.log(`      Description: ${item.description}`);
    console.log(`      Solution: ${item.solution}`);
  });
}

function generateTestCommands() {
  console.log("\n4. ⚡ Commandes de test à exécuter:");

  console.log("\n   A. Tester l'endpoint manuellement:");
  console.log(`   curl -X POST "https://agile-boar-163.convex.cloud/api/webhooks/clerk" \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -d '{"type":"test","data":{"id":"test"}}'`);

  console.log("\n   B. Vérifier les logs Convex:");
  console.log("   1. Aller sur https://dashboard.convex.dev/");
  console.log("   2. Sélectionner votre déploiement");
  console.log("   3. Aller dans 'Logs'");
  console.log("   4. Se reconnecter à l'app et observer les logs");

  console.log("\n   C. Tester depuis Clerk:");
  console.log("   1. Aller dans Clerk Dashboard → Webhooks");
  console.log("   2. Cliquer sur votre endpoint");
  console.log("   3. Utiliser l'outil 'Test' intégré");
  console.log("   4. Observer la réponse");
}

function showNextSteps() {
  console.log("\n5. 🎯 Plan d'action étape par étape:");

  const steps = [
    "Vérifier que l'URL dans Clerk correspond à votre environnement actuel",
    "Configurer CLERK_WEBHOOK_SECRET dans Convex Dashboard",
    "Redéployer Convex avec 'npx convex deploy'",
    "Tester l'endpoint manuellement avec curl",
    "Se reconnecter à l'application et vérifier les logs",
    "Utiliser l'outil de test intégré de Clerk",
    "Vérifier que les événements passent en SUCCESS",
  ];

  steps.forEach((step, index) => {
    console.log(`   ${index + 1}. ${step}`);
  });

  console.log("\n   🚨 Si ça ne fonctionne toujours pas:");
  console.log("   → Partager les logs d'erreur Convex");
  console.log("   → Vérifier la configuration réseau");
  console.log("   → Tester avec un webhook temporaire (webhook.site)");
}

async function main() {
  console.log("🚀 Diagnostic détaillé des webhooks Clerk");
  console.log("=".repeat(70) + "\n");

  await testWebhookEndpoint();

  checkClerkConfiguration();

  analyzeFailureReasons();

  generateTestCommands();

  showNextSteps();

  console.log("\n" + "=".repeat(70));
  console.log("✅ Diagnostic terminé !");
  console.log("🎯 Suivez le plan d'action pour résoudre les échecs de webhook");
  console.log("📞 Si le problème persiste, partagez les logs d'erreur Convex");
}

main().catch(console.error);
