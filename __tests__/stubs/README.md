# WooCommerce Stubs pour Tests

Ce dossier contient des stubs et mocks pour remplacer les appels réels à l'API WooCommerce dans les tests.

## 🎯 Objectif

Éviter les appels HTTP réels à WooCommerce pendant l'exécution des tests, tout en fournissant des données de test cohérentes et prévisibles.

## 📁 Fichiers

### `woocommerce-stubs.ts`

- **Interface MockBeat** : Structure des données de beat pour les tests
- **Interface MockBeatList** : Structure de la liste des beats
- **mockBeats** : Données de test pour 3 beats (Hip Hop, Trap, R&B)
- **mockBeatsList** : Liste des beats pour les tests de liste
- **stubWcApiRequest** : Stub de la fonction `wcApiRequest`
- **stubFetch** : Stub de la fonction `fetch` globale
- **setupWooCommerceStubs** : Fonction de configuration des stubs
- **cleanupWooCommerceStubs** : Fonction de nettoyage des stubs

### `woocommerce-stubs.test.ts`

- Tests unitaires pour vérifier le bon fonctionnement des stubs
- Validation des données mockées
- Tests des fonctions de stub

## 🚀 Utilisation

### 1. Import des stubs dans vos tests

```typescript
import {
  setupWooCommerceStubs,
  cleanupWooCommerceStubs,
  mockBeats,
} from "./stubs/woocommerce-stubs";
```

### 2. Configuration dans vos tests

```typescript
describe("Mon Test", () => {
  beforeAll(() => {
    setupWooCommerceStubs();
  });

  afterAll(() => {
    cleanupWooCommerceStubs();
  });

  // Vos tests ici...
});
```

### 3. Utilisation des données mockées

```typescript
it("should test with mock data", () => {
  const beat = mockBeats[123];
  expect(beat.title).toBe("Test Beat - Hip Hop");
  expect(beat.bpm).toBe(140);
});
```

## 🔧 Configuration Jest

Les stubs sont automatiquement configurés via :

1. **jest.config.cjs** : Mapping des modules
2. **jest.setup.ts** : Configuration globale des mocks
3. **Module mapping** : Remplacement des librairies réelles

## 📊 Données Mockées

### Beat 123 - Hip Hop

- **Genre** : Hip Hop
- **BPM** : 140
- **Key** : C
- **Mood** : Aggressive
- **Prix** : 9.99€

### Beat 456 - Trap

- **Genre** : Trap
- **BPM** : 150
- **Key** : F#
- **Mood** : Dark
- **Prix** : 19.99€

### Beat 789 - R&B

- **Genre** : R&B
- **BPM** : 120
- **Key** : A
- **Mood** : Smooth
- **Prix** : 14.99€

## 🧪 Tests Supportés

Ces stubs supportent les tests des endpoints suivants :

- `/api/opengraph/beat/:id`
- `/api/opengraph/shop`
- `/api/opengraph/home`
- `/api/opengraph/page/:pageName`
- `/api/schema/beat/:id`
- `/api/schema/beats-list`
- `/api/schema/organization`

## ⚠️ Points d'Attention

1. **Données statiques** : Les données mockées sont statiques et ne changent pas entre les tests
2. **Pas de persistance** : Les modifications ne sont pas persistées
3. **Simulation réseau** : Un délai aléatoire est simulé pour imiter la latence réseau
4. **Gestion d'erreurs** : Les erreurs 404 sont simulées pour les IDs invalides

## 🔄 Mise à Jour

Pour ajouter de nouveaux beats ou modifier les données existantes :

1. Modifiez `mockBeats` dans `woocommerce-stubs.ts`
2. Mettez à jour `mockBeatsList` si nécessaire
3. Ajoutez des tests dans `woocommerce-stubs.test.ts`
4. Vérifiez que tous les tests passent

## 📝 Exemple Complet

```typescript
import request from "supertest";
import { app } from "../server/app";
import { setupWooCommerceStubs, cleanupWooCommerceStubs } from "./stubs/woocommerce-stubs";

describe("Open Graph API", () => {
  beforeAll(() => {
    setupWooCommerceStubs();
  });

  afterAll(() => {
    cleanupWooCommerceStubs();
  });

  it("should return Open Graph meta tags for valid beat ID", async () => {
    const response = await request(app).get("/api/opengraph/beat/123").expect(200);

    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain("Test Beat - Hip Hop");
  });
});
```

## 🎉 Avantages

- ✅ **Tests rapides** : Pas d'appels HTTP réels
- ✅ **Données cohérentes** : Résultats prévisibles
- ✅ **Pas de dépendances externes** : Tests isolés
- ✅ **Facilité de maintenance** : Données centralisées
- ✅ **Simulation réaliste** : Comportement proche de la réalité
