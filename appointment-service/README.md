# AI GENERATED README. UPDATE DOCKER AND K8 RELATED DETAILS LATER - Amzal


# appointment-service

Handles booking, rescheduling, and cancellation of appointments between patients and doctors.

**Port:** 3004 | **Database:** MongoDB (`appointment_db`) | **Framework:** NestJS

## Running locally

```bash
npm install
cp .env.example .env   # fill in MONGODB_URI with your Atlas connection string
npm run start:dev
```

## Docker — standalone

```bash
docker build -t appointment-service:v1 .
docker run -p 3004:3004 --env-file .env appointment-service:v1
```

> The image is **orchestration-agnostic** — the same image is consumed by both
> Docker Compose (dev) and Kubernetes (prod) without any modification.
> The `PORT` variable and all secrets are injected at runtime by the orchestrator.

## Docker Compose (development)

Docker Compose configuration lives in the **separate** `clinical-infra` repository.
Clone that repo and follow its README to spin up the full multi-service stack locally.

```bash
# In clinical-infra repo:
docker compose up appointment-service
```

## Kubernetes (production)

K8s `Deployment`, `Service`, and `ConfigMap` / `Secret` manifests also live in
the `clinical-infra` repository. Deploy using:

```bash
# In clinical-infra repo:
kubectl apply -f k8s/appointment-service/
```

Secrets (e.g. `MONGODB_URI`) must be stored in a K8s `Secret` — never in the image or ConfigMap.

## Architecture notes

This service follows **Domain-Driven Design (DDD)** with strict layer isolation:

```
src/appointment/
├── domain/          # Pure TypeScript — zero NestJS/Mongoose imports
├── application/     # Orchestrators + DTOs — no Mongoose imports
├── infrastructure/  # Mongoose schemas & repositories — only layer touching MongoDB
└── presentation/    # HTTP controllers + Clerk auth guard
```

This service is **completely self-contained**. It shares no source files with any other
service in the `clinical-services` monorepo. The monorepo exists solely as a developer
convenience container.
