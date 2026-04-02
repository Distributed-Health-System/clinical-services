#!/bin/bash
set -e  # stop immediately if any command fails
set -x

echo "Pointing Docker to minikube..."
eval $(minikube docker-env)

echo "Building patient-service image..."
docker build -t patient-service:latest .

echo "Restarting deployment..."
kubectl rollout restart deployment/patient-service -n distributed-health

echo "Watching rollout..."
kubectl rollout status deployment/patient-service -n distributed-health
