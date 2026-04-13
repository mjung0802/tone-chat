FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.29.2 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/logger/package.json packages/logger/tsconfig.json packages/logger/tsconfig.build.json packages/logger/
COPY packages/server/package.json packages/server/tsconfig.json packages/server/tsconfig.build.json packages/server/
RUN pnpm --filter tone-chat-server install --frozen-lockfile
COPY test-types.d.ts ./
COPY packages/logger/src packages/logger/src
RUN pnpm --filter tone-chat-logger build
COPY packages/server/src packages/server/src
RUN pnpm --filter tone-chat-server build

FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@10.29.2 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/logger/package.json packages/logger/
COPY packages/server/package.json packages/server/
RUN pnpm --filter tone-chat-server install --frozen-lockfile --prod
COPY --from=builder /app/packages/logger/dist packages/logger/dist
COPY --from=builder /app/packages/server/dist packages/server/dist
WORKDIR /app/packages/server
USER node
EXPOSE 4000
CMD ["node", "dist/index.js"]
