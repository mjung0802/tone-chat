FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.29.2 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/logger/package.json packages/logger/tsconfig.json packages/logger/tsconfig.build.json packages/logger/
COPY packages/attachmentsService/package.json packages/attachmentsService/tsconfig.json packages/attachmentsService/tsconfig.build.json packages/attachmentsService/
RUN pnpm --filter attachmentsservice install --frozen-lockfile
COPY test-types.d.ts ./
COPY packages/logger/src packages/logger/src
RUN pnpm --filter tone-chat-logger build
COPY packages/attachmentsService/src packages/attachmentsService/src
RUN pnpm --filter attachmentsservice build && \
    mkdir -p packages/attachmentsService/dist/db/migrations && \
    cp packages/attachmentsService/src/db/migrations/*.sql packages/attachmentsService/dist/db/migrations/

FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@10.29.2 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/logger/package.json packages/logger/
COPY packages/attachmentsService/package.json packages/attachmentsService/
RUN pnpm --filter attachmentsservice install --frozen-lockfile --prod
COPY --from=builder /app/packages/logger/dist packages/logger/dist
COPY --from=builder /app/packages/attachmentsService/dist packages/attachmentsService/dist
WORKDIR /app/packages/attachmentsService
USER node
EXPOSE 3003
CMD ["sh", "-c", "node dist/db/migrate.js && exec node dist/index.js"]
