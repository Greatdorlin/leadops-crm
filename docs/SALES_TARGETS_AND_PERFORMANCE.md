# Leads Desk Sales Targets And Performance

## Purpose

Leads Desk must help businesses hit sales targets, not just track contacts.

## Current v1.0 Status

The current runtime now includes:

- additive lead value and follow-up columns
- dashboard pipeline, overdue, conversion, and source-performance summaries
- report summaries for source, rep, stage, intake, and won value views
- additive `sales_targets` storage
- admin sales target management in `/admin/settings/sales-targets`

## Required Lead Performance Fields

- `estimatedValue`
- `wonValue`
- `closeProbability`
- `expectedCloseDate`
- `wonAt`
- `lostAt`
- `lostReason`
- `lastActivityAt`
- `nextFollowUpAt`

## Target Concept

`salesTargets`

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

## Dashboard Requirements

Show:

- monthly target
- won value
- expected pipeline value
- target progress
- conversion rate
- overdue follow-ups
- stuck leads
- rep performance
- team performance
- source performance

## Reporting Priorities

- source conversion
- rep conversion
- team/branch/department conversion
- overdue follow-ups
- stuck lead detection
- target progress by scope

## Product Rule

If a feature does not help a team close, follow up, assign, or measure sales work, it is lower priority than target and performance visibility.

## Phase 2A Contract Status

Neutral sales-target and dashboard-performance contracts now exist under `src/lib/crm/domain/`.

This phase does not add persistence, calculations, or UI widgets yet.

## Production Guardrails

- Sales targets are additive and do not replace legacy fields destructively.
- The first sellable v1.0 scope must support at least a global monthly target.
- More complex enterprise target hierarchies can be layered in later without changing the base contract.
- sales-value lead columns
- target progress inputs that should remain separate from legacy assessment data

No schema work or calculations have started yet.
