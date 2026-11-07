# Leads Desk buyer readiness evidence

This is an engineering handover for the November 2026 hardening release. It is not a certification, valuation, guarantee of an external score, or a statement that all integrations have live credentials. The Datafactor report supplied by the owner scored the preceding repository at 56.6. Only a new independent scan can assign a new score.

## What changed

| Finding | Engineering change | Verification |
| --- | --- | --- |
| Single CI job; no explicit typecheck | Separate cached lint, typecheck, test/coverage, migration, build, security, and fresh-install jobs with aggregate release gate | Local commands and the PR workflow |
| Workflow watched main, while production uses master | Watch master, development, test, main, and working codex branches | Committed workflow triggers |
| Large Postgres storage implementation | Use PostgresLeadStore with a compatibility export; move operations into entity/domain modules with injected database executor | Typecheck and existing tests; real SQL regression tests |
| Large Drizzle schema | Domain table modules behind the original schema.ts entry point | The module split generated no schema changes; follow-up migration 0027 aligns inactive form/user defaults |
| Fresh installation migration failure | Commit each journaled migration separately, serialize CLI migrations with a Postgres advisory lock | Fresh in-process PostgreSQL migration and journal rerun/tamper tests; CI Postgres service |
| No full coverage report | c8 includes every TS/TSX source file, including untested pages | LCOV, JSON summary, CI artifact, whole-repository baseline gate |
| No enforceable critical coverage target | Explicit business-contract scope with minimum 80% line coverage | Coverage gate reads same whole-repository summary |
| Missing environment examples | Document source-referenced variables and compatibility aliases; check future additions automatically | npm run check:env |
| Security/update gaps | Dependency patches; audit gate at high severity; weekly npm and Actions Dependabot | npm run audit; lockfile |
| Unstructured runtime errors | Pino JSON logs with redaction and safe error classification | Logger redaction tests |
| No optional error tracking | Guarded server-only Sentry integration with data collection disabled and an additional scrubber | Typecheck/build and sanitizer regression tests; live delivery requires an operator DSN |

## Reproduce from a clean checkout

Use Node.js 24 and PostgreSQL 16. Do not use a real client's database for verification.

```bash
cp .env.example .env
# Set DATABASE_URL, AUTH_SECRET, NEXTAUTH_URL, INITIAL_ADMIN_EMAIL/NAME.
# AUTH_SECRET can be generated using openssl rand -base64 32.
npm ci
npm run check:env
npm run db:migrate
npm run db:seed:defaults:full
npm run db:migrate
npm run db:seed:defaults:full
npm run verify
npm run test:coverage
npm run audit
npm run auth:invite-initial-admin
npm start
# In a second shell:
npm run smoke:deployment
```

Next.js and the CLI both load `.env`. A deployment may supply environment variables directly instead. The seed adds missing configuration and does not create a default password. The activation link printed by the invite command is sensitive: give it directly to the intended owner, then remove it from shared logs.

`npm test` needs no external database or provider account. The SQL integration suite runs PostgreSQL in-process through PGlite and applies the actual historical SQL journal, not a test-only schema. Production still uses the existing postgres-js driver. CI separately exercises the production migration/seed/server path against PostgreSQL 16 over TCP.

## Migration behavior and recovery

Existing SQL files, journal timestamps, and SHA-256 hashes are preserved. The runner reads the same Drizzle journal and writes the same `drizzle.__drizzle_migrations` table. Existing installations skip versions already applied. A hash mismatch fails closed. Each pending migration and its history row commit atomically; a later failed migration does not undo earlier successfully committed versions.

The migration process takes a session advisory lock on a reserved connection, so concurrent CLI runs serialize. Use a direct PostgreSQL connection or session pooling when migrating; transaction-pooling proxies cannot guarantee session advisory locks. Runtime requests continue to use their own configured pool. Set DATABASE_URL to the migration connection for this command, without changing the runtime environment.

Before upgrading a client: take and test a backup, rehearse against a restored copy, run the new migrations, then deploy. If a migration fails, inspect the version and database logs, fix the cause, and rerun. Do not delete the journal, edit an applied SQL file, or use `db:push` to bypass history. Application rollback is only safe when the older application supports the current schema. See BACKUP_AND_RESTORE.md for operational backup procedures.

## Coverage: what is and is not proven

The initial measurement in this work was 20.5% line coverage across the whole repository, despite 293 passing tests. This confirms that a test-file ratio does not prove coverage. New SQL tests exercise persistence, duplicate matching, audit history, task completion, trash/restore, lost pipeline accounting, retries, user and connector upserts, report SQL, scope denial, migration idempotency, and database constraints.

The coverage policy has two distinct checks: a full-repository regression floor, and an 80% line target for explicitly listed business contracts. Untested UI, routes, storage, and adapters remain visible at zero or partial coverage in the full report. The business-contract target is not a claim of 80% whole-application coverage. The committed policy and script name both scopes; changing the scope or lowering a floor requires review. Read coverage/coverage-summary.json or the CI artifact for the exact current measurement.

Browser interaction coverage, provider-account sandbox flows, production-scale concurrency, native Cloudflare Workers runtime compatibility, and client backup/restore rehearsals require additional environment-specific evidence. Do not advertise these as completed because unit tests pass.

## Observability and privacy

Pino emits one JSON object per event to standard output on any Node.js host. Configure collection/retention in your host or log platform. LOG_LEVEL defaults to info. Runtime and intake automation errors include an operation scope and safe error type; raw exception messages are deliberately omitted because database errors often include personal data and query parameters. Do not pass full lead records, provider responses, or payloads to the logger.

SENTRY_DSN is optional. Without it, the server does not initialize tracking or send events. If supplied, the Next.js server error hook captures unhandled request errors. Automatic integrations, tracing, HTTP headers/bodies/cookies/query values, user enrichment, SQL values, source context, and stack locals are disabled. The scrubber also removes request/user/extra/context/breadcrumb data and raw exception text before delivery. APP_RELEASE can identify the exact deployed commit. Browser error tracking is not configured. Handled page-loading failures remain in structured logs.

To enable: create a project in the client's monitoring account, add its DSN to deployment secrets, set APP_RELEASE, deploy, trigger a controlled error in a private staging workspace, and verify receipt and redaction before enabling in production. No third-party monitoring account or DSN is bundled with the product.

## Security and maintenance

`npm run audit` fails on high/critical findings, including development tools. Weekly Dependabot creates npm and GitHub Actions update PRs. Update PRs must pass the same release gate. A passing audit means no high/critical advisories were reported by the registry at that time; it does not prove absence of vulnerabilities. The initial audit found 33 findings. Follow-up compatible/runtime patches and tested tooling overrides cleared all severities in the final local audit. Dependency advisories change; keep the gate and weekly updates active. Do not apply force upgrades/downgrades without testing migration generation, build, and auth.

Configure branch protection or a ruleset to require `release-gate` on master, development, and test. Merely committing a workflow does not enforce branch protection. Verify those settings in the repository owner's GitHub account and plan. CI uses read-only repository permissions and no production secrets for verification. A production deployment must only promote a reviewed commit with passing checks. This release does not fabricate a long maintenance record or backdate releases.

## Commercial handover

This remains a private commercial product. No open-source license or public redistribution permission is added. Before sale or licensing, the owner and buyer should agree scope of source access, redistribution/white-label rights, included hosting/support, data responsibility, upgrade entitlement, warranties, acceptance criteria, payment, and ownership of bespoke changes. Confirm the right to transfer inherited code/assets and review dependency licenses with the buyer's adviser. An engineering score does not establish intellectual-property title.

For agencies: keep one database, secrets set, domain, administrator bootstrap, backup schedule, and monitoring destination per client. Do not share a database connection or provider token across unrelated client deployments. A private per-client install is not a shared multi-tenant SaaS isolation claim.

The Node.js standalone build can run on a VPS/container with PostgreSQL or behind Cloudflare proxy/DNS. Native Cloudflare Workers requires a separately verified compatible adapter/runtime path. Hosting behind Cloudflare is not evidence that native Workers is supported. Connector readiness requires the client's provider token, scopes, callback domain, signature verification, and a provider-side test lead; code-only tests cannot prove live provider access.

## Final verification record

The code snapshot at GitHub commit `532af6010ae537118e5ca5f936cdb4769b48386d` was verified using Node.js 24.22.1 and npm 11.9.0 in a separate clean clone. `npm ci` and the complete `npm run verify` pass, including lint, environment inventory, explicit typecheck, coverage, audit, migration drift and production build.

| Evidence | Result |
| --- | --- |
| Automated tests | 310 passed, zero failed/skipped |
| Full-repository line coverage | 26.43%; enforced floor 26% |
| Business-contract aggregate line coverage | 87.40%; enforced target 80% |
| Dependency audit | Zero findings across all severities at verification time |
| Typecheck gate probe | Temporary intentional type error rejected, then removed |
| Coverage gate probe | Deliberately excessive threshold rejected, then restored |
| Migration drift probe | Untracked SQL file rejected, then removed |
| Schema journal | No uncommitted generation changes after migration 0027 |
| Preview deployment | Code snapshot built to READY; login and denied API boundaries checked |
| Production | Buyer-hardening plus demo fixes promoted on 6 November; see DEMO_ACCEPTANCE.md for live evidence |

Migration 0027 corrects two historical default mismatches: forms.is_active was false in historical SQL but true in the typed schema; crm_users.is_active was false in the typed schema but true in historical SQL. Both now agree on false. This changes defaults only; existing records and explicit activation choices are preserved. A regression test compares every literal boolean default with the freshly migrated database.

CLI seed and owner-invitation commands explicitly close their database pool on success or failure. They no longer depend on idle timers to let automation exit. The fresh-install workflow records migration, seeding and repeat runs as separately bounded steps. Database shutdown has dedicated success, idempotency and failure-path tests.

## External release blockers

GitHub Actions run 41976298643 could not start its jobs. Its annotation states: "The job was not started because your account is locked due to a billing issue." This is an account-level blocker and is not a green CI run. Resolve the account restriction and rerun the exact candidate before describing it as CI-verified. The PostgreSQL service smoke job and repository required-status enforcement still need completed verification. The passing in-process PostgreSQL suite does not substitute for a completed production-driver service smoke test.

The preview health endpoint returns 503 because auth/owner bootstrap variables target production only. Login renders and the anonymous forms API returns 401. No production credentials were copied into preview. Existing provider-managed database variables target multiple environments, so authenticated staging writes must wait for a separately isolated test database. The preview is build/access-boundary evidence, not a fully provisioned staging acceptance result.

The buyer hardening code and schema-free demo fixes were promoted to the live application on 6 November after local verification and production-target build/health checks. DEMO_ACCEPTANCE.md records observed owner-session workflows and remaining presentation boundaries. This is demo acceptance, not completed client-production certification. Migration 0027 has not been applied to the live client database by this work. Rehearse that default-only migration on a restored database before applying it through the normal release process. Resolve hosted CI, PostgreSQL service smoke and staging isolation before issuing a commercial readiness release tag or requesting a new independent score.

See DATA_LINEAGE.md for source-to-record transformations, identity/retry behavior, reporting boundaries and operator ownership. Remaining evidence gaps include broad UI/route coverage, provider-account acceptance tests, client backup restoration, native Cloudflare Workers compatibility, branch-rule enforcement and commercial/IP review. These gaps must remain visible in a buyer handover.
