---
inclusion: always
---

# Product Overview

BroLab Entertainment is a professional beats marketplace platform that revolutionizes music production and licensing. It's a modern React-based web application providing a comprehensive marketplace for music producers and artists.

## Core Product Features

- **Professional Audio Preview System**: Waveform visualization with individual preview controls for each beat
- **WooCommerce Integration**: Full product catalog sync with WordPress backend
- **Multi-Payment Processing**: Stripe and PayPal integration with comprehensive error handling
- **Advanced Cart System**: Persistent cart with license selection and pricing management
- **Reservation System**: Studio booking and service order management (mixing, mastering, recording, consultation)
- **Subscription Management**: License-based download quotas with Clerk Billing integration
- **Multi-Language Support**: 6 languages with automatic IP-based language detection
- **Multi-Currency Support**: Automatic currency detection and conversion based on user location

## Architecture Patterns

- **Real-time First**: Use Convex for new features requiring real-time updates
- **Legacy Support**: Maintain Supabase integration for existing functionality
- **Type Safety**: Strict TypeScript with shared schemas between client/server
- **Component Composition**: Prefer composition over inheritance for UI components
- **State Management**: Zustand for client state, TanStack Query for server state
- **Error Boundaries**: Implement comprehensive error handling at component boundaries

## Code Conventions

- **Naming**: Use descriptive names that reflect business domain (Beat, License, Reservation)
- **File Organization**: Group by feature, not by file type
- **API Design**: RESTful endpoints with consistent error responses
- **Database**: Use Convex mutations for data changes, queries for reads
- **Authentication**: Always validate user permissions at both client and server levels
- **Payments**: Handle all payment flows with proper error states and user feedback

## Business Rules

- **Licensing Tiers**: Basic ($29.99), Premium ($49.99), Unlimited ($149.99)
- **Download Quotas**: Enforce subscription-based download limits
- **File Security**: All uploads must pass antivirus scanning
- **User Permissions**: Implement Row-Level Security for data access
- **Currency**: Auto-detect user location for currency/language preferences
- **Analytics**: Track conversion funnels and user behavior for optimization

## Key Differentiators

- Professional waveform audio player with table view layout
- Seamless WordPress/WooCommerce integration
- Advanced security with Row-Level Security (RLS)
- Comprehensive file management with antivirus scanning
- Real-time analytics and conversion tracking
