#!/usr/bin/env node

/**
 * Synchronisation automatique WordPress/WooCommerce → Supabase
 * Synchronise tous les produits (beats) depuis WordPress vers la table beats de Supabase
 */

<<<<<<< HEAD
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
=======
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fetch from "node-fetch";
>>>>>>> 36d5f1783a85309cded75560c94663152dc37dcc

// Charger les variables d'environnement
dotenv.config();

// Configuration
<<<<<<< HEAD
const WORDPRESS_URL = 'https://brolabentertainment.com/wp-json/wc/v3';
const CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lqijgqevowmvikxqpgaz.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxaWpncWV2b3dtdmlreHFwZ2F6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjM1MDY1MCwiZXhwIjoyMDUxOTI2NjUwfQ.Y50LY8Rp3zFBRt4yS-kZeWlKrQvhM1kQJ8xr4jhkfrE';

// Vérifier les variables d'environnement
if (!CONSUMER_KEY || !CONSUMER_SECRET) {
  console.error('❌ Variables d\'environnement manquantes: WOOCOMMERCE_CONSUMER_KEY et WOOCOMMERCE_CONSUMER_SECRET');
  console.log('💡 Ajoutez-les au fichier .env');
  console.log('Clés trouvées:', { CONSUMER_KEY: !!CONSUMER_KEY, CONSUMER_SECRET: !!CONSUMER_SECRET });
  process.exit(1);
}

console.log('✅ Clés WooCommerce détectées, démarrage de la synchronisation...');
=======
const WORDPRESS_URL = "https://brolabentertainment.com/wp-json/wc/v3";
const CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Vérifier les variables d'environnement
if (!CONSUMER_KEY || !CONSUMER_SECRET) {
  console.error(
    "❌ Variables d'environnement manquantes: WOOCOMMERCE_CONSUMER_KEY et WOOCOMMERCE_CONSUMER_SECRET"
  );
  console.log("💡 Ajoutez-les au fichier .env");
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "❌ Variables d'environnement manquantes: SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY"
  );
  console.log("💡 Ajoutez-les au fichier .env");
  process.exit(1);
}

console.log("✅ Clés WooCommerce détectées, démarrage de la synchronisation...");
>>>>>>> 36d5f1783a85309cded75560c94663152dc37dcc

// Initialiser Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Récupère tous les produits depuis WooCommerce
 */
async function fetchWordPressProducts() {
<<<<<<< HEAD
  console.log('🔄 Récupération des produits depuis WooCommerce...');
  
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  const response = await fetch(`${WORDPRESS_URL}/products?per_page=100&status=publish`, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    }
=======
  console.log("🔄 Récupération des produits depuis WooCommerce...");

  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
  const response = await fetch(`${WORDPRESS_URL}/products?per_page=100&status=publish`, {
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
>>>>>>> 36d5f1783a85309cded75560c94663152dc37dcc
  });

  if (!response.ok) {
    throw new Error(`Erreur WooCommerce: ${response.status} ${response.statusText}`);
  }

  const products = await response.json();
  console.log(`✅ ${products.length} produits récupérés depuis WooCommerce`);
  return products;
}

/**
 * Convertit un produit WooCommerce en format Supabase
 */
function convertProductToSupabaseFormat(product) {
  // Extraire les métadonnées personnalisées
  const customFields = {};
  if (product.meta_data) {
    product.meta_data.forEach(meta => {
      customFields[meta.key] = meta.value;
    });
  }

  return {
    id: product.id, // Utiliser l'ID WordPress comme ID Supabase
    wordpress_id: product.id,
    title: product.name,
<<<<<<< HEAD
    description: product.description || product.short_description || '',
    genre: customFields.genre || customFields._genre || 'Unknown',
    bpm: parseInt(customFields.bpm || customFields._bpm || '120'),
    key: customFields.key || customFields._key || '',
    mood: customFields.mood || customFields._mood || '',
    price: Math.round(parseFloat(product.price || '0') * 100), // Convertir en centimes
    audio_url: customFields.audio_url || customFields._audio_url || '',
    image_url: product.images?.[0]?.src || '',
    is_active: product.status === 'publish',
    created_at: product.date_created,
    tags: product.tags?.map(tag => tag.name) || [],
    featured: product.featured || false,
    downloads: parseInt(customFields.downloads || '0'),
    views: parseInt(customFields.views || '0'),
    duration: parseInt(customFields.duration || '0')
=======
    description: product.description || product.short_description || "",
    genre: customFields.genre || customFields._genre || "Unknown",
    bpm: parseInt(customFields.bpm || customFields._bpm || "120"),
    key: customFields.key || customFields._key || "",
    mood: customFields.mood || customFields._mood || "",
    price: Math.round(parseFloat(product.price || "0") * 100), // Convertir en centimes
    audio_url: customFields.audio_url || customFields._audio_url || "",
    image_url: product.images?.[0]?.src || "",
    is_active: product.status === "publish",
    created_at: product.date_created,
    tags: product.tags?.map(tag => tag.name) || [],
    featured: product.featured || false,
    downloads: parseInt(customFields.downloads || "0"),
    views: parseInt(customFields.views || "0"),
    duration: parseInt(customFields.duration || "0"),
>>>>>>> 36d5f1783a85309cded75560c94663152dc37dcc
  };
}

/**
 * Synchronise un produit vers Supabase
 */
async function syncProductToSupabase(product) {
  const supabaseProduct = convertProductToSupabaseFormat(product);
<<<<<<< HEAD
  
  console.log(`🔄 Synchronisation: ${supabaseProduct.title} (ID: ${supabaseProduct.id})`);

  const { data, error } = await supabase
    .from('beats')
    .upsert(supabaseProduct, {
      onConflict: 'id',
      ignoreDuplicates: false
=======

  console.log(`🔄 Synchronisation: ${supabaseProduct.title} (ID: ${supabaseProduct.id})`);

  const { data, error } = await supabase
    .from("beats")
    .upsert(supabaseProduct, {
      onConflict: "id",
      ignoreDuplicates: false,
>>>>>>> 36d5f1783a85309cded75560c94663152dc37dcc
    })
    .select()
    .single();

  if (error) {
    console.error(`❌ Erreur lors de la synchronisation de ${supabaseProduct.title}:`, error);
    throw error;
  }

  console.log(`✅ Synchronisé: ${supabaseProduct.title}`);
  return data;
}

/**
 * Fonction principale de synchronisation
 */
async function syncAllProducts() {
  try {
<<<<<<< HEAD
    console.log('🚀 Début de la synchronisation WordPress → Supabase');
    console.log('=' * 60);
=======
    console.log("🚀 Début de la synchronisation WordPress → Supabase");
    console.log("=" * 60);
>>>>>>> 36d5f1783a85309cded75560c94663152dc37dcc

    // 1. Récupérer tous les produits WordPress
    const wordpressProducts = await fetchWordPressProducts();

    // 2. Synchroniser chaque produit
    let syncedCount = 0;
    let errorCount = 0;

    for (const product of wordpressProducts) {
      try {
        await syncProductToSupabase(product);
        syncedCount++;
      } catch (error) {
        console.error(`❌ Échec de synchronisation pour ${product.name}:`, error.message);
        errorCount++;
      }
    }

    // 3. Résumé
<<<<<<< HEAD
    console.log('=' * 60);
    console.log('📊 RÉSUMÉ DE LA SYNCHRONISATION');
=======
    console.log("=" * 60);
    console.log("📊 RÉSUMÉ DE LA SYNCHRONISATION");
>>>>>>> 36d5f1783a85309cded75560c94663152dc37dcc
    console.log(`✅ Produits synchronisés: ${syncedCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    console.log(`📦 Total traité: ${wordpressProducts.length}`);

    if (errorCount === 0) {
<<<<<<< HEAD
      console.log('🎉 Synchronisation terminée avec succès !');
    } else {
      console.log('⚠️ Synchronisation terminée avec des erreurs');
    }

  } catch (error) {
    console.error('💥 Erreur fatale lors de la synchronisation:', error);
=======
      console.log("🎉 Synchronisation terminée avec succès !");
    } else {
      console.log("⚠️ Synchronisation terminée avec des erreurs");
    }
  } catch (error) {
    console.error("💥 Erreur fatale lors de la synchronisation:", error);
>>>>>>> 36d5f1783a85309cded75560c94663152dc37dcc
    process.exit(1);
  }
}

/**
 * Fonction pour synchroniser un seul produit par ID
 */
async function syncSingleProduct(productId) {
  try {
    console.log(`🔄 Synchronisation du produit ID: ${productId}`);
<<<<<<< HEAD
    
    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
    console.log(`🔗 Tentative de connexion à: ${WORDPRESS_URL}/products/${productId}`);
    
    const response = await fetch(`${WORDPRESS_URL}/products/${productId}`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
=======

    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
    console.log(`🔗 Tentative de connexion à: ${WORDPRESS_URL}/products/${productId}`);

    const response = await fetch(`${WORDPRESS_URL}/products/${productId}`, {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
>>>>>>> 36d5f1783a85309cded75560c94663152dc37dcc
    });

    console.log(`📡 Réponse WordPress: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erreur WordPress:`, errorText);
      throw new Error(`Produit ${productId} non trouvé sur WordPress: ${response.status}`);
    }

    const product = await response.json();
    console.log(`📦 Produit récupéré:`, product.name);
<<<<<<< HEAD
    
    await syncProductToSupabase(product);
    
    console.log(`✅ Produit ${productId} synchronisé avec succès`);
    
=======

    await syncProductToSupabase(product);

    console.log(`✅ Produit ${productId} synchronisé avec succès`);
>>>>>>> 36d5f1783a85309cded75560c94663152dc37dcc
  } catch (error) {
    console.error(`❌ Erreur lors de la synchronisation du produit ${productId}:`, error);
    throw error;
  }
}

// Interface en ligne de commande
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const productId = process.argv[3];

<<<<<<< HEAD
  if (command === 'single' && productId) {
    syncSingleProduct(productId);
  } else if (command === 'all' || !command) {
    syncAllProducts();
  } else {
    console.log('Usage:');
    console.log('  node sync-beats-wordpress-to-supabase.js all    # Synchroniser tous les produits');
    console.log('  node sync-beats-wordpress-to-supabase.js single <ID>  # Synchroniser un produit');
=======
  if (command === "single" && productId) {
    syncSingleProduct(productId);
  } else if (command === "all" || !command) {
    syncAllProducts();
  } else {
    console.log("Usage:");
    console.log(
      "  node sync-beats-wordpress-to-supabase.js all    # Synchroniser tous les produits"
    );
    console.log(
      "  node sync-beats-wordpress-to-supabase.js single <ID>  # Synchroniser un produit"
    );
>>>>>>> 36d5f1783a85309cded75560c94663152dc37dcc
  }
}

export { syncAllProducts, syncSingleProduct };
