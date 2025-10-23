# Favicon Setup Guide

## Overview

This guide explains how to generate and use favicons for the BroLab Entertainment app using the logo.

## Quick Setup

### 1. Install Dependencies

```bash
npm install sharp --save-dev
```

### 2. Generate Favicons

```bash
node scripts/generate-favicon.js
```

This will generate:

- `favicon.ico` - Standard favicon (32x32)
- `favicon-16x16.png` - Small favicon
- `favicon-32x32.png` - Medium favicon
- `favicon-48x48.png` - Large favicon
- `icon-192.png` - PWA icon (Android)
- `icon-512.png` - PWA icon (Android, high-res)
- `apple-touch-icon.png` - iOS home screen icon (180x180)

### 3. Verify

All files will be generated in `client/public/` and are already referenced in `client/index.html`.

## Manual Alternative

If you prefer to generate favicons manually:

1. Use an online tool like [favicon.io](https://favicon.io/) or [realfavicongenerator.net](https://realfavicongenerator.net/)
2. Upload `client/public/logo.png`
3. Download the generated files
4. Place them in `client/public/`

## Files Generated

| File                 | Size    | Purpose                      |
| -------------------- | ------- | ---------------------------- |
| favicon.ico          | 32x32   | Legacy browsers              |
| favicon-16x16.png    | 16x16   | Browser tabs (small)         |
| favicon-32x32.png    | 32x32   | Browser tabs (standard)      |
| favicon-48x48.png    | 48x48   | Browser tabs (large)         |
| icon-192.png         | 192x192 | PWA icon, Android            |
| icon-512.png         | 512x512 | PWA icon, Android (high-res) |
| apple-touch-icon.png | 180x180 | iOS home screen              |

## HTML Integration

The favicons are already integrated in `client/index.html`:

```html
<!-- Favicon -->
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />

<!-- Apple Touch Icon -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

<!-- PWA Icons -->
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
<link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
```

## PWA Manifest

The `client/public/manifest.json` is already configured to use these icons for Progressive Web App functionality.

## Testing

1. Start the dev server: `npm run dev`
2. Open http://localhost:5000
3. Check the browser tab for the favicon
4. Test on mobile devices for PWA icons
5. Add to home screen on iOS/Android to verify app icons

## Troubleshooting

### Favicon not showing

- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+Shift+R)
- Check browser console for 404 errors
- Verify files exist in `client/public/`

### Wrong icon showing

- Browsers cache favicons aggressively
- Try incognito/private mode
- Clear site data in browser settings

### PWA icon not updating

- Uninstall the PWA
- Clear service worker cache
- Reinstall the PWA

## Browser Support

- Chrome/Edge: All sizes supported
- Firefox: All sizes supported
- Safari: Prefers apple-touch-icon.png
- Mobile browsers: Use PWA icons (192x192, 512x512)

## Notes

- The logo has a transparent background, which works well for favicons
- The theme color (#ff6b35) matches the BroLab brand
- Icons are optimized for both light and dark browser themes
