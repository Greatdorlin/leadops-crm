# Leads Desk Persistence Mapping Plan

## Purpose

This document maps inherited runtime fields into future Leads Desk persistence targets.

It complements:

- `docs/SCHEMA_TRANSLATION_PLAN.md`
- `src/lib/crm/domain/persistence-mapping.ts`

## Mapping Principles

- core sales-command fields become real lead columns
- business-specific intake moves into custom fields
- external payload detail moves into intake-event records
- legacy pathway and report state remains compatibility-only
- future runtime code should depend on neutral domain contracts first

## Legacy-To-Future Field Mapping

| Legacy field | Current use | Future target | Short-term strategy | Long-term plan |
| --- | --- | --- | --- | --- |
| `primaryGoal` | Inherited category/pathway goal | Category custom field or preset classification | Map via compatibility helpers only | Remove from core lead schema |
| `readinessLevel` | Legacy readiness signal | Fit signal custom field or derived score | Neutral summary mapping only | Remove from core lead schema |
| `topPathwayTitle` | Legacy recommendation/interest | Interest label or custom field | Neutral interest mapping only | Keep as optional custom data if needed |
| `answers` | Assessment answers blob | `leadIntakeEvents.rawPayload`, `normalizedPayload`, custom-field values | Preserve for compatibility only | Remove from core lead schema |
| `report` | Internal assessment report payload | Legacy report summary only | Summarize through compatibility helpers | Deprecate |
| `publicReport` | Public assessment snapshot | Legacy report summary only | Keep off new domain contracts | Deprecate |
| `reportToken` | Public report lookup token | Historic legacy lookup only | Preserve for old routes only | Deprecate |
| `currentStepKey` | Flow progress step | Legacy progress summary only | Keep in compatibility helpers | Remove |
| `currentStepIndex` | Flow progress index | Legacy progress summary only | Keep in compatibility helpers | Remove |
| `progressPercent` | Flow progress percentage | Legacy progress summary only | Keep in compatibility helpers | Remove |
| `crmStatus` | Legacy status and stage | `stageId`, `stageLabel`, `status` | Translate through stage mapping | Replace with normalized stage records |
| `assignedTo` | Lead owner id or email | `assignedUserId` | Direct neutral mapping | Keep only normalized relation name |
| `source` | Source label and type | `leadSources`, `formSources`, source analytics | Map into source fields first | Replace with normalized source records |
| `sourcePayload` | Mixed source metadata | Intake-event payloads or `legacySourcePayload` | Compatibility payload only | Move out of main lead row |

## What Becomes A Core Lead Column

- name
- email
- phone
- companyName
- sourceId
- sourceLabel
- campaignId
- campaignLabel
- stageId
- stageLabel
- status
- priority
- assignedUserId
- teamId
- branchId
- departmentId
- estimatedValue
- expectedValue
- wonValue
- closeProbability
- expectedCloseDate
- wonAt
- lostAt
- lostReason
- nextFollowUpAt
- lastActivityAt
- createdAt
- updatedAt
- archivedAt

## Phase 2C Column Status

Added this phase as nullable schema columns:

- `companyName`
- `sourceId`
- `stageId`
- `campaignId`
- `campaignLabel`
- `assignedUserId`
- `teamId`
- `branchId`
- `departmentId`
- `estimatedValue`
- `expectedValue`
- `wonValue`
- `closeProbability`
- `expectedCloseDate`
- `wonAt`
- `lostAt`
- `lostReason`
- `nextFollowUpAt`
- `archivedAt`

Still deferred from schema or still represented by legacy fields:

- normalized `sourceLabel`
- normalized `stageLabel`
- neutral `status` column
- custom-field persistence
- intake-event persistence

## What Moves Into Custom Fields

Examples:

- category when a client wants custom vertical-specific classification
- fit signal when it is business-defined instead of system-derived
- interest labels that are form-specific
- budget range, destination, service type, course interest, property type, urgency, and similar business-specific intake data

Phase 2D schema status:

- `custom_fields`, `custom_field_options`, and `lead_custom_field_values` now exist at the schema level
- runtime CRUD and rendering are still deferred

## What Moves Into Intake And Source Payload Storage

- raw external form submissions
- unmapped incoming fields
- transformed intake payloads
- legacy answer blobs kept only for historic compatibility
- provider-specific metadata that does not belong in core lead columns

Phase 2D schema status:

- `form_sources`, `form_field_mappings`, and `lead_intake_events` now exist at the schema level
- `lead_intake_events.raw_payload` and `normalized_payload` use `jsonb`
- runtime intake processing is still deferred

## Phase 2E Dual-Read Status

Phase 2E adds normalized-first read helpers that can resolve:

- stage display from `stageId` first, then legacy `crmStatus`
- source display from `sourceId` first, then legacy `source`
- owner display from `assignedUserId` first, then legacy `assignedTo`

This keeps current runtime stable while preparing future runtime adoption.

## Compatibility-Only Data

These should remain readable during transition but not shape the final Leads Desk model:

- `reportToken`
- `report`
- `publicReport`
- `currentStepKey`
- `currentStepIndex`
- `progressPercent`
- old pathway recommendation wording

## Planning Scaffold Status

`src/lib/crm/domain/persistence-mapping.ts` now provides:

- future table groups
- explicit legacy field translation entries
- future insert and update shapes for leads
- future insert shapes for custom fields, form sources, sales targets, and notifications

These helpers are planning-only and are not wired into production persistence yet.

Phase 2C adds the first real schema foundation, but runtime persistence still reads and writes through the inherited storage model.
