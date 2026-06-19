# Legacy Field Containment

## Purpose

Phase 1C reduces direct admin dependence on pathway-era storage fields without changing the live schema yet.

The rule for this phase:

- legacy fields may still exist in storage
- legacy fields may still power compatibility logic
- admin pages should read neutral CRM view models where practical
- new CRM-facing code should avoid exposing pathway-era names directly

## Admin view-model boundary added

New neutral CRM helper modules:

- `src/lib/crm/lead-view.ts`
- `src/lib/crm/report-view.ts`
- `src/lib/crm/task-view.ts`
- `src/lib/crm/view-models.ts`
- `src/lib/crm/form-contracts.ts`
- `src/lib/crm/input-mapping.ts`

These helpers map raw `LeadRecord` rows into admin-facing shapes such as:

- `AdminLeadListItem`
- `AdminLeadDetailView`
- `AdminLeadTaskView`
- `AdminReportSummaryView`

## Legacy fields now contained behind helpers

These fields still exist in persistence, but the main admin surfaces now read mapped labels or summaries instead of the raw names where practical:

- `primaryGoal`
  - mapped to `categoryLabel`
- `readinessLevel`
  - mapped to `fitSignalLabel`
- `topPathwayTitle`
  - mapped to `interestLabel`
- `answers.fundingReadiness` and `answers.studyFundingReadiness`
  - mapped to `budgetStatusLabel`
- `report`
  - normalized into `reportSummary`
- `answers`
  - normalized into `keyFacts` and `intakeAnswers`

## Admin surfaces updated in this phase

- `src/app/admin/leads/page.tsx`
  - now maps leads into `AdminLeadListItem`
- `src/app/admin/leads/trash/page.tsx`
  - now maps leads into `AdminLeadListItem`
- `src/app/admin/team/page.tsx`
  - unassigned-lead cards now use `AdminLeadListItem`
- `src/app/admin/reports/page.tsx`
  - interest, destination, stage, and high-intent summaries now come from `AdminReportSummaryView`
- `src/app/admin/leads/[id]/page.tsx`
  - lead summary, fit signal, attribution details, key answers, intake answers, and normalized report display now come from `AdminLeadDetailView`
- `src/components/admin/LeadDataTable.tsx`
  - now consumes `AdminLeadListItem`
- `src/components/admin/LeadTable.tsx`
  - now consumes `AdminLeadListItem`

## Admin input contracts updated in Phase 1D

- `LeadCaptureForm` now uses neutral local state names such as `category` and `stage`
- `LeadProfileForm` now uses neutral local state name `category`
- admin lead APIs accept neutral admin payloads and map them internally
- CSV import parsing now exposes neutral row fields `category` and `stage`
- admin lead filters now accept `category` as a neutral alias for legacy `primaryGoal`
- admin export headers are now separate from legacy Google Sheets export headers

## Phase 2A domain containment update

New neutral contracts now exist in `src/lib/crm/domain/`.

Legacy field names should only appear in future-facing domain work inside:

- `src/lib/crm/domain/legacy-mapping.ts`

This keeps `primaryGoal`, `readinessLevel`, `topPathwayTitle`, `reportToken`, `publicReport`, `answers`, `report`, and assessment progress fields out of the new Leads Desk domain contracts themselves.

## Phase 2B persistence translation update

Phase 2B adds planning-only translation scaffolds in:

- `src/lib/crm/domain/persistence-mapping.ts`
- `docs/SCHEMA_TRANSLATION_PLAN.md`
- `docs/PERSISTENCE_MAPPING_PLAN.md`

Current future mapping direction:

- `primaryGoal` -> category custom field or preset-backed classification
- `readinessLevel` -> fit signal custom field or derived qualification summary
- `topPathwayTitle` -> interest label or custom field
- `answers` -> intake-event payloads plus custom-field values
- `report`, `publicReport`, `reportToken` -> legacy report summary compatibility only
- `currentStepKey`, `currentStepIndex`, `progressPercent` -> legacy progress summary only

These mappings are documented and testable, but they are not wired into live persistence yet.

## Phase 2C additive schema update

Phase 2C adds neutral schema objects without removing the legacy fields:

- `branches`
- `departments`
- `teams`
- `lead_stages`
- `lead_sources`
- new nullable `leads` sales-command columns

Important:

- legacy columns like `primaryGoal`, `readinessLevel`, `topPathwayTitle`, `answers`, `report`, and `reportToken` still remain active compatibility fields
- current runtime code still depends on those legacy fields
- the new schema objects are not yet the active read and write path

## Phase 2D additive schema update

Phase 2D adds neutral schema objects for custom fields and intake without extending the legacy pathway model:

- `custom_fields`
- `custom_field_options`
- `lead_custom_field_values`
- `form_sources`
- `form_field_mappings`
- `lead_intake_events`

Legacy fields like `answers`, `report`, and `reportToken` still remain for inherited records, but new Leads Desk schema work now has a neutral place to store dynamic intake and custom business data later.

## Phase 2E dual-read update

Phase 2E adds normalized-first read helpers without expanding legacy pathway dependencies.

Current rule:

- new read helpers may consult legacy fields as fallback
- new Leads Desk work should not add new runtime dependence on pathway-engine modules
- legacy fields remain compatibility support only until selective runtime adoption is complete

## Legacy fields intentionally still present

The following fields remain in storage contracts because persistence, legacy APIs, and tests still depend on them:

- `reportToken`
- `publicReport`
- `report`
- `answers`
- `currentStepKey`
- `currentStepIndex`
- `progressPercent`
- `primaryGoal`
- `readinessLevel`
- `topPathwayTitle`

## Remaining direct legacy-field usage

These areas still read or store pathway-era fields directly and are not yet safe to remove:

- `src/lib/storage/types.ts`
  - legacy assessment/report/storage inputs still define persistence contracts
- `src/lib/storage/neon-store.ts`
  - active database implementation still persists and reads old fields
- `src/components/admin/LeadProfileForm.tsx`
  - still edits a field that maps to `primaryGoal` underneath
- `src/components/admin/LeadCaptureForm.tsx`
  - still creates leads that map `category` to `primaryGoal`
- `src/lib/crm/csv.ts`
  - still accepts legacy import header aliases for compatibility
- `src/app/api/admin/leads/route.ts`
  - still maps neutral admin payloads back to legacy storage fields
- `src/app/api/admin/leads/[id]/route.ts`
  - still maps neutral admin payloads back to legacy storage fields
- `src/app/api/admin/leads/import/route.ts`
  - still maps neutral import rows back to legacy storage fields
- legacy assessment/public-report code under `src/lib/pathway-engine/*`

## Storage naming status

Current runtime state:

- `src/lib/storage/index.ts` still exports `leadStore`
- `src/lib/storage/index.ts` now also exposes `createLeadStore()`, `getLeadStore()`, and a transitional `PostgresLeadStore` alias
- `src/lib/storage/neon-store.ts` remains the live implementation
- `NeonLeadStore` is unchanged in this phase to avoid persistence risk
- `src/lib/storage/types.ts` now exposes neutral aliases such as `LeadStore`, `LeadListResult`, `LeadDetailResult`, `LeadCreateInput`, and `LeadUpdateInput`

Provider-neutral direction remains:

- keep `DATABASE_URL` as the main runtime contract
- keep new admin code storage-agnostic
- rename or wrap the concrete Neon implementation only after tests and persistence adapters are ready

## Safe next migration sequence

1. Keep all new admin and CRM display code on `src/lib/crm/view-models.ts`.
2. Move profile-edit and capture forms away from `primaryGoal` naming after the neutral Leads Desk schema exists.
3. Keep using the neutral store boundary before changing the concrete implementation file name.
4. Replace `reportToken`, `publicReport`, `report`, and legacy intake-state fields only after:
   - admin detail
   - reports
   - exports
   - tests
   no longer depend on them.

## Phase 2F Update

Selected admin lead surfaces now use normalized-first display labels for:

- stage
- source
- owner

Lead detail can also show normalized custom field display values when those records exist.

Legacy fallback remains active for:

- `crmStatus`
- `source`
- `assignedTo`

No new Leads Desk display logic depends directly on pathway-era field names outside the existing containment boundary.
