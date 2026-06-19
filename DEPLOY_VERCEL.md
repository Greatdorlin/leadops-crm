# Deploy Leads Desk On Vercel

## Positioning

Vercel is an optional deployment path for Leads Desk. It is not required, and the product must stay provider-neutral.

## Requirements

- external Postgres database
- Google OAuth credentials
- production environment variables configured in Vercel

## Required Environment Variables

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_NAME`
- `NEXT_PUBLIC_APP_URL`

Optional:

- `ALLOWED_EMAIL_DOMAINS`

## Deploy Steps

1. Import the private repo into Vercel.
2. Set the production environment variables.
3. Point `DATABASE_URL` to an external Postgres instance.
4. Deploy the app.
5. Apply the schema from a trusted terminal:

```bash
npm run db:push
npm run db:seed:defaults:full
```

## Important Notes

- Vercel does not replace the need for Postgres backups.
- Leads Desk should not use Vercel-specific database env names as the primary contract.
- Production auth must be fully configured. Dev preview access is not allowed in production.

## Verification

After deploy, confirm:

- `/api/health` returns `200`
- owner sign-in works
- custom fields work
- webhook intake works
- notifications load
- exports run correctly
