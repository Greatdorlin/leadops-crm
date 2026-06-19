# Leads Desk Codex Workflow

## Goal

This workflow exists to keep Codex work disciplined while the repo is being migrated from inherited FlyConnect code to Leads Desk.

## Branch Strategy

- keep `main` stable
- use focused feature branches for implementation work
- prefer the `codex/` branch prefix unless the user requests another pattern
- do not start broad implementation on top of a messy or ambiguous scope
- documentation-only foundation work can happen before branch choreography if no runtime behavior changes

## Phase Strategy

- Phase 0 is foundation and documentation
- do not proceed to Phase 1 implementation until the foundation is reviewed
- Phase 1 begins with auth/bootstrap neutralization and data model migration planning
- phase boundaries matter; do not mix documentation, schema redesign, UI overhaul, and integration expansion in one uncontrolled pass

## Every Task Starts With Context

Before editing:

1. Read `AGENTS.md` and the docs in `docs/`.
2. Inspect the relevant code paths.
3. Search for old product references in the affected area.
4. Identify data flow impact.
5. Decide whether the change is:
   - documentation-only
   - safe implementation work
   - migration-sensitive
   - schema/auth/storage-sensitive

## Required Search Checks

When touching product-facing work, search for:

- `Fly Connect`
- `Pathway Finder`
- `LeadOps`
- `FunnelDesk`
- `pathway`
- `assessment`
- `study`
- `visa`
- `relocat`
- `PATHWAYFINDER_`
- `NEON`
- hardcoded admin emails
- internal implementation copy shown to users
- long explanatory text in product UI

When touching auth or permissions, search for:

- `MASTER_ADMIN_EMAILS`
- `ADMIN_ALLOWED_EMAILS`
- `LEAD_EXPORT_ALLOWED_EMAILS`
- role checks
- frontend-only access conditions

When touching schema or storage, search for:

- where the data is written
- where it is read
- where it is displayed
- where it is reported
- where it is exported

## Task Classification

## Documentation/Foundation Task

Allowed:

- docs
- AGENTS rules
- implementation planning
- architecture standards

Do not:

- sneak in risky runtime rewrites
- silently rename broad code surfaces without a migration plan

## Safe Product Task

Allowed:

- scoped feature work that fits the documented MVP
- incremental cleanup of old naming where the affected scope is fully understood
- UI modernization inside clearly targeted screens

Required:

- read nearby files first
- verify no shared data flow breaks

## Migration-Sensitive Task

Examples:

- auth changes
- schema changes
- storage changes
- route replacement
- branding changes in shared components

Required:

- explicit impact analysis
- system-wide search for affected references
- stronger verification

## Review Gates

Before moving from one phase to the next, confirm:

- the current phase deliverables exist
- the current phase acceptance criteria are met
- lint/build/test status is known
- major risks are documented
- the next phase scope is explicit

## Implementation Rules

- Do not treat the inherited repo as greenfield.
- Do not remove legacy code until replacement behavior exists.
- Do not ship partial customer-facing rebrands that still behave like the old product underneath.
- Prefer adapting reusable CRM infrastructure over copying assessment logic forward.
- Keep new product architecture provider-neutral and Postgres-first.
- Keep core business logic centralized.

## Data Flow Checklist

For any feature or field change, verify:

- input layer
- validation layer
- persistence layer
- query layer
- display layer
- report layer
- export layer
- permission layer
- audit logging layer when relevant

If a change affects one of those and the others are not considered, the work is incomplete.

## Customization Checklist

For any settings or customization work:

- store settings in the database
- support preview where practical
- archive instead of hard delete
- add audit log coverage
- preserve safe defaults
- avoid client-specific code forks

## UI Workflow

When working on product UI:

1. Identify the screen type.
2. Identify the main user action.
3. Remove unnecessary copy.
4. Strengthen hierarchy before decoration.
5. Verify desktop, tablet, and mobile.
6. Check empty, loading, and error states.
7. Compare against `docs/UI_CUSTOMIZATION_STANDARD.md`.

## Verification Requirements

For non-trivial changes, run:

- `npm run lint`
- `npm run build`
- `npm run test` when auth, schema, storage, calculation, or export logic changes

For UI changes, also verify:

- desktop layout
- tablet layout
- mobile layout
- no obvious runtime or console issues when practical

For data-sensitive changes, report explicitly:

- where the data is stored
- how it is retrieved
- where it is displayed
- where it is calculated
- where it is exported

## When To Stop And Ask

Stop and ask before proceeding when:

- the change would remove large legacy areas
- the correct replacement path is unclear
- a change would alter customer-facing product positioning
- auth or data rules have multiple plausible interpretations with different business consequences
- migration would lock the product into one provider or architecture path
- unrelated user changes conflict with the current work

## Reporting Format

Every completed task should report:

- what changed
- files changed
- areas audited
- checks run
- frontend/backend alignment status
- schema or persistence impact
- calculation impact
- export/report impact
- risks or follow-ups
- what remains unverified
- next recommended prompt or phase

## What Not To Do

- do not start building SaaS multi-tenancy unless explicitly requested
- do not expand integration work unless the task requires it
- do not add provider-specific env contracts for new work
- do not keep personal emails as product logic
- do not treat the current UI as the final Leads Desk design standard
