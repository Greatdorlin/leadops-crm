# Leads Desk Data Model Plan

## Purpose

This document defines the target Leads Desk data model before major schema refactoring begins.

The target model must support:

- private client deployments
- dynamic lead intake
- custom fields
- source and form mapping
- sales performance visibility
- target tracking
- controlled customization

## Core Modeling Rules

- core lead properties stay as real columns
- business-specific extensions belong in custom field tables
- form source and webhook mapping must not require schema edits per client
- raw intake payloads must be auditable
- reporting must support large lead volume over time
- schema migration is deferred until the inherited storage boundary and legacy field leakage are further contained

## Transitional Storage Boundary

Current transitional direction:

- new app code should prefer the neutral `LeadStore` boundary from `src/lib/storage`
- provider-specific runtime naming such as `NeonLeadStore` remains inherited implementation detail only
- legacy lead/report fields remain in the live store contract for compatibility until the future Leads Desk schema is ready

## Phase 2A Domain Contracts

Neutral TypeScript/domain contracts now exist under `src/lib/crm/domain/` for:

- leads
- custom fields
- form sources and field mappings
- intake events
- sales targets
- organization
- tasks, notes, and activity
- notifications
- dashboard metrics

These are domain contracts only. They do not start the schema migration.

## Phase 2B Schema Translation Preparation

Phase 2B adds planning-only persistence scaffolds under `src/lib/crm/domain/persistence-mapping.ts` and documents the future table translation path in:

- `docs/SCHEMA_TRANSLATION_PLAN.md`
- `docs/PERSISTENCE_MAPPING_PLAN.md`

This keeps schema work additive-first:

- future core sales-command columns are identified explicitly
- legacy pathway and report fields are marked compatibility-only
- custom fields and intake payloads have a clear destination
- migration order is documented before any Drizzle or SQL changes begin

## Phase 2C Additive Schema Foundation

Phase 2C adds the first neutral Drizzle schema foundation in `src/lib/db/schema.ts` and generates an additive SQL migration in `drizzle/0005_useful_jane_foster.sql`.

Added tables:

- `branches`
- `departments`
- `teams`
- `lead_stages`
- `lead_sources`

Added nullable `leads` columns for future Leads Desk behavior:

- company and ownership fields
- normalized stage and source relation ids
- campaign fields
- sales-value and close-probability fields
- follow-up and archive timestamps

These additions are schema-ready only. They are not yet wired into the production runtime.

## Phase 2D Custom Fields And Intake Schema

Phase 2D adds the first schema foundation for dynamic intake:

- `custom_fields`
- `custom_field_options`
- `lead_custom_field_values`
- `form_sources`
- `form_field_mappings`
- `lead_intake_events`

This gives the product a database-level place for:

- business-specific lead fields
- configurable source-to-field mapping
- raw and normalized intake payload logging

These tables are additive and not yet runtime-active.

## Phase 2E Seed And Dual-Read Preparation

Phase 2E adds the non-destructive bridge layer:

- manual seed helpers for stages, sources, and optional general custom fields
- dry-run backfill planners for normalized stage, source, and owner fields
- normalized-first read adapters with legacy fallback behavior

This phase still avoids runtime cutover.

## Phase 2J Form Source Runtime Management

Phase 2J adds the first runtime management layer on top of the existing `form_sources` and `form_field_mappings` tables:

- admin CRUD for form sources
- admin CRUD for field mappings through replace-safe upsert behavior
- active custom field selection for custom mappings
- source defaults for stage, owner, team, branch, department, and priority

This phase still does not activate webhook intake or automatic persistence from external payloads.

## Core Table Groups

- organization tables
- user and access tables
- lead operations tables
- intake and mapping tables
- customization tables
- performance and target tables
- audit and notification tables

## Organization Tables

### `teams`

- `id`
- `name`
- `managerUserId`
- `branchId`
- `createdAt`
- `updatedAt`

### `branches`

- `id`
- `name`
- `address`
- `region`
- `createdAt`
- `updatedAt`

### `departments`

- `id`
- `name`
- `createdAt`
- `updatedAt`

### `userTeamMemberships`

- `id`
- `userId`
- `teamId`
- `roleInTeam`
- `createdAt`

### `userBranchMemberships`

- `id`
- `userId`
- `branchId`
- `roleInBranch`
- `createdAt`

### `userDepartmentMemberships`

- `id`
- `userId`
- `departmentId`
- `roleInDepartment`
- `createdAt`

## User And Access Tables

### `users`

- `id`
- `email`
- `name`
- `role`
- `status`
- `managerUserId`
- `defaultTeamId`
- `defaultBranchId`
- `defaultDepartmentId`
- `createdAt`
- `updatedAt`

Target roles:

- `owner`
- `admin`
- `manager`
- `team_lead`
- `sales_rep`

## Lead Operations Tables

### `leads`

Required direction:

- `id`
- `firstName`
- `lastName`
- `email`
- `phone`
- `source`
- `sourceDetail`
- `stage`
- `status`
- `priority`
- `assignedToUserId`
- `teamId`
- `branchId`
- `departmentId`
- `estimatedValue`
- `wonValue`
- `closeProbability`
- `expectedCloseDate`
- `wonAt`
- `lostAt`
- `lostReason`
- `nextFollowUpAt`
- `lastActivityAt`
- `createdAt`
- `updatedAt`
- `archivedAt`

### `leadTasks`

- `id`
- `leadId`
- `title`
- `description`
- `status`
- `priority`
- `assignedToUserId`
- `teamId`
- `branchId`
- `departmentId`
- `dueAt`
- `completedAt`
- `createdAt`
- `updatedAt`

### `leadNotes`

- `id`
- `leadId`
- `authorUserId`
- `content`
- `createdAt`

### `leadEvents`

- `id`
- `leadId`
- `type`
- `actorUserId`
- `metadata` jsonb
- `createdAt`

## Intake And Mapping Tables

### `formSources`

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

Form source types:

- `website`
- `wordpress`
- `webhook`
- `csv`
- `manual`
- `ads`
- `other`

### `formFieldMappings`

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

### `leadIntakeEvents`

- `id`
- `formSourceId`
- `leadId`
- `rawPayload` jsonb
- `normalizedPayload` jsonb
- `status`
- `errorMessage`
- `createdAt`

Purpose:

- intake audit trail
- webhook debugging
- payload replay support later

## Customization Tables

### `customFields`

- `id`
- `entityType`
- `key`
- `label`
- `fieldType`
- `required`
- `visible`
- `editable`
- `searchable`
- `filterable`
- `order`
- `placeholder`
- `helpText`
- `defaultValue`
- `validationRules` jsonb
- `showInTable`
- `showInForm`
- `showInDetails`
- `archivedAt`
- `createdAt`
- `updatedAt`

### `customFieldOptions`

- `id`
- `customFieldId`
- `label`
- `value`
- `color`
- `order`
- `createdAt`

### `leadCustomFieldValues`

- `id`
- `leadId`
- `customFieldId`
- `valueText`
- `valueNumber`
- `valueDate`
- `valueJson`
- `createdAt`
- `updatedAt`

### `themeSettings`

- `id`
- `companyName`
- `logoUrl`
- `faviconUrl`
- `primaryColor`
- `accentColor`
- `backgroundColor`
- `surfaceColor`
- `cardColor`
- `sidebarColor`
- `textColor`
- `borderColor`
- `borderRadius`
- `fontScale`
- `density`
- `themeMode`
- `designStyle`
- `glassEnabled`
- `glassBlur`
- `glassOpacity`
- `createdAt`
- `updatedAt`

### `dashboardLayouts`

- `id`
- `name`
- `scope`
- `scopeId`
- `isDefault`
- `createdAt`
- `updatedAt`

### `dashboardWidgets`

- `id`
- `layoutId`
- `widgetType`
- `title`
- `config` jsonb
- `position` jsonb
- `color`
- `style`
- `isVisible`
- `createdAt`
- `updatedAt`

### `userDashboardPreferences`

- `id`
- `userId`
- `layoutId`
- `preferences` jsonb
- `createdAt`
- `updatedAt`

### `leadStages`

- `id`
- `name`
- `color`
- `order`
- `isWon`
- `isLost`
- `isActive`
- `archivedAt`
- `createdAt`
- `updatedAt`

### `leadSources`

- `id`
- `name`
- `type`
- `color`
- `isActive`
- `archivedAt`
- `createdAt`
- `updatedAt`

## Performance And Target Tables

### `salesTargets`

- `id`
- `name`
- `scope`
- `scopeId`
- `period`
- `targetValue`
- `startDate`
- `endDate`
- `createdAt`
- `updatedAt`

Scopes:

- `global`
- `team`
- `branch`
- `department`
- `user`

## Audit And Notification Tables

### `auditLogs`

- `id`
- `actorUserId`
- `action`
- `entityType`
- `entityId`
- `description`
- `metadata` jsonb
- `ipAddress`
- `userAgent`
- `createdAt`

### Notification direction

Notification storage can begin with:

- in-app notification records
- email notification event queue records later

This can remain a later migration detail, but the event model should assume:

- assigned lead notification
- follow-up due
- follow-up overdue
- stage changed
- won
- lost
- import completed
- webhook lead captured
- target milestone reached

## Required Index Direction

### `leads`

- `assignedToUserId`
- `teamId`
- `branchId`
- `departmentId`
- `source`
- `stage`
- `status`
- `priority`
- `estimatedValue`
- `expectedCloseDate`
- `wonAt`
- `lostAt`
- `nextFollowUpAt`
- `lastActivityAt`
- `createdAt`
- `updatedAt`
- `archivedAt`

### `leadTasks`

- `leadId`
- `assignedToUserId`
- `teamId`
- `branchId`
- `departmentId`
- `dueAt`
- `status`
- `priority`

### `leadEvents`

- `leadId`
- `createdAt`
- `type`

### `leadNotes`

- `leadId`
- `createdAt`

### `leadCustomFieldValues`

- `leadId`
- `customFieldId`

### `formFieldMappings`

- `formSourceId`
- `externalFieldName`

### `leadIntakeEvents`

- `formSourceId`
- `leadId`
- `createdAt`
- `status`

### `salesTargets`

- `scope`
- `scopeId`
- `startDate`
- `endDate`

## Migration Notes

- current assessment-specific fields remain inherited and transitional
- new work should target the Leads Desk structures above
- custom fields must work across forms, imports, webhook intake, and reporting where practical
- schema migration should not happen until the updated architecture docs are reviewed

## Phase 2F Read Adoption Note

The runtime now supports normalized-first display reads for:

- `lead_stages`
- `lead_sources`
- lead owner lookup through `crm_users`
- `custom_fields` and `lead_custom_field_values` on lead detail

This remains a read-only adoption step. Production writes still follow inherited stable paths until dual-write and backfill phases are ready.

## Phase 2G Custom Field Runtime Note

The product now has a controlled custom field definition runtime:

- `custom_fields` records can be listed, created, updated, archived, and restored
- `custom_field_options` can be managed for select-like field types
- lead-level custom field values remain read-only from the admin runtime perspective

## Phase 2H Custom Field Value Runtime Note

Lead-level custom field values are now part of the manual admin runtime:

- lead capture accepts `customFieldValues`
- lead profile editing accepts `customFieldValues`
- normalized values persist to `lead_custom_field_values`
- lead detail reads and formats saved values through shared custom field helpers

This is still a controlled runtime step:

- import behavior is unchanged
- webhook and intake runtime are unchanged
- legacy lead columns remain intact

## Phase 2I Operational Custom Field Note

Custom field values now participate in broader operational flows:

- `showInTable` fields can surface in lead list/table views
- active custom fields can be exported with neutral headers
- CSV import can recognize custom field columns and persist validated values

This still does not start webhook or form-source runtime adoption.
