#!/bin/bash
set -e  # stop immediately if any command fails
set -x

echo "Pointing Docker to minikube..."
eval $(minikube docker-env)

echo "Building notification-service image..."
docker build -t notification-service:latest .

echo "Restarting deployment..."
kubectl rollout restart deployment/notification-service -n distributed-health

echo "Watching rollout..."
kubectl rollout status deployment/notification-service -n distributed-health