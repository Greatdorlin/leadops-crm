# Phase 2J: Form Source And Field Mapping CRUD

## Summary

Phase 2J adds the admin management layer for Leads Desk form sources and field mappings.

This phase does not add:

- webhook intake runtime
- automatic lead creation from external payloads
- assignment rules
- notification triggers

## What Was Added

### Admin UI

- `/admin/settings/form-sources`
- source create and edit flow
- archive and restore flow using the current `isActive` flag
- field mapping editor per source

### API And Data Helpers

- `GET /api/admin/form-sources`
- `POST /api/admin/form-sources`
- `GET /api/admin/form-sources/[id]`
- `PATCH /api/admin/form-sources/[id]`
- `GET /api/admin/form-sources/[id]/mappings`
- `PUT /api/admin/form-sources/[id]/mappings`

### Server Functions

- `listFormSources()`
- `getFormSource()`
- `createFormSource()`
- `updateFormSource()`
- `archiveFormSource()`
- `restoreFormSource()`
- `listFormFieldMappings()`
- `upsertFormFieldMappings()`
- `getFormSourceAdminReferenceData()`

## Mapping Rules

### Core field targets

- `name`
- `email`
- `phone`
- `companyName`
- `sourceId`
- `campaignLabel`
- `priority`
- `estimatedValue`
- `expectedCloseDate`
- `notes`

### Custom field targets

- only active non-archived custom fields are selectable by default
- mapping stores `customFieldId`
- select and multi-select fields can be mapped now
- option-value validation remains part of later intake runtime

## Validation Rules

### Form source validation

- source name is required
- source type must be allowed
- webhook key is optional
- webhook key must be unique when provided
- default priority must be valid when provided

### Field mapping validation

- external field name is required
- external field name may use letters, numbers, dots, dashes, and underscores
- target type must be `core` or `custom`
- core mappings require an allowed core target
- custom mappings require an active custom field id
- duplicate external field names per source are rejected

## Permission Rules

- owner can manage form sources
- admin can manage form sources
- team lead cannot manage form sources by default
- sales rep cannot manage form sources by default

Permission checks use neutral Leads Desk helpers, not direct legacy access checks.

## Archive Behavior

The current schema uses `isActive` on `form_sources` rather than a dedicated archived column.

For this phase:

- `Archive Source` sets `isActive=false`
- `Restore Source` sets `isActive=true`

This keeps runtime changes low-risk while preserving the source definition and mapping setup.

## What Is Still Deferred

- `POST /api/intake/webhook/[webhookKey]`
- automatic payload mapping into lead writes
- raw payload processing UI
- assignment routing
- notification triggers
- source-level analytics
- form source CRUD for non-admin roles

## Next Phase Direction

Phase 2K should add the first webhook intake runtime using these saved source definitions and mapping records, while keeping payload logging, validation, and fallback behavior safe and observable.
