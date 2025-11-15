# Deployment Guide – MCGFinances (Render Free Tier)

## 1. Prerequisites
- Render account connected to GitHub.
- Git repo containing Turborepo structure (`apps/web`, `apps/api`, `apps/worker`) and `render.yaml`.
- Environment variables defined in `.env.example` (PLAID keys, JWT secrets, DB URLs, etc.).
- Docker + PNPM installed locally for building/testing before push.

## 2. Local Verification
1. `pnpm install`  
2. `pnpm lint && pnpm test && pnpm build` (ensures monorepo builds).  
3. `docker-compose up` (optional) to mimic Postgres/Redis.  
4. Confirm `.env` matches Render secrets; never commit secrets.

## 3. Render Blueprint (`render.yaml`)
```yaml
services:
  - type: web
    name: mcgfinances-web
    env: static
    buildCommand: pnpm install --filter web... && pnpm --filter web build
    staticPublishPath: apps/web/dist
    headers:
      - path: /*
        name: Content-Security-Policy
        value: "default-src 'self'; connect-src 'self' https://api.mcgfinances.com; img-src 'self' data:;"
  - type: web
    name: mcgfinances-api
    env: node
    plan: free
    buildCommand: pnpm install && pnpm --filter api build
    startCommand: pnpm --filter api start
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: mcgfinances-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: mcgfinances-redis
  - type: worker
    name: mcgfinances-worker
    env: node
    plan: free
    buildCommand: pnpm install && pnpm --filter worker build
    startCommand: pnpm --filter worker start
databases:
  - name: mcgfinances-db
    plan: free
redis:
  - name: mcgfinances-redis
    plan: free
```

## 4. Deployment Steps
1. **Push to main** – Render auto-detects changes and triggers builds for each service defined in blueprint.  
2. **Migrations** – Use Render deploy hook or GitHub Action to run `pnpm --filter api prisma migrate deploy` against `mcgfinances-db`.  
3. **Seed Data** (optional staging) – `pnpm --filter api prisma db seed`.  
4. **Smoke Test** – Hit `/healthz` endpoint on API and load SPA to confirm assets served; run Playwright smoke suite pointing at Render URLs.  
5. **Promote** – Once staging validated, merge into production branch (or use Render environments) to deploy live.

## 5. Render Secrets Management
- Group secrets using Environment Groups (e.g., `MCGFINANCES-PROD`).  
- Keys needed: `JWT_SECRET`, `REFRESH_SECRET`, `PLAID_CLIENT_ID`, `PLAID_SECRET`, `OCR_API_KEY`, `SENDGRID_API_KEY`, `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`.  
- For free tier, rotate secrets manually every quarter or when leaks suspected.

## 6. Rollback Procedure
- Use Render dashboard “Re-deploy last successful build” within each service.  
- Keep migrations backward compatible; for critical issues, restore Postgres snapshot (Render daily backup).  
- Re-run smoke tests post-rollback.

## 7. Monitoring & Logs
- Enable Render metrics; set alerts on CPU/memory >80% or response time >1s.  
- Stream logs to Logflare/Sematext for structured logging and retention beyond 30 days.  
- Configure Sentry DSN in environment variables for real-time error notifications.

## 8. Cost Awareness (Free Tier)
- Free tier limits: 750 build minutes/month, 512 MB RAM per service.  
- Use `pnpm --filter` to limit dependencies per service and keep builds under 15 min.  
- Schedule nightly worker downtime if approaching free usage cap.
