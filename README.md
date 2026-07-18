# Leads Desk

Leads Desk is a private, single-client lead operations system for capture, assignment, follow-up, offer-level qualification, reporting, and workspace customization.

## Local Setup

```bash
npm ci
npm run db:migrate
npm run db:seed:defaults:full
npm run dev
```

Copy `.env.example` to `.env.local` and replace every placeholder first.

## Release Verification

```bash
npm run verify
```

Production schema changes use `npm run db:migrate`. `npm run db:push` is for disposable development databases only.

## Deployment

- [Vercel with managed Postgres](./DEPLOY_VERCEL.md)
- [Netlify with managed Postgres](./DEPLOY_NETLIFY.md)
- [VPS with Docker Compose](./DEPLOY_VPS.md)
- [Coolify](./DEPLOY_COOLIFY.md)
- [Backup and restore](./BACKUP_AND_RESTORE.md)
- [CRM migration and connector boundaries](./docs/MIGRATIONS_AND_CONNECTORS.md)
- [Provider-neutral extension contracts](./docs/EXTENSION_CONTRACTS.md)
- [Architecture and scale contract](./docs/ARCHITECTURE.md)
- [Security and permissions](./docs/SECURITY_AND_PERMISSIONS.md)

## Operate And Handover

- [Installation guide](./INSTALL.md)
- [Production checklist](./PRODUCTION_CHECKLIST.md)
- [Go-live QA](./GO_LIVE_QA.md)
- [Demo walkthrough](./DEMO_SCRIPT.md)
- [Client handover](./CLIENT_HANDOVER.md)

The runtime is provider-neutral: it requires PostgreSQL through `DATABASE_URL` and does not depend on a specific database vendor.

Docker buyers can choose bundled Postgres with `docker-compose.yml` or an external managed database with `docker-compose.external.yml`.
