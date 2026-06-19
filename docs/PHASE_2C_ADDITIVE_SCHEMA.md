# Phase 2C Additive Schema Foundation

## Outcome

Phase 2C adds the first neutral Leads Desk schema objects through the existing Drizzle system while preserving the inherited runtime.

## Existing Schema System Used

- schema source: `src/lib/db/schema.ts`
- migration generator: `drizzle-kit`
- generated SQL folder: `drizzle/`
- Phase 2C migration file: `drizzle/0005_useful_jane_foster.sql`

No new migration system was introduced.

## Schema Objects Added

New tables:

- `branches`
- `departments`
- `teams`
- `lead_stages`
- `lead_sources`

New additive `leads` columns:

- `company_name`
- `source_id`
- `stage_id`
- `campaign_id`
- `campaign_label`
- `assigned_user_id`
- `team_id`
- `branch_id`
- `department_id`
- `estimated_value`
- `expected_value`
- `won_value`
- `close_probability`
- `expected_close_date`
- `won_at`
- `lost_at`
- `lost_reason`
- `next_follow_up_at`
- `archived_at`

## Runtime Activation Status

Currently runtime-active:

- the existing legacy `leads`, `lead_events`, `lead_notes`, `lead_tasks`, and `crm_users` paths remain active

Currently schema-ready but not wired into production runtime:

- `branches`
- `departments`
- `teams`
- `lead_stages`
- `lead_sources`
- all new additive `leads` columns

## Why Legacy Columns Remain

Legacy columns still power:

- inherited admin pages
- legacy lead loading and exports
- public assessment and report compatibility
- storage-layer tests

They remain in place to avoid breaking current runtime flows while new Leads Desk runtime work is still deferred.

## Default Stage And Source Plan

Phase 2C adds explicit default seed metadata in:

- `src/lib/db/defaults.ts`

This includes:

- default Leads Desk stage rows
- default Leads Desk source rows
- stage backfill plan
- source backfill plan
- assigned-user resolution rule

These defaults do not auto-seed production.

## Backfill Plan

Planned later backfill behavior:

- `crmStatus` -> `lead_stages.key`
- `source` -> `lead_sources.key`
- `assignedTo` -> `assigned_user_id` where `crm_users.email` can be matched safely
- `primaryGoal` stays deferred to custom-field migration
- `readinessLevel` stays deferred to fit-signal custom-field or derived summary work

Backfill is not run in Phase 2C.

## Safety And Rollback Notes

- no legacy column was removed
- no legacy column was renamed
- no new required relation was introduced
- no foreign keys were added for the new neutral tables or new `leads` ownership columns
- all new `leads` additions are nullable
- if rollback is needed, Phase 2C changes are isolated to one additive migration file

## Next Phase Direction

Phase 2D should focus on:

1. controlled seed and backfill tooling
2. normalized stage and source read helpers
3. careful runtime adapters that can read new and legacy fields side by side

## Follow-on Status

Phase 2E has now added:

- manual seed helpers
- dry-run backfill planning
- normalized-first dual-read helpers

The active runtime still remains on legacy write paths.
