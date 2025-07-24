# Audit des logs (console.log, warn, etc.) hors tests

## Méthodologie
- Recherche : `console.log`, `console.warn`, etc. hors *.test.ts*
- Catégorisation :
  - **À supprimer** : debug oublié, suggestions, logs non critiques
  - **À downgrader** : info → debug/logger
  - **À garder** : logs d’erreur, d’init, sécurité

---

## Résultats par fichier (extraits)

### server/wordpress.ts
- `console.log('WordPress module loaded - API credentials:', ...)`  
  **Suggestion** : downgrader (logger.debug)

### server/vite.ts
- `console.log(...)` (logs de build/dev)  
  **Suggestion** : garder (init/dev)

### server/storage.ts
- `console.log(...)` (downloads, newsletter, contact)  
  **Suggestion** : supprimer (debug oublié)

### server/services/mail.ts
- `console.log("📧 MAIL DRY RUN:", ...)`  
  **Suggestion** : garder (utile en dev)
- `console.log("✅ Email sent successfully:", ...)`  
  **Suggestion** : downgrader (logger.info)

### server/routes.ts
- `console.warn('Downloads router not available:', ...)`  
  **Suggestion** : garder (erreur critique)
- `console.log('✅ Email routes registered successfully')`  
  **Suggestion** : downgrader (logger.info)
- `console.log('❌ Email router not found:', ...)`  
  **Suggestion** : garder (erreur critique)
- `console.log('Payment intent request - amount:', ...)`  
  **Suggestion** : downgrader (logger.debug)
- `console.log('Payment intent created - amount in cents:', ...)`  
  **Suggestion** : downgrader (logger.debug)
- `console.log('Subscription request received:', ...)`  
  **Suggestion** : downgrader (logger.debug)
- `console.log('Reservation received:', ...)`  
  **Suggestion** : downgrader (logger.debug)
- `console.log('Recording session booking received:', ...)`  
  **Suggestion** : downgrader (logger.debug)
- `console.log('Custom beat request received:', ...)`  
  **Suggestion** : downgrader (logger.debug)
- `console.log('Production consultation booking received:', ...)`  
  **Suggestion** : downgrader (logger.debug)

### client/src/utils/tracking.ts, performanceMonitoring.ts, performance.ts, codeOptimization.ts
- Multiples logs de debug, suggestions, perf  
  **Suggestion** : supprimer ou downgrader (selon usage prod/dev)

---

## Synthèse
- **À supprimer** : debug oublié, suggestions, logs non critiques
- **À downgrader** : info/dev → debug/logger
- **À garder** : logs d’erreur, d’init, sécurité

---

## Suggestions
- Supprimer les logs de debug oubliés (Lot 2)
- Downgrader les logs d’info/dev en logger.debug/info (Lot 2)
- Garder les logs critiques/init 