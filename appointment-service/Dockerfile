# Stage 1: Dependencies
# Cached separately so dependency resolution is reused across source-only changes.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --omit=dev

# Stage 3: Production
# Orchestration-agnostic image: runtime config comes from env (Docker/K8s).
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
EXPOSE 3004
USER node
CMD ["node", "dist/main.js"]
