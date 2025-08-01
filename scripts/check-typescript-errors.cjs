#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Vérification d\'erreurs TypeScript potentielles...\n');

// Fonction pour lire récursivement les fichiers TypeScript
function findTsFiles(dir, excludes = ['node_modules', 'dist', 'build']) {
  const files = [];
  
  function scanDir(currentDir) {
    if (excludes.some(exclude => currentDir.includes(exclude))) return;
    
    try {
      const items = fs.readdirSync(currentDir);
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }
  
  scanDir(dir);
  return files;
}

// Fonction pour vérifier les erreurs communes
function checkCommonErrors(filePath) {
  const errors = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // Vérifier les imports relatifs cassés
      if (line.includes('import') && line.includes('../')) {
        const match = line.match(/from\s+['"]([^'"]+)['"]/);
        if (match) {
          const importPath = match[1];
          const resolvedPath = path.resolve(path.dirname(filePath), importPath);
          
          // Vérifier si le fichier existe (avec extensions possibles)
          const possibleExtensions = ['', '.ts', '.tsx', '.js', '.jsx'];
          let exists = false;
          
          for (const ext of possibleExtensions) {
            if (fs.existsSync(resolvedPath + ext)) {
              exists = true;
              break;
            }
          }
          
          if (!exists && !importPath.includes('node_modules')) {
            errors.push({
              file: filePath,
              line: lineNum,
              type: 'IMPORT_ERROR',
              message: `Import introuvable: ${importPath}`,
              code: line.trim()
            });
          }
        }
      }
      
      // Vérifier les types any explicites
      if (line.includes(': any') && !line.includes('//')) {
        errors.push({
          file: filePath,
          line: lineNum,
          type: 'TYPE_WARNING',
          message: 'Usage de type "any" explicite',
          code: line.trim()
        });
      }
      
      // Vérifier les destructurations potentiellement dangereuses
      if (line.includes('as any') && line.includes('?.')) {
        errors.push({
          file: filePath,
          line: lineNum,
          type: 'TYPE_WARNING',
          message: 'Cast "as any" avec optional chaining potentiellement dangereux',
          code: line.trim()
        });
      }
      
      // Vérifier les imports dynamiques suspects
      if (line.includes('await import(') && !line.includes('//')) {
        errors.push({
          file: filePath,
          line: lineNum,
          type: 'IMPORT_WARNING',
          message: 'Import dynamique détecté - vérifier la compatibilité',
          code: line.trim()
        });
      }
    });
  } catch (error) {
    errors.push({
      file: filePath,
      line: 0,
      type: 'FILE_ERROR',
      message: `Impossible de lire le fichier: ${error.message}`,
      code: ''
    });
  }
  
  return errors;
}

// Fonction principale
function main() {
  const tsFiles = findTsFiles('.');
  let totalErrors = 0;
  let totalWarnings = 0;
  
  console.log(`📁 Fichiers TypeScript trouvés: ${tsFiles.length}\n`);
  
  for (const file of tsFiles) {
    const errors = checkCommonErrors(file);
    
    if (errors.length > 0) {
      console.log(`\n📄 ${file}`);
      console.log('─'.repeat(50));
      
      errors.forEach(error => {
        const icon = error.type.includes('ERROR') ? '❌' : '⚠️';
        const color = error.type.includes('ERROR') ? '\x1b[31m' : '\x1b[33m';
        
        console.log(`${icon} ${color}Ligne ${error.line}: ${error.message}\x1b[0m`);
        if (error.code) {
          console.log(`   ${error.code}`);
        }
        
        if (error.type.includes('ERROR')) totalErrors++;
        else totalWarnings++;
      });
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Résumé:`);
  console.log(`   ❌ Erreurs: ${totalErrors}`);
  console.log(`   ⚠️  Avertissements: ${totalWarnings}`);
  
  if (totalErrors === 0 && totalWarnings === 0) {
    console.log('\n🎉 Aucun problème détecté!');
  } else if (totalErrors === 0) {
    console.log('\n✅ Pas d\'erreurs critiques, seulement des avertissements');
  } else {
    console.log('\n💥 Erreurs détectées - correction recommandée');
  }
  
  return totalErrors === 0 ? 0 : 1;
}

// Exécuter le script
process.exit(main());