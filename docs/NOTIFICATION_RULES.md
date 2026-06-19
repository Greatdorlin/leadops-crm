# Leads Desk Notification Rules

## Purpose

Notifications should reinforce execution discipline without becoming an MVP blocker.

## Current v1.0 Status

The product now includes additive `notification_events` storage and in-app notification runtime for:

- new lead assigned
- webhook lead captured
- follow-up due
- follow-up overdue
- lead stage changed
- lead marked won
- lead marked lost
- import completed
- export completed

Admin users can review notifications in `/admin/notifications` and mark them as read.

## Delivery Priorities

1. in-app notification foundation
2. email notification foundation

Not core MVP:

- WhatsApp automation
- Telegram automation

## Notification Events

- new lead assigned
- follow-up due
- follow-up overdue
- lead stage changed
- lead marked won
- lead marked lost
- new webhook lead captured
- import completed
- target milestone reached

## Delivery Direction

Short term:

- event-driven notification architecture
- in-app notifications first

Later:

- email delivery
- queue/worker processing
- optional external channels

## Safety Rules

- notifications should follow permission boundaries
- raw intake payloads should never be included in normal notifications
- notifications should help action, not create noise

## Phase 2A Contract Status

Neutral notification event contracts now exist in `src/lib/crm/domain/notifications.ts`.

This phase does not add delivery infrastructure or persistence yet.

## Production Guardrails

- Notifications must not leak raw webhook payloads or secrets.
- Read access follows the current lead/admin permission layer.
- The current v1.0 foundation is in-app only. Email delivery can be added later through a safe mailer path.
