# Yapper, personal MCP connections and product qualification

## What ships

Leads Desk has a configurable workspace assistant named **Yapper** by default. The built-in assistant searches authorized CRM leads, provides a staff sales-performance ranking, and helps prepare contact notes. These shortcuts use ordinary database queries and structured forms; they are not a general-purpose language model. Broader reasoning runs in the user's own MCP-capable AI tool.

There is no Leads Desk model API key, paid inference endpoint, AI credit balance, or proxy to a shared model account. Hosting/database costs remain. ChatGPT, Claude and other clients have their own plan availability, usage limits and workspace policies; do not promise every free account can add every kind of connector.

Open **Talk to Yapper** from any workspace page, or `/assistant`. Personal naming is under **Settings → Assistant** (`/settings/assistant`). A personal name affects that user only. The workspace owner can set a default and enable **Use this name for everyone**, which overrides personal names until unlocked. Saved names appear on the next load; the current user's launcher refreshes immediately.

## Grant access

Assistant access is separate from normal CRM access. It is off for every member until the workspace owner grants it. Owners are resolved through the same stored CRM role policy as the rest of the product, including the legacy database `admin` role displayed as Owner. Owner access does not depend solely on an environment bootstrap email. Managers, team leads, sales reps, finance and affiliates still require an explicit grant. Inactive accounts and preview sessions remain denied.

The owner uses **Settings → Assistant → Who can use the assistant?** to choose:

- No access.
- Read only.
- Read + propose changes.

The owner's grant is a ceiling, not a replacement for CRM permissions. Every MCP request reloads the active stored user, role permissions, user overrides and scope. A rep with access to their own leads cannot read another rep's leads through search, direct ID lookup, reports or proposed changes. Reports require the existing report permission. Deactivated users are denied. Preview/impersonation sessions cannot create personal connections.

Saving a grant increments its generation, revokes the member's existing tokens and codes, and rejects pending changes. They must reconnect. A user may also disconnect their own named AI connection. Removing a CRM permission or changing ownership/scope affects the next request or approval. Already-returned information cannot be recalled from an external AI conversation; access revocation prevents subsequent retrieval, not copies the user already authorized.

## Connect an AI tool

1. Open `/assistant` and copy the **MCP URL**. It uses this deployment's configured public HTTPS origin, never a hardcoded hosting vendor.
2. In an MCP-capable client, add a remote/custom connector and paste the URL. Select OAuth and automatic client registration where offered. The client must support PKCE S256. Public clients and registered confidential clients using client_secret_post or client_secret_basic are supported. In Claude, choose **Register automatically**; published client identity metadata URLs are not fetched by this server.
3. Sign in to Leads Desk as yourself. Review the external client's displayed name and callback origin. Client names are self-reported, not verified vendor identities.
4. Review read access. If both your owner grant and CRM role permit it, optionally allow proposed changes for this connection. Write access is unchecked by default.
5. Finish the connection in the AI client. Use prompts such as:
   - “Who has the highest won revenue in the leads I can see? State the period and metric.”
   - “Find Mathew. If more than one lead matches, ask me which one.”
   - “Prepare a note for this lead: I contacted Mathew and he said he will make his payment next week.”
6. Open **Talk to Yapper → Review proposed changes** to check the target lead and approve or reject. Nothing is written to the lead merely because the model proposed it.

Current tools: `workspace_context`, `search_leads`, `get_lead`, `staff_performance`, `propose_lead_change`, `get_change_status`. Context supplies reporting currency, time zone and the current time. Reads are bounded and raw intake/source payloads, credentials, unrelated settings and unrestricted exports are excluded. Staff ranking is by all-time won revenue, then won deal count, within the caller's visible leads. It is an operational sales summary, not an employment assessment.

Writes are limited to a note, a follow-up task assigned to the requesting user, or a lead priority. The MCP server cannot execute SQL/code, grant permissions, delete records, send messages or mark a promised payment as received. The user approves in the CRM, with current permission and record checks repeated. Proposals expire after 15 minutes. A request UUID deduplicates retries; the approval row lock and transaction prevent duplicate notes/tasks from repeated approval requests. Record changes, approval results, access changes and model tool usage have audit records without raw tokens or note contents in telemetry.

## OAuth and transport details

- Streamable HTTP MCP endpoint: `/api/mcp`. Stateless JSON responses; GET/SSE is not required and returns 405 after authentication.
- Protected resource discovery: `/.well-known/oauth-protected-resource/api/mcp` (also available at the root discovery path).
- Authorization server discovery: `/.well-known/oauth-authorization-server`.
- Explicit authenticated consent, exact registered HTTPS redirect matching and PKCE S256. No shared bearer key or anonymous read/write fallback.
- Authorization codes are hashed, single use, client/redirect/resource-bound and expire after two minutes.
- Opaque access tokens are hashed in storage, resource-bound and valid for 15 minutes. Optional `offline_access` refresh tokens rotate, expire after 30 days, and detect replay by revoking the entire token family.
- Dynamic client registration is size-bounded and rate-limited per source and globally. Registering a client grants no CRM access. Metadata URLs are not fetched, preventing arbitrary server-side callback discovery.
- MCP uses bearer auth only; a browser session cookie cannot authenticate an AI client's request. Browser mutation routes require a matching Origin. Cross-origin bearer requests are restricted to the app origin, supported chat origins or the registered callback origin.
- Database failures deny access; assistant role lookup does not fall back to broader permissions on failure.

No client-specific connector installation in a real ChatGPT or Claude account is implied by protocol tests. Each customer's account policy and consent flow must still be accepted there.

## Products and quick qualification

Owners/admins with settings permission manage products under **Settings → Products and offers** (`/settings/products`). Store a name, optional description, potential value, currency and default close probability. An empty catalog offers three clearly marked editable example products. They use the workspace currency. Changing or archiving a preset never rewrites existing lead opportunities.

On a lead, use **Offer opportunities → Add a preset product**, choose the product, review its copied values and save offer tracking. New instances get an independent value, currency, probability and outcome. Product labels and amounts are snapshots, so history remains meaningful when the catalog is edited.

Selecting **Unqualified** in a quick stage dropdown or the main stage control opens a compact choice:

- **One product**: choose an existing open offer or a catalog product and give a short reason. Other offers remain unchanged.
- **All current products**: mark the lead's current open offers unqualified. Won and lost outcomes remain history. This does not prohibit a new or future product from being qualified.

The generic workflow endpoint rejects a whole-lead unqualified stage. Bulk stage changes also exclude it: product qualification must be reviewed per lead. **Lost** retains the existing whole-lead close behavior and excludes every offer's open value from pipeline calculations.

Only active, qualified and on-hold offers contribute to pipeline. Qualification uses the existing transaction and reporting rollup. For example, USD500 at 50% plus USD2,500 at 40% gives USD1,250 expected pipeline; disqualifying the first product leaves USD1,000; disqualifying all current offers leaves zero. Raw potential amounts remain on the opportunities for history. No naira equivalent is required; the existing reporting-currency conversion rules still apply when currencies differ.

## Deployment and persistence

Migration **0028** adds dedicated assistant settings, member grants, OAuth clients/codes/tokens, approval rows and a product catalog. It does not change existing lead, note, task or payment columns. All grants default off; no customer credentials or live AI connections are seeded.

Fresh installations run the standard journalled `npm run db:migrate`. For an existing installation whose historical migration journal has not been reconciled, `npm run db:prepare:assistant` applies only the additive 0028 DDL in a transaction under the same migration advisory lock. It never replays old client migrations or writes a fabricated historical journal. The DDL is repeat-safe, accepts all seven tables already present, and fails on a partial feature schema. Later normal journalled migration 0028 safely recognizes the prepared tables. Rehearse against a restored database and keep backups before client rollout.

Configure the public HTTPS base URL using the existing `CRM_PUBLIC_BASE_URL`, `NEXTAUTH_URL` or `NEXT_PUBLIC_APP_URL` contract. No new provider secrets are required. The same Node/PostgreSQL routes operate in the existing container/VPS deployment model. Native Cloudflare Workers compatibility remains a separately tested hosting target.

## Verification

The test suite includes a real in-process PostgreSQL database for opt-in grants, own-lead scope, read-only restrictions, permission changes, note approval idempotency, reassignment, OAuth redirect/resource/PKCE binding, code reuse, refresh rotation/replay, revoked generations, product-specific arithmetic and repeat-safe schema preparation. The official MCP TypeScript SDK is used as a development-only interoperability client to initialize, discover tools, search and propose a change against the actual route handler.

Release evidence should record lint, explicit typecheck, full tests/coverage, audit, drift and build separately from live browser acceptance. A successful SDK test does not certify all third-party client versions or account policies.


## Availability and calmer assistant workspace — 6 November update

The assistant home focuses on an ask field, three task shortcuts, relevant results and explicit change review. The note composer opens only when requested or a lead is selected. Connection setup and team access live in collapsed settings disclosures. A direct Connect ChatGPT or Claude link opens the connection disclosure. The launcher is absent from assistant pages and compact on mobile.

Owners can use **Settings → Assistant → Turn off assistant**. This disables native assistant requests and MCP access for everyone, including owners, while retaining owner settings access to turn it back on. Turning it off revokes issued AI tokens, discards unredeemed authorization codes and rejects pending proposals; turning it back on does not revive those connections or proposals. Saved CRM notes and other business records remain intact. Other roles cannot change availability. Each user can independently hide their shortcut without changing their assistant permissions.

Migration **0029** adds the workspace enabled flag and personal shortcut preference, both defaulting true to preserve the existing installation. For the prepared existing deployment, `npm run db:prepare:assistant-controls` applies only these repeat-safe additive columns before code promotion. Fresh installations use the normal migration runner. The availability regression exercises a real OAuth token, owner/member denial while off, non-owner toggle denial, rejected approval, no note write, re-enabling and permanent token revocation.
