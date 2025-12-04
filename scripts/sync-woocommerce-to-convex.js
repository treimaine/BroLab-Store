#!/usr/bin/env node

/**
 * Script de synchronisation WooCommerce → Convex
 *
 * Récupère tous les produits depuis WooCommerce et les synchronise vers Convex
 * pour que les titres des beats s'affichent correctement dans le dashboard.
 *
 * Usage: node scripts/sync-woocommerce-to-convex.js
 *
 * Options:
 *   --ids=822,2187    Synchroniser uniquement certains IDs
 *   --all             Synchroniser tous les produits
 *   --dry-run         Afficher ce qui serait synchronisé sans exécuter
 */

import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "..", ".env") });

// Configuration
const CONVEX_URL = process.env.VITE_CONVEX_URL;
const WOOCOMMERCE_URL =
  process.env.WOOCOMMERCE_API_URL ||
  process.env.VITE_WOOCOMMERCE_URL ||
  process.env.WOOCOMMERCE_URL;
const WC_CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY || process.env.WC_CONSUMER_KEY;
const WC_CONSUMER_SECRET =
  process.env.WOOCOMMERCE_CONSUMER_SECRET || process.env.WC_CONSUMER_SECRET;

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const syncAll = args.includes("--all");
const idsArg = args.find(arg => arg.startsWith("--ids="));
const specificIds = idsArg ? idsArg.split("=")[1].split(",").map(Number) : null;

console.log("🔧 Configuration:");
console.log(`   CONVEX_URL: ${CONVEX_URL ? "✅ Configuré" : "❌ Manquant"}`);
console.log(`   WOOCOMMERCE_URL: ${WOOCOMMERCE_URL ? "✅ Configuré" : "❌ Manquant"}`);
console.log(`   WC_CONSUMER_KEY: ${WC_CONSUMER_KEY ? "✅ Configuré" : "❌ Manquant"}`);
console.log(`   WC_CONSUMER_SECRET: ${WC_CONSUMER_SECRET ? "✅ Configuré" : "❌ Manquant"}`);
console.log("");

if (!CONVEX_URL) {
  console.error("❌ VITE_CONVEX_URL non configuré dans .env");
  process.exit(1);
}

if (!WOOCOMMERCE_URL || !WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
  console.error("❌ Configuration WooCommerce manquante dans .env");
  console.error(
    "   Requis: WOOCOMMERCE_URL, WOOCOMMERCE_CONSUMER_KEY, WOOCOMMERCE_CONSUMER_SECRET"
  );
  process.exit(1);
}

const convex = new ConvexHttpClient(CONVEX_URL);

/**
 * Récupère un produit WooCommerce par ID
 */
async function fetchWooCommerceProduct(productId) {
  const auth = Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString("base64");
  const url = `${WOOCOMMERCE_URL}/wp-json/wc/v3/products/${productId}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Récupère tous les produits WooCommerce (paginé)
 */
async function fetchAllWooCommerceProducts() {
  const auth = Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString("base64");
  const allProducts = [];
  let page = 1;
  const perPage = 100;

  console.log("📥 Récupération des produits WooCommerce...");

  while (true) {
    const url = `${WOOCOMMERCE_URL}/wp-json/wc/v3/products?page=${page}&per_page=${perPage}&status=publish`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }

    const products = await response.json();

    if (products.length === 0) {
      break;
    }

    allProducts.push(...products);
    console.log(
      `   Page ${page}: ${products.length} produits récupérés (total: ${allProducts.length})`
    );

    if (products.length < perPage) {
      break;
    }

    page++;
  }

  return allProducts;
}

/**
 * Extrait les métadonnées BroLab d'un produit WooCommerce
 */
function extractBeatMetadata(product) {
  const getMeta = key => {
    const meta = product.meta_data?.find(m => m.key === key);
    return meta?.value;
  };

  // Extraire le BPM depuis les métadonnées ou les attributs
  let bpm = Number.parseInt(getMeta("bpm") || getMeta("_bpm") || "0", 10);
  if (!bpm) {
    const bpmAttr = product.attributes?.find(a => a.name.toLowerCase() === "bpm");
    if (bpmAttr?.options?.[0]) {
      bpm = Number.parseInt(bpmAttr.options[0], 10);
    }
  }

  // Extraire le genre
  let genre = getMeta("genre") || getMeta("_genre");
  if (!genre) {
    const genreAttr = product.attributes?.find(a => a.name.toLowerCase() === "genre");
    genre = genreAttr?.options?.[0] || "Unknown";
  }
  if (!genre && product.categories?.length > 0) {
    genre = product.categories[0].name;
  }

  // Extraire la tonalité
  let key = getMeta("key") || getMeta("_key");
  if (!key) {
    const keyAttr = product.attributes?.find(a => a.name.toLowerCase() === "key");
    key = keyAttr?.options?.[0];
  }

  // Extraire le mood
  let mood = getMeta("mood") || getMeta("_mood");
  if (!mood) {
    const moodAttr = product.attributes?.find(a => a.name.toLowerCase() === "mood");
    mood = moodAttr?.options?.[0];
  }

  // Extraire la durée
  let duration = Number.parseInt(getMeta("duration") || getMeta("_duration") || "0", 10);

  // Extraire l'URL audio
  let audioUrl = getMeta("audio_url") || getMeta("_audio_url") || getMeta("preview_url");

  // Tags depuis les catégories et tags WooCommerce
  const tags = [
    ...(product.categories?.map(c => c.name) || []),
    ...(product.tags?.map(t => t.name) || []),
  ];

  return {
    id: product.id,
    title: product.name,
    description: product.short_description || product.description || "",
    genre: genre || "Unknown",
    bpm: bpm || 0,
    key: key || undefined,
    mood: mood || undefined,
    price: Math.round(Number.parseFloat(product.price || "0") * 100), // Convertir en centimes
    audioUrl: audioUrl || undefined,
    imageUrl: product.images?.[0]?.src || undefined,
    tags: tags.length > 0 ? tags : undefined,
    featured: product.featured || false,
    downloads: product.download_limit || 0,
    views: 0,
    duration: duration || undefined,
    isActive: product.status === "publish",
  };
}

/**
 * Synchronise les produits vers Convex
 */
async function syncToConvex(products) {
  if (products.length === 0) {
    console.log("⚠️  Aucun produit à synchroniser");
    return;
  }

  console.log(`\n🔄 Synchronisation de ${products.length} produit(s) vers Convex...`);

  if (isDryRun) {
    console.log("\n📋 Mode dry-run - Produits qui seraient synchronisés:");
    products.forEach(p => {
      console.log(`   - ID ${p.id}: "${p.title}" (${p.genre}, ${p.bpm} BPM, ${p.price / 100}€)`);
    });
    return;
  }

  try {
    const result = await convex.mutation("sync/wordpress:syncWordPressProducts", {
      products: products,
    });

    console.log("\n✅ Synchronisation terminée!");
    console.log("📊 Résultats:");

    const created = result.filter(r => r.action === "created").length;
    const updated = result.filter(r => r.action === "updated").length;
    const errors = result.filter(r => r.action === "error").length;

    console.log(`   ✅ Créés: ${created}`);
    console.log(`   🔄 Mis à jour: ${updated}`);
    if (errors > 0) {
      console.log(`   ❌ Erreurs: ${errors}`);
      result
        .filter(r => r.action === "error")
        .forEach(r => {
          console.log(`      - ID ${r.id}: ${r.error}`);
        });
    }

    return result;
  } catch (error) {
    console.error("❌ Erreur de synchronisation Convex:", error.message);
    throw error;
  }
}

/**
 * Fonction principale - Top-level await
 */
console.log("🚀 Synchronisation WooCommerce → Convex\n");

try {
  let products = [];

  if (specificIds && specificIds.length > 0) {
    // Synchroniser des IDs spécifiques
    console.log(`📌 Synchronisation des IDs spécifiques: ${specificIds.join(", ")}`);

    for (const id of specificIds) {
      console.log(`   Récupération du produit ${id}...`);
      const product = await fetchWooCommerceProduct(id);

      if (product) {
        products.push(extractBeatMetadata(product));
        console.log(`   ✅ Produit ${id}: "${product.name}"`);
      } else {
        console.log(`   ⚠️  Produit ${id} non trouvé dans WooCommerce`);
      }
    }
  } else if (syncAll) {
    // Synchroniser tous les produits
    const wcProducts = await fetchAllWooCommerceProducts();
    products = wcProducts.map(extractBeatMetadata);
  } else {
    // Par défaut, afficher l'aide
    console.log("Usage:");
    console.log("  node scripts/sync-woocommerce-to-convex.js --ids=822,2187  # Sync specific IDs");
    console.log("  node scripts/sync-woocommerce-to-convex.js --all           # Sync all products");
    console.log(
      "  node scripts/sync-woocommerce-to-convex.js --dry-run --all # Preview without syncing"
    );
    console.log("");
    console.log("Pour synchroniser les beats manquants du dashboard:");
    console.log("  node scripts/sync-woocommerce-to-convex.js --ids=822,2187");
    process.exit(0);
  }

  await syncToConvex(products);
} catch (error) {
  console.error("\n💥 Erreur fatale:", error.message);
  process.exit(1);
}
