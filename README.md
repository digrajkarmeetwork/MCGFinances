# MCGFinances

Early scaffolding for the MCGFinances platform. This repository uses a PNPM workspace with Vite/React for the web client and Express/Prisma for the API. Documentation lives under `docs/`.

## Requirements
- Node.js 20+ (Vite dev server requires >=20.19)
- PNPM 9+
- Docker (optional, for local containers and CI builds)

## Getting Started
Create a `.env` from `.env.example` and ensure `VITE_API_URL` points at your API host (`http://localhost:4000` for local dev). Run Prisma migrations once the database URL is configured:

```bash
pnpm --filter mcgfinances-api prisma migrate deploy
```

```bash
pnpm install
pnpm dev:api         # starts Express API on port 4000
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
Render services can be created using `render.yaml`. The GitHub Action builds and tests the app then verifies Docker images so Render can pull straight from the repo. Deploy the API (Docker) and Postgres services, then set the static web service `VITE_API_URL` to your deployed API host (e.g., `https://mcgfinances-api.onrender.com`) so login, summary, and org-specific data stay functional.
