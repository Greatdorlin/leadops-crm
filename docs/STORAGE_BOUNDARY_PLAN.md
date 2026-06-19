# Leads Desk Storage Boundary Plan

## Purpose

This document defines the transitional storage boundary while the inherited runtime is still active and the full Leads Desk schema has not been introduced yet.

## Current Runtime State

- the application uses PostgreSQL-compatible storage through `DATABASE_URL`
- the concrete implementation class is still named `NeonLeadStore`
- the app-level storage entry point now routes through a neutral factory and shared accessor
- new code should prefer the neutral storage boundary, not the concrete provider-specific class

## Neutral Boundary Introduced

Current neutral boundary:

- `createLeadStore()`
- `getLeadStore()`
- `leadStore`
- `LeadStore`
- `LeadListResult`
- `LeadDetailResult`
- `LeadCreateInput`
- `LeadUpdateInput`

Current compatibility alias:

- `PostgresLeadStore` -> `NeonLeadStore`

This keeps the runtime stable while making future store renaming lower-risk.

## Why The Concrete Class Was Not Renamed

The inherited store implementation is still deeply exercised by:

- admin routes
- public assessment/report routes
- integration payload processing
- sync jobs
- legacy persistence tests

Renaming the file or class everywhere in this phase would create churn without materially improving the future schema work.

## Provider Neutrality Rules

- `DATABASE_URL` is the primary database contract
- PostgreSQL is the supported database family
- Neon is supported as one possible provider, not as the product identity
- compatibility env fallbacks still exist only to avoid breaking inherited runtime paths
- new storage code should not introduce new provider-specific env names

## Legacy Field Leakage Still Present

The active store contract still includes inherited fields such as:

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

These remain for runtime compatibility and test stability only.

## Future Naming Direction

Preferred future naming:

- `LeadStore`
- `PostgresLeadStore`
- `LeadRepository` only if the architecture later needs a repository split

Preferred future storage results and inputs:

- neutral lead create/update/list/detail types
- source/intake-specific inputs separated from core lead storage inputs
- assessment-era report fields removed from the main lead contract after schema migration

## Deferred Work

Not handled in this phase:

- schema migration
- table additions for custom fields, form sources, intake events, sales targets, or notifications
- concrete class/file rename from `NeonLeadStore`
- removal of pathway/report-era storage fields
