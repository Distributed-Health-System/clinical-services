#!/bin/bash
set -euo pipefail

# ── Config ──────────────────────────────────────────────────
DOCKERHUB_USERNAME="amzalfoumi"
SERVICE_NAME="doctor-service"
IMAGE="$DOCKERHUB_USERNAME/$SERVICE_NAME"
# ────────────────────────────────────────────────────────────

echo "Logging into Docker Hub..."
docker login

echo "Building image: $IMAGE:latest"
docker build -t "$IMAGE:latest" .

echo "Pushing image to Docker Hub..."
docker push "$IMAGE:latest"

echo "Done. Image pushed: $IMAGE:latest"