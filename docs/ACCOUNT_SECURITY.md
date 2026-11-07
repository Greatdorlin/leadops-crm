# Account security

## Set up two-factor authentication

1. Sign in with your email and password. Open your profile.
2. Under **Two-factor authentication**, enter your current password and choose **Set up authenticator**.
3. In your authenticator app, add a time-based account. Enter the setup key shown in Leads Desk. Setup expires after five minutes.
4. Enter the six-digit code and confirm.
5. Save the ten recovery codes in your password manager. They are shown once. Each works once.
6. Sign in again with your password and a fresh authenticator code.

Accounts with two-factor enabled must use email and password; Google sign-in cannot skip the second factor. Set a password through your invitation before enrollment if you currently use Google only.

To turn it off, enter your password and an authenticator or unused recovery code in your profile. Factor changes invalidate existing workspace sessions and revoke connected assistant tokens. Losing both your authenticator and recovery codes requires a verified operator recovery process; there is no public bypass or automatic reset.

## Release sequence

Apply migrations 0032 and 0033 before releasing the MFA code. Back up the database first. Check the migration ledger before running `npm run db:migrate`; do not replay historical migrations against an untracked installation. Existing sessions must sign in again after this release.

`CRM_INBOX_DATA_KEY` encrypts authenticator seeds as well as Inbox messages, with separate authenticated contexts. Keep it server-side, back it up securely, and retain previous keys during rotation. Losing the key prevents enrolled accounts from authenticating. Recovery codes are stored only as hashes. Never put setup keys or recovery codes in logs, screenshots, support tickets, or exports.

Before promotion, verify enrollment, sign-out, wrong code, correct code, single-use recovery, disable, session revocation, and Google bypass rejection on the deployment using a dedicated test account. Check profile layout on phone, tablet, and desktop. Do not enroll a customer's account on their behalf.

## Database release gate

Run `npm run security:database` with the **runtime** `DATABASE_URL`. It reads role and policy metadata in a read-only transaction, prints no lead content or credentials, and exits unsuccessfully when RLS is not enforced for the runtime connection. A successful metadata check still needs negative access tests: two representatives, separate teams, notes, tasks, Inbox participants, exports, and assistant queries.

The current application uses server-enforced user scopes. This is not proof of database-enforced RLS. The live RLS audit is blocked in the current environment by database DNS access; no production role or policy changes have been made.

Before claiming RLS protection, finish a staged rollout with a separate migration role and a least-privilege runtime role; transaction-local trusted actor context; policies covering parent records and their dependent rows; explicit service access for login, webhooks and background jobs; and direct SQL tests proving forbidden reads and writes fail. Never set pooled connection actor state outside a transaction. Superusers and BYPASSRLS roles bypass policies; table owners also normally bypass them unless forced. Enabling RLS without wiring every service path can stop the application.

## Release status

MFA source and migration tests are implemented. Production migration, browser enrollment verification, database RLS enforcement, and Workers authentication/database runtime checks remain release blockers. These checks must pass before calling this release sales-ready. Security review reduces risk; it cannot guarantee that no vulnerability exists.
