# Fly Connect Pathway Finder Handover

## Project Identity

- Brand: Fly Connect Global
- Product: Pathway Finder
- Tagline: Dream. Explore. Travel.
- Repository: `FLY-CONNECT/fly-connect-pathway-finder`
- Working branch: `main`
- Framework: Next.js App Router + TypeScript + Tailwind CSS

## Core Product Intent

Pathway Finder is not meant to feel like:

- a generic travel agency site
- a visa eligibility checker
- an AI chatbot

It should feel like:

- a premium rule-based diagnosis tool
- a guided pathway assessment
- a personality-test-like onboarding for travel direction

The system asks users simple questions, evaluates answers against pathway rules, and returns a tailored report with:

- top pathway directions
- readiness level
- blockers
- next practical step
- action plan
- Fly Connect next-step CTA

## User Experience Direction

The strongest approved UI direction came from the Stitch screens and repeated user feedback in this thread.

### Important design instruction

The first-name screen and the primary-goal screen are the approved visual benchmark. Future question screens should rise to that standard, not fall back to generic card/dashboard layouts.

### Visual traits the user wants preserved

- dark navy full-screen compositions
- premium centered layout
- strong use of `Barlow Condensed` for display headlines
- `Manrope` for body copy
- very deliberate alignment and spacing
- mobile-first, but polished on tablet and desktop
- interactive option states
- minimal clutter
- no random right-hand explanatory side panels
- no generic dashboard or SaaS-looking cards

### Explicitly rejected by the user

- the earlier split-panel questionnaire layout
- the "Why this flow feels different" panel
- the "Privacy note" panel
- drifting away from the Stitch-guided flow
- replacing approved UI with an invented template

## Brand Tokens

- Navy: `#101052`
- Yellow: `#FFBE00`
- White: `#FFFFFF`

Fonts are already wired in `src/app/layout.tsx`:

- `Barlow_Condensed` as `--font-heading`
- `Manrope` as `--font-body`
- `Poppins` as `--font-fallback`

## Current Route Structure

### Public routes

- `/` landing page
- `/start` stitched entry flow
- `/pathway-finder` main assessment branch only
- `/results/[token]` results page
- `/consultation/pathway-review`
- `/privacy`
- `/delete-my-data`

### Admin route

- `/admin`

### API routes

- `/api/assessment/submit`
- `/api/assessment/report/[token]`
- `/api/admin/leads`
- `/api/google-sheets/sync`
- `/api/sender/sync`
- `/api/analytics/track`

## Assessment Flow Status

### Intro flow at `/start`

This is implemented in `src/components/assessment/StitchEntryFlow.tsx`.

Current flow:

1. Trust / privacy promise
2. First name
3. Greeting transition
4. Primary goal
5. Continue into `/pathway-finder`

Important:

- the early "analysis" screen was removed from `/start`
- the user explicitly said the analysis/loading screen belongs only at the end, after the full profile is submitted
- the greeting transition should feel culturally aware and should prioritize local greetings over generic ones
- generic `Hello` background treatment was explicitly disliked and should not be reintroduced casually
- the `/start` flow is now the only place where the first four Stitch-style intro screens live
- only `study_abroad` is live right now
- the other goal cards are coming soon and open a waitlist form instead of entering the assessment flow
- the waitlist form currently collects first name, email, and WhatsApp number
- the live waitlist destination is Sender.net, not Neon
- `work_and_relocate` and `family_relocation` share one Sender waitlist group
- `visit_or_tour` uses its own Sender waitlist group
- `business_abroad` uses its own Sender waitlist group
- the goal screen has been compressed so the key options stay visible without unnecessary scrolling on large desktop screens
- the `/start` trust and goal screens were recently tightened to fit in a single viewport on desktop and mobile, with the mobile goal screen using a denser 2-column layout so it does not feel scroll-heavy

### Branch assessment at `/pathway-finder`

This route is intentionally the handoff after `/start`.

Current behavior:

- redirects back to `/start` if there is no saved primary goal yet
- redirects back to `/start` if the saved goal is not `study_abroad`
- waits for Zustand hydration before deciding whether the session is ready
- resumes at the first branch question instead of replaying the intro flow
- keeps the later analysis/report generation state inside the main assessment shell

Important:

- do not reintroduce the trust, first name, greeting, or primary-goal screens inside this route
- this route should feel like the continuation after the intro flow, not a duplicate of it
- the page gate relies on the `hasHydrated` flag in `src/store/assessment-store.ts`
- the study route now collects `ageRange` as part of the study-specific guidance layer
- keep the branch questions compact and centered instead of turning them into a generic dashboard-style wizard

This is powered by:

- `src/components/assessment/AssessmentShell.tsx`
- `src/lib/pathway-engine/questions.ts`

The main assessment still needs continued visual refinement to fully match the approved Stitch standard across all question types. It has been pulled back toward the centered premium layout, but this is not yet "final-perfect" by the user's standard.

## User Awareness / Name Persistence

The app is currently user-aware during the session through Zustand state.

Source:

- `src/store/assessment-store.ts`

How it works:

- the first name is stored in `answers.firstName`
- the assessment store is persisted to `sessionStorage`
- persistence key: `fly-connect-pathway-finder-session`
- the store now also tracks `hasHydrated` so route guards do not fire before the saved session is ready

What this means:

- the app remembers the user within the same browser session
- refreshes do not immediately lose the name
- closing the session may clear it depending on the browser

Recent fix:

- `/start` was previously hard-resetting the flow on mount, which caused browser-back navigation to dump users back to the privacy step
- that reset behavior was removed so intro-state and assessment-state can resume from session data instead of always restarting

Current expectation from the user:

- browser back should not feel like data loss
- cached progress should resume safely and predictably
- route handoff should preserve the intro experience on `/start` and the branch questions on `/pathway-finder`

Important limitation:

- the intro flow still relies on sessionStorage for the pre-assessment handoff
- once the live study assessment begins, draft checkpoints persist server-side in Neon through `/api/assessment/draft`
- browser back should feel continuous, but the first-name/greeting experience is still driven by session state rather than a server-restored intro replay

## Current Submission / Storage Pipeline

Current pipeline in `src/app/api/assessment/submit/route.ts`:

1. receive payload
2. sanitize fields
3. validate with Zod
4. generate report through the pathway engine
5. create token
6. build a `LeadRecord`
7. attempt Google Sheets sync
8. attempt Sender sync
9. save to `leadStore`
10. return `{ token, report, sync }`

### Current storage reality

There is still a storage abstraction:

- `src/lib/storage/types.ts`
- `src/lib/storage/index.ts`
- `src/lib/storage/neon-store.ts`
- `src/lib/storage/memory-store.ts`

The live lead store now points to Neon PostgreSQL:

- `src/lib/storage/index.ts` exports `new NeonLeadStore()`
- draft checkpoints persist through `/api/assessment/draft`
- completed study reports persist through `/api/assessment/submit`
- `/results/[token]` fetches the stored report snapshot through `/api/assessment/report/[token]`

Important consequence:

- assessment persistence is now durable for the live study flow
- the old in-memory store still exists in the codebase as a legacy/dev artifact, but it is no longer the intended live persistence path
- waitlist capture is not stored in Neon; coming-soon waitlists go to Sender.net directly

## Pathway Engine Structure

The rule engine is intentionally split into multiple typed files under `src/lib/pathway-engine/`.

Key files:

- `types.ts`
- `schemas.ts`
- `questions.ts`
- `options.ts`
- `signals.ts`
- `pathways.ts`
- `scoring.ts`
- `blockers.ts`
- `action-plans.ts`
- `segments.ts`
- `offers.ts`
- `report-copy.ts`
- `report-generator.ts`

### Why this split matters

The user asked about a possible `data.ts`, but one monolithic file is not recommended here.

Better long-term pattern:

- keep rules typed and modular
- separate pathway definitions from scoring logic
- separate copy from route intelligence
- add versioning / review metadata later

### Current engine behavior

The engine already:

- derives signals
- scores pathways
- returns top matches
- computes readiness
- assigns segment
- generates blockers
- recommends offer
- generates report copy

### Important future need

The user wants more "real info" and deeper personalization. The next iteration should likely expand the typed knowledge layer rather than collapsing it into a single data file.

### Study knowledge layer

The study pathway now has its own structured knowledge layer.

Important notes:

- study guidance is the only pathway actively exposed in public reporting right now
- the study layer includes country cards, product cards, requirement cards, and recommendation rules
- it uses disclosure levels: `public`, `advisor_only`, and `internal_only`
- it uses knowledge status levels: `draft`, `ready_for_review`, `live`, and `archived`
- public recommendations should only surface `live` cards
- advisor/internal notes can keep richer routing detail, but those should not leak into the public report
- `ageRange` is now part of the study signal set so age-sensitive routes can be handled without guessing
- missing study fields should be tracked explicitly rather than invented

## Admin / CRM Status

### Current state

There is a basic admin route and API:

- `src/app/api/admin/leads/route.ts`
- `src/components/admin/AdminShell.tsx`
- `src/components/admin/LeadTable.tsx`
- `src/lib/admin.ts`

### Current security model

Admin protection now uses:

- Google sign-in through Auth.js / `next-auth`
- allowlisted admin emails from `ADMIN_ALLOWED_EMAILS`
- server-side session checks on `/admin` pages
- server-side session checks on `/api/admin/*`, `/api/google-sheets/sync`, and `/api/sender/sync`

This is strong enough for a v1 internal dashboard, but it is still allowlist-based rather than full role-based access control.

### Current CRM model

- draft and completed leads persist in Neon PostgreSQL
- CRM status is stored separately from system-generated readiness and report content
- current manual CRM statuses are:
  - `new`
  - `contacted`
  - `qualified`
  - `unqualified`
  - `closed`

### Recommended future architecture

Next steps after v1:

- move from allowlisted-admin auth to role-based access control
- add audit logging for admin actions
- add sales-stage workflow fields if the team needs pipeline depth beyond CRM status

## Integrations

### Google Sheets

Files:

- `src/lib/google-sheets/client.ts`
- `src/lib/google-sheets/mapper.ts`
- `src/lib/google-sheets/types.ts`

Current use:

- sync target for submitted leads

Environment variables:

- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SHEETS_WORKSHEET_NAME`
- `GOOGLE_SHEETS_CLIENT_EMAIL`
- `GOOGLE_SHEETS_PRIVATE_KEY`

Important:

- if not configured, app should not crash
- only completed leads should sync
- Sheets should be treated as a sync target, not the long-term authoritative CRM

### Sender.net

Files:

- `src/lib/sender/client.ts`
- `src/lib/sender/mapper.ts`
- `src/lib/sender/types.ts`
- `src/lib/sender/waitlist.ts`

Environment variables:

- `SENDER_API_KEY`
- `SENDER_DEFAULT_GROUP_ID`
- `SENDER_WAITLIST_GROUP_ID_WORK_RELOCATE`
- `SENDER_WAITLIST_GROUP_ID_VISIT_TOURISM`
- `SENDER_WAITLIST_GROUP_ID_BUSINESS_TRAVEL`

Rules:

- server-only
- only sync when consent allows
- the coming-soon waitlist now sends directly to Sender instead of Neon
- the waitlist API should only return success if Sender accepts the subscriber

Waitlist group mapping:

- `work_and_relocate` -> `SENDER_WAITLIST_GROUP_ID_WORK_RELOCATE`
- `family_relocation` -> `SENDER_WAITLIST_GROUP_ID_WORK_RELOCATE`
- `visit_or_tour` -> `SENDER_WAITLIST_GROUP_ID_VISIT_TOURISM`
- `business_abroad` -> `SENDER_WAITLIST_GROUP_ID_BUSINESS_TRAVEL`

### Waitlist

Files:

- `src/app/api/waitlist/submit/route.ts`
- `src/lib/waitlist/types.ts`
- `src/lib/waitlist/memory-store.ts`
- `src/lib/waitlist/index.ts`

Current use:

- stores interest from users who click coming-soon goal cards
- the current payload includes first name, email, WhatsApp number, goal value, and goal label

Important:

- the live path is now Sender-based, not memory-based
- the legacy in-memory waitlist store still exists in code but is no longer the intended live destination
- this exists so the coming-soon experience can capture demand without opening the main assessment

## Deployment Status

Known deployment setup from this thread:

- branch pushed to GitHub: `v1-pathway-finder-build`
- Vercel deployment exists
- production alias used: `https://fly-connect-pathway-finder.vercel.app`

Important:

- `main` is the working branch now
- GitHub and Vercel production have already been used from `main`
- do not assume older notes about `v1-pathway-finder-build` are still current
- the user repeatedly said not to push to main directly

## Files Most Relevant To Ongoing Work

### UI / flow

- `src/app/page.tsx`
- `src/app/start/page.tsx`
- `src/app/pathway-finder/page.tsx`
- `src/components/assessment/StitchEntryFlow.tsx`
- `src/components/assessment/AssessmentShell.tsx`
- `src/components/assessment/AssessmentStep.tsx`
- `src/components/assessment/OptionCard.tsx`
- `src/components/assessment/ProgressHeader.tsx`
- `src/components/brand/PathwayFinderLogo.tsx`
- `src/app/globals.css`

### Engine / logic

- `src/lib/pathway-engine/*`

### Submission / storage / sync

- `src/app/api/assessment/submit/route.ts`
- `src/lib/storage/*`
- `src/lib/google-sheets/*`
- `src/lib/sender/*`

### Admin

- `src/app/api/admin/leads/route.ts`
- `src/components/admin/*`
- `src/lib/admin.ts`

## Current Styling Direction For Main Assessment

The current goal for `/pathway-finder` is:

- centered logo at top
- centered progress shell that follows the approved goal-screen structure
- centered question shell
- no side info column
- big condensed heading, but scaled intelligently for long questions
- supportive body copy
- interactive option cards
- clear continue/back actions
- consistent dark navy premium background
- local-market-aware background language and cultural texture
- alignment that feels intentional on both odd and even option counts
- no duplicated intro screens from `/start`

This is partially restored, but should still be refined until it feels as polished as:

- the first-name screen
- the primary-goal screen
- the Stitch reference quality

### Critical visual benchmark

The following screens are the strongest approved references and should be treated as design-system anchors:

- first-name screen
- greeting transition screen
- primary-goal screen

The user explicitly said all later question screens should be elevated to this standard, not translated into a different generic assessment template.

## Known Issues / Incomplete Areas

### 1. Main assessment styling still needs more refinement

The user is still unhappy with the question flow styling. The next agent should continue improving:

- font scale consistency
- text alignment
- spatial rhythm
- desktop composition
- mobile fit
- interaction polish
- parity with Stitch-style intro screens
- option-card typography for long labels
- grid balance when option count is odd
- visual consistency between intro screens and deeper branch questions
- avoid any explanatory filler text that repeats inside branch screens
- keep the live goal cards and branch questions compact enough that the highest-priority content stays visible without unnecessary scrolling

### 2. Draft persistence is not durable

Session storage keeps the user "known" in-session, but there is no persistent draft model yet.

### 3. Admin is not secure enough yet

Current key-based protection is too weak for a real internal CRM.

### 4. Lead storage is not production-safe yet

The memory store is not enough for real operations.

### 5. The rule knowledge layer needs richer real-world data

The engine structure is good, but the user wants stronger personalized realism and more grounded guidance data.

### Study diagnosis contract

The study layer now has a stricter public/internal split.

Public results should receive:

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

Internal/admin-only data should stay in the stored report object and not be sent to the public results route:

- matched product IDs
- triggered rule IDs
- advisor notes
- disclosure warnings
- missing fields

Files involved:

- `src/lib/pathway-engine/types.ts`
- `src/lib/pathway-engine/study-knowledge.ts`
- `src/lib/pathway-engine/report-generator.ts`
- `src/app/api/assessment/submit/route.ts`
- `src/app/api/assessment/report/[token]/route.ts`

Important:

- the browser-facing results page now expects a public-only report payload
- the stored lead report in backend storage can still retain internal study guidance
- admin lead detail can now surface advisor-only study notes from `internalStudyGuidance`

### 6. Waitlist persistence is temporary

This used to be memory-only. The live direction is now Sender-based waitlist capture, but production readiness still depends on the correct Sender group IDs being present in Vercel.

## Direct User Preferences From This Conversation

These are important and should be treated as product requirements, not suggestions:

- do not reinvent the approved Stitch UI
- the first-name and primary-goal screens are the visual baseline
- the greeting transition is also a key approved reference
- all other question pages should match that quality level
- analysis/loading belongs only at final report creation
- do not use fake-template-looking card systems
- use the user's exact uploaded logo assets, not recreated logo drawings
- maintain strong device optimization across mobile, tablet, and desktop
- avoid cluttered travel-agency styling
- keep the product premium, serious, warm, and professional
- local greetings matter because the user is optimizing for market psychology, not just decoration
- generic westernized fallback styling can actively reduce trust for this audience
- if typography or spacing drifts from the approved screens, the user notices immediately
- browser back behavior should preserve session continuity rather than feeling like a forced restart

## Specific Mistakes To Avoid

- do not reintroduce the removed split right-column assessment panels
- do not add generic explanatory side cards unless explicitly requested
- do not replace local greetings with generic `Hello` patterns in backgrounds
- do not use one-size-fits-all display type scales for long question titles
- do not use identical label sizing for short and long option-card text
- do not reset the intro flow automatically on every `/start` mount

## Recommended Next Steps

1. Finish restoring every `/pathway-finder` question screen to the approved centered Stitch-grade style.
2. Add visual QA across desktop, tablet, and mobile after each major screen type.
3. Introduce real persistence for leads and drafts with a database.
4. Replace simple admin-key security with staff auth + role-based access.
5. Add CRM fields and actions:
   - owner
   - status
   - notes
   - follow-up date
   - last contact
6. Expand the typed pathway knowledge layer with more realistic route intelligence.
7. Add a rules/versioning concept so older reports can still be explained against the logic used at the time.

## Verification Habits Expected For Future Changes

For non-trivial work on this repo:

- run `npm run lint`
- run `npm run build`
- check affected responsive layouts
- avoid breaking the assessment flow
- avoid mismatching UI and report logic
- do not describe the assessment lead flow as memory-based anymore; it now persists to Neon
- do not describe the coming-soon waitlist as Neon-backed; it now routes to Sender.net

## Study Abroad Knowledge Layer

The repo now includes a dedicated study guidance layer in:

- [src/lib/pathway-engine/study-knowledge.ts](../src/lib/pathway-engine/study-knowledge.ts)

That module is the source of truth for launch-stage Study Abroad guidance. It contains:

- country cards for UK, Canada, France, and New Zealand
- product cards for study routes, scholarship routes, loan-supported routes, and certificate/diploma routes
- requirement cards for passport, admission, academic documents, CV, research proposal, proof of funds, CAS, TB test, France POF, and New Zealand funding
- recommendation rules for passport-first sequencing, UK dependant/research routes, UK deposit support, Canada certificate routes, Canada funding support, France flexible routes, France strict business routes, New Zealand study-to-work logic, and UK scholarship logic
- disclosure controls so public output uses public names and hides internal provider or school names unless advisor-only context is used

Key behavior:

- `getStudyGuidance(answers)` returns a controlled public study report object
- only `live` study cards can appear in public-facing output
- `ready_for_review` cards are reserved for advisor notes
- `draft` and `archived` cards should not be recommended publicly
- passport readiness always wins first-step priority when `passportStatus = no_passport`
- `previousRefusal = yes` should trigger a cautionary review warning before major spending
- missing study details should be tracked in `missingFields` instead of being invented

The report generator now attaches `studyGuidance` to the normal `GeneratedReport` object for `primaryGoal = study_abroad`, and the results page renders that section alongside the standard pathway report.

Important implementation note:

- `/results/[token]/page.tsx` now renders the report client again instead of redirecting away
- the public report should show study route, location, blockers, key requirements, clarification questions, and the first practical step
- advisor-only notes remain internal to the study guidance object and are not shown in the public UI
- the public study guidance payload now strips advisor-only notes before it reaches the client, so internal provider or school names do not ride inside the user-facing report object

## Current Progress And What Is Still Rough

### What is working well now

- `/start` has the approved Stitch-style intro experience
- the coming-soon goals now open a waitlist form instead of entering the wrong flow
- `/pathway-finder` only continues the live `study_abroad` branch
- age-range capture now exists for study guidance
- the study guidance layer is connected to the results page
- the public study report now focuses on the user-facing route, blockers, requirements, and next step instead of exposing advisor notes
- the study report now uses a dedicated stitched study-report layout instead of the old generic stacked report layout
- public/internal study guidance is now segmented more deliberately
- admin can now see advisor-only study-note detail from stored reports when available

### What still needs real product work

- the public report is materially better, but it still needs final editorial polish against the exact Stitch benchmark
- if non-study pathways become live later, they will need their own report-quality pass instead of borrowing the study layout blindly
- internal admin/CRM access is still a major next phase, especially if the team needs sales visibility and lead triage
- non-study pathways are intentionally coming soon and remain waitlist-only
- the app still needs final production hardening for audit logging, deeper role-based access, and additional operational safeguards before real user operations

## Current Report Flow

- `/start` handles the intro screens
- `/pathway-finder` handles the main assessment
- `/results/[token]` shows the generated report
- the results page now includes study guidance when the user’s goal is study abroad
- if the report cannot be loaded from the current device, the fallback should still be safe and should not leak internal data

## Final Note To The Next Agent

Do not treat this as a greenfield redesign.

The user already supplied a design direction and is highly sensitive to deviations from it. When improving the product, prefer:

- restoring alignment with the approved Stitch-inspired screens
- tightening typography and spacing
- improving interaction polish

Do not replace the visual language with a generic dashboard or marketing template.
Do not put the intro flow back inside `/pathway-finder`; that route is meant to continue from `/start`, not duplicate it.
