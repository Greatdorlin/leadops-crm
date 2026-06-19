# Deploy Leads Desk On A VPS

## Recommended Use Case

Use this path when a client wants a low-cost private install with the app and Postgres under their control.

Recommended stack:

- Ubuntu 22.04 or 24.04
- Docker Engine
- Docker Compose
- reverse proxy with SSL
- PostgreSQL in Docker or an external managed Postgres instance

## Minimum Starting Server

- 2 vCPU
- 4 GB RAM
- 40+ GB SSD

Increase server size for larger lead volumes, more users, or large exports.

## 1. Install Docker

Install Docker and Docker Compose on the VPS using the official Docker instructions for your Linux distribution.

## 2. Clone The Repo

```bash
git clone <private-repo-url> /opt/leads-desk
cd /opt/leads-desk
```

## 3. Create Production Environment File

Create `.env` with production values for:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_NAME`
- `ALLOWED_EMAIL_DOMAINS` if needed
- `NEXT_PUBLIC_APP_URL`

If you use the bundled Postgres container, make sure `DATABASE_URL` matches the Postgres service credentials.

## 4. Start Postgres

```bash
docker compose up -d postgres
```

## 5. Build And Start The App

```bash
docker compose build app
docker compose up -d app
```

## 6. Apply Schema And Seed Defaults

```bash
docker compose run --rm app npm run db:push
docker compose run --rm app npm run db:seed:defaults:full
```

## 7. Health Check

Confirm the app is live:

```bash
curl http://127.0.0.1:3000/api/health
```

The endpoint should return `200` only when the production configuration is complete.

## 8. Reverse Proxy And SSL

Put the app behind Caddy, Nginx, Traefik, or a platform proxy that handles TLS.

Required outcome:

- HTTPS enabled
- public base URL matches the OAuth callback configuration
- only ports 80 and 443 are exposed publicly

## 9. Backups

Set a recurring `pg_dump` job and test restore before client handover.

See [BACKUP_AND_RESTORE.md](./BACKUP_AND_RESTORE.md).

## 10. Production Checks

Before handover, confirm:

- dev preview auth is not available
- Google OAuth works
- webhook intake works
- export works
- notifications work
- dashboard and reports load
- backup job is scheduled
