# Fix Rapide: Erreur Email "Invalid login: 535-5.7.8"

## Problème

```
❌ Email sending failed on attempt 1/3: Invalid login: 535-5.7.8 Username and Password not accepted
```

## Cause

Les identifiants SMTP Gmail ne sont pas configurés dans `.env`

## Solution Rapide (5 minutes)

### Étape 1: Créer un App Password Gmail

1. Va sur https://myaccount.google.com/apppasswords
2. Sélectionne "Mail" → "Autre (nom personnalisé)"
3. Entre "BroLab" comme nom
4. Copie le mot de passe à 16 caractères (ex: `abcd efgh ijkl mnop`)

### Étape 2: Configurer `.env`

Ouvre `.env` et modifie ces lignes:

```env
SMTP_USER=treigua@brolabentertainment.com
SMTP_PASS=abcd efgh ijkl mnop  # Ton App Password Gmail
```

### Étape 3: Redémarrer le serveur

```bash
# Arrête le serveur (Ctrl+C)
# Puis redémarre:
npm run dev
```

### Étape 4: Tester

```bash
npm run test:email
```

Tu devrais voir:

```
✅ Test email sent successfully!
```

## Alternative: Utiliser Resend (Recommandé pour Production)

Si tu veux éviter les limitations de Gmail (500 emails/jour):

1. Crée un compte sur https://resend.com (gratuit jusqu'à 3000 emails/mois)
2. Obtiens ton API key
3. Ajoute dans `.env`:
   ```env
   RESEND_API_KEY=re_your_api_key_here
   ```
4. Redémarre le serveur

## Vérification

Après configuration, crée une réservation de test. Les logs devraient afficher:

```
✅ Email sent successfully on attempt 1: <message-id>
```

Au lieu de:

```
❌ Email sending failed on attempt 1/3: Invalid login
```

## Besoin d'aide?

Voir la documentation complète: `docs/EMAIL_CONFIGURATION.md`
