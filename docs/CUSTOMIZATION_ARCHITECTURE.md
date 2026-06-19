# Leads Desk Customization Architecture

## Purpose

Leads Desk must be customizable enough for different industries and workflows without forcing code changes for every client.

Customization must support:

- branding
- dashboard behavior
- stages and sources
- custom fields
- form source mappings
- labels
- vertical presets

## Customization Principles

- database-backed
- safe by default
- archive-first where possible
- scoped where useful
- auditable
- previewable where practical

## Customization Layers

Customization precedence:

1. system defaults
2. vertical preset defaults
3. company-level settings
4. scope-level overrides
5. user preferences

Scope overrides may apply to:

- role
- team
- branch
- department

## Core Customization Domains

### 1. Appearance

- company name
- logo
- favicon
- colors
- density
- radius
- theme mode
- design style
- liquid glass settings
- login branding
- favicon and wordmark assets

### 2. Dashboard

- layouts
- widget visibility
- widget order
- widget style
- default filters
- role/team/branch/department dashboards

### 2A. Navigation

- sidebar labels
- sidebar order
- item visibility
- required item guardrails

### 2B. Lead Preview

- desktop table columns
- mobile lead preview fields
- custom field preview visibility

### 3. Lead Fields

- custom fields
- field order
- required flags
- visible fields
- searchable/filterable flags
- archived fields

### 4. Lead Stages And Sources

- stage names
- source names
- ordering
- colors
- active/archive states

### 5. Form Intake Configuration

This is now a first-class customization area.

Clients should be able to customize:

- form sources
- webhook keys
- default stage per source
- default assignment per source
- team/branch/department defaults per source
- external-to-core field mappings
- external-to-custom field mappings
- transform and fallback rules

### 6. Labels And Presets

- entity labels
- role labels
- dashboard labels
- preset-driven starter defaults

## Intake Customization Requirement

Different businesses collect different information.

Therefore:

- core lead fields stay standardized
- business-specific intake fields go through custom fields
- form source mapping decides how payloads land in Leads Desk

## Required Tables

Core existing/planned customization tables:

- `themeSettings`
- `dashboardLayouts`
- `dashboardWidgets`
- `userDashboardPreferences`
- `customFields`
- `customFieldOptions`
- `leadCustomFieldValues`
- `leadStages`
- `leadSources`

Additional intake-focused customization tables:

- `formSources`
- `formFieldMappings`

## Safe Customization Rules

- archive instead of hard delete
- warn before destructive actions
- preview where practical
- preserve historical records
- log every important customization change

## Audit Requirements

Audit log coverage should include:

- theme changed
- dashboard layout changed
- custom field created/edited/archived
- stage changed
- source changed
- form source changed
- form mapping changed
- export performed

## Implementation Sequence

1. appearance settings foundation
2. stages and sources
3. custom field builder
4. form source and field mapping
5. dashboard layouts and widgets
6. scoped overrides
7. advanced labels and preset management
