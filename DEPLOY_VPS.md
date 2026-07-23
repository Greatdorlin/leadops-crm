# Deploy Leads Desk On A VPS

## Recommended Use Case

Use this path when a client wants a low-cost private install with the app and Postgres under their control.

Recommended stack:

- Ubuntu 22.04 or 24.04
- Docker Engine
- Docker Compose
- reverse proxy with SSL
- PostgreSQL in Docker or an external managed Postgres instance

## Starting Server Profiles

- small installation: 2 vCPU, 4 GB RAM, and 40+ GB SSD
- 100,000-lead capacity target: 2 vCPU, 8 GB RAM, and 100 GB NVMe

The larger profile is a test target, not a guarantee. It must pass the representative acceptance gate in [docs/SCALING_AND_CAPACITY.md](./docs/SCALING_AND_CAPACITY.md) before client approval.

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
- `ENABLE_GOOGLE_LOGIN=false` unless Google is intentionally enabled
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` only when Google is enabled
- `NEXTAUTH_URL`
- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_NAME`
- `ALLOWED_EMAIL_DOMAINS` if needed
- `NEXT_PUBLIC_APP_URL`
- `DATABASE_POOL_MAX=5` as the single-process starting point
- `DATABASE_CONNECT_TIMEOUT_SECONDS=30`
- `DATABASE_IDLE_TIMEOUT_SECONDS=20`

If you use the bundled Postgres container, make sure `DATABASE_URL` matches the Postgres service credentials.

For bundled Postgres, start from `.env.docker.example`. The database password has no unsafe fallback and Postgres is not published to the public host network.

For external Postgres, start from `.env.example`, replace the local `DATABASE_URL` with the provider's pooled SSL connection URL, and use `docker-compose.external.yml`.

## 4. Build And Start

Bundled Postgres:

```bash
docker compose up -d --build
```

The one-shot `migrate` service applies journaled migrations before the app starts.

External Postgres:

```bash
docker compose -f docker-compose.external.yml run --rm migrate
docker compose -f docker-compose.external.yml up -d --build app
```

The external variant never starts or stores a local database container.

## 5. Seed Defaults On First Install

Bundled Postgres:

```bash
docker compose run --rm migrate npm run db:seed:defaults:full
```

External Postgres:

```bash
docker compose -f docker-compose.external.yml run --rm migrate npm run db:seed:defaults:full
```

## 6. Health Check

Confirm the app is live:

```bash
curl http://127.0.0.1:3000/api/health
```

The endpoint returns `200` only when production configuration is complete and the database responds.

## 7. Reverse Proxy And SSL

Put the app behind Caddy, Nginx, Traefik, or a platform proxy that handles TLS.

Required outcome:

- HTTPS enabled
- public base URL matches the OAuth callback configuration when Google login is enabled
- only ports 80 and 443 are exposed publicly
- upstream keep-alive is enabled
- request duration and response status are logged
- PostgreSQL is reachable only on the private network

Start with one app process. If a measured CPU bottleneck justifies another process, rebudget the aggregate database pool first. See [docs/SCALING_AND_CAPACITY.md](./docs/SCALING_AND_CAPACITY.md).

## 8. Backups

Set a recurring `pg_dump` job and test restore before client handover.

See [BACKUP_AND_RESTORE.md](./BACKUP_AND_RESTORE.md).

## 9. Production Checks

Before handover, confirm:

- dev preview auth is not available
- Google OAuth works when it is enabled
- webhook intake works
- export works
- notifications work
- dashboard and reports load
- backup job is scheduled
- the representative load and capacity gate has passed for the promised client tier
