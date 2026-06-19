# Leads Desk Custom Field Sync Architecture

## Purpose

Leads Desk must support custom fields across manual entry, imports, webhooks, and lead views without making every client request a schema change.

## Core Rule

- important shared lead fields remain real columns
- custom fields handle client-specific extensions

## Required Coverage

Custom fields should work in:

- lead forms
- imported leads
- generic webhook intake
- website form submissions
- WordPress form submissions later
- lead detail pages
- lead tables where enabled
- filters where practical
- reports where practical

## Sync Flow

1. identify form source
2. map external fields to core or custom targets
3. persist core fields on `leads`
4. persist custom fields in `leadCustomFieldValues`
5. keep source/campaign tracking separate from custom business fields

## Required Tables

- `customFields`
- `customFieldOptions`
- `leadCustomFieldValues`
- `formFieldMappings`

## Phase 2A Contract Status

Neutral custom-field domain contracts now exist in `src/lib/crm/domain/custom-fields.ts`.

This phase does not add tables or persistence yet.

## Phase 2B Translation Status

`docs/PERSISTENCE_MAPPING_PLAN.md` now distinguishes:

- what must stay as real lead columns
- what should move into custom fields
- what belongs in intake payload storage instead

No custom-field tables or runtime persistence changes have started yet.

## Phase 2D Schema Status

Phase 2D now adds:

- `custom_fields`
- `custom_field_options`
- `lead_custom_field_values`

Key design choice:

- `lead_custom_field_values.value` uses `jsonb` so future runtime can store text, number, date, boolean, and array-shaped values without per-type storage tables

Runtime CRUD, UI, and rendering are still deferred.

## Phase 2E Read Preparation Status

Phase 2E adds `buildCustomFieldDisplayValues()` in `src/lib/crm/read-adapters.ts`.

Current behavior:

- builds a stable display shape for future UI work
- hides archived fields by default
- does not introduce runtime CRUD or UI rendering yet

## Safety Rules

- archive custom fields instead of hard delete
- preserve historical values
- do not hide core business-critical fields inside one JSON blob
- keep search/filter support intentional

## Phase 2G CRUD Status

Phase 2G now adds the first custom field management runtime:

- admin settings page for lead field definitions
- API routes for list, create, update, archive, and restore
- option management for select and multi-select fields
- archive-first option handling instead of hard delete

Still deferred:

- editing lead-level custom field values
- form mapping runtime
- webhook intake
- custom-field filtering/search runtime on lead lists

## Phase 2H Runtime Value Status

Phase 2H now adds lead-level custom field value runtime for manual admin flows:

- active `showInForm` fields render in manual lead capture
- active `showInForm` fields render in lead profile editing
- values are validated against field type and active options
- values are written to `lead_custom_field_values`
- lead detail display uses the same formatting helpers for normalized output

Still deferred:

- import-time custom field value writing
- webhook and form-source mapping writes
- custom field filtering/search in lead lists
- lead-table custom field column management

## Phase 2I Operational Adoption Status

Phase 2I now expands custom field usage into:

- lead list and trash table display for `showInTable` fields
- lead exports with active custom field values
- CSV import header mapping by custom field label or key

Still deferred:

- webhook-based custom field capture
- form source mapping runtime
- custom-field-aware lead list filters
- broader reporting module adoption

## Phase 2J Mapping Management Status

Phase 2J now allows admins to select active custom fields as form-mapping targets from `/admin/settings/form-sources`.

Current behavior:

- archived custom fields do not appear in the mapping picker by default
- mappings can point to custom fields before webhook runtime goes live
- validation ensures custom mappings reference active field definitions

Still deferred:

- writing custom field values from webhook payloads
- form-source-specific option coercion and transform rules
