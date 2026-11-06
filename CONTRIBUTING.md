# Contributing and release verification

Use Node.js 24, npm ci and a disposable PostgreSQL database. Follow README.md and INSTALL.md. Never use a production client database or provider token for automated tests.

Keep changes scoped and preserve existing client data, public import paths and deployment contracts. Archive configuration where the product expects history. For schema changes, commit generated SQL/snapshots and rehearse the upgrade on restored data. Do not edit applied migrations.

Before review run npm run verify and inspect the full coverage artifact. Coverage policy names an 80% aggregate business-contract target and a separate whole-repository regression floor; do not conceal untested files or lower a floor to make a patch green. Add behavior tests for the affected risk. SQL tests use an isolated in-process PostgreSQL database; CI also verifies fresh installation with the production driver against PostgreSQL 16.

Production branches are master, test and development. Require the release-gate status in GitHub branch rules. CI must run on the exact proposed commit; a workflow file alone is not branch protection. If Actions cannot run because of account/billing restrictions, record the blocker, resolve it, and rerun before describing the release as CI-verified. No intentional-error experiment belongs on a production branch.

Use clear commit messages that explain the change. Publish genuine release notes/tags only after acceptance checks pass; do not manufacture historical activity, authors or retrospective releases. The owner must approve licensing terms separately; contributing code does not change the product's redistribution rights.
