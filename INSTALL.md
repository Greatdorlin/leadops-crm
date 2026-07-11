# Leads Desk Install Guide

## Purpose

Use this guide to install Leads Desk for local development, a private client workspace, or a production deployment where you control the infrastructure.

## Requirements

- Node.js 20+
- npm 10+
- PostgreSQL 15+ or 16+
- Google OAuth credentials for production sign-in
- A private repository checkout

## 1. Clone And Install

```bash
git clone <private-repo-url> leads-desk
cd leads-desk
npm ci
```

## 2. Configure Environment Variables

Copy `.env.example` to `.env` and set the required values:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `NEXTAUTH_URL`
- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_NAME`

Optional:

- `ALLOWED_EMAIL_DOMAINS`
- `NEXT_PUBLIC_APP_URL`
- provider-specific legacy compatibility variables only if you are migrating inherited runtime behavior

Important:

- production must not rely on dev preview auth
- use a strong `AUTH_SECRET`
- do not commit real secrets

## 3. Prepare The Database

Create a Postgres database and point `DATABASE_URL` to it.

Apply the journaled migrations:

```bash
npm run db:migrate
```

## 4. Seed Default Leads Desk Data

Seed default stages and lead sources:

```bash
npm run db:seed:defaults
```

Seed stages, sources, and recommended general custom fields:

```bash
npm run db:seed:defaults:full
```

This is manual and idempotent. It does not run automatically on app startup.

Optional local demo data:

```bash
npm run db:seed:demo
```

This adds a safe demo workspace with sample users, leads, custom field values, form-source mappings, intake logs, notifications, and a monthly sales target so `/admin` is easier to evaluate locally.

## 5. Start The App

Development:

```bash
npm run dev
```

Production build check:

```bash
npm run build
npm run start
```

## 6. Initial Admin Setup

- sign in with the Google account that matches `INITIAL_ADMIN_EMAIL`
- confirm the owner/admin account appears in `/admin/team`
- create additional users only after the owner account is working

In development only, local preview access can open `/admin` without Google auth. This must stay disabled in production.

## 7. First Workspace Setup

Recommended first actions:

1. Open `/admin/settings/fields` and create the extra lead fields the client needs.
2. Open `/admin/settings/stages` and confirm the stage list.
3. Open `/admin/settings/sources` and confirm the lead sources.
4. Open `/admin/settings/form-sources` and create the first form source.
5. Save the source mappings for core and custom fields.
6. Open `/admin/settings/sales-targets` and add a monthly target if needed.

## 8. First Webhook Test

1. Copy the webhook URL from `/admin/settings/form-sources`.
2. Send a JSON `POST` request to that URL.
3. Confirm a lead is created or updated.
4. Confirm custom field values are saved.
5. Confirm the intake event appears in `/admin/intake`.
6. Confirm failed submissions also appear with a useful error.

## 9. Verification Before Handover

Run:

```bash
npm run verify
```

Then verify:

- manual lead capture
- CSV import
- export with custom fields
- webhook intake
- notifications
- dashboard metrics
- reports
