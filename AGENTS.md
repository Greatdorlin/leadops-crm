# Leads Desk Agent Guide

This repository is in transition from an inherited FlyConnect / Pathway Finder codebase to a commercial private lead operations product called Leads Desk.

Treat the old FlyConnect, Pathway Finder, travel, study, visa, and relocation code as inherited reference material, not as the product definition.

## Product Identity

- Commercial product name: `Leads Desk`
- Do not use these names for the commercial product:
  - `FlyConnect`
  - `Fly Connect`
  - `Pathway Finder`
  - `LeadOps`
  - `FunnelDesk`
- Product promise: `Every lead, from every source, captured, assigned, followed up, customized, and reported in one private system.`

## Business Context

Leads Desk is a productized private lead management offer, not generic contract development.

Rules:

- do not sell raw code
- do not frame the work as generic CRM development
- do not treat the repo like a dashboard experiment
- package the value as a branded business system clients can buy and use
- do not expose inherited FlyConnect logic, assets, copy, or internal language to customers

## Current Repo Reality

The release runtime is Leads Desk. Inherited product routes, customer-facing branding, and travel/study behavior are outside the active product boundary.

Compatibility material remains where it is required for safe upgrades:

- historical Drizzle migrations and snapshots preserve the original database lineage
- the release migration archives retired fields before removing them
- source-label normalization still recognizes old stored values
- `NeonLeadStore` remains a transitional internal class name, while runtime database access uses the provider-neutral `DATABASE_URL` contract

Important:

- Do not reintroduce inherited product behavior into active routes.
- Do not remove compatibility migrations or mappings without proving upgrades from an existing database.
- Treat customer-facing legacy terminology as a release defect.
- Keep new storage, auth, and deployment work provider-neutral.

## Read First

Before making non-trivial changes, read:

- `AGENTS.md`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/INFRASTRUCTURE_STRATEGY.md`
- `docs/MIGRATIONS_AND_CONNECTORS.md`
- `docs/CUSTOMIZATION_ARCHITECTURE.md`
- `docs/VERTICAL_PRESETS.md`
- `docs/UI_CUSTOMIZATION_STANDARD.md`
- `docs/SECURITY_AND_PERMISSIONS.md`
- `docs/DEPLOYMENT_BUCKETS.md`
- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `.env.example`
- `src/lib/db/schema.ts`
- `src/lib/db/env.ts`
- `src/lib/db/client.ts`
- `src/lib/auth.ts`
- `src/lib/admin.ts`
- `src/lib/admin-access.ts`
- `src/lib/storage/index.ts`

If the task touches a reused legacy area, also inspect the relevant inherited files before editing them.

Git history is the reference for retired migration phases. Do not reintroduce old product documents into the release tree.

## Core Working Rules

- Quality and system stability matter more than speed.
- Do not break the current build while laying the new foundation.
- Do not do a greenfield rewrite unless the user explicitly asks for one.
- Do not ship partial migrations that leave the repo half-old-product and half-new-product without clear boundaries.
- Preserve existing behavior unless the task explicitly changes it.
- Prefer small, well-scoped, system-aware changes over broad speculative rewrites.
- Reuse good infrastructure, utilities, and patterns where they fit the new product.
- Replace old product assumptions deliberately, not cosmetically.

## Naming And Copy Rules

For new commercial docs, UI copy, architecture, and code comments:

- Use `Leads Desk`.
- Use `lead`, `owner`, `follow-up`, `team`, `branch`, `department`, `report`, and `settings`.
- Keep language plain, short, and business-facing.

Do not introduce or preserve in new customer-facing work:

- travel/study/visa/relocation terminology
- assessment/pathway/advisor wording
- FlyConnect-specific branding
- old support emails or domain references
- internal implementation jargon on product pages

Legacy files may still contain old names until they are deliberately migrated. Document them when found. Do not normalize them away silently.

## Architecture Guardrails

Leads Desk is:

- a private lead operations system
- single-tenant per client deployment
- one client app instance per deployment
- one client database per deployment
- customizable without custom code forks for normal client variation

Leads Desk is not, in the current phase:

- full SaaS multi-tenancy
- a per-user subscription CRM clone
- an integration-first product
- an AI product
- a travel assessment app

## Deployment Guardrails

The app must remain:

- Docker-ready
- Vercel-compatible
- provider-neutral
- Postgres-backed through `DATABASE_URL`
- deployable on a VPS or managed cloud

For new code:

- use `DATABASE_URL`
- do not introduce new `NEON_*` or `PATHWAYFINDER_*` env names
- do not hardcode Vercel, Neon, DigitalOcean, or any hosting provider
- do not assume one deployment style for every client

Inherited compatibility fallbacks may remain temporarily during migration, but new platform work must target the neutral contract documented in `docs/INFRASTRUCTURE_STRATEGY.md`.

## Auth And Access Rules

Default auth direction:

- Next.js App Router
- Auth.js / NextAuth
- Google OAuth first
- verified email checks
- optional allowed-domain restriction
- Postgres-backed user record
- server-enforced roles and scopes

Do not:

- rely on frontend-only permission hiding
- hardcode personal admin emails as product behavior
- weaken auth to bypass stale account/session problems
- make password auth the default

If password auth is added later, it must be optional and off by default.

## Security Rules

- Google OAuth is the default authentication path.
- Backend APIs must enforce permissions.
- Do not rely on frontend hiding for security.
- No hardcoded personal emails, company-specific backdoors, or silent bypass rules.
- Keep secrets, API keys, allowlists, and database credentials out of client code.
- Log important access, export, customization, and user-management events through audit logs.
- Keep technical settings under an `Advanced` area when surfaced in product UI.

## Data Model Direction

Leads Desk must support:

- users
- teams
- branches
- departments
- leads
- lead tasks
- notes
- lead events
- audit logs
- custom fields
- theme settings
- dashboard layouts and widgets
- lead stages
- lead sources

Rules:

- keep core lead fields as real database columns
- use custom-field tables for client-specific extensions
- archive instead of hard delete for customization entities
- enforce scoped access on the backend
- design for large lead volumes and filtered server-side access

Any change that adds or changes stored data must be checked across:

`Input -> Storage -> Processing -> Display -> Summary -> Export`

## Performance Rules

- Design for 1 to 1,000+ users and 1 to 1,000,000+ leads over time.
- Use server-side filtering.
- Prefer cursor pagination where practical.
- Avoid offset-only patterns as the default for large operational lists.
- Keep core lead fields as real columns.
- Use custom-field tables for extensions, not one giant metadata blob.
- Keep export and reporting flows background-job-friendly for future scale.
- Add indexes deliberately for ownership, scope, status, timestamps, and task due dates.

## Customization Rules

Customization must be controlled, safe, and database-backed.

Allowed customization directions:

- company branding
- appearance tokens
- dashboard widgets and layouts
- lead stages
- lead sources
- role labels
- entity labels
- custom fields
- preset-driven defaults

Do not:

- require code changes for normal client-level field or stage changes
- hard delete fields, stages, or sources by default
- let one client customization mutate the product architecture globally
- turn customization into arbitrary code injection

See `docs/CUSTOMIZATION_ARCHITECTURE.md` and `docs/VERTICAL_PRESETS.md`.

## UI Rules

The current admin UI is the commercial Leads Desk interface and must remain release-grade.

The target Leads Desk UI must be:

- modern
- calm
- premium
- fast
- action-oriented
- easy to demo
- easy for nontechnical users

The UI must not depend on long explanations to make sense.

Follow `docs/UI_CUSTOMIZATION_STANDARD.md` for:

- copy limits
- layout rules
- dashboard rules
- table rules
- form rules
- settings rules
- liquid glass usage
- responsive behavior
- banned patterns

## MVP Scope Guardrails

Build now or next:

- dashboard
- leads list
- lead detail
- notes
- tasks
- reports
- export data
- settings
- appearance customization foundation
- dashboard customization foundation
- lead fields customization foundation
- lead stages customization foundation
- lead sources customization foundation
- audit logging foundation

Do not build yet unless explicitly requested:

- full SaaS multi-tenancy
- billing
- native Meta/TikTok/LinkedIn core integrations
- WhatsApp automation core dependency
- Telegram core dependency
- AI features
- mobile app
- full workflow builder
- full drag-and-drop builder

## Migration Rules

When migrating legacy code:

- identify whether the file is reusable, transitional, or destined for removal
- document risky inherited assumptions before editing
- separate brand rename work from domain-logic replacement when possible
- avoid mixing new product architecture with old assessment behavior in the same change unless required
- keep legacy public flows working until replacements exist or the user approves removal

## Verification Requirements

For non-trivial changes, run:

- `npm run lint`
- `npm run build`
- `npm run test` when auth, storage, schema, calculation, or report logic changes

When UI changes:

- verify desktop behavior
- verify tablet behavior
- verify mobile behavior
- check loading, empty, and error states
- check for console/runtime issues when practical

When data flow changes:

- confirm where data is stored
- confirm how it is retrieved
- confirm where it is displayed
- confirm where it is calculated
- confirm where it is exported

If any of those are missing, the change is incomplete.

## Reporting Requirements

After each task, report:

- what changed
- files changed
- what was audited
- tests/checks run
- responsive checks performed
- whether frontend and backend stayed aligned
- whether schema or persistence changed
- whether calculations changed
- whether exports or reports were updated
- risks and edge cases
- what remains unverified
- next recommended step

## Immediate Priorities

Prioritize release correctness, provider-neutral deployment, scoped permissions, reliable lead workflows, migration safety, responsive UI quality, and clean verification evidence.

If speed conflicts with quality, choose quality.
If local cleanup conflicts with system stability, protect system stability.
