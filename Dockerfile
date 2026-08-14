# syntax=docker/dockerfile:1

FROM node:26-bookworm-slim AS builder

ENV NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:26-bookworm-slim AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    MALLOC_ARENA_MAX=2 \
    PORT=3000 \
    SZERUJ_DATA_DIR=/data

WORKDIR /app

COPY --from=builder --chown=node:node /app/dist/standalone ./

USER node

EXPOSE 3000

HEALTHCHECK --interval=60s --timeout=3s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"]

CMD ["node", "--no-warnings", "--max-old-space-size=128", "--env-file=/run/secrets/szeruj.env", "server.js"]
