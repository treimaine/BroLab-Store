# BroLab Beats Store - WordPress/WooCommerce Setup Guide

## Overview
This guide covers the WordPress/WooCommerce configuration required for the BroLab beats marketplace integration.

## Current WordPress Integration Status

### ✅ Working Features
- **Live Product Sync**: Products automatically sync from brolabentertainment.com WooCommerce
- **Category Management**: Beat categories (Hip Hop, R&B, Trap, etc.) sync correctly
- **Metadata Extraction**: BPM, key, mood, and other metadata extracted from WooCommerce
- **Audio URL Handling**: Audio preview URLs extracted from product meta_data
- **Price Synchronization**: Live pricing updates from WooCommerce to frontend

### WordPress API Endpoints
```
Base URL: https://brolabentertainment.com/wp-json/wp/v2
WooCommerce URL: https://brolabentertainment.com/wp-json/wc/v3
```

### Current API Integration
- **Products Endpoint**: `/api/woocommerce/products` - Fetches all beats with metadata
- **Categories Endpoint**: `/api/woocommerce/categories` - Fetches beat genres
- **Individual Product**: `/api/woocommerce/products/{id}` - Fetches specific beat details

## WooCommerce Configuration Requirements

### Product Setup for Beats
Each beat product should include:

#### Required Fields
- **Product Name**: Beat title
- **Price**: License pricing (Basic: $29.99, Premium: $49.99, Unlimited: $149.99)
- **Description**: Beat description and production details
- **Categories**: Genre classification (Hip Hop, R&B, Trap, etc.)
- **Featured Image**: Beat artwork/thumbnail

#### Required Custom Meta Data
```php
// Essential metadata for beat functionality
meta_data: [
  { key: 'bpm', value: '140' },
  { key: 'key', value: 'C Major' },
  { key: 'mood', value: 'Energetic' },
  { key: 'audio_url', value: 'https://example.com/beat-preview.mp3' },
  { key: 'producer', value: 'Producer Name' },
  { key: 'duration', value: '3:45' }
]
```

#### Optional Metadata
```php
// Additional metadata for enhanced features
meta_data: [
  { key: 'tags', value: 'Heavy Bass, Drums, 808s' },
  { key: 'free_tag', value: 'FREE' }, // For free beats
  { key: 'featured', value: 'true' }, // For featured beats
  { key: 'stems_available', value: 'true' },
  { key: 'exclusive_available', value: 'false' }
]
```

### Product Categories Setup
Configure WooCommerce categories for beat genres:

```
Categories:
- Hip Hop
- R&B
- Trap
- Drill
- Pop
- Afrobeats
- Jazz
- Electronic
- Rock
- Country
```

### Product Attributes
Set up WooCommerce attributes for filtering:

```php
Attributes:
- BPM (Number range: 60-200)
- Musical Key (Text: C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
- Mood (Text: Energetic, Chill, Dark, Happy, Sad, Aggressive)
- Producer (Text: Producer names)
- Duration (Text: MM:SS format)
```

## Audio File Management

### Audio Storage Requirements
- **Format**: MP3, WAV, or M4A
- **Quality**: Minimum 128kbps, recommended 320kbps
- **Duration**: 30-60 second previews recommended
- **File Size**: Maximum 50MB par fichier
- **Validation**: Vérification MIME type avec file-type
- **Sécurité**: Scan antivirus avec ClamAV

### Supabase Storage Configuration
Les fichiers audio sont stockés dans Supabase Storage:

```typescript
// Configuration des buckets Supabase
const STORAGE_BUCKETS = {
  USER_UPLOADS: 'user-uploads',
  DELIVERABLES: 'deliverables',
  INVOICES: 'invoices'
};

// Upload sécurisé avec validation
const uploadFile = async (file: File) => {
  await validateFile(file); // Validation MIME type et taille
  await scanFile(file);     // Scan antivirus
  return uploadToSupabase(file); // Upload avec URL signée 1h
};
```

### CDN et Performance
Optimisations via Supabase Storage:
- CDN intégré pour distribution globale
- URLs signées avec TTL configurable
- Compression gzip automatique
- Cache-Control optimisé
- Rate limiting (20 uploads/h, 100 downloads/h)

## API Security Configuration

### WooCommerce API Keys
Generate API keys in WooCommerce settings:

1. **Navigate to**: WooCommerce → Settings → Advanced → REST API
2. **Create Key**: Add new key with read permissions
3. **Permissions**: Read access for public data, Read/Write for orders

### Environment Variables
Configure in your application:

```env
WOOCOMMERCE_URL="https://brolabentertainment.com/wp-json/wc/v3"
WOOCOMMERCE_CONSUMER_KEY="ck_your_consumer_key"
WOOCOMMERCE_CONSUMER_SECRET="cs_your_consumer_secret"
```

### CORS Configuration
Add to WordPress functions.php or plugin:

```php
// Allow CORS for API requests
add_action('rest_api_init', function() {
  remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
  add_filter('rest_pre_serve_request', function($value) {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    return $value;
  });
});
```

## Order Processing Integration

### Order Creation Flow
When payment is successful, create order in WooCommerce:

```javascript
// Create order after successful payment
const orderData = {
  payment_method: 'stripe',
  payment_method_title: 'Credit Card',
  set_paid: true,
  billing: customerBillingInfo,
  line_items: [{
    product_id: beatId,
    quantity: 1,
    meta_data: [
      { key: 'license_type', value: 'premium' },
      { key: 'download_limit', value: '150000' }
    ]
  }]
};
```

### Customer Data Sync
Sync customer data between app and WooCommerce:

```javascript
// Create/update customer in WooCommerce
const customerData = {
  email: user.email,
  first_name: user.firstName,
  last_name: user.lastName,
  billing: billingAddress,
  meta_data: [
    { key: 'app_user_id', value: user.id },
    { key: 'registration_source', value: 'beats_app' }
  ]
};
```

## WordPress Plugin Recommendations

### Essential Plugins
- **WooCommerce**: Core e-commerce functionality
- **WP REST API**: Enhanced API capabilities (if needed)
- **Custom Fields Suite**: For advanced metadata management
- **WP File Download**: For secure file delivery

### Audio-Specific Plugins
- **MP3 Audio Player**: For WordPress admin audio preview
- **Media Library Plus**: Enhanced media management
- **WP Audio Player**: Advanced audio player for WordPress

### Security Plugins
- **Wordfence**: Security and firewall
- **SSL/HTTPS**: Force SSL for API requests
- **Limit Login Attempts**: Prevent brute force attacks

## Database Optimization

### WooCommerce Tables
Optimize these tables for better performance:

```sql
-- Index for faster product queries
CREATE INDEX idx_postmeta_audio_url ON wp_postmeta (meta_key, meta_value(100));
CREATE INDEX idx_postmeta_bpm ON wp_postmeta (meta_key, meta_value);

-- Index for category queries
CREATE INDEX idx_term_relationships_product ON wp_term_relationships (object_id);
```

### Regular Maintenance
- Clean up old orders and customer data
- Optimize database tables monthly
- Monitor API response times
- Regular security updates

## Testing WordPress Integration

### API Testing Commands
```bash
# Test products endpoint
curl "https://brolabentertainment.com/wp-json/wc/v3/products?consumer_key=YOUR_KEY&consumer_secret=YOUR_SECRET"

# Test specific product with metadata
curl "https://brolabentertainment.com/wp-json/wc/v3/products/920?consumer_key=YOUR_KEY&consumer_secret=YOUR_SECRET"

# Test categories
curl "https://brolabentertainment.com/wp-json/wc/v3/products/categories?consumer_key=YOUR_KEY&consumer_secret=YOUR_SECRET"
```

### Validation Checklist
- [ ] All products have required metadata (BPM, key, mood)
- [ ] Audio URLs are accessible and working
- [ ] Categories are properly configured
- [ ] Pricing is consistent across all licenses
- [ ] API keys have proper permissions
- [ ] CORS is configured correctly
- [ ] Order creation works after payment
- [ ] Customer data syncs properly

## Troubleshooting Common Issues

### API Connection Issues
1. **Check API credentials**: Verify consumer key and secret
2. **Test API directly**: Use curl to test endpoints
3. **Check CORS**: Ensure cross-origin requests are allowed
4. **Verify SSL**: API requests must use HTTPS

### Product Data Issues
1. **Missing metadata**: Check custom fields are set
2. **Audio not loading**: Verify audio URLs are accessible
3. **Pricing inconsistency**: Check WooCommerce product prices
4. **Category problems**: Verify category assignments

### Performance Issues
1. **Slow API responses**: Optimize database queries
2. **Large product catalogs**: Implement pagination
3. **Audio loading delays**: Use CDN for audio files
4. **Memory issues**: Increase PHP memory limits

This WordPress/WooCommerce setup ensures seamless integration with the BroLab beats marketplace application.