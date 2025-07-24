# Audit des usages de `any` (explicites et implicites)

## Méthodologie
- Recherche : `: any`, mapping d'API, JSONB, catch (error: any)
- Catégorisation :
  - **OK/justifié** : usage standard, JSON externe, erreurs JS
  - **Faible effort** : helpers internes typables
  - **Complexe** : mapping Woo/WP, JSONB DB

---

## Résultats par fichier

### shared/schema.ts
- `items: any; // JSONB côté Supabase`  
  **Justification** : stockage DB, structure variable.  
  **Catégorie** : complexe (proposer Zod ou type partiel ?)
- `addons?: any[]; // optional JSON array`  
  **Justification** : structure libre, dépend du contexte.  
  **Catégorie** : complexe

### server/auth.ts, server/invoice-system.ts, ...
- `catch (error: any)`  
  **Justification** : pratique courante pour erreurs JS.  
  **Catégorie** : OK/justifié

### server/storage.ts
- `toDbBeat(beat: any)`, `fromDbBeat(row: any)`, ...
- `saveCartItems(sessionId: string, items: any): Promise<void>`
- `private contactMessages: any[];`
  
  **Justification** : helpers internes, typables via types partagés.  
  **Catégorie** : faible effort

### server/wordpress.ts, server/services/woo.ts
- Mapping d’objets API externes : `products.map((product: any) => ...)`
  
  **Justification** : schéma API externe, difficile à typer sans doc.  
  **Catégorie** : complexe (proposer type partiel ?)

### server/templates/emails.ts
- Fonctions : `(orderDetails: any) => ...`
  
  **Justification** : payloads dynamiques, typables via interfaces.  
  **Catégorie** : faible effort

### server/services/wp.ts, server/services/woo.ts
- Fonctions : `fetchWPPosts(params: any = {})`, `fetchWooProducts(filters: any = {})`
  
  **Justification** : params dynamiques, typables via Record<string, unknown>.  
  **Catégorie** : faible effort

---

## Synthèse
- **OK/justifié** : catch (error: any), JSON externe
- **Faible effort** : helpers internes, params dynamiques
- **Complexe** : mapping Woo/WP, JSONB DB

---

## Suggestions
- Typage progressif des helpers internes (Lot 1)
- Proposer des types partiels pour mapping Woo/WP (Lot 3)
- Alternative Zod ou interface pour JSONB si possible (Lot 4) 