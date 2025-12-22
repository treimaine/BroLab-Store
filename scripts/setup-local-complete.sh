#!/bin/bash

# BroLab Beats Store - Complete Local Development Setup
# This script sets up the entire development environment from scratch

set -e

echo "🚀 BroLab Beats Store - Local Development Setup"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed and version
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 24+ from https://nodejs.org"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 24 ]; then
        print_error "Node.js version must be 24 or higher. Current version: $(node --version)"
        exit 1
    fi
    
    print_success "Node.js $(node --version) detected"
}

# Check if npm is available
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    print_success "npm $(npm --version) detected"
}

# Copy local configuration files
setup_local_config() {
    print_status "Setting up local configuration files..."
    
    # Copy package.local.json to package.json for local development
    if [ -f "package.local.json" ]; then
        cp package.local.json package.json
        print_success "Local package.json configured"
    else
        print_warning "package.local.json not found, using existing package.json"
    fi
    
    # Copy vite.config.local.ts to vite.config.ts for local development
    if [ -f "vite.config.local.ts" ]; then
        cp vite.config.local.ts vite.config.ts
        print_success "Local vite.config.ts configured"
    else
        print_warning "vite.config.local.ts not found, using existing vite.config.ts"
    fi
    
    # Setup environment file
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success "Environment file created from .env.example"
            print_warning "Please update .env file with your actual API keys and database credentials"
        else
            print_error ".env.example not found. Please create .env file manually."
        fi
    else
        print_success "Environment file already exists"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing project dependencies..."
    npm install
    print_success "Dependencies installed successfully"
}

# Database setup check
check_database() {
    print_status "Checking database configuration..."
    
    if grep -q "DATABASE_URL=" .env 2>/dev/null; then
        DATABASE_URL=$(grep "DATABASE_URL=" .env | cut -d'=' -f2)
        if [[ $DATABASE_URL == *"localhost"* ]] || [[ $DATABASE_URL == *"127.0.0.1"* ]]; then
            print_warning "Local database detected. Make sure PostgreSQL is running on your system."
            print_status "To start PostgreSQL with Docker: docker-compose -f docker-compose.dev.yml up -d postgres"
        elif [[ $DATABASE_URL == *"supabase"* ]]; then
            print_success "Supabase database detected"
        elif [[ $DATABASE_URL == *"neon"* ]]; then
            print_success "Neon database detected"
        else
            print_warning "Database URL configured but type not recognized"
        fi
    else
        print_warning "No DATABASE_URL found in .env file"
        print_status "Please configure your database in the .env file"
    fi
}

# Push database schema
setup_database() {
    print_status "Setting up database schema..."
    
    if command -v npx &> /dev/null; then
        if npm run db:push; then
            print_success "Database schema synchronized"
        else
            print_warning "Database schema sync failed. Please check your DATABASE_URL and try manually: npm run db:push"
        fi
    else
        print_warning "npx not available. Please run 'npm run db:push' manually after setup"
    fi
}

# Main setup process
main() {
    print_status "Starting BroLab Beats Store local development setup..."
    
    # Pre-flight checks
    check_node
    check_npm
    
    # Setup configuration
    setup_local_config
    
    # Install dependencies
    install_dependencies
    
    # Database setup
    check_database
    setup_database
    
    echo ""
    echo "================================================"
    print_success "Setup completed successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Update .env file with your API keys and database credentials"
    echo "2. Start development server: npm run dev"
    echo "3. Open browser at: http://localhost:5000"
    echo ""
    echo "🔧 Useful Commands:"
    echo "• npm run dev          - Start development server"
    echo "• npm run db:studio    - Open database GUI"
    echo "• npm run db:push      - Sync database schema"
    echo "• npm run build        - Build for production"
    echo "• npm run setup        - Reinstall dependencies and sync database"
    echo ""
    echo "📚 Documentation:"
    echo "• LOCAL_DEVELOPMENT_GUIDE.md - Complete development guide"
    echo "• README.md - Project overview"
    echo "• DEPLOYMENT_CHECKLIST.md - Production deployment guide"
    echo ""
    print_success "Happy coding! 🎵"
}

# Run main function
main "$@"