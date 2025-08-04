#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Créer le client Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans .env');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function clearDatabase() {
  try {
    console.log('🗑️  Début du nettoyage de la base de données...');
    
    // Liste des tables à vider dans l'ordre inverse des dépendances
    const tables = [
      'order_status_history',
      'cart_items', 
      'orders',
      'downloads',
      'activity_log',
      'files',
      'service_orders',
      'reservations',
      'subscriptions',
      'email_verifications',
      'password_resets',
      'wishlist_items',
      'users'
    ];
    
    // Vider chaque table
    for (const table of tables) {
      try {
        const { error } = await supabaseAdmin
          .from(table)
          .delete()
          .neq('id', 0); // Supprimer tous les enregistrements
        
        if (error) {
          console.log(`⚠️  Erreur pour ${table}:`, error.message);
        } else {
          console.log(`✅ ${table} vidée`);
        }
      } catch (err) {
        console.log(`⚠️  Erreur pour ${table}:`, err.message);
      }
    }
    
    console.log('✅ Nettoyage terminé !');
    
    // Vérifier les comptes
    console.log('\n📊 Vérification des tables:');
    for (const table of tables) {
      try {
        const { count, error } = await supabaseAdmin
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`  - ${table}: Erreur - ${error.message}`);
        } else {
          console.log(`  - ${table}: ${count} enregistrements`);
        }
      } catch (err) {
        console.log(`  - ${table}: Erreur - ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le script
clearDatabase(); 