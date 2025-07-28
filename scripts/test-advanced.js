#!/usr/bin/env node

/**
 * Script de test avancé pour les fonctionnalités Phase 2.3
 * Test des fonctionnalités avancées : Stripe, PayPal, Dashboard, etc.
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

// Tests avancés
async function runAdvancedTests() {
  console.log('🧪 DÉBUT DES TESTS AVANCÉS - PHASE 2.3');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Authentification (prérequis)
  try {
    console.log('1. Test authentification (prérequis)...');
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

  // Test 2: Paiement Stripe - Création d'intention de paiement
  try {
    console.log('2. Test paiement Stripe...');
    const response = await makeRequest('POST', '/api/create-payment-intent', {
      amount: 5000,
      currency: 'eur'
    }, true);
    if (response.status === 200 && response.body.includes('clientSecret')) {
      console.log('   ✅ Intention de paiement Stripe créée');
      passed++;
    } else {
      console.log('   ❌ Échec création intention de paiement');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Test 3: Dashboard utilisateur
  try {
    console.log('3. Test accès dashboard...');
    const response = await makeRequest('GET', '/dashboard');
    if (response.status === 200 && response.body.includes('<!DOCTYPE html>')) {
      console.log('   ✅ Dashboard accessible');
      passed++;
    } else {
      console.log('   ❌ Dashboard inaccessible');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Test 4: Page de compte utilisateur
  try {
    console.log('4. Test page compte utilisateur...');
    const response = await makeRequest('GET', '/account');
    if (response.status === 200 && response.body.includes('<!DOCTYPE html>')) {
      console.log('   ✅ Page compte accessible');
      passed++;
    } else {
      console.log('   ❌ Page compte inaccessible');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Test 5: Page de commandes
  try {
    console.log('5. Test page commandes...');
    const response = await makeRequest('GET', '/account/orders');
    if (response.status === 200 && response.body.includes('<!DOCTYPE html>')) {
      console.log('   ✅ Page commandes accessible');
      passed++;
    } else {
      console.log('   ❌ Page commandes inaccessible');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Test 6: Page de panier
  try {
    console.log('6. Test page panier...');
    const response = await makeRequest('GET', '/cart');
    if (response.status === 200 && response.body.includes('<!DOCTYPE html>')) {
      console.log('   ✅ Page panier accessible');
      passed++;
    } else {
      console.log('   ❌ Page panier inaccessible');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Test 7: Page de contact
  try {
    console.log('7. Test page contact...');
    const response = await makeRequest('GET', '/contact');
    if (response.status === 200 && response.body.includes('<!DOCTYPE html>')) {
      console.log('   ✅ Page contact accessible');
      passed++;
    } else {
      console.log('   ❌ Page contact inaccessible');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Test 8: Page à propos
  try {
    console.log('8. Test page à propos...');
    const response = await makeRequest('GET', '/about');
    if (response.status === 200 && response.body.includes('<!DOCTYPE html>')) {
      console.log('   ✅ Page à propos accessible');
      passed++;
    } else {
      console.log('   ❌ Page à propos inaccessible');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Test 9: Responsive design - Vérification viewport
  try {
    console.log('9. Test responsive design...');
    const response = await makeRequest('GET', '/');
    if (response.status === 200 && response.body.includes('viewport')) {
      console.log('   ✅ Viewport responsive configuré');
      passed++;
    } else {
      console.log('   ❌ Viewport non configuré');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Test 10: API utilisateur avec authentification
  try {
    console.log('10. Test API utilisateur...');
    const response = await makeRequest('GET', '/api/auth/user', null, true);
    if (response.status === 200 && response.body.includes('"id":1495')) {
      console.log('   ✅ API utilisateur fonctionnelle');
      passed++;
    } else {
      console.log('   ❌ API utilisateur défaillante');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Résumé
  console.log('\n📊 RÉSUMÉ DES TESTS AVANCÉS');
  console.log('============================');
  console.log(`✅ Tests réussis: ${passed}`);
  console.log(`❌ Tests échoués: ${failed}`);
  console.log(`📈 Taux de succès: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 TOUS LES TESTS AVANCÉS SONT PASSÉS !');
    console.log('L\'application est prête pour la production.');
  } else {
    console.log('\n⚠️  CERTAINS TESTS AVANCÉS ONT ÉCHOUÉ');
    console.log('Vérifiez les fonctionnalités défaillantes.');
  }

  console.log('\n🏁 FIN DES TESTS AVANCÉS - PHASE 2.3');
}

// Exécuter les tests
runAdvancedTests().catch(console.error); 