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

Available lead-capture paths include built-in forms, key-protected generic webhooks, verified Meta lead intake, key-protected Google Ads lead intake, shared-secret TikTok lead intake, and verified LinkedIn lead intake. Sender and other email-marketing providers are adapter-ready only; no production email-marketing adapter is active. Their provider-neutral server contract is documented in [`EXTENSION_CONTRACTS.md`](./EXTENSION_CONTRACTS.md).

Mapped CRM migration currently normalizes the lead/contact object types listed in `src/lib/migrations/sources.ts`. Other exported objects may be retained for reconciliation but are not claimed as fully migrated.

## Pre-Migration Checklist

1. Back up the destination database.
2. Export every required source object and record the export time.
3. Validate files before commit and review rejected rows.
4. Resolve owner and stage mappings.
5. Commit into staging first for high-value migrations.
6. Compare source counts, destination counts, values, and sampled records.
7. Keep the raw export and import ledger for the agreed retention period.
