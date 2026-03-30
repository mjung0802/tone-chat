FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/usersService/package.json packages/usersService/tsconfig.json packages/usersService/
RUN pnpm --filter usersservice install --frozen-lockfile
COPY packages/usersService/src packages/usersService/src
RUN pnpm --filter usersservice build

FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/usersService/package.json packages/usersService/
RUN pnpm --filter usersservice install --frozen-lockfile --prod
COPY --from=builder /app/packages/usersService/dist packages/usersService/dist
WORKDIR /app/packages/usersService
EXPOSE 3002
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
