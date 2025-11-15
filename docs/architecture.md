# System Architecture – MCGFinances

## 1. Solution Overview
- **Client**: Responsive SPA built with React + TypeScript, state managed by Redux Toolkit (or RTK Query) and styled via TailwindCSS/Chakra. Communicates exclusively via HTTPS/JSON to the API. Uses service workers for offline receipt capture.
- **API Layer**: Node.js (NestJS or Express) running on Render web service. Provides REST + Webhook endpoints, background job orchestration, and authentication.
- **Data Layer**:
  - **PostgreSQL** on Render for relational data (users, businesses, transactions, reports, audit logs).
  - **Redis** (Render free instance) for caching dashboard aggregates and storing short-lived auth/session data.
  - **Object storage** (Render Static + S3-compatible bucket such as Cloudflare R2) for receipts and documents.
- **Integrations**: Plaid/MX for bank feeds, OCR service (e.g., AWS Textract or OCR.space API), email ingestion via SendGrid Inbound Parse, and optional accounting exports (QuickBooks/Xero APIs).
- **Observability**: Prometheus-compatible metrics (Render dashboard), structured logging (Winston + Logflare), and Sentry for error tracking.

## 2. Modules & Responsibilities
| Module | Responsibilities |
| --- | --- |
| Auth & Access Control | Sign-up/login, MFA, RBAC, organization membership, invitation management. |
| Ingestion Service | External connectors (Plaid, CSV upload, OCR), raw transaction staging tables, normalization. |
| Categorization Engine | Rule management, ML suggestions, bulk updates, reconciliation assistance. |
| Reporting Engine | Aggregations for dashboards, scheduling, PDF/Excel export generation, KPI calculations. |
| Collaboration Suite | Tasks, comments, notifications, document vault. |
| Integrations Gateway | Webhooks, REST clients to accounting suites, API tokens for partners. |

## 3. Deployment Topology
- **Render Services**  
  - `mcgfinances-web` (Vite static hosting).  
  - `mcgfinances-api` (Node runtime) with autoscale disabled initially.  
  - `mcgfinances-db` PostgreSQL.  
  - Optional future: Redis/cache or worker service if background jobs are introduced.
- CI/CD via GitHub Actions pushing to Render using `render.yaml` blueprint.

## 4. Security Considerations
- JWT access tokens + short-lived refresh tokens stored httpOnly; optional hardware-key MFA.  
- Secrets managed with Render Environment Groups.  
- At-rest encryption via managed DB/storage; TLS 1.2+ for all traffic.  
- Audit log table capturing entity, actor, action, timestamp for compliance.  
- DDoS protection with rate limiting (Express middleware) and WAF via Cloudflare.

## 5. Scalability Notes
- Write-heavy ingestion isolated from read-heavy reporting through CQRS-like approach: transactions stored normalized; nightly summary tables for dashboards.  
- Redis/caching can be introduced later for computed KPIs.  
- File uploads handled via signed direct-to-storage uploads to avoid API bottleneck.  
- Event-driven architecture (BullMQ/queues) is optional future work once background jobs are needed.

## 6. Data Model Snapshot
- `users(id, email, password_hash, role, mfa_secret, created_at)`  
- `organizations(id, name, tax_id, fiscal_calendar_start, owner_id)`  
- `organization_users(user_id, organization_id, role, status)`  
- `bank_accounts(id, organization_id, provider, external_id, last_sync_at)`  
- `transactions(id, organization_id, bank_account_id, amount, currency, category_id, memo, transaction_date, status, tax_tags)`  
- `categories(id, organization_id, name, type, parent_id)`  
- `reports(id, organization_id, type, config_json, generated_url, created_by, created_at)`  
- `tasks(id, organization_id, assignee_id, due_date, status, reference_type, reference_id)`  
- `audit_logs(id, organization_id, actor_id, entity_type, entity_id, action, metadata, created_at)`

## 7. External Interfaces
- **REST API**: versioned `/api/v1` endpoints returning JSON; includes rate limits and pagination.  
- **Webhooks**: `POST /webhooks/*` with signature verification (HMAC).  
- **Public SDK**: Lightweight TypeScript SDK automatically generated from OpenAPI spec for partner integrations.

## 8. Dependencies
- Node 20+, PostgreSQL 15, Zod for validation, Prisma ORM, React 18.  
- Testing: Jest, Playwright, Pact.  
- Build tooling: Turborepo for monorepo, PNPM for package management.
