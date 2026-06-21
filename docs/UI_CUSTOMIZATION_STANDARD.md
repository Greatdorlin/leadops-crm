# Leads Desk UI Customization Standard

## Purpose

This document defines the product experience standard for Leads Desk as a private sales command center.

The interface should make sales action obvious, not just store records.

## Product Experience Goal

The product must help users act on business-owner pain:

- leads are scattered
- follow-up is inconsistent
- owners cannot see what is working
- salespeople miss tasks
- managers miss stuck or overdue deals
- revenue is lost because execution is weak

## UI Philosophy

Leads Desk should feel:

- modern
- calm
- premium
- fast
- operational
- trustworthy
- configurable without feeling technical

The UI should answer key sales questions through layout and data visibility, not long explanation copy.

## Runtime Customization Standard

The shipped product now supports controlled runtime customization for:

- appearance
- login branding
- navigation
- lead preview
- dashboard widgets
- industry presets

Customization must remain:

- concise
- reversible where practical
- safe for nontechnical admins
- guarded from secrets and deployment-only configuration

## Core Dashboard Questions

The dashboard should make these obvious:

1. How many leads came in?
2. Which leads need follow-up today?
3. Which leads are overdue?
4. Which leads are stuck?
5. Which sources are working?
6. Which reps or teams are performing?
7. How close are we to target?
8. What should I do next?

## Layout Direction

- sidebar + topbar admin shell
- clear page title and primary action
- concise metric cards
- obvious filters
- strong table readability
- clear urgency states

## Copy Rules

Use short labels:

- Add lead
- Assign
- Follow up
- Overdue
- Category
- Fit signal
- Budget status
- Interest
- Source performance
- Target progress

Avoid:

- pathway
- assessment
- public report
- inherited specialist guidance
- long helper paragraphs

## Dashboard Rules

The default dashboard should include:

- total leads
- new leads
- overdue follow-ups
- stuck leads
- converted leads
- source performance
- stage funnel
- team performance
- my tasks
- recent activity
- target progress

Cards should show:

- label
- value
- short hint
- click-through where useful

## Lead Intake UI Rules

Lead intake must feel flexible and business-ready.

The product should support:

- manual entry
- CSV import
- website forms
- generic webhooks
- future WordPress form setups

Form-mapping UI should stay admin-only and advanced, but still be clear and safe.

## Leads Table Rules

Rows should emphasize:

- lead name
- contact
- source
- stage
- owner
- next follow-up
- priority
- last activity
- created date

Important states:

- overdue
- unassigned
- high priority
- stuck
- converted
- lost

## Lead Detail Rules

Lead detail should feel like a sales command center for one lead.

Required areas:

- details
- assignment
- notes
- tasks
- activity
- custom fields
- source context
- intake summary

Quick actions should stay visible.

## Reporting Rules

Reports should prioritize money-making visibility:

- source performance
- rep performance
- team performance
- branch performance
- overdue follow-ups
- stuck leads
- won/lost summary
- target progress
- expected pipeline value

## Customization Rules

Customization should stay controlled and safe.

Key customizable areas:

- branding
- colors
- stages
- sources
- custom fields
- dashboard widgets
- form mappings
- labels
- presets

## Responsive Rules

Desktop-first, but mobile still must support:

- checking leads
- checking tasks
- adding notes
- marking tasks complete
- viewing one lead clearly

## Banned UI Patterns

- long instructional panels on everyday pages
- hidden next actions
- decorative cards without operational purpose
- legacy travel/study copy
- technical storage language on normal user pages

## Quality Check

Before implementation, verify the design makes it easy to see:

- what came in
- what is overdue
- what is stuck
- what is converting
- who is performing
- whether the team is on track to hit target
