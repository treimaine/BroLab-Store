#!/usr/bin/env node

/**
 * Script de test pour les améliorations futures
 * Test des nouvelles fonctionnalités : Abonnements, PayPal, Téléchargements, Cache
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

// Tests des améliorations
async function runImprovementTests() {
  console.log('🚀 DÉBUT DES TESTS D\'AMÉLIORATIONS');
  console.log('====================================\n');

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

  // Test 2: Plans d'abonnement
  try {
    console.log('2. Test plans d\'abonnement...');
    const response = await makeRequest('GET', '/api/subscription/plans');
    if (response.status === 200 && response.body.includes('"id":"basic"')) {
      console.log('   ✅ Plans d\'abonnement récupérés');
      passed++;
    } else {
      console.log('   ❌ Échec récupération plans');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Test 3: Configuration PayPal
  try {
    console.log('3. Test configuration PayPal...');
    const response = await makeRequest('GET', '/api/payment/paypal/config');
    if (response.status === 200 && response.body.includes('clientId')) {
      console.log('   ✅ Configuration PayPal récupérée');
      passed++;
    } else {
      console.log('   ❌ Échec configuration PayPal');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Test 4: Création commande PayPal
  try {
    console.log('4. Test création commande PayPal...');
    const response = await makeRequest('POST', '/api/payment/paypal/create-order', {
      amount: 29.99,
      currency: 'EUR',
      items: [{ name: 'AURORA Vol.1', price: 29.99 }]
    }, true);
    if (response.status === 200 && response.body.includes('PAYPAL_ORDER')) {
      console.log('   ✅ Commande PayPal créée');
      passed++;
    } else {
      console.log('   ❌ Échec création commande PayPal');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Test 5: Statut téléchargements
  try {
    console.log('5. Test statut téléchargements...');
    const response = await makeRequest('GET', '/api/downloads/status', null, true);
    if (response.status === 200) {
      console.log('   ✅ Statut téléchargements récupéré');
      passed++;
    } else {
      console.log('   ❌ Échec statut téléchargements');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Test 6: URL téléchargement beat
  try {
    console.log('6. Test URL téléchargement beat...');
    const response = await makeRequest('GET', '/api/downloads/beat/919', null, true);
    if (response.status === 200 && response.body.includes('downloadUrl')) {
      console.log('   ✅ URL téléchargement générée');
      passed++;
    } else {
      console.log('   ❌ Échec génération URL téléchargement');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Test 7: Statistiques téléchargements
  try {
    console.log('7. Test statistiques téléchargements...');
    const response = await makeRequest('GET', '/api/downloads/stats', null, true);
    if (response.status === 200 && response.body.includes('totalDownloads')) {
      console.log('   ✅ Statistiques téléchargements récupérées');
      passed++;
    } else {
      console.log('   ❌ Échec statistiques téléchargements');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Test 8: Historique PayPal
  try {
    console.log('8. Test historique PayPal...');
    const response = await makeRequest('GET', '/api/payment/paypal/history', null, true);
    if (response.status === 200 && response.body.includes('PAYPAL_1')) {
      console.log('   ✅ Historique PayPal récupéré');
      passed++;
    } else {
      console.log('   ❌ Échec historique PayPal');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Test 9: Performance - Test de vitesse
  try {
    console.log('9. Test performance...');
    const startTime = Date.now();
    const response = await makeRequest('GET', '/api/subscription/plans');
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (response.status === 200 && duration < 1000) {
      console.log(`   ✅ Performance OK (${duration}ms)`);
      passed++;
    } else {
      console.log(`   ⚠️ Performance lente (${duration}ms)`);
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Test 10: Gestion d'erreurs
  try {
    console.log('10. Test gestion d\'erreurs...');
    const response = await makeRequest('GET', '/api/woocommerce/products/999999');
    if (response.status === 200 && response.body.includes('error')) {
      console.log('   ✅ Gestion d\'erreurs fonctionnelle');
      passed++;
    } else {
      console.log('   ❌ Gestion d\'erreurs défaillante');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    failed++;
  }

  // Résumé
  console.log('\n📊 RÉSUMÉ DES TESTS D\'AMÉLIORATIONS');
  console.log('=====================================');
  console.log(`✅ Tests réussis: ${passed}`);
  console.log(`❌ Tests échoués: ${failed}`);
  console.log(`📈 Taux de succès: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 TOUTES LES AMÉLIORATIONS SONT FONCTIONNELLES !');
    console.log('L\'application est prête pour la production avec toutes les fonctionnalités avancées.');
  } else {
    console.log('\n⚠️ CERTAINES AMÉLIORATIONS ONT ÉCHOUÉ');
    console.log('Vérifiez les fonctionnalités défaillantes.');
  }

  console.log('\n🏁 FIN DES TESTS D\'AMÉLIORATIONS');
}

// Exécuter les tests
runImprovementTests().catch(console.error); 