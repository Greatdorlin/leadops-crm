# Phase 2A Data Contracts

## Purpose

Phase 2A introduces neutral Leads Desk sales-command domain contracts before schema migration begins.

## What Was Added

New domain modules under `src/lib/crm/domain/` now define future-facing contracts for:

- leads
- custom fields
- form sources and field mappings
- intake events
- sales targets
- teams, branches, departments, and users
- tasks, notes, and activity
- notifications
- dashboard metrics

## Important Boundary

These are domain and mapping contracts only.

This phase does not:

- change the database schema
- add tables
- add webhook routes
- redesign the UI
- remove legacy assessment/report code

## Legacy Compatibility Rule

Legacy fields such as:

- `primaryGoal`
- `readinessLevel`
- `topPathwayTitle`
- `reportToken`
- `publicReport`
- `answers`
- `report`
- `currentStepKey`
- `currentStepIndex`
- `progressPercent`

must stay behind compatibility mapping helpers while the current runtime remains live.

## How This Prepares Phase 2B

Phase 2B can now use these contracts to plan:

- schema migration targets
- entity-level mappers
- safer storage evolution
- neutral API contracts
- intake/custom-field/table design
