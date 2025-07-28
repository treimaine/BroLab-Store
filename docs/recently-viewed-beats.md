# Recently Viewed Beats - Documentation

## 📋 Vue d'ensemble

La fonctionnalité **"Recently Viewed Beats"** permet aux utilisateurs de retrouver facilement les beats qu'ils ont consultés récemment. Elle améliore l'expérience utilisateur en offrant un accès rapide à l'historique de navigation.

## 🎯 Fonctionnalités

### ✅ Fonctionnalités Implémentées

- **Tracking automatique** : Les beats sont automatiquement ajoutés à l'historique lors du clic sur une `BeatCard`
- **Persistance localStorage** : L'historique est sauvegardé localement et persiste entre les sessions
- **Limitation intelligente** : Maximum de 12 beats dans l'historique (les plus anciens sont supprimés)
- **Déduplication** : Les beats dupliqués sont déplacés en tête de liste
- **Interface utilisateur** : Composant `RecentlyViewedBeats` avec design cohérent
- **Actions utilisateur** : Possibilité de supprimer individuellement ou de vider tout l'historique
- **Intégration pages** : Affichage sur les pages Home et Shop

## 🏗️ Architecture

### Hook Principal : `useRecentlyViewedBeats`

**Fichier** : `client/src/hooks/useRecentlyViewedBeats.ts`

```typescript
interface UseRecentlyViewedBeatsReturn {
  recentBeats: RecentBeat[];
  addBeat: (beat: Beat) => void;
  removeBeat: (beatId: number) => void;
  clearHistory: () => void;
  isLoading: boolean;
}
```

**Fonctionnalités** :
- Gestion de l'état local avec `useState`
- Persistance automatique dans localStorage
- Gestion des erreurs localStorage
- Limitation à 12 beats maximum
- Déduplication automatique

### Composant UI : `RecentlyViewedBeats`

**Fichier** : `client/src/components/RecentlyViewedBeats.tsx`

**Props** :
- `maxDisplay` : Nombre maximum de beats à afficher (défaut: 6)
- `showTitle` : Afficher le titre de la section (défaut: true)
- `className` : Classes CSS personnalisées

**Fonctionnalités** :
- Affichage en grille responsive
- Loading states avec skeleton
- Boutons d'action (supprimer, vider)
- Intégration avec `BeatCard` existant
- Design cohérent avec l'application

### Intégration Tracking

**Fichier** : `client/src/components/beat-card.tsx`

**Modifications** :
- Import du hook `useRecentlyViewedBeats`
- Ajout automatique du beat lors du clic `onViewDetails`
- Conversion des données Beat vers RecentBeat

## 🔧 Configuration

### Clé localStorage
```typescript
const LOCALSTORAGE_RECENT_BEATS = 'brl_recent_beats';
```

### Limite maximale
```typescript
const MAX_RECENT_BEATS = 12;
```

### Structure des données
```typescript
interface RecentBeat extends Pick<Beat, 'id' | 'title' | 'genre' | 'price' | 'image_url' | 'audio_url'> {
  viewedAt: number; // Timestamp de consultation
}
```

## 📍 Intégration Pages

### Page d'accueil (`client/src/pages/home.tsx`)
- Section dédiée après "Featured Beats"
- Affichage de 6 beats maximum
- Design cohérent avec le reste de la page

### Page Shop (`client/src/pages/shop.tsx`)
- Section avant la pagination
- Affichage de 6 beats maximum
- Intégration dans le flux de navigation

## 🎨 Design & UX

### États visuels
- **Loading** : Skeleton animé pendant le chargement
- **Vide** : Aucun affichage si aucun beat récent
- **Normal** : Grille de BeatCards avec actions hover
- **Overflow** : Indicateur du nombre de beats supplémentaires

### Actions utilisateur
- **Hover** : Bouton de suppression individuelle
- **Clic "Vider"** : Suppression de tout l'historique
- **Clic BeatCard** : Navigation vers la page produit

### Responsive Design
- **Mobile** : 1 colonne
- **Tablet** : 2 colonnes
- **Desktop** : 3 colonnes

## 🔒 Sécurité & Performance

### Sécurité
- Données stockées uniquement côté client (localStorage)
- Pas d'envoi de données sensibles au serveur
- Gestion d'erreurs localStorage robuste

### Performance
- Hook optimisé avec `useCallback`
- Rendu conditionnel (pas d'affichage si vide)
- Limitation automatique de la taille des données

## 🧪 Tests

### Validation TypeScript
- ✅ Compilation sans erreurs
- ✅ Types stricts respectés
- ✅ Intégration avec `shared/schema.ts`

### Tests existants
- ✅ Tous les tests passent (83/83)
- ✅ Aucune régression introduite
- ✅ Intégration transparente

## 🚀 Utilisation

### Pour les développeurs

1. **Ajouter le tracking** :
```typescript
import { useRecentlyViewedBeats } from '@/hooks/useRecentlyViewedBeats';

const { addBeat } = useRecentlyViewedBeats();

// Dans un gestionnaire d'événement
const handleBeatClick = (beat: Beat) => {
  addBeat(beat);
  // Navigation ou autre logique
};
```

2. **Afficher l'historique** :
```typescript
import { RecentlyViewedBeats } from '@/components/RecentlyViewedBeats';

// Dans un composant
<RecentlyViewedBeats maxDisplay={6} showTitle={true} />
```

### Pour les utilisateurs

1. **Navigation** : Cliquer sur n'importe quelle BeatCard
2. **Consultation** : L'historique apparaît automatiquement sur Home et Shop
3. **Gestion** : Utiliser les boutons de suppression ou "Vider"

## 📈 Métriques & Analytics

### Données collectées (localStorage uniquement)
- Nombre de beats consultés
- Fréquence de consultation
- Patterns de navigation

### Améliorations futures possibles
- Analytics serveur (optionnel)
- Recommandations basées sur l'historique
- Synchronisation cross-device
- Export/import de l'historique

## 🔄 Maintenance

### Nettoyage automatique
- Limitation à 12 beats maximum
- Suppression des doublons
- Gestion des erreurs localStorage

### Compatibilité
- Compatible avec tous les navigateurs modernes
- Graceful degradation si localStorage indisponible
- Pas d'impact sur les performances

---

**Date de création** : 23 Janvier 2025  
**Version** : 1.0.0  
**Statut** : ✅ Production Ready 