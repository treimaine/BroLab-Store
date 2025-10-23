#!/usr/bin/env node

/**
 * Script pour diagnostiquer et corriger les problèmes de souscription Clerk
 *
 * Usage:
 *   npm run fix-subscriptions -- verify
 *   npm run fix-subscriptions -- clean
 *   npm run fix-subscriptions -- reset
 */

import { execSync } from "node:child_process";

interface Command {
  name: string;
  command: string;
  description: string;
  warning?: boolean;
  dangerous?: boolean;
}

const COMMANDS: Record<string, Command> = {
  verify: {
    name: "Vérifier les souscriptions",
    command: "npx convex run admin/verifySubscriptions:verifyAllSubscriptions",
    description: "Affiche un rapport complet de l'état des souscriptions",
  },
  list: {
    name: "Lister toutes les souscriptions",
    command: "npx convex run admin/verifySubscriptions:listAllSubscriptions",
    description: "Liste toutes les souscriptions avec détails complets",
  },
  clean: {
    name: "Nettoyer les données incorrectes",
    command: "npx convex run admin/cleanSubscriptions:cleanTestSubscriptions",
    description: "Supprime les souscriptions avec des dates dans le futur",
    warning: true,
  },
  duplicates: {
    name: "Supprimer les doublons",
    command: "npx convex run admin/cleanSubscriptions:removeDuplicateSubscriptions",
    description: "Supprime les souscriptions en double pour chaque utilisateur",
    warning: true,
  },
  reset: {
    name: "Réinitialiser toutes les souscriptions",
    command: "npx convex run admin/cleanSubscriptions:resetAllToFree",
    description: "⚠️ DANGER: Supprime TOUTES les souscriptions (développement uniquement)",
    warning: true,
    dangerous: true,
  },
};

function printHelp(): void {
  console.log("\n🔧 Script de Correction des Souscriptions Clerk\n");
  console.log("Usage: npm run fix-subscriptions -- <command>\n");
  console.log("Commandes disponibles:\n");

  for (const [key, cmd] of Object.entries(COMMANDS)) {
    let warning = "";
    if (cmd.dangerous) {
      warning = " ⚠️ DANGER";
    } else if (cmd.warning) {
      warning = " ⚠️";
    }
    console.log(`  ${key.padEnd(12)} - ${cmd.name}${warning}`);
    console.log(`                 ${cmd.description}\n`);
  }

  console.log("Exemples:");
  console.log("  npm run fix-subscriptions -- verify");
  console.log("  npm run fix-subscriptions -- clean");
  console.log("  npm run fix-subscriptions -- list\n");
}

function executeCommand(commandKey: string): void {
  const cmd = COMMANDS[commandKey];

  if (!cmd) {
    console.error(`❌ Commande inconnue: ${commandKey}\n`);
    printHelp();
    process.exit(1);
  }

  console.log(`\n🔄 ${cmd.name}...\n`);

  if (cmd.warning === true) {
    console.log("⚠️  ATTENTION: Cette commande va modifier les données!\n");
  }

  if (cmd.dangerous === true) {
    console.log("🚨 DANGER: Cette commande va supprimer TOUTES les souscriptions!\n");
    console.log("Êtes-vous sûr de vouloir continuer? (tapez 'yes' pour confirmer)");

    // En mode script, on ne peut pas demander confirmation interactivement
    // donc on affiche juste un message et on sort
    console.log("\n❌ Commande annulée pour des raisons de sécurité.");
    console.log("Pour exécuter cette commande, utilisez directement:");
    console.log(`   ${cmd.command}\n`);
    process.exit(0);
  }

  try {
    execSync(cmd.command, {
      encoding: "utf-8",
      stdio: "inherit",
    });

    console.log("\n✅ Commande exécutée avec succès!\n");
  } catch (error) {
    console.error("\n❌ Erreur lors de l'exécution de la commande:\n");
    console.error(error);
    process.exit(1);
  }
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "help" || args[0] === "--help" || args[0] === "-h") {
    printHelp();
    process.exit(0);
  }

  const command = args[0];
  executeCommand(command);
}

main();
