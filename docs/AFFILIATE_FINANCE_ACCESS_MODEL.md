# Affiliate And Finance Access Model

## Purpose

Leads Desk supports optional protected roles for businesses that use referral partners, affiliates, or finance review before commissions and payment-sensitive claims are trusted.

These roles are intentionally limited. They are not alternate admin roles.

## Roles

### Affiliate

Affiliate users are for external or semi-external partners who submit or bring in leads.

Default behavior:

- own-lead scope only
- can see leads assigned to them
- can keep their profile name and photo current
- cannot manage team access
- cannot export leads
- cannot access broad reports
- cannot access settings
- cannot move leads to trash

Future affiliate dashboard requirements:

- greeting based on user timezone
- leads brought in
- active lead value
- won/converted lead value
- optional commission or earnings summary
- profile settings

### Finance

Finance users are for payment or payout verification.

Default behavior:

- can verify payment claims through a dedicated approval/payment workflow
- cannot manage team access
- cannot export leads by default
- cannot access broad reports by default
- cannot access settings
- cannot move leads to trash
- cannot broadly mutate lead records through normal lead edit APIs

Future finance dashboard requirements:

- payment claims awaiting review
- approved and rejected payment confirmations
- lead links for verification context
- audit trail of who approved what and when

## Owner Approval Boundary

Normal roster management cannot grant owner-level access.

Owner-level access is reserved for the initial bootstrap owner and any future explicit owner-transfer flow. It must not be granted casually through the normal team settings UI.

## Security Rules

- Access checks must be enforced server-side.
- UI hiding is not sufficient.
- Affiliate visibility must stay scoped to assigned or owned leads.
- Finance verification must use a dedicated workflow, not broad admin mutation power.
- Export, destructive actions, role escalation, and payout-sensitive actions should create approval/audit records.

## Demo Data

The demo seed includes:

- owner/admin
- sales manager
- team lead
- sales rep
- finance reviewer
- affiliate partner
- an affiliate-sourced B2B lead

This makes it possible to visually test role-specific dashboards and scoped lead behavior with realistic data.

## Current Implementation

Implemented now:

- `finance` and `affiliate` runtime role vocabulary
- access-level mapping
- server-side grant restrictions
- finance payment-verification permission helper
- affiliate dashboard permission helper
- owner-approval permission helper
- demo user and affiliate lead seed data
- additive migration for the `affiliate` database enum value

Still required:

- dedicated affiliate dashboard UI
- dedicated finance verification dashboard UI
- persisted approval-request table
- export approval workflow
- commission/earnings model
- branch/team/department scoped roster assignments
- audit-log persistence for approvals and payout-sensitive actions
