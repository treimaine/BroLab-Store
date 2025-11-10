# Documentation Structure

This directory contains all project documentation organized by category.

## Quick Start

- **New developers**: Start with `docs/development/LOCAL_DEVELOPMENT_GUIDE.md`
- **Deployment**: Check `docs/deployment/DEPLOYMENT_CHECKLIST.md`
- **Testing**: Use `docs/testing/TESTING_GUIDE.md`
- **Features**: Review `docs/specs/` for current specifications

## Active Documentation

### Authentication & Authorization

- `AUTHENTICATION_GUIDE.md` - Clerk authentication implementation
- `CLERK_BILLING_WEBHOOK_SETUP.md` - Clerk billing webhook configuration
- `CLERK_SUBSCRIPTION_DEBUG_GUIDE.md` - Subscription debugging guide

### Development (`docs/development/`)

- `LOCAL_DEVELOPMENT_GUIDE.md` - Complete local development setup
- `LOCAL_DEVELOPMENT_SETUP.md` - Quick setup instructions
- `INTERNATIONALIZATION_GUIDE.md` - Multi-language implementation
- `CLAUDE.md` - AI assistant guidelines

### Deployment (`docs/deployment/`)

- `DEPLOYMENT_CHECKLIST.md` - Production deployment checklist
- `production-deployment-guide.md` - Production deployment guide
- `production-configuration-guide.md` - Production configuration
- `WORDPRESS_SETUP.md` - WordPress/WooCommerce setup
- `lazy-loading-strategy.md` - Code splitting and lazy loading
- `component-usage-patterns.md` - Component usage patterns

### Testing (`docs/testing/`)

- `TESTING_GUIDE.md` - Comprehensive testing guide
- `TESTING_INSTRUCTIONS.md` - Quick testing instructions

### Specifications (`docs/specs/`)

- `BACKEND_TESTING_PRODUCT_SPECIFICATION.md` - Backend testing specs
- `FRONTEND_TESTING_PRODUCT_SPECIFICATION.md` - Frontend testing specs
- `TEST_PAYMENT_FLOW.md` - Payment flow testing
- `RESERVATION_TEST_GUIDE.md` - Reservation system testing
- `UNIFIED_FILTERING_SYSTEM.md` - Filtering system specification
- `MISSING_FEATURES.md` - Feature gap analysis

### Monitoring (`docs/monitoring/`)

- `error-tracking-runbook.md` - Error tracking and debugging
- `performance-monitoring-runbook.md` - Performance monitoring
- `system-optimization-monitoring-runbook.md` - System optimization monitoring

### Examples (`docs/examples/`)

- `ErrorHandlingManager.example.ts` - Error handling examples
- `validation.config.example.ts` - Validation configuration examples

### Component Documentation

- `ErrorHandlingManager.README.md` - Error handling manager documentation
- `ErrorMessage.usage.md` - Error message component usage
- `EventBus.README.md` - Event bus system documentation
- `OfflineBanner.README.md` - Offline banner component
- `OfflineBanner.IMPLEMENTATION.md` - Offline banner implementation
- `OfflineBanner.example.tsx` - Offline banner usage example
- `ConnectionManagerWithAuth.example.tsx` - Connection manager example
- `RealtimeSyncUsageExample.tsx` - Real-time sync example

### System Architecture

- `configuration-system.md` - Configuration system architecture
- `rate-limiting-system.md` - Rate limiting implementation
- `enhanced-email-system.md` - Email system architecture
- `recently-viewed-beats.md` - Recently viewed beats feature
- `dashboard-component-business-value.md` - Dashboard component analysis

### Performance & Optimization

- `performance-optimization-guide.md` - Performance optimization guide
- `optimization-features-guide.md` - Optimization features
- `lazy-loading-guide.md` - Lazy loading implementation
- `bundle-analysis-report.md` - Bundle analysis report

### Setup & Configuration

- `EMAIL_CONFIGURATION.md` - Email configuration guide
- `FAVICON_SETUP.md` - Favicon setup instructions
- `NGROK_SETUP_GUIDE.md` - ngrok setup for webhooks
- `NGROK_VISUAL_GUIDE.md` - ngrok visual guide
- `WEBHOOK_TESTING_QUICKSTART.md` - Webhook testing quickstart

### Diagnostics & Debugging

- `ACTIVITY_SYNC_DIAGNOSTIC.md` - Activity sync diagnostics
- `DASHBOARD_LIVE_DATA_VERIFICATION.md` - Dashboard data verification
- `EnhancedGlobalAudioPlayer-DEBUG.md` - Audio player debugging
- `TROUBLESHOOTING_404.md` - 404 error troubleshooting
- `test-realtime-sync.md` - Real-time sync testing

### Reports (`docs/reports/`)

- `any-audit.md` - Any type usage audit
- `log-audit.md` - Console log audit

### Dashboard Mock Data Detection (`docs/dashboard-mock-data-detection/`)

- `README.md` - Dashboard mock data detection overview
- Task summaries and implementation details

## Archived Documentation

All completed migrations, fixes, and historical documentation have been moved to `docs/archive/` and backed up to `archive-backup-YYYYMMDD.tar.gz`.

### Archive Structure

- `migration-reports/` - Completed migrations (Supabase→Convex, Stripe→Clerk)
- `fix-summaries/` - Historical bug fixes and improvements
- `analysis-audits/` - Project analysis and audit reports
- `export-windows/` - Windows-specific documentation
- `development/` - Historical development documentation
- `config-variants/` - Configuration variants

## Maintenance

- Keep active documentation up to date
- Archive completed project documentation to `docs/archive/`
- Remove outdated files regularly
- Update this index when adding new documentation
- Backup archive directory periodically
