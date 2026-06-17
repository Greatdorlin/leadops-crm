# Fly Connect Pathway Finder Agent Guide

This is a production Next.js App Router application. Treat correctness, system consistency, and local/live parity as higher priority than speed.

## Workspace rules

- Canonical local app root: `C:\Users\USER\OneDrive\Documents\Fly Connect Pathway Finder`
- Canonical branch for parity checks: `main`
- Local dev server for parity checks should run from the canonical root, not an older or side worktree.
- Do not push directly to `main` unless the user explicitly asks for that. Use a branch and PR.
- Do not treat this as a greenfield rebuild.
- Do not create a new project or migrate the app to Astro, Vite, or another framework.

## Read first

Before making changes, read these files and use them as the primary source of truth:

- `docs/HANDOVER.md`
- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `src/app/page.tsx`
- `src/app/start/page.tsx`
- `src/app/pathway-finder/page.tsx`
- `src/app/results/[token]/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/delete-my-data/page.tsx`
- `src/app/globals.css`
- `src/components/brand/PathwayFinderLogo.tsx`
- `src/components/assessment/StitchEntryFlow.tsx`
- `src/components/assessment/AssessmentShell.tsx`
- `src/components/assessment/AssessmentStep.tsx`
- `src/components/assessment/OptionCard.tsx`
- `src/components/assessment/ProgressHeader.tsx`
- `src/store/assessment-store.ts`
- `src/lib/pathway-engine/types.ts`
- `src/lib/pathway-engine/schemas.ts`
- `src/lib/pathway-engine/questions.ts`
- `src/lib/pathway-engine/study-knowledge.ts`
- `src/lib/pathway-engine/report-generator.ts`
- `src/lib/storage/index.ts`
- `src/lib/storage/neon-store.ts`
- `src/lib/google-sheets/*`
- `src/lib/sender/*`
- `src/app/api/assessment/submit/route.ts`
- `src/app/api/assessment/draft/route.ts`
- `src/app/api/assessment/report/[token]/route.ts`
- `src/app/api/waitlist/submit/route.ts`
- `src/app/api/admin/leads/route.ts`
- `src/components/admin/*`
- `src/lib/admin.ts`

If one listed path appears missing, inspect nearby folders before assuming the architecture changed. Example: bracketed App Router paths such as `src/app/results/[token]/page.tsx` and `src/app/api/assessment/report/[token]/route.ts` exist and must be read with literal-path-safe commands.

## Stack and architecture

- Framework: Next.js 16 App Router
- Language: TypeScript with `strict: true`
- UI: React, Tailwind CSS v4, local brand assets, `lucide-react`, `framer-motion`
- State: Zustand persisted to `sessionStorage` with a `hasHydrated` route gate
- Validation: Zod
- Persistence: Neon PostgreSQL through the storage abstraction in `src/lib/storage`
- Admin auth: NextAuth/Auth.js with Google sign-in and server-side workspace access checks
- Integrations: Google Sheets and Sender.net from server-side code only

Main commands:

- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run db:generate`
- `npm run db:push`

## Product intent

Pathway Finder should feel like:

- a premium rule-based diagnosis tool
- a guided pathway assessment
- a personality-test-like onboarding for travel direction
- a calm, serious, warm, professional decision guide

It should not feel like:

- a generic travel agency site
- a visa eligibility checker
- an AI chatbot
- a dashboard template outside `/admin`

## Current route boundaries

Public routes:

- `/` landing page
- `/start` Stitch-style intro flow
- `/pathway-finder` continuation of the live assessment
- `/results/[token]` report page
- `/consultation/pathway-review`
- `/privacy`
- `/delete-my-data`

Admin route:

- `/admin`

Important route rules:

- `/start` owns trust, first-name, greeting, and primary-goal screens.
- `/pathway-finder` must resume after `/start`; do not duplicate the intro flow there.
- Only `study_abroad` is live in the public assessment.
- Other primary goals stay coming-soon and route to Sender waitlist capture.
- Final analysis/loading belongs at report generation, not near the beginning.

## Current data flow

Assessment:

1. Draft checkpoints persist through `/api/assessment/draft`.
2. Completed reports persist through `/api/assessment/submit`.
3. Public report snapshots are loaded through `/api/assessment/report/[token]`.
4. Live storage is Neon through `leadStore = new NeonLeadStore()`.

Waitlist:

- Coming-soon goal waitlists go directly to Sender.net through `/api/waitlist/submit`.
- Do not describe the waitlist as Neon-backed.

Google Sheets:

- Treat as a sync/export target, not the source of truth.
- App must not crash if Sheets is not configured.

## Assessment and report rules

- Keep pathway definitions, scoring, copy, validation, and study knowledge modular under `src/lib/pathway-engine/`.
- `src/lib/pathway-engine/study-knowledge.ts` is the launch-stage source of truth for study guidance.
- Only `live` study cards may appear in public-facing results.
- `ready_for_review` cards are advisor-facing, not public.
- `draft` and `archived` cards must not be recommended publicly.
- Advisor-only and internal-only study data must not leak to browser-facing payloads.
- Missing fields must be tracked explicitly instead of guessed.
- Passport readiness must stay first-step priority when the user has no passport.
- Prior refusals must trigger caution before major spending.

Public results may show:

- one public study direction
- fit summary
- why-this-fits highlights
- biggest blocker
- first practical step
- key requirements
- questions to clarify
- document readiness tracker
- financial roadmap summary
- milestone timeline
- consultation agenda

Internal/admin-only data may remain stored server-side:

- matched product IDs
- triggered rule IDs
- advisor notes
- disclosure warnings
- missing fields
- internal study guidance

## Admin and auth rules

- Keep server-side session checks on `/admin`.
- Keep server-side session checks on `/api/admin/*`, `/api/google-sheets/*`, and `/api/sender/*` paths that require admin access.
- Do not expose admin data to public routes.
- Preserve the CRM-style workspace patterns already established in `src/components/admin/*`.
- Keep CRM status separate from readiness/report status.

Current auth model:

- Google sign-in uses NextAuth/Auth.js.
- Sign-in and error pages point to `/admin/signin`.
- Access depends on server-side workspace checks, not client-only state.
- `MASTER_ADMIN_EMAILS` and allowlists are server-only concerns.

## Constant account switching

Assume the operator may switch Google accounts frequently to continue work on admin.

Because of that:

- Treat `AccessDenied` on `/admin/signin` as a likely account/session mismatch first, not automatically a code bug.
- Before changing auth logic, verify which Google account is currently active in the browser session.
- Prefer signing out cleanly before switching to another admin account.
- Do not weaken allowlist checks just to get past a stale session problem.
- If local and live behave differently on admin, compare both the active signed-in account and the environment config before editing code.
- Keep `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ADMIN_ALLOWED_EMAILS`, `LEAD_EXPORT_ALLOWED_EMAILS`, `SENDER_*`, `GOOGLE_SHEETS_*`, and database URLs out of client code.

## Local/live parity protocol

Do not assume local and live are aligned just because the UI looks close.

These instructions reduce drift only when they are followed. They do not automatically keep local and live in sync by themselves.

For any task that touches deployment-sensitive code, admin behavior, public report output, or shared data flow, parity checks are mandatory both before and after the work.

Do not tell the user local and live are aligned unless those checks were actually run in the current task.

Before declaring parity, verify all of the following:

1. The canonical root checkout is on the expected branch and SHA.
2. `main` in the canonical root is aligned with `origin/main` if the goal is live parity.
3. The dev server on `localhost:3000` is actually running from the canonical root, not a stale worktree.
4. The relevant local route and live route are both inspected.
5. Auth/account state is checked if the route is admin-protected.

Recommended checks:

- `git status --short --branch`
- `git rev-parse HEAD origin/main`
- `git worktree list`
- inspect the process serving port `3000`
- confirm the visible browser tab is on the intended local route

If you intentionally use a side worktree:

- say so explicitly
- keep the canonical root clean unless the task requires changing it
- do not let the side worktree silently become the user's mental model of `main`

Required preflight for parity-sensitive tasks:

1. confirm the canonical root path
2. confirm the active branch and SHA
3. confirm whether `origin/main` is the comparison target
4. confirm which worktree is serving `localhost:3000`
5. confirm the relevant account/session state when testing admin

Required post-task parity check when local/live alignment matters:

1. reload the affected local route
2. inspect the affected live route when accessible
3. confirm local server root again
4. confirm any admin account/session assumptions again if auth was involved
5. report any remaining mismatch explicitly instead of implying parity

## UI and UX rules

Approved visual anchors:

- first-name screen
- greeting transition screen
- primary-goal screen

Preserve:

- dark navy full-screen compositions
- premium centered layouts
- strong Barlow Condensed display headlines
- Manrope body copy
- deliberate spacing and alignment
- compact, mobile-first layouts that still feel polished on desktop
- interactive option states
- local-market-aware greetings and language
- minimal clutter

Avoid:

- split-screen wizard templates
- explanatory side panels
- generic SaaS cards
- generic `Hello` background treatments where local greetings are expected
- uneven option-card typography
- admin-dashboard styling outside `/admin`

## Non-negotiables

- Do not expose secrets, API keys, Google private keys, Sender keys, Neon URLs, or allowlists in client code.
- Do not make visa, scholarship, loan, admission, employment, PR, funding, or relocation guarantees.
- Do not invent eligibility results, provider names, school names, or financial guidance outside the typed knowledge layer.
- Do not reintroduce the removed split-panel questionnaire layout.
- Do not re-add the intro/trust/name/greeting/primary-goal screens inside `/pathway-finder`.
- Do not reset the intro flow automatically on every `/start` mount.
- Do not replace the approved Stitch-inspired flow with generic dashboard or agency-template styling.
- Do not use recreated logo drawings; use the provided Pathway Finder logo assets.
- Do not call UI work complete without checking mobile, tablet, and desktop.

## Verification requirements

For non-trivial changes, run:

- `npm run lint`
- `npm run build`
- `npm run test` when pathway-engine, validation, storage, admin auth, or report logic changes

Also verify affected routes manually, including responsive behavior where UI changed.

For admin/auth changes, verify:

- signed-out state
- signed-in state
- wrong-account or not-allowlisted behavior
- local and live parity where relevant

For local/live-sensitive changes, also verify:

- the canonical root checkout is still the one serving local
- the tested local SHA matches the intended branch target
- the route comparison used the same account assumptions on both local and live

## Reporting after each task

Always report:

- what changed
- files changed
- routes reviewed
- tests/checks run
- responsive checks performed
- data/privacy risks considered
- what remains below standard
- next recommended fix

If local/live parity was part of the task, also report:

- which SHA local used
- which SHA `origin/main` used
- which worktree served `localhost:3000`
- which account/session assumptions were verified for admin

## Current reality notes

- The live study flow is Neon-backed through the storage abstraction.
- The waitlist flow is Sender-backed.
- `/results/[token]` currently renders through `ResultsClient`.
- `/delete-my-data` exists as a route, but the current implementation redirects to `/`. Do not describe it as a fully implemented deletion workflow unless you build that workflow.
- `main` should remain the trustworthy local mirror of live unless the user explicitly asks to work from another branch or worktree.
