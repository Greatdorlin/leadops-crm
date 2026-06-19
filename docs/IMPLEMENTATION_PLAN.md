# Leads Desk Implementation Plan

## Current Release Status

Leads Desk is now targeting a sellable v1.0 release candidate, not an MVP-only milestone.

Completed implementation layers now include:

- commercial Leads Desk identity cleanup
- neutral role, auth bootstrap, and provider-neutral storage boundaries
- additive schema for organization, stages, sources, custom fields, form sources, intake events, notifications, and sales targets
- custom field CRUD and runtime usage across capture, detail, table, export, and import
- form source and field mapping CRUD
- generic webhook intake runtime
- intake log visibility
- in-app notification foundation
- follow-up, overdue, and sales-value runtime fields
- dashboard and report sales-command read models
- runtime appearance, navigation, lead preview, dashboard, and industry preset customization

The remaining release work focuses on production hardening, deployment assets, documentation, and go-live QA rather than a greenfield product rewrite.

## Premium UI And Customization Status

The current release candidate now includes a database-backed customization layer through `company_settings`.

Owner and admin can now control:

- appearance and login branding
- sidebar structure
- lead preview columns
- dashboard widget visibility and order
- industry presets
- system status visibility for safe deployment checks

## Purpose

This plan defines how the inherited repository transitions into Leads Desk, a private sales command center for businesses that need every lead captured, assigned, followed up, measured, and improved without per-user CRM subscription pricing.

This remains a migration plan, not a greenfield rewrite plan.

## Product Position

Leads Desk is not just a CRM or lead database.

Leads Desk is a private sales command center that helps businesses:

- stop losing leads they already paid for
- track who owns every lead
- enforce follow-up discipline
- measure source, rep, team, and branch performance
- spot overdue and stuck leads early
- connect pipeline activity to sales targets

Core promise:

- Every lead captured.
- Every follow-up assigned.
- Every salesperson visible.
- Every source measured.

## Core Business Questions

The product must help users answer:

1. How many leads came in?
2. Where did they come from?
3. Which form or source captured them?
4. What information did each form collect?
5. Who owns each lead?
6. What stage is each lead in?
7. Which leads need follow-up today?
8. Which leads are overdue?
9. Which leads are stuck?
10. Which salesperson is performing?
11. Which team or branch is performing?
12. Which source is converting?
13. How close are we to our sales target?

## Product Direction Update

The current v1.0 release prioritizes money-making visibility:

1. lead capture
2. custom fields
3. form source mapping
4. generic webhook intake
5. lead assignment
6. follow-up tasks
7. overdue tracking
8. source performance
9. team and user performance
10. sales target progress
11. export data
12. basic notifications

## Current Inherited Repo Reality

The repository still contains:

- legacy assessment and pathway logic
- legacy public routes
- legacy storage fields
- legacy role and bootstrap assumptions

These remain transitional only. They do not define the Leads Desk product.

## Phase Structure

## Phase 0: Foundation And Rules

Goal:

- establish product, copy, UI, infrastructure, data-model, and Codex rules

Status:

- completed in prior phases

## Phase 1: Product Extraction And Runtime Safety

Goal:

- neutralize inherited branding and isolate legacy public flows

Completed/active subphases:

- runtime identity cleanup
- legacy domain boundary setup
- admin contract cleanup
- admin form contract cleanup
- admin bootstrap and export permission cleanup
- role mapping and permission vocabulary cleanup
- provider-neutral storage boundary cleanup

## Phase 2A: Domain Contract Preparation

Goal:

- define the future Leads Desk sales-command domain safely before schema migration

Scope:

- neutral TypeScript contracts for leads, custom fields, intake, targets, organization, activity, notifications, and dashboard summaries
- compatibility mapping helpers that contain legacy field names

Acceptance criteria:

- schema is unchanged
- new domain contracts exist
- legacy field mapping is explicit and centralized
- docs and tests reflect the new domain boundary

## Phase 2B: Schema Translation Preparation

Goal:

- define how inherited storage translates into the future Leads Desk schema before migrations begin

Scope:

- future table plan for core, customization, intake, sales-command, and optional modules
- legacy-to-future field mapping rules
- planning-only persistence mapping scaffolds
- additive migration order and compatibility rules

Acceptance criteria:

- schema remains unchanged
- translation docs exist
- legacy field destinations are explicit
- future core columns versus custom-field or intake payload destinations are clear
- Phase 2C can start schema drafting without guessing

## Phase 2C: Additive Schema Foundation

Goal:

- add the first neutral Leads Desk tables and nullable lead columns without breaking current runtime behavior

Scope:

- `branches`, `departments`, `teams`
- `lead_stages`, `lead_sources`
- first additive nullable `leads` columns for ownership, campaign, value, and follow-up
- default seed metadata and backfill-plan constants

Acceptance criteria:

- additive migration only
- no legacy column removal or rename
- no runtime cutover yet
- generated SQL is reviewable
- tests, lint, and build stay green

## Phase 2D: Custom Fields And Intake Schema

Goal:

- add the schema foundation for dynamic custom fields and future form intake without wiring incomplete runtime behavior

Scope:

- `custom_fields`
- `custom_field_options`
- `lead_custom_field_values`
- `form_sources`
- `form_field_mappings`
- `lead_intake_events`
- migration generation, tests, and documentation

Acceptance criteria:

- additive migration only
- no legacy schema removal
- runtime remains unchanged
- custom-field and intake tables are ready for future runtime phases

## Phase 2E: Seed, Backfill, And Dual-Read Preparation

Goal:

- prepare safe manual seeds, dry-run backfill planning, and normalized-first read helpers before runtime adoption

Scope:

- manual seed helper module
- backfill planning module
- dual-read adapter module
- tests for fallback behavior and idempotent payloads

Acceptance criteria:

- no automatic production mutation
- legacy fallback remains intact
- normalized-first helper behavior is tested
- runtime write path stays unchanged

## Phase 2J: Form Source And Field Mapping CRUD

Goal:

- add the admin management layer for external form sources and their field mappings before webhook intake runtime begins

Scope:

- `/admin/settings/form-sources`
- form source create, edit, archive, and restore
- field mapping create and update per source
- validation for core-field and custom-field targets
- owner/admin permission guards through neutral authz helpers

Acceptance criteria:

- admins can manage form sources and their mappings
- archived custom fields are hidden from mapping targets by default
- no webhook intake endpoint is added yet
- tests, lint, and build remain green

## Phase 2: Sales Command Foundation

Goal:

- establish Leads Desk as a sales command center, not just a contact tracker

Scope:

- lead intake architecture
- custom field sync architecture
- form-source mapping
- raw intake event storage
- lead value and pipeline value fields
- sales targets and target progress
- manager and rep performance model
- notification event model

Acceptance criteria:

- intake, custom fields, performance, and target concepts are documented before implementation
- schema direction reflects dynamic intake and sales visibility
- UI and reporting plans clearly prioritize sales action

## Phase 3: Lead Intake And Routing Core

Goal:

- make lead capture reliable across manual entry, CSV, website forms, and generic webhook sources

Scope:

- generic webhook intake endpoint
- form source records
- field mapping records
- raw payload storage
- mapping to core fields and custom fields
- assignment defaults and routing hooks

Acceptance criteria:

- multiple intake sources can map into one consistent lead model
- raw payloads are stored for admin/debug use
- custom field capture works without schema edits per client

## Phase 4: Sales Workspace Core

Goal:

- deliver the operational workspace managers and reps use daily

Scope:

- dashboard
- leads
- tasks
- performance reporting
- target progress
- overdue and stuck lead visibility
- source and rep performance

Acceptance criteria:

- users can see what is moving, stuck, overdue, or underperforming
- managers can review rep/team/branch performance
- dashboard supports clear next actions

## Phase 5: Controlled Customization

Goal:

- let each client adapt intake, fields, branding, dashboards, stages, and sources safely

Scope:

- custom fields
- form source mappings
- branding and appearance
- dashboard widget settings
- vertical presets
- archive-first change rules

## Phase 6: Export, Notifications, And Operational Depth

Goal:

- reinforce data ownership and execution discipline

Scope:

- export flows
- notification rules
- import completion notifications
- assignment notifications
- target milestone notifications
- audit logging across operational and customization changes

## Phase 7: Deferred Modules

Still not part of MVP:

- native ad-platform integrations as core dependency
- AI features
- SaaS multi-tenancy
- billing
- WhatsApp automation
- Telegram automation
- mobile app
- advanced workflow builder

## Immediate Next Steps Before New Implementation

1. finalize the updated sales-command-center documentation set
2. align the data model plan with dynamic intake and sales targets
3. align the MVP scope with intake, performance, and target tracking priorities
4. use the new docs as the gate before schema or workflow implementation

## Phase 2F Status

Completed:

- normalized-first stage, source, and owner display on selected admin lead surfaces
- custom field display preparation on lead detail
- storage read boundary updated to preserve optional normalized IDs

Still deferred:

- write-path migration to normalized columns
- automatic seed and backfill execution
- webhook, form mapping, and custom field runtime CRUD

## Phase 2G Status

Completed:

- custom field definition CRUD foundation
- archive-first option management
- owner/admin-only custom field management gate

Still deferred:

- lead-level custom field value editing
- form source and form mapping CRUD
- intake runtime wiring

## Phase 2H Status

Completed:

- custom field value helpers for serialization, validation, display formatting, and input models
- manual lead capture support for active custom fields
- lead profile editing support for active custom fields
- server-side persistence of normalized custom field values after stable lead create/update writes

Still deferred:

- webhook and form-source runtime adoption
- import-time custom field writes
- custom-field-aware lead table filters and exports

## Phase 2I Status

Completed:

- `showInTable` custom field display on operational lead list surfaces
- export inclusion for active custom field values
- CSV import contract mapping for custom field headers
- import-time validation and persistence for recognized custom field values

Still deferred:

- custom-field-aware filtering and saved views
- webhook and form-source runtime adoption
- broader reporting adoption beyond lead export
