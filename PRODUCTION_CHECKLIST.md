# Leads Desk Production Checklist

## Environment

- Repository is private.
- `.env` or platform secrets are configured.
- `DATABASE_URL` points to the intended production database.
- `AUTH_SECRET` is strong.
- Google OAuth credentials are configured.
- `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_NAME` are configured.
- `NEXT_PUBLIC_APP_URL` matches the production domain.

## Security

- Development preview access is disabled in production.
- No personal fallback email remains in runtime configuration.
- No legacy branding is visible in customer-facing routes.
- Raw intake payloads are restricted to advanced admin review.

## Database

- `npm run db:push` has been applied to production.
- Default stages and sources have been seeded.
- Recommended custom fields have been seeded if the client wants them.
- Backup strategy is documented and scheduled.

## Product Setup

- Owner/admin sign-in works.
- Lead stages are reviewed.
- Lead sources are reviewed.
- Custom fields are reviewed.
- First form source is configured.
- Field mappings are configured.
- First sales target is configured if required.

## Operational Verification

- Manual lead capture works.
- CSV import works.
- CSV export works.
- Webhook intake works.
- Failed webhook events appear in intake logs.
- Notifications appear in the admin inbox.
- Dashboard metrics load.
- Reports load.

## Hosting

- Domain and SSL are active.
- `/api/health` returns `200`.
- Docker image builds cleanly if using the VPS or Coolify path.
- Restore test has been completed successfully.
