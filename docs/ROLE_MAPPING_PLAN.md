# Leads Desk Role Mapping Plan

## Purpose

This document defines the neutral Leads Desk role vocabulary used during the compatibility transition away from inherited access-level wording.

## Canonical Leads Desk Roles

- `owner`
- `admin`
- `manager`
- `team_lead`
- `sales_rep`

These are the role labels new Leads Desk code should prefer in UI copy, helper naming, and future permission design.

## Current Compatibility Mapping

Legacy access-level mapping:

- `master_admin` -> `owner`
- `general_admin` -> `admin`
- `lead_sales_rep` -> `team_lead`
- `sales_rep` -> `sales_rep`

Legacy CRM role mapping:

- `admin` -> `owner`
- `manager` -> `manager`
- `ad_manager` -> `manager`
- `finance` -> `manager`
- `consultant` -> `team_lead`
- `sales_agent` -> `sales_rep`

Ambiguous legacy roles are mapped conservatively unless a broader permission is already required by the inherited runtime.

## Current Limitations

- stored database enum values are unchanged in this phase
- inherited access-level values still power the live permission checks
- some compatibility behavior still allows team-lead style access to grant limited rep access
- scope is not yet enforced by team, branch, or department

## Future Scope Direction

Planned permission scopes:

- `global`
- `branch`
- `department`
- `team`
- `own`

Expected future defaults:

- owner -> global
- admin -> global
- manager -> branch or department
- team_lead -> team
- sales_rep -> own

## Why Schema Migration Is Deferred

The repo still depends on inherited enums, storage records, and admin workflows. A schema migration would be riskier before:

- neutral role helpers are established
- scope rules are defined
- admin screens stop depending on inherited role strings
- legacy storage contracts are isolated behind the new Leads Desk permission layer

## Rules For New Leads Desk Code

- prefer neutral role helpers over direct legacy string checks
- do not introduce new customer-facing `master_admin`, `general_admin`, or `lead_sales_rep` wording
- keep compatibility mapping centralized
- prepare new permission helpers so scope enforcement can be added later without rewriting the full admin surface
