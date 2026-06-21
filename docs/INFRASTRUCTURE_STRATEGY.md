# Leads Desk Infrastructure Strategy

## Goal

Leads Desk must deploy cleanly for different client sizes without changing the product architecture every time.

Customer-facing promise:

- private lead management system
- branded dashboard
- lead tracking
- assignment and follow-up
- reports and export access
- customization handled for them

What customers hear:

- we install and configure your private lead management system
- your team gets a branded dashboard and lead operations workflow
- your data stays in your private system
- you can export your data anytime
- you do not pay per-user CRM subscription pricing

What stays internal:

- hosting provider choice
- VPS vs managed cloud decisions
- Docker, reverse proxy, and database topology details
- backup scheduling implementation
- runtime and deployment environment decisions

Internal reality:

- one client = one app instance
- one client = one Postgres database
- one client = one configuration

## Infrastructure Principles

- provider-neutral
- Postgres-only through `DATABASE_URL`
- Docker-ready
- Vercel-compatible
- deployable on low-cost VPS
- deployable on managed cloud
- scalable to larger dedicated infrastructure later
- secrets stay server-side
- backups are required in production

## Supported Deployment Buckets

## 1. Demo / Trial

Use for:

- sales demos
- internal testing
- feature previews

Rules:

- low-cost hosting is acceptable
- demo data only
- clearly separate from client production
- lightweight backups are acceptable because no real client production data should live here
- operator is responsible for preventing demo and client data mixing

## 2. Low-Cost Starter Production

Recommended default:

- VPS
- Dockerized app
- Postgres on the same server when appropriate
- reverse proxy such as Caddy or Nginx
- automated backups

Use for:

- smaller teams
- cost-sensitive deployments
- early commercial installs

Backup strategy:

- scheduled database dumps
- off-server backup copy
- restore checklist

Security responsibility:

- server patching
- SSL
- database credential handling
- backup verification

## 3. Safer Small-Business Production

Recommended shape:

- stronger VPS
- Dockerized app
- Postgres
- automated backups
- basic monitoring

Use for:

- growing teams
- higher lead volume
- better stability expectations

Backup strategy:

- automated scheduled backups
- retention policy
- periodic restore tests

Security responsibility:

- host hardening
- secrets rotation process
- admin access review
- basic alerting

## 4. Business / Scale Production

Recommended shape:

- app infrastructure separated from the main database where needed
- managed Postgres or stronger dedicated database host
- stronger monitoring
- export and reporting growth headroom

Use for:

- larger clients
- heavier reporting
- higher data volume

Backup strategy:

- managed backups or scheduled external backups
- tested restore process
- clearer recovery objectives

Security responsibility:

- stronger access review
- monitoring and incident response ownership
- backup integrity checks

## 5. Enterprise Production

Recommended shape:

- dedicated app infrastructure
- dedicated managed Postgres or RDS-class database
- stronger backup policy
- monitoring
- operational runbooks
- room for workers and async jobs later

Use for:

- custom infra requirements
- higher security expectations
- higher volume teams

Backup strategy:

- documented backup ownership
- restore rehearsal expectations
- longer retention based on contract
- auditable recovery process

Security responsibility:

- strict secrets handling
- access review and audit expectations
- monitoring and response ownership
- client-specific security controls where required

## Application Contract

The application contract must stay stable across providers:

- Node / Next.js app
- Auth.js / Google OAuth
- Postgres via `DATABASE_URL`
- server-rendered admin UI
- database-backed settings and customization

Do not hardcode hosting provider assumptions into app logic.

## Environment Variable Contract

Required baseline variables:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_NAME`

Optional baseline variables:

- `ALLOWED_EMAIL_DOMAINS`
- `NEXT_PUBLIC_APP_URL`
- future email/notification variables when that module is implemented

Migration rule:

- new work must target `DATABASE_URL`
- do not add new legacy-product, provider-specific, or old-brand env names
- old env names may remain temporarily only as inherited compatibility paths until they are removed deliberately

## Database Strategy

- PostgreSQL is the only supported primary database.
- `DATABASE_URL` is the primary and preferred connection contract.
- provider-specific env names are compatibility fallbacks only while inherited runtime paths are cleaned up.
- the current DB client still uses a Neon HTTP driver, but that is an implementation detail, not a product requirement.
- Core product data must live in normalized tables, not giant JSON blobs.
- Core lead fields remain real columns.
- Custom fields use extension tables.
- Role, team, branch, and department relationships must be queryable server-side.
- Heavy filtering must happen in the database, not in the browser.

## Storage And Assets

Initial product expectation:

- company logo and favicon should be stored through a configurable upload strategy later
- do not couple file uploads to one cloud provider
- keep file references as URLs or storage-backed paths, not local absolute machine paths

This phase is documentation only. No upload system is being added yet.

## Auth And Security

Default auth:

- Google OAuth
- verified email checks
- optional allowed-domain restriction
- role and scope checks from Postgres-backed user data

Rules:

- no hardcoded personal emails as permanent product behavior
- no client-side-only access control
- admin APIs must enforce permissions server-side
- secrets never go to client bundles

## Backups And Restore

Production deployments require:

- scheduled Postgres backups
- restore instructions
- backup retention policy
- documented ownership of backup credentials

Detailed backup/restore runbooks will be written after the core product schema stabilizes.

## Observability

Production expectations by tier:

- structured server logs
- auth failure visibility
- database error visibility
- export action visibility
- audit logs for product actions

Do not make external observability tooling a blocker for MVP, but do not design the system so visibility is impossible later.

## Scaling Notes

The entry offer does not define the software ceiling.

The software architecture must support:

- 1 to 1,000+ users
- 1 to 1,000,000+ leads
- many teams and branches
- heavy filtering
- large exports
- audit logging
- customization

Implications:

- use server-side filtering
- prefer cursor pagination where practical
- keep export design background-job-friendly
- index lead ownership, stage, source, timestamps, and task due dates

## Non-Goals For This Phase

- infrastructure automation scripts
- Terraform
- Kubernetes
- multi-tenant SaaS control plane
- billing platform
- deep integration hosting guides

Those can be added later if the product direction requires them.
