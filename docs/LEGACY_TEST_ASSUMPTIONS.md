# Legacy Test Assumptions

## Purpose

This document tracks test assumptions that still lock the repo to inherited runtime behavior while Leads Desk cleanup continues.

These tests were not removed in this phase because they still protect current runtime behavior.

## Documented assumptions

### 1. `src/lib/storage/neon-store.test.ts`

- Old assumption:
  - storage still persists and retrieves `reportToken`
  - storage still persists `report` and `publicReport`
  - storage still aligns `answers` with profile updates
  - storage still accepts `topPathwayTitle` and `primaryGoal`
- Why it remains:
  - these tests protect the live persistence contract
  - removing them before schema migration would make the current phases riskier
- Future replacement plan:
  - add new neutral store-contract tests
  - migrate assertions away from report/public-report fields after the Leads Desk schema lands

### 2. `src/lib/pathway-engine/report/public-report.test.ts`

- Old assumption:
  - public report payload generation is still part of the tested runtime
- Why it remains:
  - the legacy engine is still present for compatibility and build stability
- Future replacement plan:
  - retire this test with the full removal of public assessment/report flows

### 3. `src/lib/pathway-engine/report-generator.test.ts`

- Old assumption:
  - pathway-era report generation remains a supported internal module
- Why it remains:
  - lead storage and normalized legacy report display still depend on the report structure
- Future replacement plan:
  - replace with neutral qualification-summary tests once the new CRM qualification model exists

### 4. `src/app/api/crm/website-lead/route.test.ts`

- Old assumption:
  - website lead ingestion still accepts pathway-era metadata shapes through source payloads
- Why it remains:
  - intake compatibility is still required while the old website lead contract remains live
- Future replacement plan:
  - migrate request fixtures to the Leads Desk lead-capture contract after the intake rewrite

## What changed in Phase 1E

- admin bootstrap and export tests now use neutral example emails
- the personal export allowlist fallback assumption was removed
- the personal preview-access email assumption was removed
- no legacy persistence or public-report tests were deleted

## What changed in Phase 1F

- neutral role-mapping tests now cover owner/admin/manager/team lead/sales rep vocabulary
- customer-facing role wording moved away from master/general/sales-manager labels where low-risk
- legacy access levels still remain in compatibility tests because storage and admin routing still depend on them

## Recommended follow-up

The next safe replacements should focus on:

- legacy access-level naming in admin permissions tests
- neutralized intake fixtures for website-lead route coverage
- new role/scope tests once owner/admin/team permissions replace the compatibility access levels

Persistence and public-report tests should stay intact until schema migration planning is approved.
