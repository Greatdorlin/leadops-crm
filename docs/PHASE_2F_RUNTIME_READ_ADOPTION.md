# Phase 2F: Runtime Read Adoption

## Goal

Adopt normalized-first reads on low-risk admin lead surfaces without changing the main write path.

## Surfaces Updated

- `/admin/leads`
- `/admin/leads/trash`
- `/admin/team` for the unassigned lead queue
- `/admin/leads/[id]`

## What Changed

- admin lead list and trash views now prefer normalized stage, source, and owner labels when related records exist
- admin lead detail now prefers normalized stage, source, and owner labels when related records exist
- admin lead detail now reads custom field display values from `custom_fields` and `lead_custom_field_values` when data exists
- shared admin lead view models now centralize these display-safe values so related exports and summaries can adopt them incrementally

## Fallback Rules

1. Prefer normalized `lead_stages`, `lead_sources`, and `crm_users` records when IDs are present and matching rows exist.
2. Fall back to legacy `crmStatus`, `source`, and `assignedTo` when normalized data is missing.
3. Hide archived custom fields by default.
4. Keep empty custom field output safe when no normalized custom field data exists.

## What Did Not Change

- no write-path cutover
- no automatic seeds
- no automatic backfills
- no webhook runtime
- no custom field CRUD
- no form-source CRUD
- no legacy column removal or rename

## Read Boundary Notes

- `LeadRecord` now carries optional normalized IDs for read adoption
- the current store mapper now preserves `stageId`, `sourceId`, and `assignedUserId`
- `loadAdminLeadReadContext()` loads related normalized rows without mutating runtime persistence

## Next Phase Direction

Phase 2G should focus on controlled write-path preparation for normalized stage, source, and owner links while keeping dual-read safety intact.

## Actual Phase 2G Outcome

Phase 2G instead prioritized custom field CRUD foundation to unlock business-specific field definition before lead write-path cutover. Normalized stage/source write preparation remains a later follow-up.

## Phase 2H Follow-Through

Phase 2H builds on the Phase 2F read layer by making custom field values usable in manual admin flows:

- lead detail still uses normalized-first custom field display values
- manual lead capture now writes custom field values after the inherited lead create path succeeds
- lead profile editing now writes custom field values after the inherited lead update path succeeds

Normalized stage/source write cutover is still deferred.
