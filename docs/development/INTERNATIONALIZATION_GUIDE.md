# 🌍 Guide d'Internationalisation BroLab

_Système i18n moderne avec react-i18next - Janvier 2025_

## ✅ État Actuel

L'application BroLab est maintenant entièrement internationalisée avec :

- **Langue native** : Anglais (English)
- **Langues supportées** : Français, Espagnol, Allemand, Japonais, Chinois
- **Détection automatique** : Basée sur la localisation du navigateur
- **Sélecteur de langue** : Interface utilisateur pour changer manuellement

---

## 🚀 Fonctionnalités Implémentées

### 1. **Détection Automatique de Langue**

- Détection basée sur les paramètres du navigateur
- Fallback vers l'anglais si langue non supportée
- Persistance du choix utilisateur

### 2. **Sélecteur de Langue**

- Composant `LanguageSwitcher` dans la navbar
- Variantes : default, compact, icon-only
- Interface responsive (desktop + mobile)

### 3. **Hook useTranslation Avancé**

- Formatage automatique des devises
- Formatage des dates localisées
- Support RTL (prêt pour l'arabe/hébreu)
- Gestion des erreurs et fallbacks

---

## 🛠️ Utilisation dans les Composants

### Import du Hook

```typescript
import { useTranslation } from '../hooks/useTranslationNew';

export function MonComposant() {
  const { t, formatCurrency, formatDate } = useTranslation();

  return (
    <div>
      <h1>{t('nav.home')}</h1>
      <p>{t('dashboard.welcome', { name: 'John' })}</p>
      <span>{formatCurrency(1999)}</span> {/* $19.99 */}
    </div>
  );
}
```

### Clés de Traduction Disponibles

```typescript
// Navigation
t("nav.home"); // "Home" | "Accueil" | "Inicio"...
t("nav.shop"); // "Shop" | "Boutique" | "Tienda"...
t("nav.membership"); // "Membership" | "Adhésion" | "Membresía"...

// Actions communes
t("common.loading"); // "Loading..." | "Chargement..." | "Cargando..."...
t("common.save"); // "Save" | "Enregistrer" | "Guardar"...
t("common.cancel"); // "Cancel" | "Annuler" | "Cancelar"...

// Panier
t("cart.title"); // "Shopping Cart" | "Panier" | "Carrito"...
t("cart.empty"); // "Your cart is empty" | "Votre panier est vide"...

// Produits
t("product.preview"); // "Preview" | "Aperçu" | "Vista Previa"...
t("product.addToCart"); // "Add to Cart" | "Ajouter au Panier"...

// Licences
t("license.basic"); // "Basic License" | "Licence de Base"...
t("license.premium"); // "Premium License" | "Licence Premium"...
```

---

## 🔧 Configuration Technique

### Structure des Fichiers

```
client/
├── src/
│   ├── i18n/
│   │   ├── config.ts           # Configuration i18next
│   │   └── locales/
│   │       ├── en.json         # Anglais (langue de base)
│   │       ├── fr.json         # Français
│   │       ├── es.json         # Espagnol
│   │       ├── de.json         # Allemand
│   │       ├── ja.json         # Japonais
│   │       └── zh.json         # Chinois
│   ├── hooks/
│   │   └── useTranslationNew.ts # Hook personnalisé
│   └── components/
│       └── LanguageSwitcher.tsx # Composant sélecteur
└── public/
    └── locales/                # Copies publiques pour HTTP backend
        ├── en.json
        └── ...
```

### Langues Supportées

| Code | Langue   | Nom Natif | Devise | Statut     |
| ---- | -------- | --------- | ------ | ---------- |
| `en` | English  | English   | USD    | ✅ Complet |
| `fr` | French   | Français  | EUR    | ✅ Complet |
| `es` | Spanish  | Español   | EUR    | ✅ Complet |
| `de` | German   | Deutsch   | EUR    | ✅ Complet |
| `ja` | Japanese | 日本語    | JPY    | ✅ Complet |
| `zh` | Chinese  | 中文      | CNY    | ✅ Complet |

---

## 📝 Ajouter une Nouvelle Traduction

### 1. Ajouter une Clé dans `en.json`

```json
{
  "newFeature": {
    "title": "New Feature",
    "description": "This is a new feature description"
  }
}
```

### 2. Traduire dans Toutes les Langues

```json
// fr.json
{
  "newFeature": {
    "title": "Nouvelle Fonctionnalité",
    "description": "Ceci est la description d'une nouvelle fonctionnalité"
  }
}
```

### 3. Utiliser dans les Composants

```typescript
const { t } = useTranslation();

return (
  <div>
    <h2>{t('newFeature.title')}</h2>
    <p>{t('newFeature.description')}</p>
  </div>
);
```

---

## 🎨 Composant LanguageSwitcher

### Utilisation dans la Navbar

```typescript
import { CompactLanguageSwitcher } from '../LanguageSwitcher';

// Dans votre composant
<CompactLanguageSwitcher className="w-full" />
```

### Variantes Disponibles

```typescript
// Default - Sélecteur complet avec texte
<LanguageSwitcher variant="default" />

// Compact - Sélecteur condensé (utilisé dans navbar)
<LanguageSwitcher variant="compact" />

// Icon-only - Seulement l'icône globe
<LanguageSwitcher variant="icon-only" />
```

---

## 🔄 Hooks Utilitaires

### Hook Principal

```typescript
const {
  t, // Fonction de traduction
  currentLanguage, // Langue actuelle ('en', 'fr', etc.)
  currentLanguageInfo, // Infos de la langue (nom, drapeau, devise)
  changeLanguage, // Changer de langue
  formatCurrency, // Formater devise
  formatDate, // Formater date
  formatNumber, // Formater nombre
  isRTL, // True si langue RTL
  direction, // 'ltr' ou 'rtl'
} = useTranslation();
```

### Hooks Spécialisés

```typescript
// Pour les prix
const formatPrice = usePrice();
formatPrice(1999); // "$19.99" selon la devise locale

// Pour les dates
const { formatShortDate, formatLongDate, formatRelative } = useDateFormat();
formatShortDate(new Date()); // "Jan 26, 2025"
formatRelative(new Date()); // "2 hours ago"

// Pour la pluralisation
const plural = usePlural();
plural("cart.itemCount", 3); // "3 items" | "3 articles" | "3 artículos"
```

---

## 🌐 Fonctionnalités Avancées

### Formatage Automatique

```typescript
// Devises selon la langue
formatCurrency(1999); // $19.99 (EN), 19,99 € (FR), ¥1999 (JP)

// Dates localisées
formatDate(new Date(), {
  // 26/01/2025 (FR), 1/26/2025 (EN)
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

// Nombres selon la locale
formatNumber(1234.56); // 1,234.56 (EN), 1 234,56 (FR)
```

### Détection et Persistance

- **Détection** : Navigateur → URL → Cookie → localStorage
- **Persistance** : localStorage + cookie (30 jours)
- **Fallback** : Anglais si langue non supportée

---

## 🚨 Bonnes Pratiques

### ✅ À Faire

1. **Toujours utiliser les clés de traduction**

   ```typescript
   // ✅ Bon
   <Button>{t('common.save')}</Button>

   // ❌ Éviter
   <Button>Save</Button>
   ```

2. **Ajouter des fallbacks pour les nouvelles clés**

   ```typescript
   t("newKey", { defaultValue: "Default text" });
   ```

3. **Utiliser l'interpolation pour les variables**
   ```typescript
   t("welcome", { name: user.name });
   ```

### ❌ À Éviter

1. **Texte hardcodé dans les composants**
2. **Mélanger anglais et autres langues dans le même fichier**
3. **Oublier de mettre à jour toutes les langues**

---

## 📊 État des Traductions

### Composants Traduits ✅

- [x] **Navbar** - Navigation principale
- [x] **LanguageSwitcher** - Sélecteur de langue
- [x] **Cart** - Panier d'achat
- [x] **Dashboard** - Messages de bienvenue
- [x] **Auth** - Boutons connexion/déconnexion

### Composants à Traduire 🔄

- [ ] **Footer** - Pied de page
- [ ] **ProductCard** - Cartes de produits
- [ ] **Checkout** - Processus de paiement
- [ ] **Dashboard Tabs** - Onglets du dashboard
- [ ] **Forms** - Formulaires de contact/réservation

---

## 🎯 Prochaines Étapes

1. **Finaliser toutes les traductions** des composants existants
2. **Ajouter tests automatisés** pour l'i18n
3. **Optimiser le bundle** avec lazy loading des traductions
4. **Ajouter support RTL** pour l'arabe/hébreu si nécessaire
5. **Intégrer traduction automatique** pour nouvelles langues

---

**✨ L'internationalisation de BroLab est maintenant opérationnelle !**

Vous pouvez tester en changeant la langue avec le sélecteur dans la navbar ou en modifiant la langue de votre navigateur.

---

_Guide créé le 26 janvier 2025 - Version 1.0_
