# syntax=docker/dockerfile:1

# The web build of the app, served as static files.
#
# In mock mode the whole thing runs in the browser — the IndoMart dataset lives
# in the bundle — so this image needs no backend and no network to be useful.
#
# IMPORTANT: VITE_* values are inlined by Vite at build time, not read at
# runtime. Pointing the image at a real API means rebuilding it with different
# build args; setting them on `docker run` has no effect.

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
# npm ci for a lockfile-exact install; the cache mount keeps rebuilds quick.
RUN --mount=type=cache,target=/root/.npm npm ci

# ---------------------------------------------------------------------------
# Static web build
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Defaults produce a self-contained demo. Override to point at a real backend:
#   docker compose build --build-arg VITE_API_MODE=live \
#                        --build-arg VITE_API_URL=https://api.example.com/api/v1
ARG VITE_API_MODE=mock
ARG VITE_API_URL=http://localhost:3000/api/v1
ARG VITE_API_TIMEOUT_MS=15000
ARG VITE_MOCK_LATENCY_MS=220

ENV VITE_API_MODE=${VITE_API_MODE} \
    VITE_API_URL=${VITE_API_URL} \
    VITE_API_TIMEOUT_MS=${VITE_API_TIMEOUT_MS} \
    VITE_MOCK_LATENCY_MS=${VITE_MOCK_LATENCY_MS} \
    CI=1

RUN npm run build

# ---------------------------------------------------------------------------
# Runtime
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]