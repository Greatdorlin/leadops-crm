# Deploy Leads Desk On Netlify

Netlify is an optional host. Leads Desk remains a standard Next.js application backed by PostgreSQL through `DATABASE_URL`.

## Requirements

- a managed PostgreSQL database with SSL and connection pooling
- Google OAuth credentials
- a private Git repository connected to Netlify

## Deploy

1. Create the production database.
2. From a trusted release terminal, apply the journaled schema and defaults:

```bash
npm ci
npm run db:migrate
npm run db:seed:defaults:full
```

3. Import the repository into Netlify. The checked-in `netlify.toml` uses `npm run build` and publishes `.next`; Netlify applies its maintained OpenNext adapter automatically.
4. Add the required variables in Netlify project configuration. Do not commit their values:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`
   - `NEXTAUTH_URL`
   - `NEXT_PUBLIC_APP_URL`
   - `INITIAL_ADMIN_EMAIL`
   - `INITIAL_ADMIN_NAME`
5. Set the Google OAuth callback to `https://YOUR_DOMAIN/api/auth/callback/google`.
6. Deploy, then run the checks below before directing traffic to the site.

Use the database provider's pooled connection URL for serverless traffic. Neon, Supabase Postgres, and other PostgreSQL providers use the same `DATABASE_URL` contract.

## Verify

- `/api/health` returns `200`
- owner sign-in and sign-out work
- lead creation, inline stage changes, assignment, and tasks persist
- file upload, form intake, notifications, imports, and exports work
- integration webhook URLs use the final production domain
- database backups and a restore test are configured

Do not run `db:push` against production. Do not run migrations as part of the Netlify build.

Official platform reference: [Next.js on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).
