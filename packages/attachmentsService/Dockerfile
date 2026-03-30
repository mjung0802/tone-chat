FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/attachmentsService/package.json packages/attachmentsService/tsconfig.json packages/attachmentsService/
RUN pnpm --filter attachmentsservice install --frozen-lockfile
COPY packages/attachmentsService/src packages/attachmentsService/src
RUN pnpm --filter attachmentsservice build

FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/attachmentsService/package.json packages/attachmentsService/
RUN pnpm --filter attachmentsservice install --frozen-lockfile --prod
COPY --from=builder /app/packages/attachmentsService/dist packages/attachmentsService/dist
WORKDIR /app/packages/attachmentsService
EXPOSE 3003
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
