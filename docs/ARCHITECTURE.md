# Leads Desk Architecture

## Runtime

- Next.js App Router with server-rendered admin pages and focused client controls
- Auth.js with invite-only email/password, optional secondary Google OAuth, and database-backed roles
- PostgreSQL through `DATABASE_URL`
- Drizzle ORM with journaled SQL migrations
- Postgres.js with pooler-compatible prepared statements disabled
- one private app instance and one database per client deployment

The runtime is compatible with Vercel plus managed PostgreSQL, a Docker VPS, or another Node hosting platform. Product logic does not require a specific database or hosting vendor.

## Product Boundaries

Core records use normalized tables for users, leads, stages, sources, tasks, notes, opportunities, notifications, forms, custom fields, intake events, imports, and audit-ready events. Client-specific lead attributes use custom-field tables rather than changing the core lead table for every deployment.

Permissions are enforced in server routes and read scopes. Hiding a navigation item never grants or removes access by itself.

Lead value is offer-aware. One lead can be qualified for one product and unqualified for another. Only active, qualified, or on-hold opportunities contribute to live pipeline value; lost and unqualified opportunities remain in history without inflating the pipeline.

## Operational Flows

- lead queue: cursor pagination, server filtering, selective list columns, and inline stage/priority/owner/follow-up updates
- lead actions: quick notes and tasks plus full lead detail history
- qualification: form-answer rules can route leads, set offer status/value, notify owners, and create owner tasks
- migration: source rows are staged, retained, validated, committed atomically per row, and resumed in bounded batches
- reports: database-side aggregation instead of transferring operational lead rows for summary charts
- exports: bounded server-side batches with spreadsheet-formula neutralization
- integrations: available, mapped-import, adapter-ready, and planned states are kept distinct

Always-visible navigation disables speculative route prefetch so one screen does not fan out into unrelated database reads. Raw source payload JSON is retained for traceability but excluded from queue, dashboard, task, and report list reads.

## Scale Contract

The default product targets operational deployments from small teams through million-record databases. It uses keyset pagination, selective columns, indexed queue filters, bounded exports, and resumable imports so browser memory is not tied to total lead count.

A billion-record installation is an infrastructure program, not a UI claim. It requires measured query plans, table partitioning, worker queues, object storage, archival policy, read replicas or analytics stores, and dedicated capacity. The application boundaries support that evolution, but no default deployment should be sold as billion-record-tested until a representative benchmark proves it.

## Release Contract

- apply schema changes with `npm run db:migrate`
- use `npm run db:push` only for disposable development databases
- run `npm run verify` before release
- verify `/api/health`, OAuth, backups, restore, imports, exports, forms, and permission scopes in staging
- keep secrets out of client code and Git
