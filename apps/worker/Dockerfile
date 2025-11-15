FROM node:20-alpine AS base
RUN corepack enable && apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json apps/worker/tsconfig.json ./apps/worker/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --filter mcgfinances-worker...

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps ./apps
COPY tsconfig.base.json ./
COPY apps/worker ./apps/worker
RUN pnpm --filter mcgfinances-worker build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker/dist ./dist
COPY apps/worker/package.json ./package.json
CMD ["node", "dist/index.js"]
