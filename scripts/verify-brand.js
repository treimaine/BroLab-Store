#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const BRQLAB_PATTERN = /BRQLAB/gi;
const IGNORED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
const IGNORED_DIRS = ['node_modules', '.git', 'dist', '.next', 'build'];

function shouldIgnoreFile(filePath) {
  const ext = path.extname(filePath);
  return IGNORED_EXTENSIONS.includes(ext) || filePath.includes('verify-brand.js');
}

function shouldIgnoreDir(dirName) {
  return IGNORED_DIRS.includes(dirName) || dirName.startsWith('.');
}

function scanDirectory(dirPath, violations = []) {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!shouldIgnoreDir(item)) {
        scanDirectory(fullPath, violations);
      }
    } else if (stat.isFile() && !shouldIgnoreFile(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const matches = content.match(BRQLAB_PATTERN);
        
        if (matches) {
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            if (BRQLAB_PATTERN.test(line)) {
              violations.push({
                file: fullPath,
                line: index + 1,
                content: line.trim(),
                matches: line.match(BRQLAB_PATTERN)
              });
            }
          });
        }
      } catch (error) {
        // Skip files that can't be read as text
        if (error.code !== 'EISDIR') {
          console.warn(`Warning: Could not read file ${fullPath}: ${error.message}`);
        }
      }
    }
  }
  
  return violations;
}

function main() {
  console.log('🔍 Scanning for BRQLAB brand violations...');
  
  const violations = scanDirectory(process.cwd());
  
  if (violations.length === 0) {
    console.log('✅ No BRQLAB violations found. Brand consistency check passed!');
    process.exit(0);
  } else {
    console.log(`❌ Found ${violations.length} brand violation(s):`);
    console.log('');
    
    violations.forEach(violation => {
      console.log(`📁 ${violation.file}:${violation.line}`);
      console.log(`   ${violation.content}`);
      console.log(`   ^ Found: ${violation.matches.join(', ')}`);
      console.log('');
    });
    
    console.log('Please replace all instances of "BRQLAB" with "BROLAB" and run the build again.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { scanDirectory, shouldIgnoreFile, shouldIgnoreDir };