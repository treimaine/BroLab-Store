#!/usr/bin/env node

/**
 * Script simple pour synchroniser un beat spécifique
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fetch from "node-fetch";

// Charger les variables d'environnement
dotenv.config();

// Configuration - All sensitive credentials loaded from environment variables
const WORDPRESS_URL =
  process.env.WORDPRESS_API_URL || "https://brolabentertainment.com/wp-json/wc/v3";
const CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "❌ Missing required environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_KEY"
  );
  console.error("Please set these in your .env file");
  process.exit(1);
}

if (!CONSUMER_KEY || !CONSUMER_SECRET) {
  console.error(
    "❌ Missing required environment variables: WOOCOMMERCE_CONSUMER_KEY and/or WOOCOMMERCE_CONSUMER_SECRET"
  );
  console.error("Please set these in your .env file");
  process.exit(1);
}

console.log("✅ Configuration chargée");
console.log("CONSUMER_KEY:", !!CONSUMER_KEY);
console.log("CONSUMER_SECRET:", !!CONSUMER_SECRET);

// Initialiser Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function syncBeat920() {
  try {
    console.log("🔄 Synchronisation du beat 920...");

    // 1. Récupérer le produit depuis WordPress
    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
    console.log("🔗 Connexion à WordPress...");

    const response = await fetch(`${WORDPRESS_URL}/products/920`, {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`📡 Réponse: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erreur WordPress:", errorText);
      return;
    }

    const product = await response.json();
    console.log(`📦 Produit récupéré: ${product.name}`);

    // 2. Insérer dans Supabase
    const supabaseProduct = {
      id: 920, // Force l'ID
      wordpress_id: 920,
      title: product.name,
      description: product.description || product.short_description || "",
      genre: "Hip-Hop", // Valeur par défaut
      bpm: 120, // Valeur par défaut
      key: "C", // Valeur par défaut
      mood: "Energetic", // Valeur par défaut
      price: Math.round(Number.parseFloat(product.price || "0") * 100),
      audio_url: "",
      image_url: product.images?.[0]?.src || "",
      is_active: true,
      created_at: product.date_created,
      tags: [],
      featured: false,
      downloads: 0,
      views: 0,
      duration: 180,
    };

    console.log("💾 Insertion dans Supabase...");
    const { data, error } = await supabase
      .from("beats")
      .upsert(supabaseProduct, {
        onConflict: "id",
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Erreur Supabase:", error);
      return;
    }

    console.log("✅ Beat 920 synchronisé avec succès !");
    console.log("📊 Données:", data);
  } catch (error) {
    console.error("💥 Erreur fatale:", error);
  }
}

// Exécuter la synchronisation avec top-level await
await syncBeat920();
