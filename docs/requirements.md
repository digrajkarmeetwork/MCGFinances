# MCGFinances Requirements

## 1. Vision & Objectives
- Deliver a modern web platform that lets small-business owners monitor income, expenses, cash flow, and profitability in real time.
- Replace spreadsheets by automating transaction ingestion, categorization, reporting, and compliance tasks.
- Provide actionable insights and alerts so owners can make better financial decisions without needing a full-time accountant.

## 2. Target Users & Personas
- **Owner-Operators** – Need an at-a-glance view of revenue, expenses, and runway.
- **Bookkeepers / Accountants** – Require clean data exports, audit trails, and collaboration tools.
- **Advisors / Mentors** – Want summarized KPIs to advise clients quickly.

## 3. Functional Requirements
### 3.1 Account & Workspace Management
- Secure onboarding with email + MFA and role-based permissions (owner, accountant, advisor).
- Company profiles capturing business details, tax IDs, fiscal calendars, and connected bank accounts.
- Multi-business workspace toggle for agencies handling several clients.

### 3.2 Financial Data Ingestion
- Bank/feed integrations (Plaid, MX, CSV upload) with nightly sync and manual refresh.
- Expense receipt capture via mobile upload and email forwarding with OCR.
- Invoices and bills import from QuickBooks, Xero, and Shopify.

### 3.3 Transaction Processing
- Automatic categorization using rules engine + ML suggestions, with bulk edit workflows.
- Split transactions, recurring expense templates, and tax tagging (deductible, non-deductible, sales tax).
- Reconciliation workflow: suggested matches, approval queue, and reconciliation history.

### 3.4 Dashboards & Analytics
- Real-time cash dashboard: cash on hand, burn rate, runway, top expenses, receivables/payables aging.
- Customizable KPI widgets (gross margin, EBITDA, AR/AP turnover, break-even).
- Scenario modeling and budget vs. actual comparisons with drill-down to underlying transactions.

### 3.5 Reporting Suite
- Ready-made financial statements: P&L, Balance Sheet, Cash Flow, and Sales Tax reports.
- Expense and revenue reports filtered by project, department, or location.
- Export to PDF, Excel, and shareable links with permission controls.

### 3.6 Compliance & Audit Trail
- Automated audit log of edits, approvals, and user actions.
- Document vault for receipts, contracts, and tax forms with expiration reminders.
- Sales tax tracking per jurisdiction and estimated quarterly tax calculators.

### 3.7 Collaboration & Guidance
- Task assignments with due dates (e.g., “Upload receipts for March”).
- In-app chat/comments pinned to transactions or reports.
- AI-guided insights: anomaly detection (unusual spend), cash shortfall alerts, KPI explanations.

### 3.8 Integrations & Extensibility
- Webhooks and REST API for pushing data into payroll, CRM, or BI tools.
- Pre-built Zapier templates and accountant tools (export to tax software).
- Marketplace structure for future partner add-ons (payroll, lending, insurance).

## 4. Non-Functional Requirements
- Availability target 99.9% with regional data residency options.
- SOC 2 Type II controls, encryption in transit/at rest, and regular penetration testing.
- Responsive UI, sub-2-second load times for dashboards, and offline-friendly mobile app.
- Accessible design (WCAG 2.1 AA) including keyboard navigation and screen reader support.

## 5. Success Metrics
- Onboard 100 paying businesses within six months of launch.
- Reduce manual bookkeeping time for customers by 40%.
- Achieve >85 Net Promoter Score from owner-operator persona.

## 6. Roadmap (High-Level)
1. **MVP (0-3 months)** – Authentication, bank sync, transaction categorization, core dashboards, PDF exports.
2. **Growth (3-6 months)** – AI insights, budgeting, collaboration tools, integrations with accounting suites.
3. **Scale (6-12 months)** – Marketplace, advanced compliance modules, multi-entity consolidations.

## 7. Risks & Mitigations
- **Bank feed dependency** – Partner with multiple aggregators and provide CSV fallback.
- **Data accuracy** – Combine rules-based checks with human review queue and audit logs.
- **Adoption friction** – Guided onboarding checklists, in-app tutoring, and live support channels.

## 8. Open Questions
- Which geographic markets to prioritize (affects tax/compliance features)?
- Should pricing tier by number of accounts, collaborators, or transaction volume?
- Is a native mobile app required at launch or can PWA suffice?
