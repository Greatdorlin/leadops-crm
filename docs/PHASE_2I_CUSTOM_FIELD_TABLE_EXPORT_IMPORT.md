# Phase 2I: Custom Field Table, Export, and Import Adoption

## Goal

Extend custom fields beyond lead detail so captured business-specific data becomes operational in lead review, exports, and CSV imports.

## What This Phase Adds

- lead list and trash table now support `showInTable` custom field columns
- active custom field values are included in lead exports
- CSV import can recognize custom field headers by label or key
- imported custom field values are validated and persisted after the stable lead write path succeeds

## Lead Table Behavior

- only active `showInTable` fields are eligible
- archived fields stay hidden by default
- the table currently shows up to 4 custom field columns
- empty values render as `—` on desktop
- mobile cards show populated custom field values inside an `Extra details` section

## Export Behavior

- active custom fields are exported by neutral labels
- archived fields are hidden by default
- display values are preferred over raw stored values
- conflicting headers are disambiguated with `Custom: <Label>`
- core export columns remain unchanged

## Import Contract Behavior

- CSV import still supports the existing core lead headers
- active custom field labels and keys can now map into `customFieldValues`
- imported values are validated with the same type rules used by manual lead entry and profile editing
- invalid custom field values fail the affected row without weakening existing import behavior

## Safety Rules

- no automatic seed or backfill behavior
- no webhook or form-source runtime changes
- no legacy column removal
- no raw intake payload exposure

## Current Limitations

- lead list table columns are capped for readability
- custom field filters/search on lead lists are still deferred
- exports include custom field values, but wider report modules have not adopted them yet
- webhook and advanced intake mapping still remain separate future work

## Next Phase Direction

Phase 2J should focus on custom-field-aware filters, saved views, and broader report/export adoption so business-specific data becomes easier to segment and measure.
