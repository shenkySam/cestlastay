# syntax=docker/dockerfile:1
# ----------------------------------------------------------------------------
# Hotel-Manager API (NestJS) — built from the pnpm workspace ROOT.
# The build context must be the workspace root (Hotel-Manager/), because the
# API depends on packages/shared via `workspace:*`. On Railway: set the service
# Root Directory = "Hotel-Manager" so this Dockerfile (apps/api/Dockerfile) and
# railway.json are found and the context is the whole workspace.
# ----------------------------------------------------------------------------
FROM node:20-slim AS base

# Prisma needs OpenSSL (query engine) + CA certs, both at generate and runtime.
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH"
RUN corepack enable

WORKDIR /app

# 1) Install deps first, keyed only on manifests for good layer caching.
#    All workspace package.json files must be present for a frozen install.
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json         apps/api/
COPY apps/web/package.json         apps/web/
COPY apps/guest/package.json       apps/guest/
RUN pnpm install --frozen-lockfile

# 2) Copy sources and build. .dockerignore keeps node_modules/dist out so the
#    image uses the freshly-installed deps.
COPY . .
RUN pnpm --filter @hms/api exec prisma generate
# Turbo builds @hms/shared first (dependsOn ^build), then @hms/api.
RUN pnpm exec turbo run build --filter=@hms/api

ENV NODE_ENV=production
# Railway injects PORT; main.ts reads process.env.PORT (defaults to 3000 locally).
EXPOSE 3000

# Apply any pending migrations, then start the verified entrypoint.
CMD ["sh", "-c", "pnpm --filter @hms/api exec prisma migrate deploy && node apps/api/dist/src/main.js"]
