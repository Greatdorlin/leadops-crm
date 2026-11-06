# Data lineage and quality contract

Each client deployment owns its PostgreSQL database. This document traces runtime data and operational ownership. It describes the existing application plus the hardening tests; it does not claim that an external orchestration service or live provider account is provisioned.

| Entry point | Durable input | Transformation | Output and evidence |
| --- | --- | --- | --- |
| Public builder form | forms, form_fields, form_rules, form_submissions | Validate active public form, visible fields, field types and conditional answers; evaluate routing/offer rules | Lead, custom values, opportunities, tasks and audit events; submission records processed/failed state |
| Configured intake/webhook form source | form_sources, form_field_mappings, lead_intake_events | Verify source access, map allowlisted fields, normalize identity and assignment | Leads and intake status/history |
| Provider callback | lead_source_payloads | Verify provider signature/secret, fetch details where needed, normalize provider identity/attribution, deduplicate | Lead plus provider/source identity; failed payloads retain retry metadata |
| Manual lead entry/update | Validated admin request | Permission/scope checks, identity normalization and workflow resolution | leads, lead_events and field values |
| CSV/import tooling | data_imports, data_import_records | Validate, map, preview and commit batches according to selected mode | Per-row outcomes and imported/updated/skipped/failed counters |
| Qualification for a product | lead_opportunities | Validate ownership, per-offer status/reason, money/currency and saved exchange rates; calculate rollup | Per-offer records, lead summary values, optional call tasks and audit events |
| Dashboard/reports | Leads, stages, opportunities, campaign metrics, sales targets | Apply permission scope, exclude trashed/closed/lost values as defined by the report, aggregate currencies using configured rates | Read-only report models; aggregate SQL regression tests |
| Client configuration | company_settings, branch/team/department, custom fields, stages, sources | Validate settings and archive removed configuration | Persisted configuration; runtime reads preserve client customization |

## Identity and duplicates

External source identity is retained on the lead. The database enforces unique source/external ID and Facebook leadgen ID where present. Normalized email/phone matching is used by intake to find a candidate duplicate. Do not infer that every person with the same phone/email is always the same opportunity; separate product opportunities belong to the retained contact. Some capture paths deliberately allow a new record. Account for this in client import policy.

Public builder submissions carry a stable ID for retry recovery. Lead creation from a submission uses a transaction and row lock; completed submissions return their existing lead. A retry must reuse the original submission ID. Payload replay and provider identity matching must preserve attribution and avoid a second identity record. Automated tests cover both pure validation/routing rules and SQL persistence paths; live provider retries must also be tested in the client's sandbox.

## Workflow and value

Contact state and offer qualification are separate concerns. A lead can be unsuitable for one product and qualified for another. Offer statuses and exclusion reasons are stored per opportunity. Do not mark the contact globally lost solely because one offer is unqualified.

Open pipeline excludes lost/closed outcomes according to the reporting contract. Marking a lead lost must remove its open pipeline contribution while preserving historical estimated value and audit history. The SQL suite verifies this persisted transition. Currency is explicit; a value in another currency must use a stored/configured exchange rate or remain unavailable to the global rollup. Never relabel a foreign amount as the reporting currency. No Naira equivalent is required by the global money contract.

## Transactions, constraints and migrations

Database constraints enforce foreign keys, source identifiers, valid opportunity ranges and form configuration bounds. Application Zod validation supplements these constraints and permissions; SQL typing alone does not validate an HTTP request. Workflow changes and audit events share a transaction where implemented. An external HTTP provider call is not part of a database transaction and cannot be rolled back by PostgreSQL.

Schema modules live in src/lib/db/schema with a stable schema.ts export. Storage operations live in focused src/lib/storage/neon-* modules behind the existing NeonLeadStore facade; its database factory can carry the same transaction executor through calls. The class name is a compatibility name, not a hosting requirement.

Migration SQL is the historical lineage. Do not regenerate an existing client's schema from only the latest TypeScript definitions. Use npm run db:migrate, a session-compatible connection, a tested backup and a restored rehearsal database. The runner validates applied hashes and commits each version atomically. The regression suite migrates an empty in-process PostgreSQL database, reruns without changes, rejects tampered history, and verifies rollback of a failing version.

## Ownership and operational checks

The agency/client operator owns credential rotation, provider permissions, retention, backup schedules, restoration rehearsals, delivery monitoring and failed-intake triage. The application retains operational records; this document does not assign a universal lawful retention period. Agree client-specific retention and deletion requirements in the deployment contract.

Before acceptance, send one consented synthetic test lead through each enabled source. Confirm: one durable intake/submission, expected normalized contact, correct owner/stage, per-offer qualification, task generation, visible audit history, report contribution, and retry recovery. Then exercise a denied user and confirm it cannot read or mutate another scope. Record actual provider test IDs and timestamps in a private handover, without copying tokens or customer payloads into this repository.

Monitor failed payloads, failed intake events, stalled sync jobs, health status and server error counts. Logs intentionally omit raw payloads and sensitive exception values. Investigate using record IDs through the authorized CRM/database workflow. A healthy `/api/health` checks database connectivity and configuration; it does not prove provider delivery, migration completeness, or backup restoration.
