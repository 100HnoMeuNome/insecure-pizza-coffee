#!/bin/bash

# Docker Compose down with automatic user cleanup
# Usage: ./docker-down.sh [options]

echo "🛑 Stopping Insecure Pizza & Coffee Application"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Run cleanup before stopping containers
if [ "$1" != "--skip-cleanup" ]; then
    echo ""
    echo "Step 1: Cleaning up users..."
    ./scripts/cleanup-users.sh

    if [ $? -eq 0 ]; then
        echo "✅ User cleanup completed"
    else
        echo "⚠️  User cleanup failed, but continuing..."
    fi
else
    echo "⏭️  Skipping user cleanup (--skip-cleanup flag used)"
fi

echo ""
echo "Step 2: Stopping Docker containers..."

# Check if -v flag should be passed (remove volumes)
if [ "$1" = "-v" ] || [ "$2" = "-v" ]; then
    echo "🗑️  Removing volumes (all data will be lost)"
    docker-compose down -v
else
    echo "💾 Keeping volumes (data will be preserved)"
    docker-compose down
fi

echo ""
echo "✅ Docker Compose down completed!"
echo ""
echo "Usage options:"
echo "  ./docker-down.sh              - Stop containers, cleanup users, keep volumes"
echo "  ./docker-down.sh -v           - Stop containers, cleanup users, REMOVE volumes"
echo "  ./docker-down.sh --skip-cleanup - Stop containers, skip user cleanup"
echo ""
