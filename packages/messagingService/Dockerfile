FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.29.2 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/messagingService/package.json packages/messagingService/tsconfig.json packages/messagingService/tsconfig.build.json packages/messagingService/
RUN pnpm --filter messagingservice install --frozen-lockfile
COPY test-types.d.ts ./
COPY packages/messagingService/src packages/messagingService/src
RUN pnpm --filter messagingservice build

FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@10.29.2 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/messagingService/package.json packages/messagingService/
RUN pnpm --filter messagingservice install --frozen-lockfile --prod
COPY --from=builder /app/packages/messagingService/dist packages/messagingService/dist
WORKDIR /app/packages/messagingService
USER node
EXPOSE 3001
CMD ["node", "dist/index.js"]
