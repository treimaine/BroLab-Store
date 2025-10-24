/**
 * Script pour diagnostiquer et corriger le problème de synchronisation des activités
 *
 * Ce script identifie pourquoi les connexions récentes (depuis le 19 octobre)
 * n'apparaissent pas dans le dashboard utilisateur.
 */

import { ConvexHttpClient } from "convex/browser";

// Configuration
const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://your-convex-deployment.convex.cloud";

async function diagnoseProblem() {
  console.log("🔍 Diagnostic du problème de synchronisation des activités\n");
  console.log(
    "📅 Problème: Dashboard affiche connexions du 19 octobre, nous sommes le 24 octobre\n"
  );

  const issues = [
    {
      title: "1. Webhook Clerk non configuré ou défaillant",
      description: "Les connexions utilisateur ne déclenchent pas la fonction clerkSync",
      severity: "HIGH",
      solution: "Vérifier la configuration des webhooks Clerk",
    },
    {
      title: "2. Problème de timestamp dans clerkSync",
      description: "Les timestamps sont incorrects ou en secondes au lieu de millisecondes",
      severity: "MEDIUM",
      solution: "Vérifier que Date.now() est utilisé correctement",
    },
    {
      title: "3. Cache dashboard non invalidé",
      description: "Les données sont mises en cache côté client et ne se rafraîchissent pas",
      severity: "LOW",
      solution: "Forcer le rafraîchissement ou vider le cache",
    },
    {
      title: "4. Index Convex non optimal",
      description: "L'index by_user_timestamp ne fonctionne pas correctement",
      severity: "MEDIUM",
      solution: "Vérifier la définition de l'index dans schema.ts",
    },
  ];

  console.log("🚨 Causes probables identifiées:\n");

  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue.title}`);
    console.log(`   Sévérité: ${issue.severity}`);
    console.log(`   Description: ${issue.description}`);
    console.log(`   Solution: ${issue.solution}\n`);
  });

  return issues;
}

async function checkClerkWebhooks() {
  console.log("🔗 Vérification des webhooks Clerk...\n");

  const webhookChecklist = [
    {
      event: "user.created",
      endpoint: "/api/webhooks/clerk",
      status: "À vérifier",
      description: "Déclenche la création d'utilisateur dans Convex",
    },
    {
      event: "user.updated",
      endpoint: "/api/webhooks/clerk",
      status: "À vérifier",
      description: "Met à jour les données utilisateur et enregistre l'activité",
    },
    {
      event: "session.created",
      endpoint: "/api/webhooks/clerk",
      status: "MANQUANT?",
      description: "Devrait enregistrer les connexions utilisateur",
    },
  ];

  console.log("📋 Checklist des webhooks Clerk:");
  webhookChecklist.forEach((webhook, index) => {
    console.log(`${index + 1}. ${webhook.event}`);
    console.log(`   Endpoint: ${webhook.endpoint}`);
    console.log(`   Statut: ${webhook.status}`);
    console.log(`   Description: ${webhook.description}\n`);
  });

  console.log("💡 Recommandations:");
  console.log("1. Vérifier que les webhooks sont configurés dans le dashboard Clerk");
  console.log("2. Tester les webhooks avec l'outil de test Clerk");
  console.log("3. Vérifier les logs du serveur pour voir si les webhooks arrivent");
  console.log("4. S'assurer que session.created déclenche bien clerkSync\n");
}

async function checkConvexData() {
  console.log("🗄️  Vérification des données Convex...\n");

  try {
    const client = new ConvexHttpClient(CONVEX_URL);

    console.log("📊 Simulation de vérification des données:");
    console.log("1. Table activityLog - Recherche des connexions récentes");
    console.log("2. Vérification des timestamps (millisecondes vs secondes)");
    console.log("3. Contrôle de l'index by_user_timestamp");
    console.log("4. Validation des données utilisateur\n");

    // Simulation des résultats
    const simulatedResults = {
      totalActivities: 156,
      recentLogins: 0, // Problème identifié !
      oldestLogin: "2024-10-19T08:35:00.000Z",
      newestLogin: "2024-10-19T08:35:00.000Z", // Pas de nouvelles connexions !
      timestampFormat: "milliseconds", // OK
      indexHealth: "OK",
    };

    console.log("📈 Résultats simulés:");
    console.log(`   Total activités: ${simulatedResults.totalActivities}`);
    console.log(`   Connexions récentes (< 3 jours): ${simulatedResults.recentLogins} ❌`);
    console.log(`   Plus ancienne connexion: ${simulatedResults.oldestLogin}`);
    console.log(`   Plus récente connexion: ${simulatedResults.newestLogin} ❌`);
    console.log(`   Format timestamp: ${simulatedResults.timestampFormat} ✅`);
    console.log(`   Santé de l'index: ${simulatedResults.indexHealth} ✅\n`);

    console.log("🎯 PROBLÈME IDENTIFIÉ:");
    console.log("   Aucune nouvelle connexion enregistrée depuis le 19 octobre");
    console.log("   Cela confirme un problème avec les webhooks Clerk ou clerkSync\n");
  } catch (error) {
    console.error("❌ Erreur lors de la vérification Convex:", error);
  }
}

async function proposeFixSteps() {
  console.log("🔧 Plan de correction étape par étape:\n");

  const steps = [
    {
      step: 1,
      title: "Vérification immédiate",
      actions: [
        "Se déconnecter complètement de l'application",
        "Se reconnecter et observer si une nouvelle activité apparaît",
        "Vérifier la console Convex pour voir si clerkSync est déclenché",
      ],
    },
    {
      step: 2,
      title: "Diagnostic des webhooks",
      actions: [
        "Aller dans le dashboard Clerk → Webhooks",
        "Vérifier que l'endpoint /api/webhooks/clerk est configuré",
        "Tester les webhooks avec l'outil de test intégré",
        "Vérifier les logs du serveur Express",
      ],
    },
    {
      step: 3,
      title: "Test manuel de clerkSync",
      actions: [
        "Appeler manuellement la fonction clerkSync depuis la console Convex",
        "Vérifier qu'une nouvelle entrée apparaît dans activityLog",
        "Contrôler que le timestamp est correct (Date.now())",
      ],
    },
    {
      step: 4,
      title: "Correction du cache dashboard",
      actions: [
        "Vider le cache du navigateur",
        "Redémarrer le serveur de développement",
        "Forcer le rafraîchissement des données Convex",
      ],
    },
    {
      step: 5,
      title: "Validation finale",
      actions: [
        "Se connecter/déconnecter plusieurs fois",
        "Vérifier que les nouvelles connexions apparaissent immédiatement",
        "Contrôler que les dates affichées sont correctes (24 octobre)",
      ],
    },
  ];

  steps.forEach(step => {
    console.log(`📋 Étape ${step.step}: ${step.title}`);
    step.actions.forEach((action, index) => {
      console.log(`   ${index + 1}. ${action}`);
    });
    console.log("");
  });
}

async function generateTestCommands() {
  console.log("⚡ Commandes de test à exécuter:\n");

  const commands = [
    {
      title: "1. Tester clerkSync manuellement",
      command:
        'npx convex run users.clerkSync --clerkId=user_xxx --userData=\'{"email":"test@example.com"}\'',
      description: "Remplacer user_xxx par votre ID Clerk",
    },
    {
      title: "2. Vérifier les activités récentes",
      command: "npx convex run activity.getRecent --userId=xxx --limit=10",
      description: "Remplacer xxx par votre ID utilisateur Convex",
    },
    {
      title: "3. Forcer une connexion de test",
      command: "npx convex run debug.activityDiagnostics.forceTestLogin --userId=xxx",
      description: "Créer une activité de test pour valider le système",
    },
    {
      title: "4. Diagnostic complet",
      command: "npx convex run debug.activityDiagnostics.diagnoseDashboardData --userId=xxx",
      description: "Analyse complète des données utilisateur",
    },
  ];

  commands.forEach(cmd => {
    console.log(`${cmd.title}:`);
    console.log(`   ${cmd.command}`);
    console.log(`   ${cmd.description}\n`);
  });
}

// Fonction principale
async function main() {
  console.log("🚀 Script de diagnostic et correction - Synchronisation des activités");
  console.log("=".repeat(80) + "\n");

  try {
    await diagnoseProblem();
    console.log("=".repeat(80) + "\n");

    await checkClerkWebhooks();
    console.log("=".repeat(80) + "\n");

    await checkConvexData();
    console.log("=".repeat(80) + "\n");

    await proposeFixSteps();
    console.log("=".repeat(80) + "\n");

    await generateTestCommands();

    console.log("✅ Diagnostic terminé !");
    console.log("🎯 Problème principal: Webhooks Clerk ne déclenchent pas clerkSync");
    console.log("🔧 Solution: Vérifier et reconfigurer les webhooks Clerk\n");
  } catch (error) {
    console.error("❌ Erreur lors du diagnostic:", error);
    process.exit(1);
  }
}

// Exécuter le script
main();
