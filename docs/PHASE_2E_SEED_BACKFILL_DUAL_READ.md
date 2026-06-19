# Phase 2E Seed, Backfill, And Dual-Read Preparation

## Outcome

Phase 2E adds the bridge layer between the inherited runtime and the new Leads Desk schema without changing the active write path.

## Manual Seed Helpers Added

Added:

- `src/lib/db/seed-defaults.ts`

This provides:

- `buildLeadsDeskDefaultSeedPayload()`
- `seedLeadsDeskDefaults()`

Supported manual seed groups:

- default lead stages
- default lead sources
- optional recommended general custom fields

Important:

- nothing runs automatically on startup
- no package script was added
- mutation only happens if a developer explicitly calls the helper

## Backfill Scaffolding Added

Added:

- `src/lib/db/backfill-plan.ts`

This provides dry-run planning helpers for:

- `crmStatus -> stageId`
- `source -> sourceId`
- `assignedTo -> assignedUserId`
- deferred form-source linkage planning

The backfill planners:

- only consider missing normalized fields
- do not guess ambiguous user matches
- report unresolved values and warnings
- return counts and update previews without mutating the database

## Dual-Read Helpers Added

Added:

- `src/lib/crm/read-adapters.ts`

This provides:

- `resolveLeadStageDisplay()`
- `resolveLeadSourceDisplay()`
- `resolveLeadOwnerDisplay()`
- `buildCustomFieldDisplayValues()`
- `resolveFormSourceDisplay()`
- `resolveIntakeEventStatusLabel()`
- `summarizeIntakeEvent()`
- `buildLeadSalesCommandReadModel()`

Strategy:

1. prefer normalized stage/source/custom-field data when available
2. fall back to legacy fields when normalized data is missing
3. keep safe default labels when neither path is present

## Custom Field Display Preparation

`buildCustomFieldDisplayValues()` prepares a stable read shape for future UI work.

Current behavior:

- archived fields are hidden by default
- values are converted into safe display strings
- no UI or filtering runtime is introduced yet

## Runtime Status

Still not runtime-active:

- automatic seeds
- automatic backfills
- custom field CRUD
- custom field rendering in admin pages
- form mapping UI
- webhook endpoint
- intake processing

## Next Phase Direction

Phase 2F should begin controlled runtime adoption by:

1. introducing low-risk normalized stage/source reads into selected admin surfaces
2. adding safe manual execution wrappers for seed and backfill helpers
3. preparing selective dual-write or joined-read paths where tests prove stability

## Phase 2F Outcome

Phase 2F completed the first selective runtime adoption step:

- admin lead list and trash views now use normalized-first stage and source labels when possible
- admin lead detail now uses normalized-first stage, source, and owner labels when possible
- admin lead detail now reads custom field display values from normalized tables when possible

Writes remain unchanged, and all updated surfaces still fall back safely to legacy lead fields.
