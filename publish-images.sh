#!/usr/bin/env bash
set -e

# Configuration
REGISTRY_USER="${DOCKER_REGISTRY_USER:-madaley1}"
REPOSITORY="tone-chat"
VERSION_SUFFIX="${VERSION:-latest}"

# Image mappings: local_name -> tag_name
declare -A IMAGES=(
  ["tone-chat-bff"]="bff"
  ["tone-chat-users"]="users"
  ["tone-chat-messaging"]="messaging"
  ["tone-chat-attachments"]="attachments"
  ["tone-chat-caddy"]="caddy"
)

echo "🚀 Publishing Tone Chat Images"
echo "================================"
echo ""
echo "Repository: $REGISTRY_USER/$REPOSITORY"
echo "Version: $VERSION_SUFFIX"
echo ""

echo "📦 Images to publish:"
for local_image in "${!IMAGES[@]}"; do
  tag="${IMAGES[$local_image]}"
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

echo ""
echo "🏷️  Tagging images..."
for local_image in "${!IMAGES[@]}"; do
  tag="${IMAGES[$local_image]}"
  if [[ "$VERSION_SUFFIX" == "latest" ]]; then
    target_tag="$REGISTRY_USER/$REPOSITORY:$tag"
  else
    target_tag="$REGISTRY_USER/$REPOSITORY:$tag-$VERSION_SUFFIX"
  fi
  echo "  Tagging $local_image -> $target_tag"
  docker tag "$local_image:latest" "$target_tag"
done

echo ""
echo "🔐 Logging in to Docker Hub..."
echo "   (You may be prompted for credentials)"
docker login

echo ""
echo "⬆️  Pushing images..."
for local_image in "${!IMAGES[@]}"; do
  tag="${IMAGES[$local_image]}"
  if [[ "$VERSION_SUFFIX" == "latest" ]]; then
    target_tag="$REGISTRY_USER/$REPOSITORY:$tag"
  else
    target_tag="$REGISTRY_USER/$REPOSITORY:$tag-$VERSION_SUFFIX"
  fi
  echo ""
  echo "  📤 Pushing $target_tag"
  docker push "$target_tag"
done

echo ""
echo "✅ All images published successfully!"
echo ""
echo "📋 Published images:"
for local_image in "${!IMAGES[@]}"; do
  tag="${IMAGES[$local_image]}"
  if [[ "$VERSION_SUFFIX" == "latest" ]]; then
    echo "  $REGISTRY_USER/$REPOSITORY:$tag"
  else
    echo "  $REGISTRY_USER/$REPOSITORY:$tag-$VERSION_SUFFIX"
  fi
done

echo ""
echo "💡 To deploy on a server, see DEPLOYMENT.md"
