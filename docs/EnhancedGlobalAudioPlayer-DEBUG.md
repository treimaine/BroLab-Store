# EnhancedGlobalAudioPlayer - Debug Guide

## Problèmes Résolus

### 1. Loading Infini

**Cause**: Le timeout de 10 secondes était trop court et les événements audio ne se déclenchaient pas correctement.

**Solution**:

- Augmenté le timeout à 30 secondes
- Ajouté `audio.load()` pour forcer le rechargement
- Amélioré la gestion des événements `canplay`, `loadedmetadata`, `playing`, `waiting`
- Supprimé `crossOrigin="anonymous"` qui bloquait le chargement

### 2. Pas de Waveform

**Cause**: Web Audio API échouait silencieusement ou n'était pas initialisé correctement.

**Solution**:

- Simplifié l'initialisation de Web Audio API
- Ajouté un fallback pour `webkitAudioContext` (Safari)
- Initialisé sur la première interaction utilisateur
- Amélioré la connexion des nœuds audio

### 3. Pas de Durée

**Cause**: L'événement `loadedmetadata` ne se déclenchait pas ou la durée était `NaN`.

**Solution**:

- Ajouté des vérifications `Number.isNaN()` et `Number.isFinite()`
- Écouté plusieurs événements: `loadedmetadata`, `canplay`, `loadeddata`
- Ajouté `preload="metadata"` sur l'élément audio

### 4. Race Conditions

**Cause**: Multiples `useEffect` avec dépendances conflictuelles créaient des boucles infinies.

**Solution**:

- Séparé les responsabilités en 3 `useEffect` distincts:
  1. Changement de track (source audio)
  2. Play/pause (contrôle de lecture)
  3. Événements audio (listeners)
- Ajouté des vérifications pour éviter les mises à jour inutiles

## Comment Déboguer

### 1. Vérifier les Logs Console

Ouvrez la console du navigateur et cherchez ces messages:

```
✅ Messages de succès:
🔍 Setting audio source: [URL]
🎵 Metadata loaded - Duration: [seconds]
🎵 Can play - Ready state: [0-4]
✅ Audio playing successfully
✅ Web Audio API initialized successfully

❌ Messages d'erreur:
❌ Audio error: [details]
❌ Audio play failed: [error]
❌ Failed to initialize Web Audio API: [error]
❌ Audio loading timed out after 30 seconds
```

### 2. Vérifier l'URL Audio

Dans la console, tapez:

```javascript
document.querySelector("audio").src;
```

Vérifiez que l'URL est valide et accessible.

### 3. Vérifier le Ready State

```javascript
const audio = document.querySelector("audio");
console.log("Ready state:", audio.readyState);
console.log("Network state:", audio.networkState);
console.log("Duration:", audio.duration);
```

**Ready State**:

- 0 = HAVE_NOTHING (pas de données)
- 1 = HAVE_METADATA (métadonnées chargées)
- 2 = HAVE_CURRENT_DATA (données actuelles disponibles)
- 3 = HAVE_FUTURE_DATA (données futures disponibles)
- 4 = HAVE_ENOUGH_DATA (assez de données pour jouer)

**Network State**:

- 0 = NETWORK_EMPTY (pas de source)
- 1 = NETWORK_IDLE (source définie, pas de chargement)
- 2 = NETWORK_LOADING (chargement en cours)
- 3 = NETWORK_NO_SOURCE (pas de source valide)

### 4. Vérifier CORS

Si l'audio est hébergé sur un domaine différent, vérifiez les headers CORS:

```bash
curl -I [AUDIO_URL]
```

Cherchez:

```
Access-Control-Allow-Origin: *
```

### 5. Tester Manuellement

Dans la console:

```javascript
const audio = document.querySelector("audio");
audio
  .play()
  .then(() => {
    console.log("✅ Play successful");
  })
  .catch(error => {
    console.error("❌ Play failed:", error);
  });
```

## Problèmes Connus

### 1. Autoplay Bloqué par le Navigateur

**Symptôme**: L'audio ne démarre pas automatiquement.

**Solution**: L'utilisateur doit interagir avec la page (clic) avant que l'audio puisse jouer automatiquement.

### 2. Web Audio API Non Supporté

**Symptôme**: Pas de waveform, mais l'audio joue.

**Solution**: C'est normal sur les navigateurs anciens. La lecture audio fonctionne toujours.

### 3. Audio Lent à Charger

**Symptôme**: Loading prolongé mais pas de timeout.

**Solution**:

- Vérifier la taille du fichier audio
- Vérifier la connexion réseau
- Considérer l'utilisation d'un CDN

## Tests Recommandés

1. **Test avec URL locale**:

   ```typescript
   const testTrack = {
     id: "test",
     title: "Test",
     artist: "Test",
     audioUrl: "/test-audio.mp3", // Fichier local
     url: "/test",
   };
   ```

2. **Test avec URL externe**:

   ```typescript
   const testTrack = {
     id: "test",
     title: "Test",
     artist: "Test",
     audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
     url: "/test",
   };
   ```

3. **Test avec différents formats**:
   - MP3 (le plus compatible)
   - WAV (haute qualité, gros fichiers)
   - OGG (bonne compression, moins compatible)

## Prochaines Étapes

Si le problème persiste:

1. Vérifier que `currentTrack.audioUrl` est bien défini
2. Vérifier que l'URL est accessible (pas de 404)
3. Vérifier les headers CORS du serveur
4. Tester avec un fichier audio différent
5. Vérifier les erreurs réseau dans l'onglet Network du DevTools
