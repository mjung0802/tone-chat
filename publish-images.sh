#!/usr/bin/env bash
set -euo pipefail

# Configuration
REGISTRY_USER="${DOCKER_REGISTRY_USER:-madaley1}"
REPOSITORY="tone-chat"
VERSION_SUFFIX="${VERSION:-latest}"
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"

# Image mappings: "dockerfile_path:tag_name"
IMAGES=(
  "packages/server/Dockerfile:bff"
  "packages/usersService/Dockerfile:users"
  "packages/messagingService/Dockerfile:messaging"
  "packages/attachmentsService/Dockerfile:attachments"
  "packages/client/Dockerfile:caddy"
)

echo "🚀 Publishing Tone Chat Images"
echo "================================"
echo ""
echo "Repository: $REGISTRY_USER/$REPOSITORY"
echo "Version: $VERSION_SUFFIX"
echo "Platforms: $PLATFORMS"
echo ""

echo "📦 Images to publish:"
for image_pair in "${IMAGES[@]}"; do
  tag="${image_pair##*:}"
  if [[ "$VERSION_SUFFIX" == "latest" ]]; then
    echo "  - $REGISTRY_USER/$REPOSITORY:$tag"
  else
    echo "  - $REGISTRY_USER/$REPOSITORY:$tag-$VERSION_SUFFIX"
  fi
done

echo ""
read -p "Continue? (y/n): " CONFIRM
if [[ "$CONFIRM" != "y" ]]; then
  echo "❌ Cancelled"
  exit 0
fi

if ! docker buildx version >/dev/null 2>&1; then
  echo "❌ docker buildx is required but not available"
  exit 1
fi

echo ""
echo "🔐 Logging in to Docker Hub..."
echo "   (You may be prompted for credentials)"
docker login

echo ""
echo "🛠️  Preparing buildx builder..."
if ! docker buildx inspect tone-chat-builder >/dev/null 2>&1; then
  docker buildx create --name tone-chat-builder --driver docker-container --use
else
  docker buildx use tone-chat-builder
fi
docker buildx inspect --bootstrap >/dev/null

echo ""
echo "⬆️  Building and pushing multi-arch images..."
for image_pair in "${IMAGES[@]}"; do
  dockerfile_path="${image_pair%%:*}"
  tag="${image_pair##*:}"
  if [[ "$VERSION_SUFFIX" == "latest" ]]; then
    target_tag="$REGISTRY_USER/$REPOSITORY:$tag"
  else
    target_tag="$REGISTRY_USER/$REPOSITORY:$tag-$VERSION_SUFFIX"
  fi
  echo ""
  echo "  📤 Building $target_tag from $dockerfile_path"
  docker buildx build \
    --platform "$PLATFORMS" \
    --file "$dockerfile_path" \
    --tag "$target_tag" \
    --push \
    .
done

echo ""
echo "✅ All images published successfully!"
echo ""
echo "📋 Published images:"
for image_pair in "${IMAGES[@]}"; do
  tag="${image_pair##*:}"
  if [[ "$VERSION_SUFFIX" == "latest" ]]; then
    echo "  $REGISTRY_USER/$REPOSITORY:$tag"
  else
    echo "  $REGISTRY_USER/$REPOSITORY:$tag-$VERSION_SUFFIX"
  fi
done

echo ""
echo "💡 To deploy on a server, see DEPLOYMENT.md"
