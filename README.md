# BroLab Entertainment - Professional Beats Marketplace

A cutting-edge beats marketplace platform revolutionizing music production and licensing through intelligent technology and seamless user experience.

## 🎵 Overview

BroLab Entertainment is a modern React-based web application that provides a professional marketplace for music producers and artists. The platform integrates seamlessly with WordPress/WooCommerce for content management while offering advanced features like real-time audio preview, multi-currency support, and comprehensive payment processing.

## ✨ Key Features

### Core Functionality
- **Professional Audio Preview System**: Waveform visualization with individual preview controls for each beat
- **WooCommerce Integration**: Full product catalog sync with WordPress backend
- **Multi-Payment Processing**: Stripe and PayPal integration with comprehensive error handling
- **Responsive Design**: Mobile-first approach with device-specific optimizations (320px-1920px+)
- **Advanced Cart System**: Persistent cart with license selection and pricing management

### Advanced Features
- **Geolocation & Multi-Currency**: Automatic currency detection and conversion based on user location
- **Multi-Language Support**: 6 languages with automatic IP-based language detection
- **Professional Waveform Audio Player**: Table view with individual audio previews per product
- **License Management**: Multiple licensing tiers (Basic $29.99, Premium $49.99, Unlimited $149.99)
- **Enhanced User Experience**: Professional table layout matching industry standards

### Technical Excellence
- **Type-Safe Development**: Full TypeScript implementation with Drizzle ORM
- **Modern State Management**: Zustand for client state, TanStack Query for server state
- **Accessibility Compliant**: WCAG AA standards with reduced motion support
- **Performance Optimized**: Lazy loading, caching, virtual scrolling, and CDN integration

## 🏗️ Technical Architecture

### Frontend Stack
- **React 18** with TypeScript and Vite build system
- **Tailwind CSS** with shadcn/ui component library
- **Wouter** for lightweight client-side routing
- **TanStack Query** for advanced server state management
- **Zustand** for client-side state management

### Backend Stack
- **Node.js + Express** server with TypeScript
- **PostgreSQL** database with Drizzle ORM
- **WordPress/WooCommerce** REST API integration
- **Stripe + PayPal** payment processing
- **Session-based authentication** with bcrypt

### Development & Deployment
- **Local Development**: Docker PostgreSQL setup with automated scripts
- **Production Ready**: Optimized builds for o2switch cPanel hosting
- **CI/CD Ready**: Comprehensive deployment checklist and automation scripts

## 🚀 Quick Start

### Local Development Setup

```bash
# Clone and setup
git clone <repository-url> brolab-beats
cd brolab-beats

# Run automated setup
./scripts/setup-local.sh

# Start development server
npm run dev
```

### Production Deployment

```bash
# Create deployment package
./scripts/deploy-cpanel.sh

# Follow deployment guide
# See DEPLOYMENT_CHECKLIST.md for complete steps
```

## 📁 Project Structure

```
brolab-beats/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Route components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and configurations
├── server/                # Express backend application
│   ├── routes.ts          # API route definitions
│   ├── storage.ts         # Database operations
│   └── wordpress.ts       # WooCommerce integration
├── shared/                # Shared TypeScript definitions
│   └── schema.ts          # Database schema and types
├── scripts/               # Development and deployment scripts
└── docs/                  # Documentation files
```

## 🔧 Development Commands

```bash
# Development
npm run dev                # Start full development server
npm run dev:client         # Frontend only (port 3000)
npm run dev:server         # Backend only (port 5000)

# Database
npm run db:push            # Push schema changes
npm run db:studio          # Open database GUI
npm run db:generate        # Generate migration files

# Build & Production
npm run build              # Build for production
npm run start              # Start production server
npm run type-check         # TypeScript validation
```

## 🌐 Environment Configuration

### Development (.env)
```env
DATABASE_URL="postgresql://brolab_user:password@localhost:5432/brolab_beats_dev"
WORDPRESS_URL="https://brolabentertainment.com/wp-json/wp/v2"
WOOCOMMERCE_URL="https://brolabentertainment.com/wp-json/wc/v3"
WOOCOMMERCE_CONSUMER_KEY="your_test_key"
WOOCOMMERCE_CONSUMER_SECRET="your_test_secret"
STRIPE_SECRET_KEY="sk_test_your_test_key"
VITE_STRIPE_PUBLIC_KEY="pk_test_your_test_key"
NODE_ENV="development"
```

### Production
- Use live API keys and production database
- Enable SSL and security headers
- Configure domain and DNS settings
- See DEPLOYMENT_CHECKLIST.md for complete setup

## 📱 Responsive Design

### Breakpoint System
- **Mobile**: 320px - 640px (xs, sm)
- **Tablet**: 641px - 1024px (md, lg)
- **Desktop**: 1025px+ (xl, 2xl)

### Key Features
- Touch-friendly interactions (44px+ tap targets)
- Safe-area support for iOS/Android notch devices
- Network-aware loading optimizations
- Reduced motion support for accessibility

## 🎵 Audio System

### Waveform Audio Player
- Professional waveform visualization with Canvas rendering
- Individual audio controls for each product in table view
- Click-to-seek functionality with visual progress tracking
- Cyan-themed UI matching modern music platforms
- Mobile-optimized controls with backdrop blur effects

### Table View Layout
- Professional layout matching industry standards
- Thumbnails, waveforms, genre, duration, and actions per row
- Independent audio preview for each beat
- Responsive design with mobile scroll optimization

## 🔒 Security Features

- Environment variable protection
- HTTPS enforcement in production
- Rate limiting and input validation
- Secure session management
- Payment data encryption

## 📈 Performance Optimizations

- Lazy loading for components and images
- Virtual scrolling for large product lists
- CDN integration for static assets
- Database query optimization
- Client-side caching strategies

## 🛠️ Development Workflow

1. **Local Development**: Use Docker or local PostgreSQL
2. **Feature Development**: Type-safe development with hot reloading
3. **Testing**: Build and test production builds locally
4. **Deployment**: Automated scripts for cPanel deployment
5. **Monitoring**: Comprehensive logging and error tracking

## 📚 Documentation

- **LOCAL_DEVELOPMENT_GUIDE.md**: Complete setup and development guide
- **DEPLOYMENT_CHECKLIST.md**: Production deployment steps
- **TESTING_GUIDE.md**: Testing procedures and workflows
- **replit.md**: Technical architecture and project context

## 🏆 Production Ready

This application is production-ready with:
- Comprehensive error handling and logging
- Security best practices implementation
- Performance optimization strategies
- Scalable architecture patterns
- Professional deployment workflows

## 🤝 Support

For development support and questions:
- Check documentation files in the project root
- Review troubleshooting sections in guides
- Consult deployment checklist for production issues

---

**BroLab Entertainment** - Revolutionizing music production through technology

## Typage TypeScript pour json2csv

Ce projet utilise la librairie [json2csv](https://www.npmjs.com/package/json2csv) pour l’export CSV côté backend. Comme il n’existe pas de paquet de types officiel, un fichier de déclaration custom a été ajouté :

- `server/types/json2csv.d.ts` : expose la classe `Parser` et ses options principales.

**À savoir** :
- Si l’API de json2csv évolue, il faudra mettre à jour ce fichier.
- Si un paquet de types officiel apparaît, il est recommandé de le préférer et de supprimer ce .d.ts custom.
- Ce fichier est référencé dans `tsconfig.json` via `typeRoots`.