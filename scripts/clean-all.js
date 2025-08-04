#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Charger les variables d'environnement
dotenv.config();

console.log('🧹 Début du nettoyage complet...\n');

// 1. Nettoyer les logs
function clearLogs() {
  console.log('🗑️  Nettoyage des logs...');
  
  const logFiles = [
    'typescript_errors.log',
    'npm-debug.log',
    'yarn-error.log',
    'pnpm-debug.log'
  ];
  
  let deletedCount = 0;
  
  // Nettoyer les fichiers de logs spécifiques
  for (const logFile of logFiles) {
    try {
      if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
        console.log(`  ✅ Supprimé: ${logFile}`);
        deletedCount++;
      }
    } catch (err) {
      console.log(`  ⚠️  Erreur pour ${logFile}:`, err.message);
    }
  }
  
  // Chercher et supprimer tous les fichiers .log
  try {
    const files = fs.readdirSync('.');
    for (const file of files) {
      if (file.endsWith('.log')) {
        try {
          fs.unlinkSync(file);
          console.log(`  ✅ Supprimé: ${file}`);
          deletedCount++;
        } catch (err) {
          console.log(`  ⚠️  Erreur pour ${file}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.log(`  ⚠️  Erreur lors de la lecture du répertoire:`, err.message);
  }
  
  console.log(`  ✅ Logs nettoyés ! ${deletedCount} fichiers supprimés.\n`);
}

// 2. Nettoyer la base de données
async function clearDatabase() {
  console.log('🗄️  Nettoyage de la base de données...');
  
  // Créer le client Supabase
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('  ❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans .env');
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  
  try {
    // D'abord, supprimer les données de wishlist qui bloquent la suppression des users
    console.log('  🗑️  Suppression des wishlist...');
    try {
      const { error } = await supabaseAdmin
        .from('wishlist')
        .delete()
        .neq('id', 0);
      
      if (error) {
        console.log(`    ⚠️  Erreur pour wishlist:`, error.message);
      } else {
        console.log(`    ✅ wishlist vidée`);
      }
    } catch (err) {
      console.log(`    ⚠️  Erreur pour wishlist:`, err.message);
    }
    
    // Maintenant supprimer les users
    console.log('  🗑️  Suppression des users...');
    try {
      const { error } = await supabaseAdmin
        .from('users')
        .delete()
        .neq('id', 0);
      
      if (error) {
        console.log(`    ⚠️  Erreur pour users:`, error.message);
      } else {
        console.log(`    ✅ users vidée`);
      }
    } catch (err) {
      console.log(`    ⚠️  Erreur pour users:`, err.message);
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
          console.log(`    ⚠️  Erreur pour ${table}:`, error.message);
        } else {
          console.log(`    ✅ ${table} vidée`);
        }
      } catch (err) {
        console.log(`    ⚠️  Erreur pour ${table}:`, err.message);
      }
    }
    
    console.log('  ✅ Base de données nettoyée !\n');
    
  } catch (error) {
    console.error('  ❌ Erreur générale:', error);
  }
}

// 3. Nettoyer les caches
function clearCaches() {
  console.log('🗂️  Nettoyage des caches...');
  
  const cacheDirs = [
    'node_modules/.cache',
    '.next',
    'dist',
    'build',
    '.cache'
  ];
  
  let deletedCount = 0;
  
  for (const cacheDir of cacheDirs) {
    try {
      if (fs.existsSync(cacheDir)) {
        fs.rmSync(cacheDir, { recursive: true, force: true });
        console.log(`  ✅ Supprimé: ${cacheDir}`);
        deletedCount++;
      }
    } catch (err) {
      console.log(`  ⚠️  Erreur pour ${cacheDir}:`, err.message);
    }
  }
  
  console.log(`  ✅ Caches nettoyés ! ${deletedCount} répertoires supprimés.\n`);
}

// Exécuter le nettoyage complet
async function cleanAll() {
  clearLogs();
  await clearDatabase();
  clearCaches();
  
  console.log('🎉 Nettoyage complet terminé !');
  console.log('✨ Votre projet est maintenant propre.');
}

// Exécuter le script
cleanAll(); 