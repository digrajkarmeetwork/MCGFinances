FROM node:20-alpine AS base
RUN corepack enable && apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/
RUN pnpm install --filter mcgfinances-api...

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps ./apps
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
RUN pnpm --filter mcgfinances-api build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY apps/api/package.json ./package.json
EXPOSE 4000
CMD ["node", "dist/index.js"]
