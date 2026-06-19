# Phase 2B Schema Preparation

## Outcome

Phase 2B defines the translation layer between the inherited runtime model and the future Leads Desk schema without touching the live database.

## Delivered In This Phase

- future table groups for core, customization, intake, sales-command, and deferred optional tables
- field-by-field mapping guidance for inherited pathway-era fields
- planning-only persistence mapping scaffolds under `src/lib/crm/domain/persistence-mapping.ts`
- updated data-model and implementation docs that point Phase 2C toward additive schema work

## Not Done In This Phase

- no database migrations
- no schema changes
- no new runtime persistence wiring
- no webhook endpoints
- no UI redesign
- no legacy engine removal

## Phase 2C Readiness

Phase 2C should use this preparation to draft additive schema definitions for:

1. organization tables
2. normalized source and stage tables
3. nullable sales-command lead columns
4. custom-field tables
5. intake-event tables

Destructive cleanup remains deferred until much later.

## Follow-on Status

Phase 2C has now completed the first portion of that work:

- organization tables
- normalized stage and source tables
- nullable sales-command lead columns

Custom-field tables and intake-event tables remain deferred.
