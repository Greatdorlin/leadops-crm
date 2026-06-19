# Leads Desk Database Provider Neutrality

## Core Rule

Leads Desk is PostgreSQL-compatible, not Neon-only.

Primary database configuration:

- `DATABASE_URL`

Supported provider examples:

- local Postgres
- managed Postgres on VPS providers
- Neon
- Supabase Postgres
- Railway Postgres
- Render Postgres
- any compatible PostgreSQL connection URL

## Current Compatibility Reality

The repo still contains:

- a concrete class named `NeonLeadStore`
- a DB client using the Neon HTTP driver
- compatibility env fallbacks for inherited runtime paths

These do not make Neon the product requirement. They are implementation details that remain for stability while the storage boundary is cleaned up.

## What This Phase Confirms

- `DATABASE_URL` is the primary runtime database contract
- provider-specific env names are fallback compatibility only
- app-level storage now has a more neutral entry point
- future Leads Desk work should build against the neutral storage boundary first

## Why The Schema Migration Is Deferred

The current live runtime still depends on:

- assessment-era persistence fields
- legacy report/token flows
- existing integration payload processing
- inherited admin data flows

The safer sequence is:

1. neutralize storage entry points
2. contain legacy field usage
3. finalize future data model
4. migrate schema deliberately
