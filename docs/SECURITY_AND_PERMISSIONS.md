# Leads Desk Security And Permissions

## Purpose

This document defines the default security model and permission expectations for Leads Desk.

## Authentication Default

Default authentication:

- Next.js App Router
- Auth.js / NextAuth
- Google OAuth
- verified email check
- optional allowed-domain restriction
- Postgres-backed user record

Required environment variables:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_NAME`

Optional:

- `ALLOWED_EMAIL_DOMAINS`
- `ENABLE_PASSWORD_LOGIN=false` by default

### Optional chief access

A deployment may explicitly enable an owner-only password fallback for recovery or restricted environments. It is disabled by default and is not a separate admin identity:

- `ENABLE_PASSWORD_LOGIN=true` is required.
- `CHIEF_LOGIN_EMAIL` must exactly match `INITIAL_ADMIN_EMAIL`.
- `CHIEF_LOGIN_PASSWORD_HASH` must contain a bcrypt hash, never a plaintext password.
- Failed attempts are rate limited and successful authentication still passes through the normal server-side workspace access check.

Do not enable this fallback for a client unless their deployment operator stores the hash in that deployment's secret manager.

Current runtime rule:

- admin sign-in is not considered configured unless Google OAuth credentials and the initial admin bootstrap variables are present
- no personal fallback email is allowed when `INITIAL_ADMIN_EMAIL` or `INITIAL_ADMIN_NAME` is missing
- development may show a setup warning, but production should be treated as misconfigured until the bootstrap env is supplied
- local development can use a preview-only admin session when auth is not configured, but that path must stay disabled in production
- `/api/intake/webhook/[webhookKey]` is protected by the webhook key instead of admin auth
- raw intake payloads are visible only in advanced intake review surfaces for owner/admin
- `/api/health` returns configuration status only and does not expose secrets
- no customer-facing runtime should depend on development preview auth

## Role Model

Required product roles:

- `owner`
- `admin`
- `manager`
- `team_lead`
- `sales_rep`

The role model must be stored server-side and enforced in backend logic.

Legacy runtime role names still present today:

- `master_admin`
- `general_admin`
- `lead_sales_rep`
- `sales_rep`

These remain compatibility access levels around the old data model. The intended product direction is:

- `owner`
- `admin`
- `manager`
- `team_lead`
- `sales_rep`

Current compatibility mapping:

- `master_admin` -> `owner`
- `general_admin` -> `admin`
- `lead_sales_rep` -> `team_lead`
- `sales_rep` -> `sales_rep`

## Scope Model

Required access scopes:

- `all`
- `branch`
- `department`
- `team`
- `own`

Scope controls what records a user can view and act on.

## Backend Permission Enforcement

Rules:

- permissions must be enforced in APIs and server actions
- frontend hiding is not sufficient protection
- lead visibility must respect role and scope
- task visibility must respect role and scope
- exports must respect role and scope
- settings changes must respect role and permission level
- custom field definitions, form sources, lead stages, lead sources, and sales targets remain owner/admin-managed
- notification reads and follow-up actions must respect the same lead access context as the rest of admin

## Initial Admin Bootstrap

Bootstrap direction:

- use `INITIAL_ADMIN_EMAIL`
- use `INITIAL_ADMIN_NAME`
- create or activate the first privileged user through neutral environment configuration
- do not hardcode any personal email in product logic
- treat the bootstrap admin as the initial owner/admin equivalent for setup purposes
- allow additional admins through stored user records and server-side permissions after bootstrap

The bootstrap admin should be transitional operational setup, not a permanent backdoor concept.

Current compatibility behavior:

- `ADMIN_ALLOWED_EMAILS` may still add extra approved admin emails for inherited runtime flows
- `INITIAL_ADMIN_EMAIL` is the only bootstrap identity source
- no personal or company-specific email should appear as a runtime default

## Operational Hardening Notes

- Use `DATABASE_URL` as the primary database connection variable in every environment.
- Treat missing production auth variables as a deployment blocker, not as a reason to enable preview access.
- Keep public error responses human-readable and free from stack traces or secret values.

## Allowed Email Domains

`ALLOWED_EMAIL_DOMAINS` is optional.

Behavior:

- if empty, no domain restriction is applied
- if set, only emails whose domain matches the comma-separated list are allowed to sign in
- values are normalized with trimmed whitespace and lowercase comparison
- domain checks apply before workspace-access approval

## Export Permissions

Current behavior:

- export access should be granted by role/access level first
- the initial bootstrap owner/admin can export
- general admin access can export
- `LEAD_EXPORT_ALLOWED_EMAILS` remains a compatibility-only deployment allowlist
- no hardcoded personal export allowlist default is allowed
- exports enforce role and stored owner, team, department, or branch scope server-side

## Neutral Permission Vocabulary

New permission helpers should prefer neutral role concepts:

- `owner`
- `admin`
- `manager`
- `team_lead`
- `sales_rep`

Current helper direction includes:

- manage users
- manage settings
- export leads
- manage team scope
- manage branch scope
- manage department scope

Compatibility role names remain mapped at the boundary, while new permission logic uses this neutral vocabulary.

## Hard Rules

- no hardcoded personal admin emails
- no company-specific auth bypass rules
- no client-side-only access control
- no plaintext passwords
- no secrets in client bundles

## Audit Logging

Audit logging foundation is required for:

- login
- logout when practical
- lead created
- lead updated
- lead assigned
- stage changed
- note added
- task created
- task completed
- user created
- user role changed
- user deactivated
- export performed
- customization changed

## Password Fallback Rules

Password login is optional only.

When enabled:

- `ENABLE_PASSWORD_LOGIN=false` by default
- bcrypt hashing
- rate limiting
- no plaintext passwords
- password reset can come later

Password login must not replace Google OAuth as the default path.

## Security Review Checklist

Before approving security-sensitive work, verify:

- auth rules are server-enforced
- role and scope logic are server-enforced
- no personal/admin hardcodes remain
- secrets stay server-side
- audit logs cover the changed action
- export rules do not bypass scope checks

## Compatibility Boundaries

- Google OAuth remains the default runtime sign-in path.
- Stored access scopes are enforced for owner, team, department, and branch views.
- Legacy environment allowlists remain compatibility-only and must not become product defaults.
- Compatibility access-level names are mapped to neutral Leads Desk roles at authorization boundaries.
- Local preview access is guarded by `NODE_ENV !== "production"` and must never become a production bypass.
