#!/bin/bash
# BroLab Entertainment - Export Script
# Generated: January 23, 2025 - Post SAFE-UPDATE-FIX-BLOCKERS

echo "🚀 Creating production-ready export ZIP..."

# Create export filename with timestamp
EXPORT_NAME="brolab-production-$(date +%Y%m%d-%H%M%S).zip"

# Create clean export excluding development files
zip -r "$EXPORT_NAME" . \
  -x "node_modules/*" \
  -x ".git/*" \
  -x "*.log" \
  -x ".env.local" \
  -x ".env.test" \
  -x "coverage/*" \
  -x ".nyc_output/*" \
  -x "dist/*" \
  -x ".vite/*" \
  -x "build/*" \
  -x "*.tmp" \
  -x "*.temp" \
  -x ".DS_Store" \
  -x "Thumbs.db" \
  -x ".replit" \
  -x "replit.nix"

echo "✅ Export created: $EXPORT_NAME"
echo "📂 Size: $(du -h "$EXPORT_NAME" | cut -f1)"
echo "📋 Contents preview:"
unzip -l "$EXPORT_NAME" | head -20

echo ""
echo "🎯 Production-ready export complete!"
echo "📦 File: $EXPORT_NAME"
echo "🚀 Ready for deployment"