FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.29.2 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/client/package.json packages/client/
RUN pnpm --filter tone-chat-client install --frozen-lockfile
COPY packages/client/index.ts packages/client/
COPY packages/client/app packages/client/app
COPY packages/client/src packages/client/src
COPY packages/client/assets packages/client/assets
COPY packages/client/app.json packages/client/babel.config.js packages/client/tsconfig.json packages/client/metro.config.js packages/client/
RUN pnpm --filter tone-chat-client build:web

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/packages/client/dist /srv/client
