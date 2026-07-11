# Deploy Leads Desk With Coolify

## Purpose

Coolify is an optional deployment path for clients who want a managed self-hosting layer without locking the product to a single app provider.

Leads Desk does not require Coolify, but it is compatible with it.

## Deployment Shape

- app deployed from the provided `Dockerfile`
- Postgres from Coolify, external managed Postgres, or a private Postgres server
- `DATABASE_URL` remains the primary database contract

## 1. Connect The Repository

- create a new application in Coolify
- connect the private repository
- use the included `Dockerfile`

## 2. Configure Environment Variables

Required:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `NEXTAUTH_URL`
- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_NAME`
- `NEXT_PUBLIC_APP_URL`

Optional:

- `ALLOWED_EMAIL_DOMAINS`

Do not rely on development preview access in Coolify production environments.

## 3. Database Choice

Options:

- Coolify-managed Postgres
- external managed Postgres
- private VPS Postgres

Whatever provider you use, Leads Desk should only depend on the final `DATABASE_URL`.

## 4. First Deploy

- trigger the initial build
- confirm `/api/health` returns `503` until env setup is complete
- apply the schema after the app container is available

## 5. Apply Schema And Seed Defaults

Run journaled migrations as a trusted pre-deploy command, then seed a new workspace once:

```bash
npm run db:migrate
npm run db:seed:defaults:full
```

Never use `db:push` for a client production database.

## 6. Domain And SSL

- attach the client domain
- enable SSL
- confirm the public URL matches the Google OAuth callback URL

## 7. Post-Deploy Checks

- sign in with the owner Google account
- test custom fields
- test form sources and webhook intake
- test export
- test notifications
- confirm no old branding is visible

## 8. Backups

Backups are still the operator’s responsibility even if the app is deployed through Coolify.

See [BACKUP_AND_RESTORE.md](./BACKUP_AND_RESTORE.md).
