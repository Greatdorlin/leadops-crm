# Extension Contracts

## Purpose

Leads Desk keeps optional integrations behind server-side, provider-neutral contracts. A contract is not a working connector. Customer-facing status must remain `adapter_ready` until a production adapter, setup path, health view, retry handling, and deployment verification exist.

## Email Marketing

`src/lib/integrations/email-marketing/adapter.ts` defines the outbound contact-event boundary. It supports idempotent contact upsert, unsubscribe, and removal events plus adapter health results.

Current status:

- Sender, Mailchimp, Brevo, ActiveCampaign, and custom email platforms are adapter-ready only
- no email-marketing provider adapter is active in the release runtime
- credentials must not be added to client code or general lead records
- a future adapter must expose setup, health, delivery failure, and retry operations before its catalog status becomes available

## Official Outbound Mailbox

`src/lib/integrations/outbound-email/contracts.ts` defines a provider-neutral send and health boundary for a future official-mailbox feature.

Current boundary:

- the contract supports SMTP, Google OAuth, and Microsoft OAuth adapter identities without coupling product code to one provider
- Hostinger and other standards-compliant mailboxes can be supported by a future SMTP adapter
- credentials must be encrypted per user, read only on the server, and never returned by an API or placed in lead records
- inbox sync, conversation history, open tracking, per-user mailbox credentials, and automatic retries are not claimed or simulated
- customer-facing activation remains `adapter_ready` until an admin setup surface, encrypted secret storage, a delivery ledger, retry controls, and production health view are implemented and verified

## AI Extensions

`src/lib/ai/index.ts` is a server-only adapter contract and capability registry. It does not implement an AI feature or depend on an AI provider.

Current status:

- every capability is explicitly disabled
- no adapter is registered
- no provider dependency or provider-specific environment variable exists
- credentials belong inside a future server-side adapter implementation
- enabling a capability requires a product-level data, permission, retention, audit, failure, and human-review design

The registry must not be used to imply that Leads Desk currently includes AI behavior.
