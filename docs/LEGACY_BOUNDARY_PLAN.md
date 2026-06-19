# Legacy Boundary Plan

## 1. Legacy modules still present

- `src/lib/pathway-engine/*`
- `src/components/assessment/*`
- `src/components/pathway/*`
- `src/components/report/*`
- `src/lib/assessment/*`
- `src/store/assessment-store.ts`
- `src/app/api/assessment/*`
- `src/app/api/waitlist/*`

These modules remain in the repo for compatibility and test stability. They are not the commercial Leads Desk foundation.

## 2. Legacy routes already neutralized

- `/start`
- `/pathway-finder`
- `/results/[token]`
- `/consultation/pathway-review` redirect

These routes no longer represent the commercial product surface.

## 3. Legacy files still imported by admin/CRM

Admin and CRM code no longer import `src/lib/pathway-engine/types.ts` directly for shared runtime types.

However, the neutral CRM layer still depends on legacy modules underneath:

- `src/lib/crm/types.ts`
  - transitional aliases back to `src/lib/pathway-engine/types.ts`
- `src/lib/storage/neon-store.ts`
  - still persists legacy fields such as `reportToken`, `publicReport`, `readinessLevel`, and `topPathwayTitle`
- `src/lib/storage/types.ts`
  - still exposes some assessment-era inputs and result types because persistence has not been refactored yet
- `src/app/admin/leads/[id]/page.tsx`
  - still reads normalized legacy report content for internal summary display

## 4. Types that need to move into neutral CRM modules

Already moved into neutral import paths:

- lead status
- lead priority
- lead source
- CRM user role
- lead record
- lead task record
- lead note record
- integration record
- sync record

Still needing a deeper move away from legacy naming:

- `AssessmentAnswers`
- `AssessmentStepKey`
- `GeneratedReport`
- `PublicAssessmentResult`
- legacy analytics event names tied to report viewing

These remain transitional because storage and tests still rely on them.

## 5. Old database fields still used temporarily

- `reportToken`
- `publicReport`
- `readinessLevel`
- `topPathwayTitle`
- `primaryGoal`
- `currentStepKey`
- `currentStepIndex`
- `progressPercent`
- legacy ad-attribution fields embedded into the lead table

These fields should stay behind formatter and mapping helpers until the Leads Desk schema replaces them.

## 6. What must be removed in later phases

- direct storage dependence on assessment-era report fields
- assessment-specific API contracts in admin and storage layers
- legacy public-report persistence and analytics assumptions
- old lead qualification semantics tied to pathway reports
- legacy route/source labels embedded in source payload handling
- any remaining UI dependence on legacy field names

## 7. What should not be imported by new Leads Desk code

New Leads Desk code should avoid importing directly from:

- `src/lib/pathway-engine/*`
- `src/components/assessment/*`
- `src/components/pathway/*`
- `src/app/api/assessment/*`
- `src/store/assessment-store.ts`

Preferred import paths for shared CRM work:

- `src/lib/crm/types.ts`
- `src/lib/crm/constants.ts`
- `src/lib/crm/status.ts`
- `src/lib/crm/labels.ts`
- `src/lib/crm/formatters.ts`

## 8. Safe migration sequence toward Leads Desk schema

1. Keep all new CRM-facing code on the neutral CRM import surface.
2. Replace customer-facing admin labels through formatters and label helpers before touching persistence.
3. Introduce provider-neutral storage contracts without renaming the active Neon implementation yet.
4. Move lead/task/note/event records to a new Leads Desk schema shape while keeping adapters for old rows.
5. Retire `reportToken`, `publicReport`, `readinessLevel`, and `topPathwayTitle` only after:
   - lead detail
   - reports
   - exports
   - analytics
   - storage tests
   all work without them.
6. Remove legacy public assessment and report modules after the Leads Desk product flows fully replace them.

## Storage and provider note

- `src/lib/storage/index.ts` still exports `new NeonLeadStore()`
- `src/lib/storage/neon-store.ts` is still the active persistence implementation
- `DATABASE_URL` is already the preferred runtime contract

Future direction:

- keep the implementation provider-neutral at the interface layer
- keep the concrete Neon file stable until a low-risk rename or adapter extraction can be done without breaking persistence
