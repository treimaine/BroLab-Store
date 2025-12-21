# 📱 Audit Mobile UI - BroLab Entertainment

**Date:** 21 décembre 2025  
**Version:** 1.0  
**Auteur:** Kiro - Expert Front-end / UX Mobile

---

## A) Résumé Exécutif

### 🔴 Top 10 Problèmes Mobile Bloquants

| #   | Problème                                     | Priorité | Impact Utilisateur                           | Fichiers Concernés                              |
| --- | -------------------------------------------- | -------- | -------------------------------------------- | ----------------------------------------------- |
| 1   | **Grille de beats non responsive sur 320px** | P0       | Débordement horizontal, scroll impossible    | `SonaarGridLayout.tsx`, `OptimizedBeatGrid.tsx` |
| 2   | **Zones tactiles trop petites (< 44px)**     | P0       | Clics difficiles, frustration                | `beat-card.tsx`, `cart.tsx`, `navbar.tsx`       |
| 3   | **Filtres shop non optimisés mobile**        | P1       | Panel trop large, dropdowns hors écran       | `SonaarFiltersSearch.tsx`                       |
| 4   | **Cart page layout cassé sur mobile**        | P1       | Éléments superposés, actions inaccessibles   | `cart.tsx`                                      |
| 5   | **Dialog/Modal sans scroll interne**         | P1       | Contenu coupé sur petits écrans              | `dialog.tsx`                                    |
| 6   | **Footer grille 4 colonnes sur mobile**      | P2       | Texte trop petit, liens difficiles à cliquer | `footer.tsx`                                    |
| 7   | **Dashboard tabs overflow horizontal**       | P2       | Onglets cachés, navigation difficile         | `ModernDashboard.tsx`, `DashboardLayout.tsx`    |
| 8   | **Images non contraintes dans cards**        | P2       | Layout shifts, débordements                  | `beat-card.tsx`, `ResponsiveBeatCard.tsx`       |
| 9   | **Formulaires inputs trop petits**           | P2       | Saisie difficile, clavier masque champs      | `contact.tsx`, `checkout.tsx`                   |
| 10  | **Hero section texte trop grand**            | P2       | Titres débordent sur 320px                   | `home.tsx`, `StandardHero.tsx`                  |

### ⚡ Quick Wins (Corrections Immédiates)

1. Ajouter `min-h-[44px] min-w-[44px]` sur tous les boutons/icônes interactifs
2. Changer grille beats de `grid-cols-1 sm:grid-cols-2` à `grid-cols-1 xs:grid-cols-1 sm:grid-cols-2`
3. Ajouter `overflow-x-hidden` sur le body/main container
4. Réduire taille titres hero: `text-3xl sm:text-4xl lg:text-5xl`
5. Ajouter `max-h-[80vh] overflow-y-auto` sur DialogContent

---

## B) Checklist "Mobile Readiness"

### Layout & Structure

| Problème                       | Écran/Route  | Fichiers               | Cause                                                      | Correction                                | Risque | Test                    | Statut     |
| ------------------------------ | ------------ | ---------------------- | ---------------------------------------------------------- | ----------------------------------------- | ------ | ----------------------- | ---------- |
| Débordement horizontal global  | Toutes pages | `index.css`, `App.tsx` | Pas de `overflow-x-hidden` global                          | Ajouter `overflow-x-hidden` sur html/body | Faible | Scroll horizontal 320px | ⬜ À faire |
| Container max-width trop large | Shop, Home   | `shop.tsx`, `home.tsx` | `max-w-7xl` sans padding mobile                            | Ajouter `px-4` minimum                    | Faible | Vérifier marges 320px   | ⬜ À faire |
| Grille 4 colonnes sur mobile   | Shop         | `SonaarGridLayout.tsx` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` | OK mais vérifier gap                      | Faible | Grille 320px            | ✅ OK      |

### Navigation

| Problème                           | Écran/Route | Fichiers              | Cause                         | Correction                                   | Risque | Test        | Statut     |
| ---------------------------------- | ----------- | --------------------- | ----------------------------- | -------------------------------------------- | ------ | ----------- | ---------- |
| Menu hamburger zone tactile        | Header      | `navbar.tsx`          | `min-w-[44px]` déjà présent   | Vérifier focus ring visible                  | Faible | Tap test    | ✅ OK      |
| MobileBottomNav masqué par clavier | Formulaires | `MobileBottomNav.tsx` | Détection clavier implémentée | Tester sur vrais devices                     | Faible | Focus input | ✅ OK      |
| Dashboard tabs overflow            | Dashboard   | `DashboardLayout.tsx` | Tabs nombreux sans scroll     | Ajouter `overflow-x-auto` + `scrollbar-hide` | Faible | Swipe tabs  | ⬜ À faire |

### Composants Beats

| Problème                       | Écran/Route | Fichiers               | Cause                                     | Correction                               | Risque | Test         | Statut     |
| ------------------------------ | ----------- | ---------------------- | ----------------------------------------- | ---------------------------------------- | ------ | ------------ | ---------- |
| BeatCard boutons trop petits   | Shop, Home  | `beat-card.tsx`        | Wishlist button `p-1.5` sur mobile        | Augmenter à `p-2 min-w-[44px]`           | Faible | Tap wishlist | ⬜ À faire |
| Image aspect-ratio non fixé    | Cards       | `beat-card.tsx`        | `aspectRatio: "1 / 1"` inline             | Utiliser classe Tailwind `aspect-square` | Faible | Layout shift | ⬜ À faire |
| Play button overlay trop petit | Grid        | `SonaarGridLayout.tsx` | `w-14 h-14` OK mais prev/next `w-10 h-10` | Augmenter à `w-12 h-12`                  | Faible | Tap controls | ⬜ À faire |

### Formulaires

| Problème                   | Écran/Route       | Fichiers      | Cause                      | Correction                           | Risque | Test           | Statut     |
| -------------------------- | ----------------- | ------------- | -------------------------- | ------------------------------------ | ------ | -------------- | ---------- |
| Input height trop petit    | Contact, Checkout | `input.tsx`   | `h-10` standard            | OK mais ajouter `text-base` pour iOS | Faible | Zoom input iOS | ⬜ À faire |
| Select dropdown hors écran | Cart, Filters     | `select.tsx`  | Position absolute          | Ajouter `max-h-[50vh]`               | Moyen  | Ouvrir select  | ⬜ À faire |
| Textarea resize sur mobile | Contact           | `contact.tsx` | `resize-none` déjà présent | OK                                   | Faible | -              | ✅ OK      |

### Modals & Dialogs

| Problème                   | Écran/Route    | Fichiers     | Cause                               | Correction               | Risque | Test         | Statut     |
| -------------------------- | -------------- | ------------ | ----------------------------------- | ------------------------ | ------ | ------------ | ---------- |
| Dialog content overflow    | Licences, Cart | `dialog.tsx` | Pas de `max-h` ni `overflow-y-auto` | Ajouter contraintes      | Moyen  | Long content | ⬜ À faire |
| Sheet width 3/4 trop large | Menu mobile    | `sheet.tsx`  | `w-3/4` peut être trop              | Ajouter `max-w-[85vw]`   | Faible | Ouvrir menu  | ⬜ À faire |
| Close button zone tactile  | Dialogs        | `dialog.tsx` | Bouton X petit                      | Augmenter zone cliquable | Faible | Tap close    | ⬜ À faire |

### Cart & Checkout

| Problème                     | Écran/Route | Fichiers   | Cause                                    | Correction                      | Risque | Test           | Statut     |
| ---------------------------- | ----------- | ---------- | ---------------------------------------- | ------------------------------- | ------ | -------------- | ---------- |
| Cart items layout cassé      | /cart       | `cart.tsx` | `flex items-center space-x-4` sur mobile | Passer en `flex-col` sur mobile | Moyen  | Cart 320px     | ⬜ À faire |
| Quantity buttons trop petits | /cart       | `cart.tsx` | `w-8 h-8`                                | Augmenter à `w-10 h-10`         | Faible | Tap +/-        | ⬜ À faire |
| License selector trop large  | /cart       | `cart.tsx` | `w-48` fixe                              | Passer à `w-full sm:w-48`       | Faible | Select license | ⬜ À faire |

---

## C) Plan d'Implémentation par Lots

### 🟢 Lot 1: Safe CSS/UI Fixes (Aucun changement logique)

**Risque:** Faible  
**Temps estimé:** 2-3 heures  
**Fichiers:** CSS uniquement, classes Tailwind

#### 1.1 Corrections Globales CSS

```css
/* client/src/index.css - Ajouter après @tailwind utilities */

/* Mobile-first overflow prevention */
html,
body {
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

/* Minimum touch target size */
.touch-target {
  @apply min-h-[44px] min-w-[44px];
}

/* Safe area padding for notched devices */
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom, 16px);
}
```

#### 1.2 Typography Responsive

| Fichier            | Avant                  | Après                                          |
| ------------------ | ---------------------- | ---------------------------------------------- |
| `home.tsx`         | `text-5xl lg:text-7xl` | `text-3xl sm:text-4xl md:text-5xl lg:text-7xl` |
| `StandardHero.tsx` | `text-4xl`             | `text-2xl sm:text-3xl md:text-4xl`             |
| `footer.tsx`       | `text-xl font-bold`    | `text-lg sm:text-xl font-bold`                 |

#### 1.3 Touch Targets

| Fichier                | Élément           | Correction                                       |
| ---------------------- | ----------------- | ------------------------------------------------ |
| `beat-card.tsx`        | Wishlist button   | `p-1.5 sm:p-2` → `p-2 min-h-[44px] min-w-[44px]` |
| `cart.tsx`             | Quantity buttons  | `w-8 h-8` → `w-10 h-10 sm:w-8 sm:h-8`            |
| `SonaarGridLayout.tsx` | Prev/Next buttons | `w-10 h-10` → `w-12 h-12`                        |

---

### 🟡 Lot 2: Navigation & Composants (Faible risque)

**Risque:** Faible à Moyen  
**Temps estimé:** 3-4 heures  
**Fichiers:** Composants layout, navigation

#### 2.1 Dashboard Tabs Scroll

```tsx
// DashboardLayout.tsx - Modifier la section tabs
<div className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible">
  {tabs.map(tab => (
    <button key={tab.value} className="snap-start flex-shrink-0 px-4 py-2 min-w-[100px] sm:min-w-0">
      {tab.label}
    </button>
  ))}
</div>
```

#### 2.2 Cart Layout Mobile

```tsx
// cart.tsx - Modifier cart item layout
<div className="flex flex-col sm:flex-row sm:items-center gap-4">
  {/* Image */}
  <div className="w-full sm:w-20 h-32 sm:h-20 ...">

  {/* Info + Actions */}
  <div className="flex flex-col sm:flex-row flex-1 gap-4">
    {/* Beat info */}
    <div className="flex-1">...</div>

    {/* Quantity + Delete - Row on mobile */}
    <div className="flex items-center justify-between sm:justify-end gap-4">
      {/* Quantity controls */}
      {/* Delete button */}
    </div>
  </div>
</div>
```

#### 2.3 Filters Mobile Panel

```tsx
// SonaarFiltersSearch.tsx - Améliorer panel mobile
{
  showMobileFilters && (
    <Card className="lg:hidden fixed inset-x-4 top-20 bottom-20 z-50 bg-[var(--dark-gray)] border-[var(--medium-gray)] overflow-y-auto">
      <CardContent className="p-4 pb-20">{FiltersContent}</CardContent>
      {/* Sticky apply button */}
      <div className="sticky bottom-0 p-4 bg-[var(--dark-gray)] border-t border-[var(--medium-gray)]">
        <Button onClick={() => setShowMobileFilters(false)} className="w-full">
          Apply Filters ({filteredResults} results)
        </Button>
      </div>
    </Card>
  );
}
```

---

### 🟠 Lot 3: Optimisations Perf & Accessibilité (Large scope)

**Risque:** Faible  
**Temps estimé:** 4-5 heures  
**Fichiers:** Multiples composants

#### 3.1 Dialog/Modal Responsive

```tsx
// dialog.tsx - Améliorer DialogContent
<DialogPrimitive.Content
  className={cn(
    "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] sm:w-full max-w-lg",
    "max-h-[85vh] overflow-y-auto", // Ajout scroll
    "translate-x-[-50%] translate-y-[-50%]",
    "gap-4 border bg-background p-4 sm:p-6 shadow-lg",
    "duration-200 sm:rounded-lg rounded-lg", // Rounded sur mobile aussi
    className
  )}
>
```

#### 3.2 Input iOS Zoom Prevention

```tsx
// input.tsx - Prévenir zoom iOS
<input
  className={cn(
    "flex h-10 sm:h-10 w-full rounded-md border border-input",
    "bg-background px-3 py-2",
    "text-base sm:text-sm", // 16px sur mobile = pas de zoom iOS
    "ring-offset-background"
    // ...
  )}
/>
```

#### 3.3 Images Lazy Loading & Sizing

```tsx
// beat-card.tsx - Optimiser images
<OptimizedImage
  src={imageUrl}
  alt={title}
  width={400}
  height={400}
  loading="lazy"
  decoding="async"
  sizes="(max-width: 375px) 100vw, (max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
  className="aspect-square object-cover"
/>
```

#### 3.4 Accessibilité Focus States

```css
/* index.css - Focus visible amélioré */
@layer utilities {
  .focus-ring {
    @apply focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-purple)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dark-gray)];
  }
}
```

---

## D) PR-Ready Patch Plan

### Fichiers à Modifier

| Fichier                                               | Type de Modification      | Lignes Estimées |
| ----------------------------------------------------- | ------------------------- | --------------- |
| `client/src/index.css`                                | Ajout classes utilitaires | +30             |
| `client/src/components/ui/dialog.tsx`                 | Responsive constraints    | ~5              |
| `client/src/components/ui/input.tsx`                  | Text size mobile          | ~2              |
| `client/src/components/ui/button.tsx`                 | Touch target size         | ~3              |
| `client/src/components/beats/beat-card.tsx`           | Touch targets, layout     | ~15             |
| `client/src/components/audio/SonaarGridLayout.tsx`    | Button sizes              | ~5              |
| `client/src/components/audio/SonaarFiltersSearch.tsx` | Mobile panel              | ~30             |
| `client/src/components/layout/footer.tsx`             | Grid responsive           | ~10             |
| `client/src/pages/cart.tsx`                           | Layout mobile             | ~40             |
| `client/src/pages/home.tsx`                           | Typography responsive     | ~10             |
| `client/src/components/dashboard/DashboardLayout.tsx` | Tabs scroll               | ~15             |

### Diff Attendu (Haut Niveau)

```diff
# index.css
+ html, body { overflow-x: hidden; }
+ .touch-target { min-height: 44px; min-width: 44px; }

# dialog.tsx
- "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg"
+ "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] sm:w-full max-w-lg max-h-[85vh] overflow-y-auto"

# input.tsx
- "text-base ring-offset-background"
+ "text-base sm:text-sm ring-offset-background"

# cart.tsx
- <div className="flex items-center space-x-4">
+ <div className="flex flex-col sm:flex-row sm:items-center gap-4">
```

### Stratégie de Rollback

1. **Git revert** - Chaque lot = 1 commit séparé
2. **Feature flag** - Optionnel pour Lot 2 et 3
3. **CSS variables** - Changements isolés via custom properties

### Scénarios de Tests Manuels

#### Test 1: Scroll Horizontal (P0)

- [ ] Ouvrir sur iPhone SE (320px)
- [ ] Naviguer: Home → Shop → Cart → Dashboard
- [ ] Vérifier: Aucun scroll horizontal involontaire

#### Test 2: Touch Targets (P0)

- [ ] Ouvrir sur smartphone
- [ ] Tester: Wishlist heart, Play button, Cart +/-, Menu hamburger
- [ ] Vérifier: Tous cliquables sans zoom

#### Test 3: Formulaires (P1)

- [ ] Ouvrir Contact page sur iOS
- [ ] Focus sur input email
- [ ] Vérifier: Pas de zoom automatique, clavier ne masque pas le champ

#### Test 4: Modals (P1)

- [ ] Ouvrir license selector sur mobile
- [ ] Vérifier: Contenu scrollable, bouton close accessible

#### Test 5: Navigation (P2)

- [ ] Ouvrir Dashboard sur mobile
- [ ] Swiper les tabs
- [ ] Vérifier: Tous les onglets accessibles

---

## Annexes

### Breakpoints Cibles

| Breakpoint | Largeur | Devices                       |
| ---------- | ------- | ----------------------------- |
| xs         | 320px   | iPhone SE, petits Android     |
| sm         | 640px   | iPhone 12/13/14, Galaxy S     |
| md         | 768px   | iPad Mini, tablettes portrait |
| lg         | 1024px  | iPad Pro, tablettes paysage   |
| xl         | 1280px  | Desktop                       |

### Ressources

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [WCAG Touch Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [iOS Input Zoom Prevention](https://css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/)

### Hooks Utiles Existants

```typescript
// Déjà implémentés dans le projet
import { useIsMobile, useIsTablet, useIsDesktop } from "@/hooks/useBreakpoint";
import { useOrientation, useIsTouchDevice } from "@/hooks/useBreakpoint";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
```

---

**Prochaines étapes recommandées:**

1. Appliquer Lot 1 (CSS safe fixes) immédiatement
2. Tester sur 3 devices réels (320px, 375px, 414px)
3. Itérer sur Lot 2 après validation
4. Planifier Lot 3 pour sprint suivant
