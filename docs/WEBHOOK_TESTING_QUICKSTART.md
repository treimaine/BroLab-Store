# Webhook Testing Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Install ngrok

**Windows (Chocolatey - Recommended)**

```powershell
choco install ngrok
```

**Windows (Manual)**

1. Download: https://ngrok.com/download
2. Extract to `C:\ngrok`
3. Add to PATH
4. Restart terminal

### Step 2: Configure ngrok

```bash
# Check installation
npm run setup:ngrok

# Sign up at https://dashboard.ngrok.com/signup
# Get authtoken from https://dashboard.ngrok.com/get-started/your-authtoken

# Configure ngrok
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

### Step 3: Start Development Environment

**Terminal 1: Start Express Server**

```bash
npm run dev
```

**Terminal 2: Start ngrok Tunnel**

```bash
ngrok http 5000
```

**Terminal 3: Get Webhook URL**

```bash
npm run ngrok:url
```

This will display:

```
✅ ngrok tunnel is active!

Public URL:
  https://abc123.ngrok.io

Webhook URL for Clerk Dashboard:
  https://abc123.ngrok.io/api/webhooks/clerk-billing
```

### Step 4: Update Clerk Dashboard

1. Go to https://dashboard.clerk.com
2. Click **Webhooks** → Your endpoint
3. Update URL to: `https://YOUR-NGROK-URL.ngrok.io/api/webhooks/clerk-billing`
4. Enable events:
   - ✅ `subscription.created`
   - ✅ `subscription.updated`
   - ✅ `subscription.deleted`
5. **Enable** the endpoint
6. **Save**

### Step 5: Test

In Clerk Dashboard:

1. Click **Send Test Event**
2. Select `subscription.created`
3. Click **Send**

Check Terminal 1 (Express server) for:

```
📨 [uuid] Processing Clerk Billing webhook...
✅ [uuid] Webhook signature verified
📋 [uuid] Event type: subscription.created
🔔 [uuid] Handling subscription event: subscription.created
```

## 🎯 Common Commands

```bash
# Check ngrok installation
npm run setup:ngrok

# Get current ngrok URL
npm run ngrok:url

# Start Express server
npm run dev

# Start ngrok tunnel
ngrok http 5000
```

## ⚠️ Important Notes

- **Free ngrok URLs change** every restart
- Update Clerk Dashboard URL each time
- Keep all 3 terminals open while testing
- ngrok web interface: http://localhost:4040

## 🐛 Troubleshooting

### "ngrok: command not found"

```bash
# Run setup helper
npm run setup:ngrok

# Follow installation instructions
# Restart terminal after installation
```

### "Failed to connect to ngrok API"

```bash
# Make sure ngrok is running
ngrok http 5000

# Then check URL
npm run ngrok:url
```

### "Webhook signature verification failed"

- Verify `CLERK_WEBHOOK_SECRET` in `.env.local`
- Check secret matches Clerk Dashboard
- Ensure endpoint is enabled in Clerk

### "404 Not Found"

- Verify URL: `https://YOUR-URL.ngrok.io/api/webhooks/clerk-billing`
- Check Express server is running on port 5000
- Verify route in `server/routes/index.ts`

## 📚 Full Documentation

- ngrok Setup: `docs/NGROK_SETUP_GUIDE.md`
- Webhook Implementation: `docs/CLERK_BILLING_WEBHOOK_SETUP.md`
