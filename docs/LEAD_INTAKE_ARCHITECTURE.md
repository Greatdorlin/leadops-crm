# Leads Desk Lead Intake Architecture

## Purpose

Leads Desk must support flexible lead intake across different businesses and different form structures.

## Current v1.0 Status

The runtime now includes:

- form source CRUD in admin settings
- field mapping CRUD for core and custom fields
- `POST /api/intake/webhook/[webhookKey]`
- additive `lead_intake_events` persistence
- intake event logging for success and failure states
- admin intake log visibility at `/admin/intake`

The runtime still does not include native ad-platform intake or advanced transform rules.

## Intake Principles

- many sources, one lead system
- core fields stay standardized
- business-specific data flows through custom fields
- raw payloads are stored for audit/debugging
- intake mapping must be configurable

## Core Intake Paths

MVP priority:

1. generic webhook endpoint
2. website form endpoint
3. WordPress/form plugin documentation
4. CSV import
5. manual entry

## Intake Flow

1. identify source or webhook key
2. load form source config
3. parse external payload
4. map to core lead fields
5. map to custom fields
6. apply defaults for stage/owner/team/branch/department
7. store raw and normalized payloads
8. create lead
9. create intake event
10. create lead event
11. trigger notifications later

## Core Lead Fields

Examples of stable core fields:

- name
- email
- phone
- source
- stage
- status
- priority
- assigned user
- team
- branch
- department
- estimated value
- expected close date

## Required Intake Storage Concepts

- `formSources`
- `formFieldMappings`
- `leadIntakeEvents`

## Phase 2A Contract Status

Neutral domain contracts for intake sources, field mappings, and intake events now exist in `src/lib/crm/domain/`.

This phase does not add the webhook endpoint or persistence tables yet.

## Phase 2B Translation Status

Phase 2B now sets the persistence destination for inherited answer blobs and source payloads:

- `leadIntakeEvents.rawPayload`
- `leadIntakeEvents.normalizedPayload`
- custom-field values where intake data becomes business-specific lead data

No endpoints or intake tables have been added yet.

## Production Runtime Notes

- Webhook requests do not require admin auth, but they must provide a valid active `webhookKey`.
- Raw payloads are stored for audit and debugging, but they are hidden from normal users.
- Intake creates or updates a lead through the stable lead-store path, then persists mapped custom field values separately.

Phase 2D now adds the `lead_intake_events` table plus `form_sources` and `form_field_mappings`.

Important design choice:

- both `raw_payload` and `normalized_payload` use `jsonb`

This supports future debugging of failed or partially mapped submissions without assuming one fixed payload shape.

The intake endpoint and processor are still deferred.

## Phase 2E Bridge Status

Phase 2E adds:

- dry-run backfill planning for normalized stage, source, and owner fields
- intake summary helpers for future normalized read surfaces

No endpoint or processor has been added yet.

## Phase 2J Management Status

Phase 2J now adds the admin management layer for:

- form source definitions
- field mappings per source
- default stage, owner, team, branch, department, and priority values

This means the intake architecture now has a controlled setup surface before webhook runtime begins.

Still deferred:

- webhook endpoint implementation
- payload parsing and normalization
- lead creation from external submissions
- intake event writes during live processing

## Endpoint Direction

Planned generic endpoint:

- `POST /api/intake/webhook/[webhookKey]`

Behavior:

- validate webhook key
- resolve form source
- normalize payload
- map fields
- create lead and intake event
- return safe success/failure response

## Security Note

Raw payloads belong in admin/debug surfaces only, not normal user views.
