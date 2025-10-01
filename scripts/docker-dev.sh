#!/bin/bash

# BroLab Entertainment - Docker Development Management Script
# This script provides convenient commands for managing the development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.dev.yml"
PROJECT_NAME="brolab"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Check if .env file exists
check_env() {
    if [ ! -f ".env" ]; then
        log_warning ".env file not found. Creating from template..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_info "Please edit .env file with your configuration"
        else
            log_error ".env.example not found. Please create .env file manually."
            exit 1
        fi
    fi
}

# Show usage information
show_usage() {
    echo "BroLab Entertainment - Docker Development Management"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  start [profile]     Start development environment"
    echo "  stop               Stop all services"
    echo "  restart [service]  Restart services"
    echo "  logs [service]     View logs"
    echo "  shell              Access app container shell"
    echo "  clean              Clean up containers and volumes"
    echo "  status             Show service status"
    echo "  build              Build development images"
    echo "  test               Run tests in container"
    echo "  lint               Run linting in container"
    echo "  type-check         Run TypeScript type checking"
    echo ""
    echo "Profiles:"
    echo "  basic              App only (default)"
    echo "  full               App + Redis + Email testing"
    echo "  minimal            App only, no extras"
    echo "  testing            App + all testing services"
    echo ""
    echo "Examples:"
    echo "  $0 start           # Start basic development environment"
    echo "  $0 start full      # Start with all services"
    echo "  $0 logs app        # View app logs"
    echo "  $0 shell           # Access container shell"
    echo "  $0 clean           # Clean up everything"
}

# Start development environment
start_env() {
    local profile=${1:-basic}
    
    log_info "Starting BroLab development environment with profile: $profile"
    
    case $profile in
        "basic"|"")
            docker-compose -f $COMPOSE_FILE --profile full-stack up -d
            ;;
        "full")
            docker-compose -f $COMPOSE_FILE --profile full-stack --profile caching --profile email-testing up -d
            ;;
        "minimal")
            docker-compose -f $COMPOSE_FILE --profile full-stack up -d app
            ;;
        "testing")
            docker-compose -f $COMPOSE_FILE --profile full-stack --profile caching --profile email-testing --profile security up -d
            ;;
        *)
            log_error "Unknown profile: $profile"
            show_usage
            exit 1
            ;;
    esac
    
    log_success "Development environment started!"
    log_info "Application: http://localhost:5000"
    
    if [[ "$profile" == "full" || "$profile" == "testing" ]]; then
        log_info "Mailhog UI: http://localhost:8025"
    fi
    
    log_info "Use '$0 logs' to view logs"
}

# Stop development environment
stop_env() {
    log_info "Stopping BroLab development environment..."
    docker-compose -f $COMPOSE_FILE down
    log_success "Development environment stopped!"
}

# Restart services
restart_services() {
    local service=${1:-}
    
    if [ -n "$service" ]; then
        log_info "Restarting service: $service"
        docker-compose -f $COMPOSE_FILE restart $service
    else
        log_info "Restarting all services..."
        docker-compose -f $COMPOSE_FILE restart
    fi
    
    log_success "Services restarted!"
}

# View logs
view_logs() {
    local service=${1:-}
    
    if [ -n "$service" ]; then
        docker-compose -f $COMPOSE_FILE logs -f $service
    else
        docker-compose -f $COMPOSE_FILE logs -f
    fi
}

# Access container shell
access_shell() {
    log_info "Accessing app container shell..."
    docker-compose -f $COMPOSE_FILE exec app sh
}

# Clean up environment
clean_env() {
    log_warning "This will remove all containers, networks, and volumes!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cleaning up development environment..."
        docker-compose -f $COMPOSE_FILE down -v --remove-orphans
        docker system prune -f
        log_success "Environment cleaned up!"
    else
        log_info "Cleanup cancelled."
    fi
}

# Show service status
show_status() {
    log_info "Service Status:"
    docker-compose -f $COMPOSE_FILE ps
    
    echo ""
    log_info "Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" $(docker-compose -f $COMPOSE_FILE ps -q) 2>/dev/null || log_warning "No running containers"
}

# Build images
build_images() {
    log_info "Building development images..."
    docker-compose -f $COMPOSE_FILE build --no-cache
    log_success "Images built successfully!"
}

# Run tests
run_tests() {
    log_info "Running tests in container..."
    docker-compose -f $COMPOSE_FILE exec app npm test
}

# Run linting
run_lint() {
    log_info "Running linting in container..."
    docker-compose -f $COMPOSE_FILE exec app npm run lint
}

# Run type checking
run_type_check() {
    log_info "Running TypeScript type checking..."
    docker-compose -f $COMPOSE_FILE exec app npm run type-check
}

# Main script logic
main() {
    check_docker
    check_env
    
    case ${1:-} in
        "start")
            start_env $2
            ;;
        "stop")
            stop_env
            ;;
        "restart")
            restart_services $2
            ;;
        "logs")
            view_logs $2
            ;;
        "shell")
            access_shell
            ;;
        "clean")
            clean_env
            ;;
        "status")
            show_status
            ;;
        "build")
            build_images
            ;;
        "test")
            run_tests
            ;;
        "lint")
            run_lint
            ;;
        "type-check")
            run_type_check
            ;;
        "help"|"--help"|"-h"|"")
            show_usage
            ;;
        *)
            log_error "Unknown command: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"