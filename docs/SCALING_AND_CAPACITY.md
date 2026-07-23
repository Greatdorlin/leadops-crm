# Leads Desk Scaling And Capacity

## Purpose

This runbook defines a measurable starting point for a private Leads Desk deployment with:

- 2 vCPU
- 8 GB RAM
- 100 GB NVMe storage
- about 100,000 leads
- up to 100 concurrently active users

This is a target profile, not a capacity guarantee. A deployment is approved only after the actual build, database, data shape, network, and host pass the acceptance test in this document.

## Supported Topologies

The application contract is the same on every host:

- Next.js application
- PostgreSQL through `DATABASE_URL`
- journaled migrations through `npm run db:migrate`
- HTTPS reverse proxy or managed platform edge
- external backup copy and a tested restore

| Topology | Application | Database | Connection rule |
| --- | --- | --- | --- |
| Single VPS | One app container | Private Postgres container | Direct private connection; start with `DATABASE_POOL_MAX=5` |
| VPS plus managed Postgres | One app container | External PostgreSQL | Use the provider's pooled TLS URL when available |
| Serverless app host | Platform functions | External PostgreSQL | Use a pooled URL and set `DATABASE_POOL_MAX=1` or `2` per runtime instance |
| Container platform | One app replica initially | Private or managed PostgreSQL | Multiply pool size by every live replica before scaling out |

New deployment logic does not require a provider-specific database variable. Neon, Supabase Postgres, and other PostgreSQL services must all be configured through the same `DATABASE_URL` contract.

## Provider-Neutral Environment Contract

Required production values:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_NAME`

Capacity controls:

- `DATABASE_POOL_MAX`
- `DATABASE_CONNECT_TIMEOUT_SECONDS`
- `DATABASE_IDLE_TIMEOUT_SECONDS`

Optional capabilities keep their own credentials disabled until configured. Google login requires `ENABLE_GOOGLE_LOGIN=true` plus both Google credentials. Integration secrets are added only for connectors enabled in that client deployment. Do not introduce a provider database variable as the primary contract, expose secrets through `NEXT_PUBLIC_*`, or commit any environment file.

## VPS Resource Budget

For a combined app and database host, begin with one application process. Reserve capacity rather than filling all memory with fixed allocations:

| Resource | Starting budget | Operating rule |
| --- | --- | --- |
| Operating system, proxy, monitoring | 1-1.5 GB RAM | Keep at least 1 GB immediately available under normal load |
| Next.js app container | 1.5-2 GB RAM | One process; investigate growth before adding replicas |
| PostgreSQL | 3-4 GB RAM | Tune from measured cache hit rate and query plans |
| Filesystem cache and burst headroom | 1-2 GB RAM | No sustained swap activity during the acceptance run |
| CPU | Shared | Sustained utilization below 75%; short peaks below 90% |
| Disk | 100 GB | Alert at 70%; stop growth and remediate before 85% |

Do not run build jobs, large imports, large exports, backup compression, and the peak interactive workload at the same time on a 2 vCPU host. Build the image in CI when possible, and schedule maintenance work away from business peaks.

## Database Connections

The runtime creates one Postgres.js pool per application process. The current defaults are:

- `DATABASE_POOL_MAX=5`
- `DATABASE_CONNECT_TIMEOUT_SECONDS=30`
- `DATABASE_IDLE_TIMEOUT_SECONDS=20`
- prepared statements disabled for pooler compatibility

Calculate the worst case before deploying:

```text
total app connections = live app processes x DATABASE_POOL_MAX
required database headroom = app connections + migration/admin connections + monitoring reserve
```

Keep the calculated total below 70% of the database connection limit. Reserve the remaining 30% for migrations, operator access, health checks, and recovery. One hundred active users do not require one hundred database connections; requests should queue briefly at the application pool instead of exhausting PostgreSQL.

Starting guidance:

- combined VPS: one app process and pool size 5; increase toward 10 only after evidence shows pool wait time while PostgreSQL remains healthy
- serverless: pooled `DATABASE_URL`, pool size 1 or 2 per runtime instance, and provider connection metrics enabled
- multiple containers: reduce each process pool so the aggregate remains within the same budget
- never connect serverless traffic to an unpooled database endpoint unless the database operator has explicitly sized for the possible connection fan-out

## PostgreSQL And Data Volume

The lead queue uses server-side filters and cursor pagination, so response size should not grow with the total lead count. Capacity still depends on the client's fields, notes, tasks, opportunities, intake history, and audit volume.

For the 100,000-lead acceptance dataset:

- use representative owner, stage, source, branch, team, priority, and date distributions
- include realistic tasks, notes, opportunities, custom fields, and audit history
- run `ANALYZE` after loading the dataset
- inspect query plans for queue filters, owner views, overdue tasks, dashboard summaries, and reports
- reject sequential scans on high-frequency operational paths unless a measured plan proves they are cheaper
- monitor database size, index size, write-ahead log growth, dead tuples, cache hit rate, lock waits, and slow queries

Do not infer one-billion-record capacity from a 100,000-record test. Partitioning, archival, workers, replicas, and analytics storage are separate measured infrastructure projects.

## Reverse Proxy And Process Guidance

Run one application container initially. Put it behind Caddy, Nginx, Traefik, or an equivalent managed proxy with:

- TLS termination and HTTP-to-HTTPS redirect
- HTTP/2 or HTTP/3 at the edge and keep-alive to the app
- the original host and forwarding headers preserved
- a request body limit matched to the documented import/upload limit
- an upstream connection timeout near 10 seconds
- an upstream response timeout long enough for bounded exports, but not unlimited
- access logs with request duration, status, and request ID
- rate limits on public auth, form, and webhook routes sized to expected traffic
- only ports 80 and 443 exposed publicly; PostgreSQL remains private

Do not add a second Node process merely because the server has two cores. First prove CPU saturation while memory, database connections, and query latency remain safe. If a second process is justified, halve or otherwise rebudget `DATABASE_POOL_MAX` before starting it.

## Health And Monitoring

`GET /api/health` is a readiness check. It validates production configuration and performs a bounded database query. Configure the platform or proxy to check it every 30 seconds with a 5-second timeout and several retries before replacement.

Monitor at minimum:

- HTTP request rate, p50/p95/p99 duration, 4xx, and 5xx
- app CPU, resident memory, restarts, and event-loop stalls
- PostgreSQL CPU, memory, active/waiting connections, locks, and slow queries
- disk use, inode use, and backup size
- failed sign-ins, failed form/webhook intake, imports, exports, and migrations

Alerting baseline:

- any sustained 5xx rate above 1%
- readiness failure for two consecutive minutes
- CPU above 85% for five minutes
- memory above 85% or any out-of-memory restart
- database connections above 70% of the configured limit
- disk above 70% warning and 85% critical
- a missed backup or failed restore drill

## Backups And Recovery

The starter production objective is:

- RPO: 24 hours or better
- RTO: 4 hours or better

Use a shorter objective when the client cannot accept one day of data loss. That normally requires managed point-in-time recovery or more frequent encrypted backups.

Production requirements:

- daily logical backup at minimum
- encrypted copy stored outside the app server
- at least 7 daily and 4 weekly recovery points unless the client contract requires more
- backup success monitoring
- quarterly restore drill into an isolated database
- documented database, asset, secret, and DNS ownership

Follow [`BACKUP_AND_RESTORE.md`](../BACKUP_AND_RESTORE.md). A backup that has not been restored successfully is not accepted as a recovery control.

## Release And Migration Sequence

1. Run `npm ci` and `npm run verify` against the release commit.
2. Back up the production database and record the backup identifier.
3. Review generated migration SQL and confirm it belongs to the release.
4. Put long-running imports and exports on hold.
5. Run `npm run db:migrate` once from a trusted release job.
6. Start or promote the new app image only after migration succeeds.
7. Confirm `/api/health`, owner login, lead queue, assignment, tasks, forms, reports, imports, and exports.
8. Monitor errors, latency, connections, and locks through the observation window.

Never run `db:push` against production. Do not run the same migration concurrently from every application replica.

## Load Smoke Harness

The repository includes a dependency-free, GET-only harness for Node 20+.

Inspect a plan without network traffic:

```bash
npm run load:smoke -- --dry-run --base-url https://staging.example.com --concurrency 100 --duration 900 --think-ms 1000 --path /api/health
```

Run only after staging approval:

```bash
npm run load:smoke -- --confirm --base-url https://staging.example.com --concurrency 100 --duration 900 --think-ms 1000 --path /api/health --max-p95-ms 250 --max-error-rate 0.001
```

For authenticated GET routes, use a dedicated least-privilege staging account and pass its short-lived session without printing it:

```bash
export LOAD_COOKIE='session-cookie-name=REDACTED'
npm run load:smoke -- --confirm --base-url https://staging.example.com --concurrency 100 --duration 900 --think-ms 1000 --path '/leads' --max-p95-ms 750 --max-error-rate 0.001
unset LOAD_COOKIE
```

Use PowerShell `$env:LOAD_COOKIE` and `Remove-Item Env:LOAD_COOKIE` on Windows. The harness does not follow redirects, so an expired session fails visibly instead of measuring the login page.

The harness protects the target by requiring `--confirm`, allowing only same-origin relative paths, sending only `GET`, enforcing time and request ceilings, and never printing header values. It does not replace server metrics or browser workflow tests.

## Capacity Acceptance Gate

Run the test against the final staging topology with representative 100,000-lead data. Use at least a 2-minute warm-up followed by a 15-minute measured run. Test endpoint classes separately so each has an honest threshold.

| Endpoint class | Measured target |
| --- | --- |
| `/api/health` | p95 at or below 250 ms |
| Lead queue and common filters | p95 at or below 750 ms |
| Dashboard and common task views | p95 at or below 1,000 ms |
| Representative reports | p95 at or below 1,500 ms |

The deployment passes only when all conditions hold:

- 100 virtual users with realistic think time complete the 15-minute run
- failed-request rate is at or below 0.1% and there are no unexplained 5xx responses
- thresholds above pass for each tested endpoint class
- app CPU stays below 75% sustained and 90% peak
- app and database memory stay below 85% with no swap churn or restart
- database connections remain below 70% of the configured limit
- no lock pile-up, connection timeout, or query slower than 2 seconds appears on common operational paths
- disk has at least 30% free space after representative data and a local temporary backup
- a backup and isolated restore have succeeded
- owner, sales-rep, branch/team scope, forms, imports, and exports pass functional QA after the run

Record the release commit, image digest, host size, database plan, environment tuning values, anonymized dataset profile, command, timestamps, harness output, and monitoring screenshots. If any condition fails, reduce load or tune the measured bottleneck, then rerun the full gate. Do not publish the target as supported from a partial or local-only run.

## Current Deployment Audit

The checked-in deployment surfaces were reviewed together:

- `Dockerfile` uses a multi-stage standalone build and a non-root runtime user
- `docker-compose.yml` gates app startup on a one-shot migration and includes readiness health checks
- `docker-compose.external.yml` keeps managed PostgreSQL outside the stack
- Vercel and Netlify guides require external pooled PostgreSQL and trusted release migrations
- Coolify and VPS guides use the same Docker and `DATABASE_URL` contract
- `.env.example` exposes bounded pool, connect timeout, and idle timeout controls

Google login remains optional in both Compose validation and production readiness. When `ENABLE_GOOGLE_LOGIN=true`, readiness requires both Google credentials; password-only deployments do not.
