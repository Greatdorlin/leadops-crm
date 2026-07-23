# Release Branches

Leads Desk uses three permanent branches:

| Branch | Purpose | Deployment |
| --- | --- | --- |
| `development` | Active product work and reviewed fixes | Development or local environments |
| `test` | Release candidate after development checks pass | Preview or staging environment |
| `master` | Production-approved code only | Vercel production and client releases |

## Promotion Flow

1. Create product changes from `development`.
2. Run lint, tests, build, migration review, and responsive checks.
3. Promote the reviewed commit to `test`.
4. Apply migrations to staging and complete workflow, security, and capacity checks.
5. Promote the exact approved commit to `master`.
6. Let the Git-connected production platform deploy `master`.
7. Verify production health, login, permissions, forms, leads, tasks, reports, and integrations.

Do not commit directly to `master` for routine work. Emergency fixes still require the same checks and must be merged back into `test` and `development` so the branches do not drift.

Vercel must stay connected to `Greatdorlin/leadops-crm`, with `master` as the production branch. Direct CLI deployments are for controlled recovery only, not the normal release path.
