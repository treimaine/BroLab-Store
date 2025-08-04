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
    
    // D'abord, supprimer les données de wishlist qui bloquent la suppression des users
    console.log('🗑️  Suppression des wishlist...');
    try {
      const { error } = await supabaseAdmin
        .from('wishlist')
        .delete()
        .neq('id', 0);
      
      if (error) {
        console.log(`⚠️  Erreur pour wishlist:`, error.message);
      } else {
        console.log(`✅ wishlist vidée`);
      }
    } catch (err) {
      console.log(`⚠️  Erreur pour wishlist:`, err.message);
    }
    
    // Maintenant supprimer les users
    console.log('🗑️  Suppression des users...');
    try {
      const { error } = await supabaseAdmin
        .from('users')
        .delete()
        .neq('id', 0);
      
      if (error) {
        console.log(`⚠️  Erreur pour users:`, error.message);
      } else {
        console.log(`✅ users vidée`);
      }
    } catch (err) {
      console.log(`⚠️  Erreur pour users:`, err.message);
    }
    
    // Liste des autres tables à vider
    const tables = [
      'order_status_history',
      'cart_items', 
      'orders',
      'downloads',
      'activity_log',
      'service_orders',
      'subscriptions'
    ];
    
    // Vider chaque table
    for (const table of tables) {
      try {
        const { error } = await supabaseAdmin
          .from(table)
          .delete()
          .neq('id', 0);
        
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
    const allTables = ['users', 'wishlist', ...tables];
    
    for (const table of allTables) {
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