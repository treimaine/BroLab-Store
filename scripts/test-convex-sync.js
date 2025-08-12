#!/usr/bin/env node

/**
 * Script de test pour la synchronisation Convex avec WordPress et WooCommerce
 * Usage: node scripts/test-convex-sync.js
 */

import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "..", ".env") });

// Configuration
const CONVEX_URL = process.env.VITE_CONVEX_URL;
const WORDPRESS_URL = process.env.VITE_WORDPRESS_URL;
const WOOCOMMERCE_URL = process.env.VITE_WOOCOMMERCE_URL;

if (!CONVEX_URL) {
  console.error("❌ VITE_CONVEX_URL non configuré dans .env");
  process.exit(1);
}

const convex = new ConvexHttpClient(CONVEX_URL);

async function testConvexConnection() {
  console.log("🔍 Test de connexion Convex...");

  try {
    // Test simple de connexion
    const result = await convex.query("sync_wordpress.getSyncedProducts", { limit: 1 });
    console.log("✅ Connexion Convex réussie");
    console.log(`📊 Produits synchronisés: ${result.page.length}`);
    return true;
  } catch (error) {
    console.error("❌ Erreur de connexion Convex:", error.message);
    return false;
  }
}

async function testWordPressSync() {
  console.log("\n🔄 Test de synchronisation WordPress...");

  if (!WORDPRESS_URL) {
    console.log("⚠️  VITE_WORDPRESS_URL non configuré, test ignoré");
    return false;
  }

  try {
    // Simuler une synchronisation WordPress
    const testProducts = [
      {
        id: 999,
        title: "Test Beat",
        description: "Beat de test pour la synchronisation",
        genre: "Test",
        bpm: 120,
        price: 999,
        isActive: true,
      },
    ];

    const result = await convex.mutation("sync_wordpress.syncWordPressProducts", {
      products: testProducts,
    });

    console.log("✅ Synchronisation WordPress réussie");
    console.log(`📊 Résultats:`, result);
    return true;
  } catch (error) {
    console.error("❌ Erreur de synchronisation WordPress:", error.message);
    return false;
  }
}

async function testWooCommerceSync() {
  console.log("\n🔄 Test de synchronisation WooCommerce...");

  if (!WOOCOMMERCE_URL) {
    console.log("⚠️  VITE_WOOCOMMERCE_URL non configuré, test ignoré");
    return false;
  }

  try {
    // Simuler une synchronisation WooCommerce
    const testOrders = [
      {
        id: 999,
        status: "completed",
        total: "29.99",
        currency: "EUR",
        customerEmail: "test@example.com",
        items: [
          {
            productId: 1,
            name: "Test Product",
            quantity: 1,
            total: "29.99",
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const result = await convex.mutation("sync_woocommerce.syncWooCommerceOrders", {
      orders: testOrders,
    });

    console.log("✅ Synchronisation WooCommerce réussie");
    console.log(`📊 Résultats:`, result);
    return true;
  } catch (error) {
    console.error("❌ Erreur de synchronisation WooCommerce:", error.message);
    return false;
  }
}

async function testClerkUserSync() {
  console.log("\n🔄 Test de synchronisation utilisateur Clerk...");

  try {
    // Simuler une synchronisation d'utilisateur
    const testUser = {
      clerkId: "test_user_123",
      email: "test@example.com",
      username: "testuser",
      firstName: "Test",
      lastName: "User",
      imageUrl: "https://example.com/avatar.jpg",
    };

    const result = await convex.mutation("users_clerkSync.syncClerkUser", testUser);

    console.log("✅ Synchronisation utilisateur Clerk réussie");
    console.log(`📊 Résultat:`, result);
    return true;
  } catch (error) {
    console.error("❌ Erreur de synchronisation utilisateur Clerk:", error.message);
    return false;
  }
}

async function testDownloadLogging() {
  console.log("\n🔄 Test d'enregistrement de téléchargement...");

  try {
    const testDownload = {
      clerkId: "test_user_123",
      productId: 1,
      license: "basic",
      productName: "Test Beat",
      price: 999,
    };

    const result = await convex.mutation("downloads.logDownload", testDownload);

    console.log("✅ Enregistrement de téléchargement réussi");
    console.log(`📊 Résultat:`, result);
    return true;
  } catch (error) {
    console.error("❌ Erreur d'enregistrement de téléchargement:", error.message);
    return false;
  }
}

async function testFavorites() {
  console.log("\n🔄 Test des favoris...");

  try {
    // Ajouter un favori
    const addResult = await convex.mutation("favorites_add", {
      clerkId: "test_user_123",
      beatId: 1,
    });

    console.log("✅ Ajout de favori réussi");

    // Récupérer les favoris
    const favorites = await convex.query("favorites_getFavorites", {
      clerkId: "test_user_123",
    });

    console.log(`📊 Favoris récupérés: ${favorites.length}`);

    // Supprimer le favori
    const removeResult = await convex.mutation("favorites_remove", {
      clerkId: "test_user_123",
      beatId: 1,
    });

    console.log("✅ Suppression de favori réussie");
    return true;
  } catch (error) {
    console.error("❌ Erreur des favoris:", error.message);
    return false;
  }
}

async function runAllTests() {
  console.log("🚀 Démarrage des tests de synchronisation Convex\n");

  const results = {
    convex: await testConvexConnection(),
    wordpress: await testWordPressSync(),
    woocommerce: await testWooCommerceSync(),
    clerkUser: await testClerkUserSync(),
    download: await testDownloadLogging(),
    favorites: await testFavorites(),
  };

  console.log("\n📋 Résumé des tests:");
  console.log("=".repeat(50));

  Object.entries(results).forEach(([test, success]) => {
    const status = success ? "✅" : "❌";
    console.log(`${status} ${test}`);
  });

  const allPassed = Object.values(results).every(result => result);

  if (allPassed) {
    console.log("\n🎉 Tous les tests sont passés avec succès!");
  } else {
    console.log("\n⚠️  Certains tests ont échoué. Vérifiez la configuration.");
  }

  return allPassed;
}

// Exécuter les tests si le script est appelé directement
runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("💥 Erreur fatale:", error);
    process.exit(1);
  });
