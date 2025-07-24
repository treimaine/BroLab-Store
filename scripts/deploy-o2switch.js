#!/usr/bin/env node

/**
 * Script de déploiement cross-platform pour o2switch
 * Compatible Windows/Linux/macOS
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

console.log('🚀 Déploiement o2switch - Cross-Platform');

// Vérification environnement
if (!existsSync('.env.production')) {
  console.error('❌ Fichier .env.production manquant');
  process.exit(1);
}

try {
  // Clean et build production
  console.log('🧹 Nettoyage...');
  execSync('npm run clean:safe', { stdio: 'inherit' });
  
  console.log('🔨 Build production...');
  execSync('npm run build:prod', { stdio: 'inherit' });
  
  // Tests avant déploiement
  console.log('🧪 Tests de validation...');
  execSync('npm run test:ci', { stdio: 'inherit' });
  
  console.log('✅ Build prêt pour o2switch');
  console.log('📋 Prochaines étapes:');
  console.log('   1. Upload dossier dist/ vers o2switch');
  console.log('   2. Configurer variables .env.production');
  console.log('   3. Redémarrer Node.js sur cPanel');
  
} catch (error) {
  console.error('❌ Erreur deployment:', error.message);
  process.exit(1);
}