# ngrok Setup Guide for Clerk Webhook Testing

## What is ngrok?

ngrok creates a secure tunnel from a public URL to your local server, allowing Clerk to send webhooks to your development environment.

## Installation

### Windows (Chocolatey)

```powershell
choco install ngrok
```

### Windows (Manual Download)

1. Download from https://ngrok.com/download
2. Extract `ngrok.exe` to a folder (e.g., `C:\ngrok`)
3. Add the folder to your PATH environment variable

### Verify Installation

```bash
ngrok version
```

## Setup Steps

### 1. Create ngrok Account (Free)

1. Go to https://dashboard.ngrok.com/signup
2. Sign up for a free account
3. Copy your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken

### 2. Configure ngrok

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

### 3. Start Your Express Server

```bash
npm run dev
```

The server should start on port 5000.

### 4. Start ngrok Tunnel

In a new terminal:

```bash
ngrok http 5000
```

You'll see output like:

```
Session Status                online
Account                       your-email@example.com
Version                       3.x.x
Region                        United States (us)
Forwarding                    https://abc123.ngrok.io -> http://localhost:5000
```

### 5. Copy the Forwarding URL

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### 6. Update Clerk Dashboard

1. Go to https://dashboard.clerk.com
2. Navigate to **Webhooks** section
3. Click on your existing endpoint or **Add Endpoint**
4. Update the URL to:
   ```
   https://YOUR-NGROK-URL.ngrok.io/api/webhooks/clerk-billing
   ```
   Example: `https://abc123.ngrok.io/api/webhooks/clerk-billing`
5. Select events:
   - ✅ `subscription.created`
   - ✅ `subscription.updated`
   - ✅ `subscription.deleted`
6. **Enable** the endpoint
7. **Save**

### 7. Test the Webhook

In Clerk Dashboard:

1. Click on your webhook endpoint
2. Click **Send Test Event**
3. Select `subscription.created`
4. Click **Send**

Check your Express server logs for:

```
📨 [uuid] Processing Clerk Billing webhook...
✅ [uuid] Webhook signature verified
📋 [uuid] Event type: subscription.created
```

## Quick Start Script

I've created a helper script to automate the process:

```bash
npm run webhook:dev
```

This will:

1. Start your Express server
2. Start ngrok tunnel
3. Display the webhook URL to use in Clerk Dashboard

## Troubleshooting

### ngrok command not found

- Verify installation: `ngrok version`
- Check PATH environment variable includes ngrok folder
- Restart terminal after installation

### Tunnel not connecting

- Check if port 5000 is already in use
- Verify Express server is running
- Check firewall settings

### Webhook signature verification failed

- Verify `CLERK_WEBHOOK_SECRET` in `.env.local` matches Clerk Dashboard
- Check webhook secret hasn't expired
- Ensure you're using the correct environment (dev/prod)

### 404 Not Found

- Verify URL is `https://YOUR-URL.ngrok.io/api/webhooks/clerk-billing`
- Check Express server is running
- Verify route is registered in `server/routes/index.ts`

## Important Notes

- **Free ngrok URLs change** every time you restart ngrok
- Update Clerk Dashboard webhook URL each time you restart ngrok
- For persistent URLs, upgrade to ngrok paid plan
- Keep ngrok terminal window open while testing
- Don't commit ngrok URLs to git

## Alternative: ngrok Configuration File

Create `ngrok.yml` for persistent configuration:

```yaml
version: "2"
authtoken: YOUR_AUTH_TOKEN
tunnels:
  clerk-webhook:
    proto: http
    addr: 5000
    subdomain: your-custom-subdomain # Requires paid plan
```

Start with:

```bash
ngrok start clerk-webhook
```
