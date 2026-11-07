# Inbox and workspace tour

Inbox is private team messaging. Use New message to choose one teammate for a direct message or several for a private group (up to 20 people including yourself). Conversation names are optional. You can link a lead only when every participant already has access to it. The conversation creator or a participating owner can manage members; an owner outside the conversation cannot read it.

All, Unread and Groups filter loaded conversations. Search covers loaded conversations; load older conversations to search further. Messages refresh while the page is visible. This is polling, not live presence or a typing indicator. Enter sends; Shift + Enter adds a line. Older messages use cursor pagination.

## Email retirement

Customer email and mailbox setup have been removed from the active product. The Inbox API rejects email creation, reading, sending, retry and mailbox configuration. The former sync endpoint returns 410 and the CLI job exits without contacting a provider. Remove old sync schedules. Historical email rows and encrypted credentials are retained for safe upgrades; no history is deleted by this release. Legacy transport modules remain only for historical compatibility tests and are not imported by runtime Inbox routes.

## Encryption and access

Set a unique 32-byte base64 `CRM_INBOX_DATA_KEY` for every installation. Keep it with protected database backups. AES-256-GCM protects stored subjects and messages with record-specific authenticated context. HTTPS protects transport. This is not end-to-end encryption: the server decrypts messages after checking the current participant and lead permissions. Revoked participants and inactive users lose access; linking a lead does not grant lead access. Keep previous keys configured through the documented key rotation contract when rotating existing data.

No database migration or recalculation is required for the team-only interface. Existing team messages, participants, unread markers and idempotency keys are preserved. For installations missing the Inbox tables, follow the additive `npm run db:prepare:inbox` workflow before using messaging.

## Workspace tour

Open Settings → Workspace guide or use the link in My profile. Start at the beginning or choose a stop. The tour opens actual pages with a visible highlight and a compact movable-through guide card; users can interact with the page, minimize the card or close with Escape. Back and Next navigate real routes. A scoped lead-notes stop is included only when an accessible lead exists. Stops follow the current account’s permissions.

Progress is retained in session storage per user and guide version during navigation. Completion is recorded per user, role and version. Replaying the tour does not create leads, notes, tasks, messages or payments. The completion version was raised to 2; previous completions remain stored.

## Validation

Tests use migrated Postgres-compatible PGlite databases and fictional users. They check encryption, participant-only access, group membership, removed members, lead reassignment, idempotent sends, unread progression, team-only runtime policy, hidden historical mail, permission-aware guide destinations and user/version-scoped tour progress. Validate browser navigation and small-screen layouts before release. Never send test messages to real staff without their authorization.
