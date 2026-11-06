# Demo acceptance — 6 November 2026

This records checks on the actual Leads Desk workspace, not an isolated mock dashboard. Production provider accounts and hosting certification are separate from the sales demo.

## Verified live

- Owner session opens the dashboard, lead queue, form builder and automation settings.
- The General contact form accepts an enquiry, returns a submission reference, and creates its lead in the real queue.
- Avery Chen has a qualified Agency growth plan worth USD 15,000 at 60% probability: USD 9,000 expected pipeline. Enterprise rollout is independently unqualified and excluded from that pipeline. Saving qualification created one follow-up call task.
- The named automation Prioritise website enquiries saves successfully. A subsequent Jordan Ellis form submission receives High priority automatically.
- Desktop and narrow CSS-width views at 454px were inspected. The nested condition-value picker stays open while its options scroll; the page has no horizontal overflow at that width.
- Existing won/lost dashboard stages each show zero open pipeline value.

## Demo defects corrected in this release

- Lead profile updates send only changed custom fields. Existing missing fields from another industry no longer block an unrelated contact edit; clearing an existing required field is still rejected.
- Saved public-form answers are read back by their configured labels on the authorized lead detail page. Unknown metadata is not exposed.
- Empty, private or inactive forms do not count as accepting submissions or show a broken public View link.
- Opportunity metrics use the actual card width rather than forcing five cramped columns on desktop.
- Closed leads receive accurate lifecycle labels, location falls back to city/country, and the obsolete final-report placeholder is replaced with actionable sales context.
- The Website integration card opens Forms rather than looping back to the same integration page.

The data schema and report arithmetic are unchanged by these demo fixes. The earlier buyer-readiness branch also contains migration 0027 (default alignment only); its live migration/CI acceptance remains separately documented in BUYER_READINESS.md.

## Honest presentation boundary

Demonstrate forms, automation rules, leads, product-specific qualification, tasks, notes, dashboard, reports, export and configuration. Show provider setup as configuration capability. Do not present Meta, Google Ads, TikTok, LinkedIn, outbound email/WhatsApp or native Cloudflare Workers as connected or production-certified without the relevant client credentials, provider-side delivery tests and hosting acceptance.

GitHub Actions is blocked by account billing. Local verification and observed live demo checks are recorded separately; they do not constitute a green hosted CI run or a 90–100% independent score.
