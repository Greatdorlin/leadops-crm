# Phase 2H: Custom Field Runtime Adoption

## Goal

Make active custom fields usable on actual leads without replacing the stable inherited lead write path.

## What This Phase Adds

- manual lead capture now loads active `showInForm` custom fields
- lead profile editing now loads active `showInForm` custom fields
- custom field values are validated server-side before persistence
- custom field values persist to `lead_custom_field_values`
- lead detail display continues to render normalized custom field values safely

## Runtime Flow

1. load active custom field definitions
2. build a display-safe input model
3. submit `customFieldValues` alongside the existing lead payload
4. create or update the core lead through the inherited stable path
5. validate custom field values against active definitions and options
6. upsert normalized values into `lead_custom_field_values`
7. display saved values on lead detail through normalized-first helpers

## Helper Modules Added

- `src/lib/crm/custom-field-values.ts`
- `src/lib/crm/custom-field-values-store.ts`
- `src/components/admin/CustomFieldValueInputs.tsx`

Key helpers:

- `listLeadCustomFieldValues()`
- `upsertLeadCustomFieldValues()`
- `buildCustomFieldInputModel()`
- `validateCustomFieldValues()`
- `serializeCustomFieldValue()`
- `formatCustomFieldDisplayValue()`

## Supported Field Types

Current runtime support:

- text
- textarea
- number
- currency
- date
- datetime
- select
- multi_select
- checkbox
- phone
- email
- url
- file_url

Deferred / simplified:

- `user_reference` is accepted by validation and rendered as a plain text input for now
- `file_url` is treated as URL text only
- no file upload handling yet

## Safety Rules

- active fields only appear in normal lead capture and editing
- archived fields stay hidden from normal editing
- invalid option values are rejected
- required custom fields are enforced
- non-select fields do not depend on option metadata
- no webhook, form mapping, or import runtime was changed in this phase

## What Did Not Change

- no schema change
- no migration generation
- no automatic seeds
- no automatic backfills
- no webhook endpoint
- no form-source CRUD
- no lead import behavior change
- no legacy column removal

## Phase 2I Follow-Through

Phase 2I extends this runtime into broader operations:

- `showInTable` fields can now appear in lead list and trash views
- active custom fields now flow into lead exports
- CSV import can now recognize custom field columns by label or key

## Next Phase Direction

Phase 2I should focus on custom field visibility in lead tables, filtered exports, and a safe path toward custom-field-aware imports and intake mapping.
