# Leads Desk Copy And Content Standard

## Purpose

This document defines how Leads Desk should sound in product UI.

The product should feel clear, calm, direct, and business-ready.

The product should not sound like:

- inherited legacy product copy
- an internal engineering tool
- a travel or study product
- a technical admin console
- documentation pasted into the interface

## Core Principles

- use short labels
- make the next action obvious
- prefer plain language over technical wording
- remove explanatory copy that does not help the user act
- keep product pages operational, not essay-like

## Short Label Standard

Prefer labels like:

- Add lead
- Assign
- Follow up
- Mark contacted
- Mark converted
- Add note
- Create task
- Export data
- Overdue
- New leads
- My tasks
- Source performance

Avoid labels like:

- Technical summary
- Legacy journey summary
- Intake diagnostic details
- Specialist review
- Fast path
- Best for

## Banned Internal Language

Do not expose these words to normal users unless they are inside a technical admin area:

- payload
- webhook payload
- source payload
- sync job
- integration provider record
- database
- schema
- environment variable
- adapter
- legacy lead reference
- intake diagnostic
- legacy engine

Do not use these inherited product words in commercial Leads Desk UI:

- old product names
- old route names
- old diagnostic labels
- inherited specialist labels
- travel or education-specific guidance unless a client deliberately configures it

## Helper Text Limits

Recommended limits:

- badge text: 1 to 2 words
- card hint: 3 to 7 words
- empty state text: 1 sentence
- form help text: 1 sentence
- settings explanation: 1 to 2 short sentences

If text is longer than that, first ask whether the layout or label can do the work instead.

## Empty State Rules

Empty states should be short and action-oriented.

Good:

- Title: `No leads yet`
- Text: `Add your first lead or import a list.`
- Button: `Add lead`

Good:

- Title: `No overdue tasks`
- Text: `Your follow-ups are clear.`
- Button: `View all tasks`

Bad:

- long explanations of what leads or tasks are
- product marketing paragraphs inside operational screens

## Error Message Rules

Error messages should be human first.

Good:

- `We could not load leads. Try again.`
- `We could not save this change. Try again.`
- `This export could not be completed right now.`

Bad:

- `Database query failed at source payload adapter.`
- `Configuration error in integration provider record.`

If deeper details are needed:

- hide them under `Show details`
- keep detailed diagnostics admin-only

## Loading State Rules

- use skeletons for primary pages
- use loading states for buttons and forms
- avoid blank screens
- keep the page shape stable while data loads

## No Long Instructional Paragraphs In UI

Admin product pages should not read like documentation.

Do not use:

- long instructional panels
- repeated explanatory paragraphs
- decorative text blocks that do not help action
- internal notes pasted into cards

Documentation belongs in `docs/`, not in the main product UI.

## Technical Settings Rule

When technical wording is unavoidable:

- place it under `Advanced`
- keep the main settings flow plain-language
- show technical details only to the people who need them

## Review Checklist

Before approving UI copy, verify:

- labels are short
- the next action is obvious
- no inherited legacy wording leaked in
- no technical implementation wording leaked in
- no long instructional paragraphs remain
