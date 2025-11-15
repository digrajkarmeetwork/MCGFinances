# Testing & QA Strategy – MCGFinances

## 1. Goals
- Ensure financial calculations and data integrity are correct and auditable.
- Prevent regressions in ingestion, categorization, reporting, and collaboration features.
- Validate compliance requirements (security, access control, audit logging).

## 2. Testing Pyramid
| Layer | Scope | Tooling | Notes |
| --- | --- | --- | --- |
| Unit | Pure functions (calculations, validators, reducers) | Jest + ts-jest | Mock Plaid/Redis/DB as needed. |
| Integration | API endpoints, Prisma DB, queue interactions | Jest + Supertest, Testcontainers | Spin up Postgres/Redis locally via docker-compose. |
| Contract | External APIs (Plaid, QuickBooks) | Pact | Mock provider states, run in CI nightly. |
| E2E/UI | User flows (onboarding, categorization, reporting exports) | Playwright | Run on CI w/ seeded DB snapshot. |
| Performance | Load tests for ingestion/reporting | k6 | Trigger via GitHub Actions manual workflow. |
| Security | SAST, dependency scanning, auth tests | GitHub Advanced Security, OWASP ZAP | Schedule monthly dynamic scans. |

## 3. Test Data Management
- Use Prisma seed script to create demo organizations, accounts, transactions.  
- Snapshot DB state before E2E suites; restore after tests to keep deterministic.  
- Synthetic CSVs/receipts stored under `fixtures/`.

## 4. Automation & CI
- GitHub Actions workflow: `lint → unit → integration → e2e (docker) → build`.  
- Parallelize suites using matrix strategy to keep runtime <10 min.  
- Cache PNPM store + Playwright browsers for speed.  
- Upload coverage reports to Codecov; enforce thresholds (80% statements, 90% for finance calculators).

## 5. Manual QA
- Exploratory testing each sprint focusing on new features and edge cases (multi-entity switching, offline receipt upload).  
- Accessibility audits with axe DevTools + manual keyboard testing.  
- Regression checklist for release candidates covering authentication, ingestion, dashboards, reporting, collaboration.

## 6. Monitoring & Post-Release
- Synthetic transactions pushed hourly to verify ingestion pipeline.  
- Alerting thresholds for failed bank sync jobs, report generation errors, and latency spikes.  
- Capture user feedback via in-app widget; triage for hotfix vs backlog.

## 7. Environments
- **Local**: dev containers or docker-compose stack.  
- **Staging**: Render free service mirroring production config with Feature Flags toggled.  
- **Production**: Render paid upgrade optional once scale requires; includes read replicas if needed.
