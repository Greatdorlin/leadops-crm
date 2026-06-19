# Phase 2D Custom Fields And Intake Schema

## Outcome

Phase 2D adds the additive schema foundation for Leads Desk custom fields and dynamic form intake using the existing Drizzle migration workflow.

## Tables Added

- `custom_fields`
- `custom_field_options`
- `lead_custom_field_values`
- `form_sources`
- `form_field_mappings`
- `lead_intake_events`

## Migration Status

- generated through `npm run db:generate`
- migration file: `drizzle/0006_red_guardsmen.sql`
- additive only
- no legacy table or column removal

## Runtime Status

These tables are schema-ready only.

Not wired yet:

- custom field CRUD
- form source settings
- mapping UI
- webhook endpoint
- automatic intake processing
- notification triggers

## Design Decisions

### Custom field values

`lead_custom_field_values.value` uses `jsonb`.

Reason:

- custom values may be text, numbers, dates, booleans, or arrays
- the existing stack already uses `jsonb` safely
- this avoids premature serializer complexity

### Intake payloads

`lead_intake_events.raw_payload` and `normalized_payload` use `jsonb`.

Reason:

- raw intake payloads vary widely across sources
- future debug and audit tools need the original shape preserved
- normalized payloads may still contain flexible structures before final lead mapping

## Foreign Keys And Indexes

Added foreign keys where low-risk and self-contained:

- `custom_field_options.custom_field_id` -> `custom_fields.id`
- `lead_custom_field_values.lead_id` -> `leads.id`
- `lead_custom_field_values.custom_field_id` -> `custom_fields.id`
- `form_field_mappings.form_source_id` -> `form_sources.id`
- `form_field_mappings.custom_field_id` -> `custom_fields.id`
- `lead_intake_events.form_source_id` -> `form_sources.id`
- `lead_intake_events.lead_id` -> `leads.id`

Deferred:

- foreign keys from `form_sources.default_*` columns to stages, users, teams, branches, and departments

Reason for deferral:

- those defaults are nullable and not runtime-active yet
- keeping them loose reduces transition risk while the dual-read runtime does not exist yet

Added low-risk indexes for:

- custom field keys and archived state
- option ownership
- lead custom field lookup
- form source type, webhook key, and active state
- form field mapping ownership
- intake event source, lead, status, and created time

## Industry Support

This schema now supports future client-specific intake like:

- real estate property and budget fields
- insurance coverage and renewal fields
- training and coaching preference fields
- travel and education timeline fields
- service-business urgency and appointment fields

without changing the core `leads` table for every client.

## Legacy Compatibility

Legacy assessment and pathway fields remain because they still support:

- inherited records
- old tests
- current admin compatibility
- public assessment/report flows

New Leads Desk schema work in this phase does not depend on those legacy modules.

## Next Phase Direction

Phase 2E should focus on:

1. manual seed helpers for stages, sources, and recommended custom fields
2. safe backfill scaffolds for stage, source, and intake relationships
3. dual-read helpers for normalized stage/source/custom-field data
4. keeping legacy and neutral paths readable side by side before write cutover

## Follow-on Status

Phase 2E has now added the planned helper layer for:

- manual seeding
- dry-run backfill planning
- dual-read preparation

Custom-field and intake tables are still not wired into live admin or intake runtime behavior.

## Phase 2G Follow-on Status

Phase 2G now wires custom field definitions into live admin settings runtime for:

- field CRUD
- option CRUD through archive-first updates
- owner/admin permission enforcement

Lead custom field values, form sources, and intake events are still not editable through runtime UI in this phase.
