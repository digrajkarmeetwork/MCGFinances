# MCGFinances

Early scaffolding for the MCGFinances platform. This repository uses a PNPM workspace with Vite/React for the web client, Express for the API, and a BullMQ-based worker. Documentation lives under `docs/`.

## Requirements
- Node.js 18+
- PNPM 9+
- Docker (for local containers and CI builds)

## Getting Started
```bash
pnpm install
pnpm dev:api # starts Express API on port 4000
pnpm --filter mcgfinances-web dev # starts Vite dev server
pnpm dev:worker # runs the background worker
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
