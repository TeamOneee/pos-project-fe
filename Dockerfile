# syntax=docker/dockerfile:1

# The web build of the app, served as static files.
#
# In mock mode the whole thing runs in the browser — the IndoMart dataset lives
# in the bundle — so this image needs no backend and no network to be useful.
#
# IMPORTANT: EXPO_PUBLIC_* values are inlined by Metro at build time, not read
# at runtime. Pointing the image at a real API means rebuilding it with
# different build args; setting them on `docker run` has no effect. See the
# `api` build stage below and the README.

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------
# Debian rather than Alpine: the Expo export pipeline pulls in sharp for image
# processing, and its prebuilt binaries expect glibc.
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
#   docker compose build --build-arg EXPO_PUBLIC_API_MODE=live \
#                        --build-arg EXPO_PUBLIC_API_URL=https://api.example.com/api/v1
ARG EXPO_PUBLIC_API_MODE=mock
ARG EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
ARG EXPO_PUBLIC_API_TIMEOUT_MS=15000
ARG EXPO_PUBLIC_MOCK_LATENCY_MS=220

ENV EXPO_PUBLIC_API_MODE=${EXPO_PUBLIC_API_MODE} \
    EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL} \
    EXPO_PUBLIC_API_TIMEOUT_MS=${EXPO_PUBLIC_API_TIMEOUT_MS} \
    EXPO_PUBLIC_MOCK_LATENCY_MS=${EXPO_PUBLIC_MOCK_LATENCY_MS} \
    CI=1 \
    EXPO_NO_TELEMETRY=1

RUN npx expo export -p web --output-dir dist

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
