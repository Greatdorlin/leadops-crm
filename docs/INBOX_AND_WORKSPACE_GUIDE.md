# Inbox and workspace guide

Leads Desk is a private deployment for one client and one database. Inbox adds private team conversations and an optional shared sales email connection. It does not expose every message to the workspace owner.

## Everyday use

1. Open **Inbox** from the workspace navigation.
2. Choose **New conversation**, select teammates, and write a subject and message.
3. Optionally link a lead. Every participant must already have access to it.
4. Open a conversation to read its messages and clear its unread count.
5. The conversation creator or a participating owner can add or remove teammates. An owner outside the conversation cannot open it or grant themselves access through Inbox.

The desktop view shows conversations alongside the selected conversation. On mobile, the list and conversation use separate views with a Back control. Messages load in bounded pages; older messages remain available through **Load earlier messages**. The page checks for updates while visible and on focus. This is polling, not guaranteed instant push delivery.

## Connect customer email

The owner opens **Connect mailbox**. Provide the sending address, login and password. Hostinger server defaults are supplied as a convenience; Advanced settings accept another provider's public SMTP/IMAP servers. Supported ports are SMTP 465 or 587 and IMAP 993 or 143, always with TLS or required STARTTLS and certificate verification.

The connection is saved only after both outgoing and incoming servers verify successfully. A disconnected workspace cannot claim email is ready or send customer email. Re-enter passwords when changing a server or username; saved passwords are never returned to the browser.

To start an email, choose a lead with one valid email address. Replies are grouped only when their references match and the sender matches that conversation's customer. Unmatched incoming mail starts an owner-only conversation; it is not automatically shared with all staff. The owner can add appropriately authorized participants.

SMTP acceptance is shown as **Accepted by mail server**. This is not proof of final delivery. A confirmed rejection can be retried manually. If a connection is lost after a send attempt and acceptance is uncertain, the message becomes **Delivery unconfirmed—check your mailbox** and is never automatically resent. Deterministic message identifiers and atomic claims prevent duplicate sends from ordinary retries.

The initial sync imports the latest 50 emails, then resumes by IMAP UID in batches of 50. UID validity changes trigger a new bounded import. Provider identifiers and message identifiers prevent duplicate imports. Sync reads INBOX without deleting messages or changing read flags. HTML becomes plain text; remote images and tracking resources are not rendered. Attachments remain in the original mailbox. Large/truncated emails are labelled; this is not an attachment management or full mailbox replacement product.

## Protection and client isolation

- Invite-only CRM authentication and active-user checks apply to every Inbox request.
- A participant must still have access to a linked lead. Reassignment, trashing, account deactivation and participant removal block subsequent requests.
- Subject, customer recipient, message body and mailbox credentials use AES-256-GCM encryption in Postgres. Fresh random nonces and record-specific authenticated context prevent ciphertext being copied between records.
- Participant IDs, lead links, timestamps, channel, delivery state and audit metadata remain queryable metadata. Audit entries omit message bodies and credentials.
- HTTPS protects browser transport. Mail connections enforce TLS. **This is encryption at rest and in transit, not end-to-end encryption:** the application server decrypts authorized messages, and email providers handle email content.
- Each client deployment needs its own database, encryption key, mailbox and job secret. Never share keys across clients.
- Outgoing and incoming hosts must resolve to public network addresses. DNS answers are checked, the selected public address is pinned, and TLS verifies the original hostname. Local/private server addresses are rejected.

## Deployment and operations

Set these server-only environment values:

| Variable | Purpose |
| --- | --- |
| `CRM_INBOX_DATA_KEY` | Unique 32-byte key encoded as canonical base64. Generate with `openssl rand -base64 32`. Keep an encrypted backup with database backups. |
| `CRM_INBOX_PREVIOUS_ENCRYPTION_KEYS` | Optional comma-separated previous keys, retained while old ciphertext still needs them. |
| `CRM_INBOX_SYNC_SECRET` | Independent random secret of at least 32 characters for the sync job endpoint. |

Never use `NEXT_PUBLIC_` names for these values. Losing the encryption key makes existing encrypted content unreadable; a database backup alone is insufficient. Restore the matching key set during client migration. Key rotation requires retaining old keys until all old records have been re-encrypted; this release does not provide a bulk re-encryption command.

For a fresh database, follow the normal `npm run db:migrate` workflow. For the existing deployment upgrade, `npm run db:prepare:inbox` applies only additive migrations 30 and 31 under an advisory lock, without replaying historical production migrations or modifying lead values. Both scripts are repeat-safe with these additions. Historical migration lineage remains intact.

For scheduled email sync, choose one:

- Run `npm run inbox:sync` through the host's scheduler on a Node 24 VPS/container.
- Configure an HTTPS scheduler to POST `/api/jobs/inbox-sync` with `Authorization: Bearer <CRM_INBOX_SYNC_SECRET>`.

The job drains never-attempted queued mail using fresh sender permissions, then imports incoming messages. Unconfirmed attempts are not retried. A two-minute lease prevents overlapping imports; a 30-second cooldown limits repeated sync. Owners can also sync in the app; an open owner Inbox checks email periodically. There is no claim that a scheduler has been provisioned for every client automatically.

The runtime uses `DATABASE_URL`, SMTP/IMAP configuration and standard Node facilities. Docker/VPS and Vercel deployments use the same application contracts. Cloudflare deployments must use the project's documented Next.js/OpenNext process and validate Node compatibility, Postgres connectivity and outbound SMTP/IMAP sockets in that runtime before enabling email. This release's transport tests do not certify a customer's Cloudflare network or mailbox. No Vercel-specific email service is required.

Before client activation, verify both mailbox servers with the client's credentials, send a consented test email to a controlled address, reply to it, sync it, check correct threading and permissions, and configure/observe the scheduler. Do not send testing emails to real prospects without authorization.

## Role-based workspace guide

The first dashboard visit opens a short guide tailored to the stored role and effective permissions: owner, admin, manager, team lead, finance, sales rep or affiliate. It explains the real workspace; it does not mutate business data or silently seed records.

Completion/skip is stored in Postgres per user, role and guide version, so it persists across devices. Replay from **Settings → Workspace guide** or **My profile → Workspace guide**. The profile entry remains available to users who cannot manage workspace settings. Role preview does not write another user's guide completion.

## Yapper questions and evidence

Native Yapper recognizes supported CRM questions without a paid inference API. Greetings such as “Hi who is performing the best” route to the sales report. The report explicitly ranks all-time won revenue and uses current CRM reporting scope.

“What objections do customers mention most?” reads the latest 1,000 accessible sales notes and counts distinct leads per recognizable theme: price/budget, readiness, trust/proof, product fit, competitors and approval. Results include note counts, excerpts and links to the supporting lead records. Repeated notes on one lead do not inflate the lead count. Trashed and out-of-scope leads are excluded in SQL before note content is read. Clear resolved/no-objection phrases are excluded by the recognizer.

This is a bounded phrase-based indicator analysis, not a general language model or a complete interpretation of every note. Different wording may not match. No-match responses say so explicitly. Unsupported questions receive guidance rather than a misleading lead-search result. For open-ended interpretation, authorized users can connect an external AI tool through MCP; its own account plan and consent apply. The MCP `sales_objections` tool shares the same scope enforcement and evidence limits.

## Validation evidence

Automated tests cover encryption/AAD/tampering/key rotation, owner-without-membership denial, participant removal, reassignment/deletion/inactive-user denial, idempotent requests, unread progression, mailbox verification failure, credential protection, SMTP acceptance/ambiguity/retry, incoming duplicate suppression, private address rejection, HTML-to-text parsing, role guide definitions and native question routing. Tests use migrated Postgres-compatible PGlite plus transport fakes; an external provider send/receive requires the client activation check above.
