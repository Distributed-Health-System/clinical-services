#!/bin/bash
set -e  # stop immediately if any command fails
set -x

echo "Pointing Docker to minikube..."
eval $(minikube docker-env)

echo "Building appointment-service image..."
docker build -t appointment-service:latest .

echo "Restarting deployment..."
kubectl rollout restart deployment/appointment-service -n distributed-health

echo "Watching rollout..."
kubectl rollout status deployment/appointment-service -n distributed-health
