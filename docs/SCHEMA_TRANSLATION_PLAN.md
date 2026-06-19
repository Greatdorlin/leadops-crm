# Leads Desk Schema Translation Plan

## Purpose

This document defines the additive migration path from the inherited pathway-era storage model to the future Leads Desk sales-command schema.

Phase 2B prepared the table plan. Phase 2C now adds the first additive schema objects and migration scaffolding while keeping runtime behavior unchanged.

## Current Inherited Model

The live runtime still depends on:

- legacy lead rows that mix CRM data with assessment and report fields
- provider-neutral access through `LeadStore`, backed today by `NeonLeadStore`
- compatibility-only fields such as `primaryGoal`, `readinessLevel`, `topPathwayTitle`, `answers`, `report`, `publicReport`, and `reportToken`
- legacy admin and report flows that must keep loading during transition

## Future Leads Desk Table Plan

### Core tables

- `users`
- `teams`
- `branches`
- `departments`
- `leads`
- `leadStages`
- `leadSources`
- `leadTasks`
- `leadNotes`
- `leadActivityEvents`

### Customization and intake tables

- `customFields`
- `customFieldOptions`
- `leadCustomFieldValues`
- `formSources`
- `formFieldMappings`
- `leadIntakeEvents`

### Sales-command tables

- `salesTargets`
- `notificationEvents`
- `auditLogs`

### Deferred optional tables

- `campaigns`
- `assignmentRules`
- `notificationRules`
- `dashboardLayouts`
- `dashboardWidgets`
- `userDashboardPreferences`

## Future `leads` Table Direction

### Core identity and contact

- `id`
- `name`
- `email`
- `phone`
- `companyName`

### Source and campaign

- `sourceId`
- `sourceLabel`
- `campaignId`
- `campaignLabel`

### Pipeline

- `stageId`
- `stageLabel`
- `status`
- `priority`

### Ownership and scope

- `assignedUserId`
- `teamId`
- `branchId`
- `departmentId`

### Sales tracking

- `estimatedValue`
- `expectedValue`
- `wonValue`
- `closeProbability`
- `expectedCloseDate`
- `wonAt`
- `lostAt`
- `lostReason`

### Follow-up and activity

- `nextFollowUpAt`
- `lastActivityAt`

### Timestamps

- `createdAt`
- `updatedAt`
- `archivedAt`

### Compatibility-only columns if still required temporarily

- `legacySourcePayload`
- `legacyAssessmentId`
- `legacyReportSummary`

Pathway-era fields should not become first-class long-term `leads` columns.

## Table-by-Table Migration Direction

### `users`

- keep current auth and bootstrap compatibility
- add neutral role and scope-ready fields first
- defer strict team, branch, and department enforcement until later runtime phases

### `teams`, `branches`, `departments`

- create additive organization tables first
- backfill nullable ownership links from existing admin records only where safe
- Phase 2C status: added in schema and generated migration, not wired into runtime yet

### `leadStages` and `leadSources`

- normalize current text labels into managed records
- keep readable labels available during backfill
- Phase 2C status: added in schema and generated migration, no runtime read path yet

### `leads`

- add nullable sales-command columns before removing any legacy fields
- translate `crmStatus` into future stage and status fields
- translate ownership into `assignedUserId`
- Phase 2C status: first nullable ownership, campaign, value, follow-up, and archive columns added without foreign keys

### `leadTasks`, `leadNotes`, `leadActivityEvents`

- preserve current operational behavior while moving toward neutral naming and richer reporting joins

### `customFields`, `customFieldOptions`, `leadCustomFieldValues`

- move business-specific intake away from one fixed lead shape
- keep core fields in real lead columns
- Phase 2D status: added in schema and generated migration, not wired into runtime yet

### `formSources`, `formFieldMappings`, `leadIntakeEvents`

- store where a lead came from
- map external fields into core and custom targets
- preserve raw payloads for admin and debug use only
- Phase 2D status: added in schema and generated migration, no endpoint or runtime processor yet

### `salesTargets`

- additive table for target tracking only
- no dependency on legacy assessment logic

### `notificationEvents`

- event-first design for in-app and email notifications later

### `auditLogs`

- record exports, customization changes, access events, and future intake actions

## Migration Order

1. Add neutral tables that do not disturb existing lead reads.
2. Add nullable `leads` columns for ownership, scope, and sales tracking.
3. Add `leadStages` and `leadSources` records plus safe backfill helpers.
4. Add custom-field tables and value storage.
5. Add form-source and field-mapping tables.
6. Add intake-event logging tables.
7. Add sales-target tables.
8. Add notification-event tables.
9. Gradually wire runtime behind guarded helpers and compatibility adapters.
10. Deprecate legacy fields only after admin, exports, reports, and tests no longer depend on them.

## Compatibility Rules

- old records must continue to load
- old admin pages must not break during additive migrations
- legacy public report data remains readable only through neutral summaries
- new Leads Desk data must not depend on assessment concepts
- additive migrations happen before destructive cleanup
- exports should prefer neutral field names even while legacy storage remains underneath

## Rollback and Safety Notes

- do not remove legacy columns in the first migration wave
- keep backfills idempotent where possible
- keep schema additions nullable until runtime writes are ready
- test neutral mappings before any persistence cutover
- preserve `DATABASE_URL` as the primary database configuration path

## Phase 2C Concrete Artifacts

- schema updates in `src/lib/db/schema.ts`
- defaults and backfill metadata in `src/lib/db/defaults.ts`
- generated additive migration in `drizzle/0005_useful_jane_foster.sql`

## Phase 2D Concrete Artifacts

- additional schema updates in `src/lib/db/schema.ts`
- generated additive migration in `drizzle/0006_red_guardsmen.sql`
- custom-field and intake phase summary in `docs/PHASE_2D_CUSTOM_FIELDS_AND_INTAKE_SCHEMA.md`

## Phase 2E Runtime-Bridge Artifacts

- manual seed helpers in `src/lib/db/seed-defaults.ts`
- backfill planners in `src/lib/db/backfill-plan.ts`
- normalized-first read adapters in `src/lib/crm/read-adapters.ts`

These bridge helpers do not remove legacy fallback behavior yet.
