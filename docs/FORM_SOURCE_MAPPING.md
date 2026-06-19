# Leads Desk Form Source Mapping

## Purpose

Different forms collect different data. Leads Desk needs a configurable mapping layer between external forms and the internal lead model.

## Current v1.0 Status

Admins can now:

- create, edit, archive, and restore form sources
- set default stage, owner, team, branch, department, and priority values
- manage core-field and custom-field mappings
- preview a webhook URL
- copy the webhook URL for external setup
- preview a sample JSON payload generated from current mappings

## Form Source Concept

`formSources` represents where leads come from.

Examples:

- website contact form
- WordPress form
- landing page form
- generic webhook source
- CSV import
- manual entry

## Required Form Source Fields

- `id`
- `name`
- `type`
- `sourceId`
- `webhookKey`
- `isActive`
- `defaultStageId`
- `defaultAssignedUserId`
- `defaultTeamId`
- `defaultBranchId`
- `defaultDepartmentId`
- `createdAt`
- `updatedAt`

## Field Mapping Concept

`formFieldMappings` defines how external payload fields land inside Leads Desk.

Required fields:

- `id`
- `formSourceId`
- `externalFieldName`
- `targetType`
- `targetField`
- `customFieldId`
- `required`
- `transformRule`
- `fallbackValue`
- `createdAt`
- `updatedAt`

Target types:

- `core`
- `custom`

## Example Mappings

- `full_name` -> core -> `name`
- `property_budget` -> custom -> `budget_custom_field`
- `interested_course` -> custom -> `course_interest_custom_field`

## Operational Benefit

This mapping layer lets Leads Desk support different businesses without assuming one fixed intake form structure.

## Runtime Rules

- Only active custom fields appear as custom mapping targets by default.
- Webhook keys must be unique when present.
- Duplicate external field names per form source are rejected.
- The mapping UI stays business-friendly and avoids exposing legacy pathway-era fields.

## Phase 2A Contract Status

Neutral form-source and field-mapping contracts now exist in `src/lib/crm/domain/form-sources.ts`.

This phase does not add runtime routing, webhook handling, or database tables yet.

## Phase 2B Translation Status

Phase 2B now documents how inherited `source`, `sourceDetail`, and `sourcePayload` data should translate into future:

- `leadSources`
- `formSources`
- `formFieldMappings`
- `leadIntakeEvents`

Runtime persistence remains unchanged in this phase.

## Phase 2D Schema Status

Phase 2D now adds:

- `form_sources`
- `form_field_mappings`

These tables support future mapping from one external form payload into:

- core lead fields
- custom fields

The webhook route and mapping runtime are still deferred.

## Phase 2E Read Preparation Status

Phase 2E adds helper scaffolds for:

- form source display
- intake event status labels
- intake event summaries

These stay outside the active runtime until later UI and intake phases.

## Phase 2J CRUD Status

Phase 2J now adds:

- admin management for form sources
- admin management for field mappings per source
- validation for core versus custom targets
- webhook-key uniqueness checks
- owner/admin-only permission guards

Current behavior:

- sources can be created, edited, archived, and restored
- mappings can point to safe core lead fields
- mappings can point to active custom fields
- archived custom fields stay hidden from the mapping picker by default

Still deferred:

- webhook intake endpoint
- automatic payload processing
- runtime lead creation from mapped payloads
