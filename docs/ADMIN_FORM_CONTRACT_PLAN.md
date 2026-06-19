# Admin Form Contract Plan

## 1. Admin forms reviewed

- `src/components/admin/LeadCaptureForm.tsx`
- `src/components/admin/LeadProfileForm.tsx`
- `src/lib/admin-leads.ts`
- `src/lib/crm/csv.ts`
- `src/lib/admin-lead-export.ts`
- `src/app/api/admin/leads/route.ts`
- `src/app/api/admin/leads/[id]/route.ts`
- `src/app/api/admin/leads/import/route.ts`
- `src/app/api/admin/leads/export/route.ts`

## 2. Legacy input fields still present

Still present in storage and compatibility layers:

- `primaryGoal`
- `readinessLevel`
- `topPathwayTitle`
- `reportToken`
- `publicReport`
- `answers`
- `report`
- `currentStepKey`

## 3. Neutral labels introduced

- `Category`
- `Stage`
- `Priority`
- `Source`
- `Phone`
- `Fit signal`
- `Budget status`
- `Interest`

## 4. Neutral form contracts created

New helper modules:

- `src/lib/crm/form-contracts.ts`
- `src/lib/crm/input-mapping.ts`

New contracts:

- `AdminLeadCaptureInput`
- `AdminLeadProfileInput`
- `AdminLeadFilterInput`
- `AdminLeadImportInput`
- `AdminLeadExportOptions`

## 5. Mapping from neutral admin fields to old persistence fields

- `category` -> `primaryGoal`
- `stage` -> `crmStatus`
- `phone` / `whatsappNumber` remains compatible with current storage
- import row `category` -> legacy upsert `primaryGoal`
- filter `category` -> legacy filter `primaryGoal`

These mappings now live in:

- `src/lib/crm/input-mapping.ts`

## 6. Import/export labels cleaned

CSV import parser now accepts neutral headers like:

- `Category`
- `Stage`

Admin export now uses Leads Desk-friendly headers:

- `Lead Name`
- `Email`
- `Phone`
- `Source`
- `Category`
- `Stage`
- `Priority`
- `Fit Signal`
- `Interest`
- `Assigned To`
- `Next Follow-up`
- `Notes Count`
- `Tasks Count`
- `Created At`
- `Updated At`

Admin export filename now uses:

- `leads-desk-leads-...`

## 7. API payload fields still legacy

The persistence-facing admin APIs still map back to legacy storage fields internally:

- `POST /api/admin/leads`
- `PATCH /api/admin/leads/[id]`
- `POST /api/admin/leads/import`

These routes now accept neutral admin inputs, but still write to legacy storage names underneath.

## 8. Tests updated

Updated:

- `src/lib/crm/csv.test.ts`
  - now validates neutral `Category` input headers
  - now expects neutral parsed row fields: `category` and `stage`

## 9. Tests still locked to legacy fields

Still intentionally locked:

- `src/lib/storage/neon-store.test.ts`
- `src/lib/admin-access.test.ts`
- pathway/public-report tests under `src/lib/pathway-engine/**`

See:

- `docs/LEGACY_TEST_ASSUMPTIONS.md`

## 10. What must be solved during schema migration

- replace `primaryGoal` in storage contracts with a true `category` field
- replace `readinessLevel` with a neutral qualification field
- replace `topPathwayTitle` with a neutral interest/category summary field
- remove report/public-report/token dependencies from lead records
- replace legacy assessment progress fields such as `currentStepKey`
- separate admin export contracts fully from legacy Google Sheets sync structures
