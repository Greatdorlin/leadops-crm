# Leads Desk

Leads Desk is a private, single-client lead operations system for capture, assignment, follow-up, offer-level qualification, reporting, and workspace customization.

## Local Setup

```bash
cp .env.example .env
# Edit .env: DATABASE_URL, AUTH_SECRET, public URL and initial administrator.
npm ci
npm run db:migrate
npm run db:seed:defaults:full
npm run dev
```

Requires Node.js 24 and PostgreSQL 16 or newer. Create an empty database first.
Generate AUTH_SECRET with `openssl rand -base64 32`. Use a working database URL and your own initial administrator email; optional provider secrets may stay empty. Both Next.js and the database CLI load `.env`. Never commit it.

The seed creates configuration only. Use `npm run auth:invite-initial-admin` to generate the initial owner activation link, then open the link to set a password. Use `npm run db:seed:demo` only when you deliberately want sample records.

## Release Verification

```bash
npm run verify
# Individual checks
npm test
npm run typecheck
npm run test:coverage
npm run audit
```

Production schema changes use `npm run db:migrate`. `npm run db:push` is for disposable development databases only.

Inspect the read-only capacity harness with `npm run load:smoke -- --help`. Live requests require an explicit `--confirm` flag.

## Deployment

- [Client deployment and service model](./docs/CLIENT_DEPLOYMENT_AND_SERVICE.md)
- [Vercel with managed Postgres](./DEPLOY_VERCEL.md)
- [Netlify with managed Postgres](./DEPLOY_NETLIFY.md)
- [VPS with Docker Compose](./DEPLOY_VPS.md)
- [Coolify](./DEPLOY_COOLIFY.md)
- [Backup and restore](./BACKUP_AND_RESTORE.md)
- [CRM migration and connector boundaries](./docs/MIGRATIONS_AND_CONNECTORS.md)
- [Provider-neutral extension contracts](./docs/EXTENSION_CONTRACTS.md)
- [Architecture and scale contract](./docs/ARCHITECTURE.md)
- [Scaling, capacity, and load verification](./docs/SCALING_AND_CAPACITY.md)
- [Security and permissions](./docs/SECURITY_AND_PERMISSIONS.md)
- [Release branches](./docs/RELEASE_BRANCHES.md)

## Operate And Handover

- [Installation guide](./INSTALL.md)
- [Production checklist](./PRODUCTION_CHECKLIST.md)
- [Go-live QA](./GO_LIVE_QA.md)
- [Demo walkthrough](./DEMO_SCRIPT.md)
- [Client handover](./CLIENT_HANDOVER.md)

The runtime is provider-neutral: it requires PostgreSQL through `DATABASE_URL` and does not depend on a specific database vendor.

Docker buyers can choose bundled Postgres with `docker-compose.yml` or an external managed database with `docker-compose.external.yml`.

See [buyer readiness evidence](./docs/BUYER_READINESS.md) for verification scope, operational requirements, and remaining limits.

Inbox, mailbox security, scheduling and the role guide: [operating guide](docs/INBOX_AND_WORKSPACE_GUIDE.md).
