#!/usr/bin/env bash
set -e

echo "🔄 Local Environment Reset Tool"
echo "================================"
echo ""

# Ask about stopping containers
read -p "Stop all running containers? (y/n): " STOP_CONTAINERS
STOP_CONTAINERS=${STOP_CONTAINERS:-n}

# Ask about resetting databases
read -p "Reset databases (⚠️  WIPES ALL DATA)? (y/n): " RESET_DBS
RESET_DBS=${RESET_DBS:-n}

# Ask about rebuilding images
read -p "Rebuild Docker images? (y/n): " REBUILD_IMAGES
REBUILD_IMAGES=${REBUILD_IMAGES:-n}

# Ask about resetting .env
read -p "Reset .env file (⚠️  REGENERATES SECRETS)? (y/n): " RESET_ENV
RESET_ENV=${RESET_ENV:-n}

echo ""
echo "📋 Actions to perform:"
echo "   Stop containers: $STOP_CONTAINERS"
echo "   Reset databases: $RESET_DBS"
echo "   Rebuild images: $REBUILD_IMAGES"
echo "   Reset .env: $RESET_ENV"
echo ""
read -p "Continue? (y/n): " CONFIRM
CONFIRM=${CONFIRM:-n}

if [[ "$CONFIRM" != "y" ]]; then
  echo "❌ Cancelled."
  exit 0
fi

echo ""
echo "🚀 Starting reset process..."
echo ""

# Reset .env if requested
if [[ "$RESET_ENV" == "y" ]]; then
  echo "🔑 Resetting .env file..."
  if [[ -f .env ]]; then
    rm .env
    echo "   Removed existing .env"
  fi
  echo "   Run ./setup.sh to regenerate (skipping for now)"
fi

# Stop containers
if [[ "$STOP_CONTAINERS" == "y" ]]; then
  echo "⏹️  Stopping all containers..."
  
  if [[ "$RESET_DBS" == "y" ]]; then
    echo "   (Including database volumes)"
    docker compose -f docker-compose.prod.yml down -v
  else
    echo "   (Preserving database volumes)"
    docker compose -f docker-compose.prod.yml down
  fi
fi

# Rebuild images if requested
BUILD_FLAG=""
if [[ "$REBUILD_IMAGES" == "y" ]]; then
  echo "🔨 Will rebuild Docker images..."
  BUILD_FLAG="--build"
fi

# Start services
if [[ "$STOP_CONTAINERS" == "y" ]] || [[ "$REBUILD_IMAGES" == "y" ]]; then
  echo "▶️  Starting all services..."
  docker compose -f docker-compose.prod.yml up -d $BUILD_FLAG
  
  echo ""
  echo "⏳ Waiting for services to be ready..."
  sleep 5
  
  echo ""
  echo "📊 Service status:"
  docker compose -f docker-compose.prod.yml ps
  
  echo ""
  echo "🏥 Testing API health..."
  if curl -s http://localhost:8080/api/v1/health | grep -q "ok"; then
    echo "   ✅ API is healthy!"
  else
    echo "   ⚠️  API health check failed"
  fi
fi

echo ""
echo "✅ Reset complete!"
echo ""
echo "📍 Access points:"
echo "   Frontend: http://localhost:8080"
echo "   API: http://localhost:8080/api/v1/health"

if [[ "$RESET_DBS" == "y" ]]; then
  echo ""
  echo "⚠️  Databases were wiped - you'll need to:"
  echo "   • Register a new account"
  echo "   • Create new servers/channels"
fi

if [[ "$RESET_ENV" == "y" ]]; then
  echo ""
  echo "⚠️  .env was removed - run ./setup.sh to regenerate"
fi
