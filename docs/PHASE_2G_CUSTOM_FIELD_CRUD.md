# Phase 2G: Custom Field CRUD Foundation

## What This Phase Adds

Phase 2G introduces the first controlled Leads Desk customization runtime for lead field definitions.

Admin users can now:

- list custom fields
- create custom fields
- edit custom field metadata
- archive custom fields
- restore archived custom fields
- manage select and multi-select options
- control visibility and search flags

## Admin Surface

Added:

- `/admin/settings/fields`

This page is intentionally simple and business-friendly. It focuses on field definitions, option management, and archive-first safety.

## API And Data Helpers

Added:

- `GET /api/admin/custom-fields`
- `POST /api/admin/custom-fields`
- `PATCH /api/admin/custom-fields/[id]`

Server-side helpers now support:

- `listCustomFields()`
- `getCustomField()`
- `listCustomFieldOptions()`
- `createCustomField()`
- `updateCustomField()`
- `archiveCustomField()`
- `restoreCustomField()`
- `upsertCustomFieldOptions()`

## Validation Rules

Current validation includes:

- field label is required
- key is machine-safe
- key uniqueness is enforced
- field type must be one of the allowed domain types
- select and multi-select fields require at least one active option
- field type changes are blocked when saved values already exist

## Archive-First Behavior

- fields are archived instead of deleted
- removed options are archived instead of hard deleted
- archived fields are hidden by default in normal listing logic
- archived fields can be restored

## Permissions

Only owner/admin access can manage field definitions.

Current gate:

- `canManageCustomFields()`

Managers, team leads, and sales reps do not manage custom field definitions by default.

## What Is Still Deferred

- editing custom field values on leads
- form source CRUD
- form field mapping CRUD
- webhook intake
- automatic intake processing
- custom field filtering/search runtime on lead lists
- broad UI redesign

## Next Phase Direction

Phase 2H should focus on selective custom field runtime adoption in lead capture and lead detail flows, while keeping the main lead write path stable and avoiding a broad schema cutover.

## Phase 2H Outcome

Phase 2H now extends that CRUD foundation into runtime usage:

- active custom fields render on manual lead capture
- active custom fields render on lead profile editing
- custom field values are validated and persisted to `lead_custom_field_values`
- lead detail continues to display normalized custom field values safely

Definition CRUD remains separate from lead value persistence so the runtime can evolve without weakening admin controls.
