# Guide de Vérifications de Développement

Ce guide explique comment utiliser les vérifications automatiques TypeScript et ESLint pour éviter les erreurs de syntaxe et maintenir la qualité du code.

## 🚀 Scripts Disponibles

### Vérifications de Base

```bash
# Vérification TypeScript uniquement
npm run type-check

# Vérification ESLint uniquement
npm run lint

# Correction automatique ESLint
npm run lint:fix

# Vérification complète (TypeScript + ESLint)
npm run pre-check

# Vérification pré-commit complète
npm run pre-commit
npm run verify
```

### Vérifications Avant Build

```bash
# Build avec vérifications automatiques
npm run build

# Vérifications manuelles avant build
npm run pre-build
```

## 🔍 Types de Vérifications

### 1. TypeScript Type Checking

- Vérifie les types et interfaces
- Détecte les erreurs de compilation
- Valide les imports/exports
- Vérifie la cohérence des types

### 2. ESLint Code Quality

- Règles de style de code
- Détection d'erreurs potentielles
- Vérification des bonnes pratiques
- Correction automatique possible

### 3. JSX Syntax Validation

- Vérification de la syntaxe JSX
- Détection des balises mal fermées
- Validation des props React
- Vérification des hooks React

## 🛠️ Configuration VS Code

Le projet inclut une configuration VS Code optimisée :

### Extensions Recommandées

- **ESLint** - Vérification en temps réel
- **TypeScript and JavaScript Language Features** - Support TypeScript natif
- **Prettier** - Formatage automatique
- **Auto Rename Tag** - Pour JSX/HTML
- **Bracket Pair Colorizer** - Visualisation des parenthèses

### Fonctionnalités Activées

- ✅ Vérification TypeScript en temps réel
- ✅ ESLint en temps réel
- ✅ Formatage automatique à la sauvegarde
- ✅ Correction automatique ESLint
- ✅ Organisation automatique des imports
- ✅ Auto-complétion TypeScript
- ✅ Détection d'erreurs JSX

## 🚨 Erreurs Courantes et Solutions

### Erreur JSX : "Adjacent JSX elements must be wrapped"

```tsx
// ❌ Incorrect
return (
  <div>Content 1</div>
  <div>Content 2</div>
);

// ✅ Correct
return (
  <>
    <div>Content 1</div>
    <div>Content 2</div>
  </>
);
```

### Erreur TypeScript : "Cannot access before initialization"

```tsx
// ❌ Incorrect
const recommendations = generateRecommendations();

// ✅ Correct
const recommendations = useMemo(() => {
  return generateRecommendations();
}, [dependencies]);
```

### Erreur ESLint : "Missing key prop"

```tsx
// ❌ Incorrect
{
  items.map(item => <div>{item.name}</div>);
}

// ✅ Correct
{
  items.map(item => <div key={item.id}>{item.name}</div>);
}
```

## 📋 Workflow Recommandé

### 1. Pendant le Développement

```bash
# Démarrer le serveur de développement
npm run dev

# Dans un autre terminal, surveiller les erreurs
npm run type-check -- --watch
```

### 2. Avant de Commiter

```bash
# Vérification complète
npm run pre-commit

# Si des erreurs, les corriger
npm run lint:fix
npm run type-check
```

### 3. Avant de Pousser

```bash
# Build avec vérifications
npm run build
```

## 🔧 Correction Automatique

### ESLint Auto-fix

```bash
# Corriger automatiquement les erreurs ESLint
npm run lint:fix
```

### TypeScript Organize Imports

Dans VS Code : `Ctrl+Shift+P` → "TypeScript: Organize Imports"

### Prettier Format

Dans VS Code : `Ctrl+Shift+P` → "Format Document"

## 📊 Monitoring Continu

### Intégration CI/CD

Les vérifications peuvent être intégrées dans votre pipeline CI/CD :

```yaml
# Exemple GitHub Actions
- name: Type Check
  run: npm run type-check

- name: Lint
  run: npm run lint

- name: Build
  run: npm run build
```

### Pre-commit Hooks

Pour une vérification automatique avant chaque commit, installez husky :

```bash
npm install --save-dev husky
npx husky install
npx husky add .husky/pre-commit "npm run pre-commit"
```

## 🎯 Bonnes Pratiques

1. **Vérifiez régulièrement** : Lancez `npm run pre-check` avant de commiter
2. **Corrigez immédiatement** : Ne laissez pas les erreurs s'accumuler
3. **Utilisez VS Code** : Profitez de la vérification en temps réel
4. **Documentez les exceptions** : Si vous devez désactiver une règle, documentez pourquoi
5. **Maintenez la cohérence** : Respectez les conventions établies

## 🆘 Dépannage

### Erreurs TypeScript persistantes

```bash
# Nettoyer le cache TypeScript
rm -rf node_modules/.cache
rm -rf .tsbuildinfo
npm run type-check
```

### Erreurs ESLint persistantes

```bash
# Nettoyer le cache ESLint
rm -rf node_modules/.cache/eslint
npm run lint
```

### Problèmes de configuration

```bash
# Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install
```

---

💡 **Conseil** : Intégrez ces vérifications dans votre workflow quotidien pour maintenir un code de qualité et éviter les erreurs de production !
