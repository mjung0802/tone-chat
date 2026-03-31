FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.29.2 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json test-types.d.ts ./
COPY packages/usersService/package.json packages/usersService/tsconfig.json packages/usersService/
RUN pnpm --filter usersservice install --frozen-lockfile
COPY packages/usersService/src packages/usersService/src
RUN pnpm --filter usersservice build
RUN mkdir -p packages/usersService/dist/db/migrations && \
    cp packages/usersService/src/db/migrations/*.sql packages/usersService/dist/db/migrations/

FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@10.29.2 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/usersService/package.json packages/usersService/
RUN pnpm --filter usersservice install --frozen-lockfile --prod
COPY --from=builder /app/packages/usersService/dist packages/usersService/dist
WORKDIR /app/packages/usersService
USER node
EXPOSE 3002
CMD ["sh", "-c", "node dist/db/migrate.js && exec node dist/index.js"]
