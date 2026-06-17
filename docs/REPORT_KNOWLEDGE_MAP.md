# Report Knowledge Map

This map exists so report content can be updated safely without guessing which file owns a user-facing section.

## Snapshot Policy

- Completed reports must be frozen snapshots.
- Public UI, print/PDF, and public-facing exports must read from the stored `publicReport` snapshot.
- Internal/admin analysis can still read the stored internal `report`.

## Section Ownership

| Section | Primary owner | Notes | Volatility |
| --- | --- | --- | --- |
| Route selection and ranking | `src/lib/pathway-engine/study-knowledge.ts` | Controls route recommendations and route stack logic | Fast changing |
| Blockers and readiness risks | `src/lib/pathway-engine/study-knowledge.ts` | Controls blocker wording and readiness signals | Fast changing |
| Document readiness | `src/lib/pathway-engine/study-knowledge.ts` | Drives checklist items and status | Fast changing |
| First practical step | `src/lib/pathway-engine/report/build-public-study-report.ts` | Converts route/readiness into user action copy | Fast changing |
| Questions to clarify | `src/lib/pathway-engine/report/build-public-study-report.ts` | Filters clarification prompts against confirmed answers | Stable |
| Roadmap and timeline | `src/lib/pathway-engine/report/build-public-study-report.ts` | Shapes phased or timeline roadmap output | Stable |
| Consultation focus | `src/lib/pathway-engine/report/build-public-study-report.ts` | Builds meeting-ready next-review agenda | Stable |
| Disclaimer and advisory copy | `src/lib/pathway-engine/report-copy.ts` | Shared legal and cautionary copy | Stable |

## Fast-Changing Guidance

Treat these as high-maintenance areas and review them first when travel rules or support products move:

- route selection
- blockers
- document readiness
- first practical step

## Implementation Notes

- Shared report constants and section metadata live in `src/lib/pathway-engine/report-knowledge.ts`.
- Legacy rows without `publicReport` must derive the public snapshot from the stored internal report, not from current live rules.
- If a user-facing statement changes, update both the controlling source and any tests that assert report wording or section behavior.
