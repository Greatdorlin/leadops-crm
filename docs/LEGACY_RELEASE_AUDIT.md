# Leads Desk Legacy Release Audit

## Purpose

This audit documents the release-candidate cleanup pass for legacy FlyConnect, Pathway Finder, pathway, assessment, and travel-study wording.

The goal of this pass was:

- remove customer-facing legacy branding where active
- confirm old public routes are neutralized
- isolate legacy compatibility areas
- keep build, lint, and tests passing

## Search Terms Used

- `FlyConnect`
- `Fly Connect`
- `fly-connect`
- `flyconnect`
- `Pathway Finder`
- `pathway-finder`
- `pathway`
- `Assessment`
- `assessment`
- `advisor`
- `study`
- `study abroad`
- `report token`
- `reportToken`
- `publicReport`
- `pathway report`
- `primaryGoal`
- `readinessLevel`
- `topPathwayTitle`
- `currentStepKey`
- `currentStepIndex`
- `progressPercent`
- `funding readiness`
- `destination`
- `program`
- `visa`
- `travel`
- `consultation`

## Release-Sensitive Files Reviewed

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/start/page.tsx`
- `src/app/pathway-finder/page.tsx`
- `src/app/results/[token]/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/reports/page.tsx`
- `src/app/admin/settings/page.tsx`
- `src/components/admin/LeadImportForm.tsx`
- `src/components/admin/LeadTaskForm.tsx`
- `src/lib/google-sheets/mapper.ts`
- `PRODUCTION_CHECKLIST.md`
- `INSTALL.md`
- `DEPLOY_VPS.md`
- `DEPLOY_COOLIFY.md`
- `DEPLOY_VERCEL.md`
- `BACKUP_AND_RESTORE.md`
- `DEMO_SCRIPT.md`
- `CLIENT_HANDOVER.md`
- `GO_LIVE_QA.md`

## Classification Summary

### Customer-Facing — replaced now

- `src/app/admin/reports/page.tsx`
  - Replaced destination-focused report wording with neutral sales wording:
    - `Top interests and destinations` -> `Top interests and locations`
    - `Destination interest` -> `Location interest`
    - related empty-state copy updated
- `src/components/admin/LeadImportForm.tsx`
  - Removed legacy-style sample owner email and consultation-stage example
- `src/components/admin/LeadTaskForm.tsx`
  - Replaced consultation-specific placeholder text
- `src/lib/google-sheets/mapper.ts`
  - Replaced customer-visible sheet header labels:
    - `Report Token` -> `Lead Reference`
    - `Top Pathway` -> `Interest`
    - `Readiness` -> `Fit Signal`
    - `Primary Goal` import alias kept for compatibility, but new visible export labels are neutral
  - Replaced `No ranked pathway` fallback with `No saved interest`
- `src/lib/crm/labels.ts`
  - Replaced visible `pathway_finder` label with `Website intake`
- `PRODUCTION_CHECKLIST.md`
  - Replaced direct old-brand wording with neutral release wording

### Internal Legacy Compatibility — remains, contained

- `src/lib/pathway-engine/**`
- `src/app/api/assessment/**`
- `src/lib/storage/types.ts`
- `src/lib/storage/neon-store.ts`
- `src/lib/crm/types.ts`
- `src/lib/crm/domain/legacy-mapping.ts`
- `src/lib/crm/domain/persistence-mapping.ts`
- `src/lib/google-sheets/mapper.ts`
  - still maps legacy storage fields internally for compatibility

### Test Fixture — can remain for now

- `src/lib/crm/csv.test.ts`
- `src/lib/storage/neon-store.test.ts`
- `src/app/api/crm/website-lead/route.test.ts`
- `src/lib/crm/domain/*.test.ts`

These still reference legacy field names or old category values because they validate compatibility mapping. They are not customer-facing.

### Docs For Legacy Migration — removed from normal docs

The old FlyConnect handover, ad-integration, and report-knowledge documents were removed from the normal docs tree instead of being carried forward as client/operator documentation.

### Dead Or Neutralized

- `src/app/start/page.tsx`
  - redirects to `/`
- `src/app/pathway-finder/page.tsx`
  - redirects to `/`
- `src/app/results/[token]/page.tsx`
  - redirects to `/`
- Removed orphaned legacy route components and supporting stores:
  - `src/app/results/[token]/ResultsClient.tsx`
  - `src/components/assessment/**`
  - `src/components/pathway/**`
  - `src/components/report/**`
  - `src/components/brand/FlyConnectLogo.tsx`
  - `src/components/brand/PathwayFinderLogo.tsx`
  - `src/store/assessment-store.ts`

These routes are no longer product entry points.

## Public Routes Checked

- `/` -> active Leads Desk homepage
- `/start` -> redirects to `/`
- `/pathway-finder` -> redirects to `/`
- `/results/[token]` -> redirects to `/`

## Asset And Metadata Findings

### Removed from active customer-facing use

- No active public page or admin shell now uses FlyConnect or Pathway Finder wordmarks.

### Removed legacy brand and pathway assets

- `public/brand/fly-connect-global-logo.png`
- `public/brand/fly-connect-nav-logo.png`
- `public/brand/pathway-finder-admin-logo.png`
- `public/brand/pathway-finder-logo-dark-cropped.png`
- `public/brand/pathway-finder-logo-dark.png`
- `public/brand/pathway-finder-logo-light-cropped.png`
- `public/brand/pathway-finder-logo-light.png`
- `public/pathway-preview.png`
- `public/pathway/**`

These files were safe to remove after the legacy public assessment/report component tree was proven orphaned behind redirects.

## Current Release Pass Update

- Removed old FlyConnect reference docs so they no longer appear as normal operator/client documentation.
- Replaced old-brand production checklist wording with neutral inherited-brand wording.
- Removed legacy category selection from the normal manual lead capture UI.
- Replaced Nigeria-only region selection in normal lead capture with global location fields:
  - country
  - State/Province/Region
  - city
  - address
  - postal code

## Remaining Blockers

1. Internal type aliases still use compatibility names such as `PrimaryGoal` while old data contracts are being retired.
   - These are not shown as normal customer-facing labels.
2. Some internal source constants still include `pathway_finder` for historic rows.
   - Customer-facing labels resolve this as `Website intake`.
3. Internal migration/planning docs still mention legacy names where they explain removal history or compatibility constraints.
   - These are not client/operator setup docs.

## Why Remaining Legacy Items Are Safe For Release

- They are isolated to compatibility, storage, tests, migrations, or retired route modules.
- Active customer-facing public routes redirect away from legacy flows.
- The Leads Desk homepage, admin shell, settings, exports, demo docs, and operator docs no longer present the product as FlyConnect or Pathway Finder.
- Remaining legacy terminology is primarily tied to:
  - stored field compatibility
  - old tests
  - internal mapping
  - legacy modules not used as the active product surface

## Recommended Next Cleanup After Buyer Demo

1. Retire or hard-disable `src/app/api/assessment/**` once old compatibility checks are no longer required.
2. Replace remaining legacy integration header aliases and provider docs with fully neutral naming.
