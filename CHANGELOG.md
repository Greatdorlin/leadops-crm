# Changelog

## Unreleased — buyer readiness hardening (2026-11-05)

- Split the Drizzle schema into domain modules without changing schema metadata or historical SQL.
- Split Postgres storage operations behind the existing facade and database-executor contract.
- Align inactive form/user database defaults without changing existing rows.
- Fix fresh migration runs by committing versions individually, preserving journal hashes and serializing CLI migration runs.
- Add persisted PostgreSQL regression tests and explicit coverage reporting/enforcement with honest scope.
- Add independent typecheck, lint, test/coverage, security, migration drift, build and fresh-install CI jobs.
- Add Pino JSON diagnostics and optional privacy-restricted server error tracking.
- Patch vulnerable dependencies, document environment compatibility aliases, and configure weekly dependency updates.
- Document data lineage, fresh setup, maintenance and commercial handover limits.

No historical release tags or maintenance activity have been synthesized. The readiness candidate remains unreleased until its release checks and client acceptance requirements are satisfied.
