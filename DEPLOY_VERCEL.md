# Deploy Leads Desk On Vercel

## Positioning

Vercel is an optional deployment path for Leads Desk. It is not required, and the product must stay provider-neutral.

## Requirements

- external Postgres database
- managed PostgreSQL with a pooled TLS connection URL
- production environment variables configured in Vercel

## Required Environment Variables

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_URL`
- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_NAME`
- `NEXT_PUBLIC_APP_URL`

Optional:

- `ALLOWED_EMAIL_DOMAINS`
- `ENABLE_GOOGLE_LOGIN=true`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET` when Google login is enabled

Set `DATABASE_POOL_MAX=1` or `2` for serverless runtime instances unless measured database capacity supports a larger aggregate. Every concurrent runtime instance can create its own application pool.

## Deploy Steps

1. Import the private repo into Vercel.
2. Set the production environment variables.
3. Point `DATABASE_URL` to an external PostgreSQL instance. Neon, Supabase Postgres, and other managed PostgreSQL providers use the same contract.
4. Deploy the app.
5. Apply journaled migrations from a trusted release terminal before promoting the deployment:

```bash
npm ci
npm run db:migrate
npm run db:seed:defaults:full
```

## Important Notes

- Vercel does not replace the need for Postgres backups.
- Use the provider's pooled connection URL for serverless traffic and keep SSL enabled.
- Do not run `db:push` against production.
- Leads Desk should not use Vercel-specific database env names as the primary contract.
- Production auth must be fully configured. Dev preview access is not allowed in production.
- Capacity must be verified against the selected function and database tiers; see [docs/SCALING_AND_CAPACITY.md](./docs/SCALING_AND_CAPACITY.md).

## Verification

After deploy, confirm:

- `/api/health` returns `200`
- owner sign-in works
- custom fields work
- webhook intake works
- notifications load
- exports run correctly
