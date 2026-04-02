#!/bin/bash
set -e  # stop immediately if any command fails
set -x

echo "Pointing Docker to minikube..."
eval $(minikube docker-env)

echo "Building doctor-service image..."
docker build -t doctor-service:latest .

echo "Restarting deployment..."
kubectl rollout restart deployment/doctor-service -n distributed-health

echo "Watching rollout..."
kubectl rollout status deployment/doctor-service -n distributed-health
