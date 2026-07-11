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
- [VPS with Docker Compose](./DEPLOY_VPS.md)
- [Coolify](./DEPLOY_COOLIFY.md)
- [Backup and restore](./BACKUP_AND_RESTORE.md)
- [CRM migration and connector boundaries](./docs/MIGRATIONS_AND_CONNECTORS.md)
- [Architecture and scale contract](./docs/ARCHITECTURE.md)
- [Security and permissions](./docs/SECURITY_AND_PERMISSIONS.md)

The runtime is provider-neutral: it requires PostgreSQL through `DATABASE_URL` and does not depend on a specific database vendor.
