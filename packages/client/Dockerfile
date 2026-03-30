FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/client/package.json packages/client/
RUN pnpm --filter tone-chat-client install --frozen-lockfile
COPY packages/client/ packages/client/
RUN pnpm --filter tone-chat-client build:web

FROM caddy:2-alpine
COPY --from=builder /app/packages/client/dist /srv/client
