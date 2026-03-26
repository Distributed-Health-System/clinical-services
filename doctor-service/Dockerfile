# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
# The image produced here is orchestration-agnostic.
# Use it with Docker Compose (environment: PORT=3003) or inject PORT via a
# K8s ConfigMap / env: block in the pod spec — no image changes required.
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3003
CMD ["node", "dist/main.js"]
