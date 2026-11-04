# CRM Migrations And Connectors

## Migration Contract

The interactive migration path supports mapped CSV exports from HubSpot, Zoho CRM, Salesforce, Pipedrive, and generic spreadsheets.

Current guarantees:

- every source row is staged before it can be committed
- original source columns remain in the import ledger, including unmapped cells
- invalid rows are isolated instead of blocking valid rows
- each committed row is atomic across the lead, owner, stage, value, custom fields, events, and ledger result
- batches are resumable and safe against duplicate commit requests
- prior lead and custom-field values are retained before an existing record is updated
- unknown legacy owners are reported and are never guessed

Current normalized objects are listed in `src/lib/migrations/sources.ts`. Objects marked archive-ready are not yet normalized into product tables. Do not promise a complete notes, activities, attachments, or deal-history migration until the relevant adapter and reconciliation report are implemented and tested for that source platform.

Large migrations should use a worker deployment that consumes the same staged ledger. The browser path validates up to 10,000 rows and commits in bounded, resumable batches controlled by `CRM_IMPORT_COMMIT_BATCH_SIZE`.

## Connector Status

`src/lib/integrations/connector-registry.ts` is the source of truth for customer-visible status:

- `available`: a working setup or intake path exists
- `mapped_import`: loss-aware file migration exists
- `adapter_ready`: the provider-neutral contract exists, but credentials and a production adapter are still required
- `planned`: not presented as connected

Every `available` catalog entry must link to a real setup path and health path. Connectors with retained failed deliveries must also link to their retry controls. Environment values alone indicate setup readiness, not a healthy or tested connection.

Available lead-capture paths include built-in forms, key-protected generic webhooks, verified Meta lead intake, key-protected Google Ads lead intake, shared-secret intake from a TikTok-capable relay, and verified LinkedIn lead intake. Sender and other email-marketing providers are adapter-ready only; no production email-marketing adapter is active. Their provider-neutral server contract is documented in [`EXTENSION_CONTRACTS.md`](./EXTENSION_CONTRACTS.md).

Mapped CRM migration currently normalizes the lead/contact object types listed in `src/lib/migrations/sources.ts`. Other exported objects may be retained for reconciliation but are not claimed as fully migrated.

## Connector Activation

Store credential values in the deployment environment. The guided setup page for each connector shows its callback URL. After applying the deployment environment, verify account access separately from webhook delivery.

| Connector | Prerequisites | Activation check |
| --- | --- | --- |
| Meta Lead Ads | Page access token with lead retrieval access, app secret, and webhook verify token. Subscribe the correct Page to leadgen. | Verify Page token access, then send a Meta test lead and confirm a CRM record and processed delivery. |
| Google Ads | Shared webhook key in Google Ads and the deployment. For reporting, add OAuth client credentials, a refresh token, developer token, customer ID, and manager ID if applicable. | Use Send test data to confirm processing without creating a lead. Verify campaign reporting separately against the chosen customer. |
| LinkedIn | Approved Lead Sync access, client secret, access token, and the authorized sponsored account or organization URN. Register a Lead Sync subscription for that owner. | Verify the owner through Lead Sync, then send a provider test and confirm a processed delivery. LinkedIn test leads do not create CRM records. |
| Google Sheets | Enable the Sheets API, configure the service account, spreadsheet ID, and exact tab name. Grant Viewer for imports or Editor for exports. | Verify the tab, then import one test row and export to a dedicated test tab if export is required. Export replaces lead data in the destination tab. |
| TikTok | A relay that can retrieve the TikTok Instant Form answers. Forward the lead ID and answers to the Leads Desk callback with the shared secret in the `x-leads-desk-webhook-secret` header. | Send a TikTok test lead through the relay and confirm it appears with the expected fields. |

## Pre-Migration Checklist

1. Back up the destination database.
2. Export every required source object and record the export time.
3. Validate files before commit and review rejected rows.
4. Resolve owner and stage mappings.
5. Commit into staging first for high-value migrations.
6. Compare source counts, destination counts, values, and sampled records.
7. Keep the raw export and import ledger for the agreed retention period.
