# MCGFinances

Early scaffolding for the MCGFinances platform. This repository uses a PNPM workspace with Vite/React for the web client, Express for the API, and a BullMQ-based worker. Documentation lives under `docs/`.

## Requirements
- Node.js 20+ (Vite dev server requires >=20.19)
- PNPM 9+
- Redis 7+ (via Docker, Render, or `brew services start redis` for the worker)
- Docker (optional, for local containers and CI builds)

## Getting Started
Create a `.env` from `.env.example` and ensure `VITE_API_URL` points at your API host (`http://localhost:4000` for local dev).

```bash
pnpm install
pnpm dev:api         # starts Express API on port 4000
pnpm dev:worker      # BullMQ worker (requires Redis running locally)
pnpm --filter mcgfinances-web dev -- --host 0.0.0.0
```

Use the provided `docker-compose.yml` for a full stack with Postgres + Redis:
```bash
docker compose up --build
```

## Testing & Linting
```bash
pnpm lint
pnpm test
```

## Deployment
Render services can be created using `render.yaml`. The GitHub Action builds and tests the app then verifies Docker images so Render can pull straight from the repo.
