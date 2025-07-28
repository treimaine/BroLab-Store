#!/usr/bin/env node

/**
 * Script de test automatisé pour l'interface utilisateur
 * Phase 2.2 - Test de l'interface utilisateur
 */

import http from 'http';

const BASE_URL = 'http://localhost:5000';
let cookies = '';

// Fonction utilitaire pour faire des requêtes HTTP
function makeRequest(method, path, data = null, useCookies = false) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (useCookies && cookies) {
      options.headers['Cookie'] = cookies;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        // Extraire les cookies de la réponse
        if (res.headers['set-cookie']) {
          cookies = res.headers['set-cookie'].map(cookie => cookie.split(';')[0]).join('; ');
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Tests
async function runTests() {
  console.log('🧪 DÉBUT DES TESTS - PHASE 2.2');
  console.log('================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Accès à la page d'accueil
  try {
    console.log('1. Test accès page d\'accueil...');
    const response = await makeRequest('GET', '/');
    if (response.status === 200 && response.body.includes('<!DOCTYPE html>')) {
      console.log('   ✅ Page d\'accueil accessible');
      passed++;
    } else {
      console.log('   ❌ Page d\'accueil inaccessible');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Test 2: Accès à la page shop
  try {
    console.log('2. Test accès page shop...');
    const response = await makeRequest('GET', '/shop');
    if (response.status === 200 && response.body.includes('<!DOCTYPE html>')) {
      console.log('   ✅ Page shop accessible');
      passed++;
    } else {
      console.log('   ❌ Page shop inaccessible');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Test 3: Accès à la page wishlist
  try {
    console.log('3. Test accès page wishlist...');
    const response = await makeRequest('GET', '/wishlist');
    if (response.status === 200 && response.body.includes('<!DOCTYPE html>')) {
      console.log('   ✅ Page wishlist accessible');
      passed++;
    } else {
      console.log('   ❌ Page wishlist inaccessible');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Test 4: API WooCommerce - Produits
  try {
    console.log('4. Test API WooCommerce - Produits...');
    const response = await makeRequest('GET', '/api/woocommerce/products');
    if (response.status === 200 && response.body.includes('"id":919')) {
      console.log('   ✅ API produits WooCommerce fonctionnelle');
      passed++;
    } else {
      console.log('   ❌ API produits WooCommerce défaillante');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Test 5: API WooCommerce - Catégories
  try {
    console.log('5. Test API WooCommerce - Catégories...');
    const response = await makeRequest('GET', '/api/woocommerce/categories');
    if (response.status === 200 && response.body.includes('"name":"BeatStore"')) {
      console.log('   ✅ API catégories WooCommerce fonctionnelle');
      passed++;
    } else {
      console.log('   ❌ API catégories WooCommerce défaillante');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Test 6: Authentification
  try {
    console.log('6. Test authentification...');
    const response = await makeRequest('POST', '/api/auth/login', {
      username: 'test@example.com',
      password: 'password123'
    });
    if (response.status === 200 && response.body.includes('"id":1495')) {
      console.log('   ✅ Authentification réussie');
      passed++;
    } else {
      console.log('   ❌ Authentification échouée');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Test 7: API Wishlist (avec authentification)
  try {
    console.log('7. Test API Wishlist...');
    const response = await makeRequest('GET', '/api/wishlist', null, true);
    if (response.status === 200) {
      console.log('   ✅ API Wishlist accessible');
      passed++;
    } else {
      console.log('   ❌ API Wishlist inaccessible');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Résumé
  console.log('\n📊 RÉSUMÉ DES TESTS');
  console.log('===================');
  console.log(`✅ Tests réussis: ${passed}`);
  console.log(`❌ Tests échoués: ${failed}`);
  console.log(`📈 Taux de succès: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 TOUS LES TESTS SONT PASSÉS !');
    console.log('L\'interface utilisateur est fonctionnelle.');
  } else {
    console.log('\n⚠️  CERTAINS TESTS ONT ÉCHOUÉ');
    console.log('Vérifiez les fonctionnalités défaillantes.');
  }

  console.log('\n🏁 FIN DES TESTS - PHASE 2.2');
}

// Exécuter les tests
runTests().catch(console.error); 