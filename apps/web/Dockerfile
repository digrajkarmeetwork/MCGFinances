FROM node:20-alpine AS base
RUN corepack enable && apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
RUN pnpm install --filter mcgfinances-web...

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps ./apps
COPY tsconfig.base.json ./
COPY apps/web ./apps/web
RUN pnpm --filter mcgfinances-web build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g serve
COPY --from=builder /app/apps/web/dist ./dist
EXPOSE 4173
CMD ["serve", "-s", "dist", "-l", "4173"]
