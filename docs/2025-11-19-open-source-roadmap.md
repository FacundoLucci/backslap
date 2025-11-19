# BackSlap OSS + Cloud Roadmap
_Last updated: 2025-11-19_

## 1. Current State Snapshot
- **Widget**: Single Web Component (`FeedbackWidget`) built with TypeScript + Vite, supports screenshot capture via `html-to-image` and the Screen Capture API fallback.
- **Packaging**: Library build targets ES/UMD with generated `.d.ts` via `vite-plugin-dts`; published entry point is `dist/index.{mjs,js}`.
- **Demo/Test Bed**: `src/main.ts` renders a showcase page but doubles as a manual test harness.
- **Quality**: Vitest is configured but automated tests are sparse; accessibility, regression, and e2e coverage are absent.
- **Docs**: README markets both OSS and hosted variants but there is no architecture, contribution, or deployment guidance.
- **Backend**: No API/Dashboard code exists; hosted offer is aspirational today.

## 2. Gaps Blocking Launch
- **Product completeness**
  - Missing config validation, runtime error surfacing, telemetry, localization, accessibility (focus trapping, ARIA labels).
  - Screenshot code duplicates constants/types; lacks rate limiting or fallback UX.
- **Distribution & DX**
  - No multi-package setup (SDK vs widget), no CDN build, no package version automation, no live playground.
  - Need documented integration examples (React, Next.js, Vue, vanilla, mobile webview).
- **Hosted service**
  - No API for submissions, no auth/multi-tenancy, no storage for screenshots, no dashboards, no integrations.
  - Observability, billing, compliance (GDPR, SOC2 roadmap) and SLA definitions absent.
- **Feedback → Dev workflow**
  - No bridge from feedback events to GitHub issues/PRs or Cursor agents; lacks prioritization/triage pipeline.

## 3. Target Architecture Overview
- **Monorepo structure**
  ```
  /apps/dashboard           – Next.js dashboard (multi-tenant)
  /apps/ingest-api          – Fastify/Express API (REST + Webhooks)
  /packages/widget          – Web Component (current code)
  /packages/sdk-js          – Thin wrapper for frameworks + TS client
  /packages/config-schemas  – Zod schemas shared server/client
  /infra                    – Terraform + Pulumi blueprints
  ```
- **Core flows**
  1. Widget posts `FeedbackData` → Ingest API.
  2. API validates (Zod), enriches (geo, user agent), stores metadata (Postgres) + screenshot (S3/R2).
  3. Event emitted to queue (Kafka/NATS/SQS) → Workers fan-out to: notifications (email/Slack), analytics aggregation, Cursor/GitHub automation.
  4. Dashboard consumes GraphQL/tRPC API for triage, assignment, tagging, insights.
  5. Billing service (Stripe) gates plan limits and issues API keys.

## 4. Hosted Cloud Slice
- **API Gateway**: Fastify + tRPC (TypeScript-first) with API key + OAuth (GitHub/Google) for org onboarding; optional signed upload URLs for screenshots.
- **Data tier**: Postgres (Supabase/RDS) for metadata, S3-compatible object storage for images, Redis for rate limiting + cache.
- **Workers**: Temporal/Queues to process screenshots, run AI summarization, send notifications, sync to integrations.
- **Observability**: ClickHouse/OpenSearch for event analytics, OpenTelemetry traces, SLO dashboards (Grafana).
- **Security & compliance**: Scoped API keys, secrets via Doppler/Vault, encryption at rest (KMS), audit logs, DPA templates.
- **Extensibility**: Webhook subscriptions + Integration connectors (Slack, Linear, Jira, GitHub, Zapier).

## 5. Cursor Background Agent & PR Integration
- **Goal**: Turn high-signal feedback into actionable dev work with minimal human routing.
- **Proposed flow**
  1. Feedback ingested → classify via lightweight LLM service (priority, component, bug vs idea).
  2. Matching rules decide action:
     - `bug` with repo mapping → call GitHub App to open/append issue or PR comment referencing screenshot URL.
     - `feature` → add to product backlog (Linear/Jira) with metadata.
  3. For GitHub issues requiring rapid fixes, emit a Cursor Background Agent job payload (JSON) stored in repo under `.cursor/tasks/{id}.json`.
  4. Background Agent watches bucket/webhook, pulls tasks, spins temporary branches (via Cursor automation) to implement fixes or create reproduction harnesses.
  5. When agent opens PR, attach original feedback context (message, screenshot link, user env) + traceability ID.
- **Minimal MVP**
  - Build webhook service: `/integrations/github/pr-comment`.
  - Provide CLI (`backslap sync --cursor`) that fetches new feedback and writes `.cursor/rules/feedback-{date}.md` instructions so Cursor agent has context during future sessions.

## 6. Implementation Plan (12–16 weeks)
- **Phase 0 – Hardening (2 wks)**
  - Refactor widget (types, accessibility, error states), add unit + screenshot tests, add CI (lint/test/build), publish storybook/playground.
- **Phase 1 – Platform Foundation (4 wks)**
  - Scaffold monorepo, set up Postgres + S3 + Auth (Clerk/Supabase), deliver ingest API + Dashboard auth shell, implement API keys + orgs.
- **Phase 2 – Workflow + Integrations (4 wks)**
  - Deliver Slack/Email + GitHub issue sync, ship analytics MVP (per-page feedback, sentiment), expose public REST/GraphQL endpoints.
- **Phase 3 – Cursor/Automation + Billing (2–3 wks)**
  - Implement Cursor Background Agent bridge + PR comment bots, add Stripe billing, usage metering, rate limits.
- **Phase 4 – Polish & Launch (2–3 wks)**
  - Final docs, security review, pricing rollout, marketing site refresh, seed design partners.

## 7. Launch Readiness Checklist
- OSS: CONTRIBUTING, SECURITY, CODEOWNERS, issue templates, semantic-release, CodeSandbox demo, badges for bundle size.
- SaaS: Status page, incident runbooks, support SLAs, privacy policy, billing terms, onboarding emails, in-app tours.
- GTM: Publish comparison vs Usersnap/BugHerd/Sleekplan, launch blog post, Product Hunt plan, devrel tutorials (Next.js, Shopify, Chrome extension).

## 8. Metrics & Success Criteria
- **Adoption**: npm weekly downloads, unique widgets instantiated, OSS GitHub stars/contribs.
- **Engagement**: Feedback submissions per active widget, screenshot attach rate, triage-to-resolution SLA.
- **Revenue**: Trials started, conversion to paid, ARPA, churn.
- **Automation**: % feedback auto-routed to GitHub/PRs, number of Cursor-generated fixes merged.

## 9. Immediate Next Actions
1. Land widget refactors + accessibility fixes, expand Vitest suite, and publish new minor release.
2. Bootstrap platform monorepo + infra templates; secure staging cloud resources.
3. Prototype ingest API + GitHub issue mirroring, then iterate towards Cursor background agent contract.
