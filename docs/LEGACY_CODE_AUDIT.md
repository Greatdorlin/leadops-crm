# Legacy Code Audit

## 1. Legacy public routes found

- `/start`
- `/pathway-finder`
- `/results/[token]`
- `/consultation/pathway-review` redirect in `next.config.ts`
- legacy assessment APIs under `src/app/api/assessment/*`

## 2. Legacy components found

- `src/components/assessment/*`
- `src/components/pathway/*`
- `src/components/brand/FlyConnectLogo.tsx`
- `src/components/brand/PathwayFinderLogo.tsx`
- `src/components/report/*`

## 3. Legacy libraries found

- `src/lib/pathway-engine/*`
- `src/lib/assessment/*`
- `src/store/assessment-store.ts`
- public report generation under `src/lib/pathway-engine/report/*`
- legacy CRM typing still shared from `src/lib/pathway-engine/types.ts`

## 4. Legacy env variables found

- `PATHWAYFINDER_DATABASE_URL`
- `PATHWAYFINDER_POSTGRES_URL`
- `PATHWAYFINDER_POSTGRES_PRISMA_URL`
- `PATHWAYFINDER_POSTGRES_URL_NON_POOLING`
- `ADMIN_ALLOWED_EMAILS`
- `LEAD_EXPORT_ALLOWED_EMAILS`

## 5. Legacy brand assets found

- `public/brand/fly-connect-global-logo.png`
- `public/brand/fly-connect-nav-logo.png`
- `public/brand/pathway-finder-admin-logo.png`
- `public/brand/pathway-finder-logo-dark-cropped.png`
- `public/brand/pathway-finder-logo-dark.png`
- `public/brand/pathway-finder-logo-light-cropped.png`
- `public/brand/pathway-finder-logo-light.png`
- `public/pathway-preview.png`
- `public/pathway/pathway-logo.png`
- additional legacy imagery under `public/pathway/*`

## 6. Hardcoded admin logic found

- existing admin allowlist logic still reads `ADMIN_ALLOWED_EMAILS` in `src/lib/admin-access.ts`
- export allowlist logic still reads `LEAD_EXPORT_ALLOWED_EMAILS`
- legacy admin data labels still depend on assessment-era source and report fields

## 7. Neon/provider-specific naming found

- legacy `PATHWAYFINDER_*` database variables in `.env.example`
- `@neondatabase/serverless` remains in dependencies and storage implementation
- `src/lib/storage/neon-store.ts` remains the active storage implementation

## 8. What was changed in this phase

- renamed package metadata from `fly-connect-pathway-finder` to `leads-desk`
- replaced the public homepage with a Leads Desk placeholder
- updated app metadata from FlyConnect / Pathway Finder to Leads Desk
- removed old public tracking scripts from the root layout
- redirected `/start`, `/pathway-finder`, and `/results/[token]` back to `/`
- replaced customer-facing runtime branding with a neutral Leads Desk wordmark
- rewrote public legal pages to neutral Leads Desk copy
- updated the admin sign-in screen and sidebar branding to Leads Desk
- neutralized the most visible assessment/pathway labels in admin reports and lead detail
- updated `.env.example` to prefer `DATABASE_URL`, `AUTH_*`, `INITIAL_ADMIN_*`, and `ALLOWED_EMAIL_DOMAINS`
- marked legacy env names as compatibility-only

## 9. What was intentionally left untouched

- `src/components/assessment/*`
- `src/lib/pathway-engine/*`
- `src/components/pathway/*`
- `src/app/api/assessment/*`
- legacy CRM schemas and report structures that still depend on assessment-era types
- existing integration docs and setup files that still mention the old domain
- old brand assets still on disk for compatibility and audit purposes

## 10. What must be removed in later phases

- migrate shared CRM types out of `src/lib/pathway-engine/types.ts`
- replace assessment-centric APIs, storage fields, and report payload assumptions
- remove legacy public report and assessment modules once the Leads Desk CRM flows replace them
- replace allowlist env naming with the new admin bootstrap pattern
- remove old brand assets from `public/brand` and legacy preview imagery
- audit and rewrite remaining old docs that still mention FlyConnect, Pathway Finder, or the old public domain
- phase out Neon-specific implementation naming behind provider-neutral storage abstractions
