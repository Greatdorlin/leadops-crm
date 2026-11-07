# Production readiness review plan

Review target: Leads Desk, repository Greatdorlin/leadops-crm. Commercial discussion: 10 November 2026. This plan is not a release certificate.

1. Recover unfinished changes and capture the source baseline. Keep historical migrations unchanged; reconcile any previously prepared production schema explicitly.
2. Inventory tracked files and reachable Git history. Classify legacy references, runtime dependencies, assets, hardcoded identities and compatibility boundaries.
3. Remove proven inactive code. Keep storage interfaces stable and verify each replacement against the SQL integration suite.
4. Inspect repository, hosting and integration ownership without changing production settings. Prepare rollback plans and approval requests for transfers, permission changes and rotations.
5. Generate CycloneDX inventories from the exact lockfile, collect licence texts and asset notices, and record provenance gaps requiring assignments or external confirmation.
6. Retest authentication, scope boundaries, forms, intake, exports, Inbox and assistant controls. Run lint, types, coverage, dependency audit, migration checks and production build.
7. Test fresh installation, repeatable migrations and backup/restore on an isolated PostgreSQL 16+ database. Verify encrypted records with matching keys. Never restore production.
8. Compare hosted CI and deployment evidence with the reviewed commit. Record untested provider accounts and Workers runtime boundaries.
9. Prepare a public-safe handover index and separate confidential evidence. Summarize every unresolved approval or external verification item.

Consequential changes require an approved rollback plan. This includes production environment variables, runtime/platform settings, DNS, database roles, ownership and credentials. Public repository visibility also needs an explicit business decision.
