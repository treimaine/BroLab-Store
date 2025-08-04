#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '../server/lib/supabaseAdmin.js';

async function clearDatabase() {
  try {
    console.log('🗑️  Début du nettoyage de la base de données...');
    
    // Lire le script SQL
    const sqlPath = path.join(process.cwd(), 'scripts', 'clear-database.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Exécuter le script SQL
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Erreur lors du nettoyage:', error);
      return;
    }
    
    console.log('✅ Base de données vidée avec succès !');
    console.log('📊 Résultats du nettoyage:');
    
    if (data) {
      data.forEach(row => {
        console.log(`  - ${row.table_name}: ${row.count} enregistrements`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Exécuter le script
clearDatabase(); 