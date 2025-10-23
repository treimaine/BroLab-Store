# Configuration du Service Email

## Problème Actuel

L'erreur `Invalid login: 535-5.7.8 Username and Password not accepted` indique que les identifiants SMTP Gmail ne sont pas configurés correctement.

## Solutions

### Option 1: Resend (Recommandé pour Production)

Resend est un service d'email moderne, fiable et optimisé pour les emails transactionnels.

**Avantages:**

- Meilleure délivrabilité que Gmail
- Pas de limite de 500 emails/jour
- Analytics et tracking intégrés
- Configuration simple
- Support professionnel

**Configuration:**

1. Créer un compte sur [resend.com](https://resend.com)
2. Obtenir votre API key
3. Ajouter dans `.env`:
   ```env
   RESEND_API_KEY=re_your_api_key_here
   ```
4. Vérifier votre domaine dans Resend (optionnel mais recommandé)

**Prix:**

- Gratuit jusqu'à 3,000 emails/mois
- $20/mois pour 50,000 emails

### Option 2: Gmail SMTP (Pour Développement)

Gmail peut être utilisé pour le développement, mais a des limitations.

**Limitations:**

- Maximum 500 emails par jour
- Peut être bloqué si trop d'emails sont envoyés rapidement
- Nécessite un "App Password" (pas votre mot de passe Gmail normal)

**Configuration:**

1. **Activer l'authentification à deux facteurs sur votre compte Gmail**
   - Aller sur [myaccount.google.com/security](https://myaccount.google.com/security)
   - Activer "Validation en deux étapes"

2. **Créer un App Password**
   - Aller sur [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Sélectionner "Mail" comme application
   - Sélectionner "Autre" comme appareil et entrer "BroLab"
   - Copier le mot de passe généré (16 caractères)

3. **Configurer `.env`**

   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=treigua@brolabentertainment.com
   SMTP_PASS=xxxx xxxx xxxx xxxx  # Le mot de passe d'application à 16 caractères
   ```

4. **Redémarrer le serveur**
   ```bash
   npm run server
   ```

## Vérification de la Configuration

Pour tester si l'email fonctionne, créer une réservation de test. Les logs devraient afficher:

```
✅ Email sent successfully on attempt 1: <message-id>
```

Au lieu de:

```
❌ Email sending failed on attempt 1/3: Invalid login: 535-5.7.8
```

## Dépannage

### Erreur: "Invalid login"

- Vérifier que vous utilisez un App Password, pas votre mot de passe Gmail normal
- Vérifier que l'authentification à deux facteurs est activée
- Vérifier qu'il n'y a pas d'espaces dans le mot de passe

### Erreur: "Connection timeout"

- Vérifier que le port est correct (587 pour TLS, 465 pour SSL)
- Vérifier que votre firewall n'est pas bloqué

### Erreur: "Daily sending quota exceeded"

- Gmail limite à 500 emails/jour
- Passer à Resend pour la production

## Recommandation

**Pour la production, utiliser Resend.** Gmail est acceptable pour le développement, mais Resend offre:

- Meilleure délivrabilité
- Pas de limites restrictives
- Analytics professionnels
- Support technique

## Variables d'Environnement

```env
# Option 1: Resend (Recommandé)
RESEND_API_KEY=re_your_api_key_here

# Option 2: Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_char_app_password

# Email par défaut pour l'expéditeur
DEFAULT_FROM=BroLab <contact@brolabentertainment.com>

# Emails admin pour les notifications
ADMIN_EMAILS=treigua@brolabentertainment.com,admin@brolabentertainment.com
```

## Code Modifié

Le service email (`server/services/mail.ts`) a été mis à jour pour:

1. Supporter Resend en priorité si `RESEND_API_KEY` est défini
2. Valider les identifiants Gmail avant de créer le transporteur
3. Afficher des messages d'erreur clairs si la configuration est manquante
4. Utiliser le port 587 (TLS) par défaut au lieu de 465 (SSL) pour Gmail
