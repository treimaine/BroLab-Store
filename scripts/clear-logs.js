#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

function clearLogs() {
  console.log('🗑️  Début du nettoyage des logs...');
  
  const logFiles = [
    'typescript_errors.log',
    'npm-debug.log',
    'yarn-error.log',
    'pnpm-debug.log',
    '*.log'
  ];
  
  const directories = [
    '.',
    'logs',
    'tmp',
    'temp'
  ];
  
  let deletedCount = 0;
  
  // Nettoyer les fichiers de logs spécifiques
  for (const logFile of logFiles) {
    try {
      if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
        console.log(`✅ Supprimé: ${logFile}`);
        deletedCount++;
      }
    } catch (err) {
      console.log(`⚠️  Erreur pour ${logFile}:`, err.message);
    }
  }
  
  // Chercher et supprimer tous les fichiers .log
  try {
    const files = fs.readdirSync('.');
    for (const file of files) {
      if (file.endsWith('.log')) {
        try {
          fs.unlinkSync(file);
          console.log(`✅ Supprimé: ${file}`);
          deletedCount++;
        } catch (err) {
          console.log(`⚠️  Erreur pour ${file}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.log(`⚠️  Erreur lors de la lecture du répertoire:`, err.message);
  }
  
  // Vider les répertoires de logs
  for (const dir of directories) {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file.endsWith('.log')) {
            const filePath = path.join(dir, file);
            try {
              fs.unlinkSync(filePath);
              console.log(`✅ Supprimé: ${filePath}`);
              deletedCount++;
            } catch (err) {
              console.log(`⚠️  Erreur pour ${filePath}:`, err.message);
            }
          }
        }
      } catch (err) {
        console.log(`⚠️  Erreur pour le répertoire ${dir}:`, err.message);
      }
    }
  }
  
  console.log(`✅ Nettoyage terminé ! ${deletedCount} fichiers supprimés.`);
}

// Exécuter le script
clearLogs(); 