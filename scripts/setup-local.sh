#!/bin/bash

# BroLab Beats Store - Local Development Setup Script

echo "🎵 Setting up BroLab Beats Store for local development..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 24+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 24 ]; then
    echo "❌ Node.js version 24+ required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📄 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update .env file with your actual credentials"
else
    echo "✅ .env file already exists"
fi

# Check if Docker is available for database
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "🐳 Docker detected. Starting PostgreSQL container..."
    docker-compose -f docker-compose.dev.yml up -d postgres
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 10
else
    echo "⚠️  Docker not found. Please install PostgreSQL manually or install Docker."
    echo "   Manual PostgreSQL setup:"
    echo "   1. Install PostgreSQL 14+"
    echo "   2. Create database: brolab_beats_dev"
    echo "   3. Create user: brolab_user with password: brolab_password"
    echo "   4. Update DATABASE_URL in .env file"
fi

# Build the project
echo "🔨 Building the project..."
npm run build

# Push database schema
echo "📊 Setting up database schema..."
npm run db:push

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env file with your actual credentials"
echo "2. Start development server: npm run dev"
echo "3. Open http://localhost:5000 in your browser"
echo ""
echo "Useful commands:"
echo "  npm run dev          - Start development server"
echo "  npm run db:studio    - Open database GUI"
echo "  npm run build        - Build for production"
echo "  npm run start        - Start production server"
echo ""