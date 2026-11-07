# Release verification

This release adds authenticator sign-in, direct form deletion, form template previews, email in the contact menu, corrected interest reports and owner-approved assistant automations.

## Database findings

The Vercel sandbox reached the production database. All nine MFA columns were added in one locked transaction with `ADD COLUMN IF NOT EXISTS`. Existing password and account values were preserved. The historical migration ledger was not changed; the original committed migration hashes remain unchanged. The prepared MFA schema must be reconciled with the journal before a production upgrade; this is an explicit release blocker.

The runtime role has BYPASSRLS and CREATEROLE. None of the 51 public tables had enforced row security. This remains a release-readiness gap. Application scopes do not resolve database-level privilege exposure. A safe RLS rollout needs a separate runtime role, transaction-bound actor context, service policies and direct denial tests before switching credentials.

## Functional checks

The PostgreSQL suite covers form publication, duplicate submission protection, lead/task creation and deletion while preserving the captured lead. Interest reports count saved preference fields, honor lead scope, and merge city casing. Acquisition tags and company names are no longer counted as interests.

Assistant rules are proposals until the owner approves. Tests cover replay/idempotency, future lead intake, rejected user access and unavailable owners. Supported actions use the existing engine: assign an owner, change stage, or set priority. They do not send campaigns or execute arbitrary code. Existing leads are not processed by a new intake rule.

Calls, SMS and email use device handlers. The browser cannot enumerate installed apps or change OS defaults. WhatsApp remains a separate action.

## Remaining work

Record live MFA and browser checks after staging. Provider integrations require real provider credentials and a real test delivery; configuration alone must not be described as verified delivery. Broader demo data consistency, notification preferences and Workers authentication/database certification still need completion. This release must not be presented as a completed sales-readiness certification.
