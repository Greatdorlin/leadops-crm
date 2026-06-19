# Leads Desk MVP Scope

> This document is retained for project continuity. Leads Desk is now being completed as a sellable v1.0 private sales command product, and that v1.0 target supersedes any lightweight MVP framing below.

## Current v1.0 Release Boundary

Leads Desk v1.0 must be good enough to:

- deploy for a real client
- capture and import live lead data
- receive webhook leads through form source mappings
- persist custom field values
- show overdue follow-up and sales visibility
- export operational data
- support a client handover with production setup, backup, and restore guidance
- support premium runtime customization for brand, navigation, lead preview, dashboard, and industry presets

## Original MVP Objective

Ship a private, deployable sales command center that helps a business stop losing leads it already paid for.

The MVP must help a business:

- capture leads from website forms, ads, imports, manual entry, and team channels
- assign ownership clearly
- enforce follow-up discipline
- surface overdue and stuck leads
- measure source, rep, team, and branch performance
- compare pipeline movement against sales targets
- export operational data easily

## Core Positioning

Headline:

- Stop losing leads your business already paid for.

Subheadline:

- Capture leads from your website, forms, ads, and team channels, assign follow-up, track performance, and see exactly what is moving, stuck, or overdue.

Core promise:

- Every lead captured. Every follow-up assigned. Every salesperson visible. Every source measured.

## Entry Package Boundary

Current entry offer:

- `Leads Desk Team`
- `₦500,000 one-time`

This is an entry package, not a product ceiling.

## Who The MVP Serves

- owners
- admins
- managers
- team leads
- sales reps

## In Scope

### Sales command core

- dashboard
- leads list
- lead detail
- add lead
- edit lead
- assign lead
- update stage/status
- notes
- follow-up tasks
- overdue tasks
- team/users
- reports
- settings
- export data

### Lead intake core

- manual lead entry
- CSV import
- website form endpoint
- generic webhook intake architecture
- form source definitions
- form field mapping
- raw intake event logging

### Dynamic data capture

- custom field foundation
- custom field intake mapping
- custom field visibility in lead detail
- custom field support in imports and webhook mapping

### Performance visibility

- leads by source
- leads by stage
- conversion by source
- conversion by user
- conversion by team
- conversion by branch
- conversion by department
- overdue follow-ups
- stuck lead visibility
- target progress
- won/lost summary
- recent activity

### Sales value tracking

- estimated value
- won value
- close probability
- expected close date
- won and lost timestamps
- lost reason

### Notification foundation

- in-app notification foundation
- email notification foundation

## Highest MVP Priorities

1. Lead capture
2. Custom fields
3. Form source mapping
4. Generic webhook intake
5. Lead assignment
6. Follow-up tasks
7. Overdue tracking
8. Source performance
9. Team/user performance
10. Sales target progress
11. Export data
12. Basic notifications

## Not In Scope For MVP

- native Meta/TikTok/LinkedIn integrations as core requirements
- AI features
- mobile app
- billing
- SaaS multi-tenancy
- WhatsApp automation as a core dependency
- Telegram automation as a core dependency
- advanced workflow builder
- full drag-and-drop customization builder

## Required MVP Questions

The MVP must make it easy to answer:

1. How many leads came in?
2. Where did they come from?
3. Which form/source captured them?
4. What information did that form collect?
5. Who owns each lead?
6. What stage is each lead in?
7. Which leads need follow-up today?
8. Which leads are overdue?
9. Which leads are stuck?
10. Which salesperson is performing?
11. Which team or branch is performing?
12. Which source is converting?
13. How close are we to our sales target?

## UX Requirements

The MVP must feel:

- modern
- premium
- calm
- operational
- intuitive
- demo-ready

The product should not feel like:

- a recycled travel product
- a generic CRM clone
- a static contact database

## MVP Acceptance Checklist

- product can be deployed privately for one client
- leads can be captured through manual entry and CSV import
- architecture is ready for website forms and generic webhooks
- custom-field architecture exists for business-specific intake
- leads can be assigned, updated, and reviewed
- follow-up tasks can be created and completed
- overdue and stuck leads are visible
- managers can review team and rep performance
- sales target progress is visible
- source performance is visible
- exports give the client clear ownership of their data

## Dependency Note

No implementation should start for the new intake, target, or notification foundations until the updated documentation set has been reviewed.

## Phase 2A Progress Note

The neutral Leads Desk sales-command domain contracts now exist. Schema migration, persistence changes, and runtime feature implementation remain deferred to later phases.

## Phase 2B Progress Note

The schema translation and persistence mapping plan now exist. Future tables, legacy field destinations, and additive migration order are documented before any database changes begin.

## Phase 2C Progress Note

The first additive Leads Desk schema foundation now exists for organization ownership, normalized stages and sources, and future sales-command lead columns. These additions are not yet wired into the production runtime.

## Phase 2D Progress Note

The additive schema foundation for custom fields, form sources, field mappings, and intake events now exists. Dynamic intake runtime behavior is still deferred.

## Phase 2E Progress Note

Manual seed helpers, dry-run backfill planning, and dual-read preparation now exist. Runtime cutover and new write behavior remain deferred.

## Phase 2F Progress Note

Selected admin lead read surfaces now use normalized-first display helpers for stage, source, owner, and custom-field detail values where data exists. The main write path and all automatic mutation behavior remain unchanged.

## Phase 2G Progress Note

Admins can now manage lead custom field definitions in settings, including select/multi-select options and archive-first field lifecycle behavior. Lead value editing, form mapping, and webhook intake remain deferred.

## Phase 2H Progress Note

Active custom fields now appear in manual lead capture and lead profile editing, and saved values persist to `lead_custom_field_values`. Intake mapping, import support, and webhook-based custom field writes remain deferred.

## Phase 2I Progress Note

Custom fields now extend into lead list visibility, lead exports, and CSV import contract mapping. Advanced filtering, webhook intake, and form-source mapping are still deferred.

## Phase 2J Progress Note

Admins can now manage form sources and field mappings from settings, including source defaults and mapping external fields to core or custom lead fields. Webhook intake and automatic payload processing are still deferred.
