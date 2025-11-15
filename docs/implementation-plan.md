# Implementation Plan – MCGFinances

## Phase 0 – Project Setup (Week 0-1)
- Initialize GitHub repo + Turborepo structure (`apps/web`, `apps/api`, `apps/worker`, `packages/ui`, `packages/config`).
- Configure linting/formatting (ESLint, Prettier), TypeScript project references, Husky pre-commit hooks.
- Create base CI pipeline (GitHub Actions) with lint/test/build jobs; add `render.yaml`.
- Provision Render services (DB, Redis, S3 bucket) and seed environment variables locally via `.env.example`.

## Phase 1 – Core Foundations (Week 1-4)
1. **Auth & Users**
   - Implement NestJS auth module (JWT access/refresh, MFA scaffolding).  
   - Build onboarding UI flow; add organization creation/invite logic.
2. **Data Layer**
   - Define Prisma schema for core tables. Run migrations on Render PostgreSQL and local Docker.  
   - Implement Seed script for demo data.
3. **Bank & Receipt Ingestion**
   - Integrate Plaid sandbox; build OAuth handshake screen.  
   - CSV upload endpoint + UI with validation; store receipts in S3 via signed URLs.

## Phase 2 – Transaction Management (Week 4-7)
- Categorization rule engine (priority-based rules + fallback suggestions).  
- Bulk edit UI, splits, recurring transactions, tax tags.  
- Reconciliation workflow with match suggestions and approval queue.  
- Introduce worker queue for nightly bank sync + ML inference tasks.

## Phase 3 – Dashboards & Reporting (Week 7-10)
- Implement cash dashboard API endpoints (burn, runway, top expenses).  
- Build KPI widget library with customizable layout.  
- Reporting service for P&L, Balance Sheet, Cash Flow; PDF/Excel export using `puppeteer`.  
- Scenario modeling module (budget vs actual) storing versioned plans.

## Phase 4 – Collaboration & Insights (Week 10-12)
- Task management (assignments, due dates, status updates).  
- Inline comments on transactions/reports, notifications (email + in-app).  
- AI insights service hooking into worker pipeline for anomaly detection and cash alerts.

## Phase 5 – Hardening & Launch Prep (Week 12-14)
- Security review: pen-test, dependency audit, rate limiting, content security policy.  
- Performance tuning: DB indexes, Redis caching, load tests (k6).  
- Comprehensive QA, regression suite, and UAT with pilot businesses.  
- Documentation: user guides, API reference, on-call runbooks.

## Milestones & Deliverables
- **Milestone A (Week 4)**: Auth, organizations, Plaid sandbox ingestion, baseline dashboard.  
- **Milestone B (Week 8)**: Full transaction lifecycle + reporting exports.  
- **Milestone C (Week 12)**: Collaboration + AI alerts + polished UI.  
- **Milestone D (Week 14)**: Production-ready deployment on Render free tier, onboarding beta customers.

## Resource Plan
- 1 Product Manager, 2 Full-stack engineers, 1 Frontend specialist, 1 Backend/DevOps, 1 UX designer, 1 QA.  
- Weekly demos + retros; backlog managed in Linear/Jira with dual-track discovery.

## Success Gates
- Beta users complete onboarding without support hand-holding.  
- Transaction import accuracy >98% (manual corrections tracked).  
- Dashboard loads under 2 seconds with 50k transactions dataset.  
- Render free tier cost monitored (<$50/mo).
