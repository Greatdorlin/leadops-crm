# Leads Desk technical handover

Leads Desk is a private lead operations application developed by Greatdorlin. Each customer installation needs its own deployment and PostgreSQL database. The repository is Greatdorlin/leadops-crm; its default and production integration branch is master.

## Start with these documents

| Need | Document |
| --- | --- |
| Architecture and modules | ../ARCHITECTURE.md |
| Installation and supported hosting | ../../README.md, ../../public/INSTALL.md, ../../DEPLOY_VPS.md |
| Cloudflare adapter boundary | ../../DEPLOY_CLOUDFLARE.md |
| Schema, upgrades and connectors | ../MIGRATIONS_AND_CONNECTORS.md, ../DATA_LINEAGE.md |
| Roles, scopes and account security | ../SECURITY_AND_PERMISSIONS.md, ../ACCOUNT_SECURITY.md |
| Team messaging | ../INBOX_AND_WORKSPACE_GUIDE.md |
| Assistant tools and approval model | ../ASSISTANT_AND_PRODUCTS.md |
| Product attribution and inherited code | ../../PROVENANCE.md |
| Licence and font notices | ../../THIRD_PARTY_NOTICES.md |
| Review sequence | PLAN.md |

## Supported feature boundaries

Lead capture, forms, protected webhook intake, assignments, notes, follow-up tasks, product opportunities, reports, exports, CSV migration, appearance settings and private team messaging have automated regression coverage. These checks do not establish every provider's live account access or full device acceptance.

The assistant searches accessible leads and sales notes. It prepares approved lead edits and owner-reviewed intake automations. Rules can assign owners, change stage or set priority for future leads. It does not execute arbitrary code, send campaigns or process old leads merely because a new rule was added.

Inbox is private team messaging. Customer email delivery and mailbox transport were retired. Its database compatibility tables remain to preserve stored information and upgrade history.

## Operator requirements

Use Node.js 24 and PostgreSQL 16 or later. Review the environment example; configure a unique auth secret, canonical public origin, initial owner and database connection. Configure the messaging encryption key before enabling secure Inbox or authenticator enrollment. Never share an agency's demo database or secrets across customers.

Run npm ci, the journaled migrations, intentional default seeding and npm run verify. Issue the first invitation through the documented bootstrap command. Demo seeding is an explicit operator action; it is not part of application startup.

For an installation whose MFA columns were prepared outside the journal, obtain a verified backup and approval before using `npm run db:migrate -- --accept-prepared-mfa`. The opt-in checks the expected column types, nullability and defaults before recording the original migration hashes. It refuses partial or mismatched structures. Normal installations use the ordinary migration command.

## Recovery acceptance

`npm run verify:recovery` accepts separate, local test databases named leads_review/test and leads_restore/test. It refuses a nonempty restore target and never uses pg_restore --clean. It checks record fingerprints and verifies encrypted-message recovery with the matching key. Use the actual backup system and key escrow procedure for client acceptance; an isolated test does not prove production backup retention.

`npm run verify:auth` exercises owner login, MFA enrollment, single-use recovery, session revocation and logout against an isolated local app. It creates synthetic fixture accounts only in explicitly named local test databases. Keep fixture secrets and database dumps out of artifacts.

## Release status

The commercial-readiness branch is a review candidate. Production promotion, infrastructure changes and account transfers require their documented approval and rollback checks. Hosted CI must pass the candidate commit before describing it as CI-verified. Workers bundle generation and a deployed Workers auth/database runtime are separate acceptance results.

## Password length follow-up — 7 November 2026

New passwords are limited to 72 UTF-8 bytes before bcrypt hashing. Both activation and password changes use the same browser-safe policy; the server enforces it independently. Multibyte boundary tests and an actual bcrypt truncation regression demonstrate why a character-only upper bound is insufficient. Existing credential verification remains compatible so this change does not lock out users with previously accepted passwords. Those older passwords still need a controlled reset campaign; this patch cannot recover their discarded suffixes. Password changes also reject foreign or missing request origins before authentication/database work. No production passwords or database schema changed.

Authenticated mobile/desktop acceptance remains open: this session's cloud browser cannot reach the local test server (`ERR_CONNECTION_REFUSED`). This is a test-environment connection failure, not evidence about production availability.

Follow-up validation: Node 24.22.1; 369 tests passed with zero failures, lint/type checks and coverage gates passed (repository lines 28.13%; business-contract lines 87.44%). Migration drift check passed; historical SQL, snapshots and journal remain unchanged. See the confidential review for the exact candidate and build evidence. Browser-level password-form interaction remains unverified.
