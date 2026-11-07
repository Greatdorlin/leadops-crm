# Workspace fixes, 7 November 2026

Yapper now removes conversational wrappers from lead searches and checks matches against the lead's name, email or company. A failed search returns no records. Both the main question field and note composer show a clear no-result message.

Note questions read the same lead_notes records shown on lead pages. Users can ask about a named lead, a common objection topic, an exact quoted phrase, a recent period or a standard lead stage. Results include dated excerpts and links to the source lead. Current CRM permissions and deleted-lead filters apply before note content is read.

The built-in response groups recognizable wording and retrieves matching notes. Open-ended language interpretation still uses the user's connected external AI client. Neither a paid model nor a separate AI subscription was added to this release.

The target ring shows completion up to 100%. An over-target percentage appears as separate text below it, where it can fit without breaking across lines. Remaining value keeps its target currency visible when that differs from the workspace currency.

Six known fictional demo records received smaller sales values. Their original amounts were recorded in lead history before the update. The named November demo target is EUR 25,000, matching the current reporting currency. Sample sales notes are explicitly labelled “Demo scenario”. No historical lead or note was deleted.

Industry setup now has a searchable industry list, an inline preview and field selection. Existing fields show their saved type and archive state. New fields are optional; applying a preset again preserves saved records and does not create duplicate fields. Field selection and same-origin checks apply on the server too.

Appearance settings are divided into sections with a sample workspace preview, an unsaved-change indicator and a discard action. Mobile save controls stay within the viewport. Theme changes still require Save; browsing a preset does not save it for the team.

Settings includes a readable installation guide and a downloadable INSTALL.md. System status links now lead to actual guide sections. The guide covers an empty database, owner activation, hosting, mailbox setup and backups, with separate instructions for historical database updates.

Verification covers the no-match search path, scoped and dated note retrieval, MCP calls, lint, types, migration drift, dependency checks and the production build. Live UI observations and deployment identity are recorded in the handover once release checks finish. A test database and observed browser layouts do not certify a physical iPhone, external mailbox delivery, a customer's backup restore or a fresh VPS/Workers deployment.
