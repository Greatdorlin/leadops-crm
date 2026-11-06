# Demo acceptance — 6 November 2026

This records checks on the actual Leads Desk workspace, not an isolated mock dashboard. Production provider accounts and hosting certification are separate from the sales demo.

## Verified live

- Owner session opens the dashboard, lead queue, form builder and automation settings.
- The General contact form accepts an enquiry, returns a submission reference, and creates its lead in the real queue.
- Avery Chen has a qualified Agency growth plan worth USD 15,000 at 60% probability: USD 9,000 expected pipeline. Enterprise rollout is independently unqualified and excluded from that pipeline. Saving qualification created one follow-up call task.
- The named automation Prioritise website enquiries saves successfully. A subsequent Jordan Ellis form submission receives High priority automatically.
- Desktop and narrow CSS-width views at 454px and 340px were inspected. The nested condition-value picker stays open while its options scroll; the page has no horizontal overflow at that width.
- Existing won/lost dashboard stages each show zero open pipeline value.
- Company edits persist after refresh without requiring the unrelated Destination field. Both Avery offers persist after refresh, and the qualification task remains a single task.
- The captured form enquiry is visible by its original field labels on the lead. Historical submission answers remain preserved even when contact details are edited later.
- CSV export downloads through the live lead queue.
- Forms shows one accepting form and two incomplete drafts; the incomplete forms have no broken public View link.
- Webhook setup opens at the Add source section below the sticky header; responsive navigation opens from the left.
- Demo QA contact records were renamed to Mila Grant and Oliver Morgan; historical submissions were preserved.

## Demo defects corrected in this release

- Lead profile updates send only changed custom fields. Existing missing fields from another industry no longer block an unrelated contact edit; clearing an existing required field is still rejected.
- Saved public-form answers are read back by their configured labels on the authorized lead detail page. Unknown metadata is not exposed.
- Empty, private or inactive forms do not count as accepting submissions or show a broken public View link.
- Opportunity metrics use the actual card width rather than forcing five cramped columns on desktop.
- Closed lead list pipeline values are zero while historical estimated amounts are retained. Closed leads receive accurate lifecycle labels, location falls back to city/country, and the obsolete final-report placeholder is replaced with actionable sales context.
- The Website integration card opens Forms rather than looping back to the same integration page.

The data schema and report arithmetic are unchanged by these demo fixes. The earlier buyer-readiness branch also contains migration 0027 (default alignment only); its live migration/CI acceptance remains separately documented in BUYER_READINESS.md.

## Honest presentation boundary

Demonstrate forms, automation rules, leads, product-specific qualification, tasks, notes, dashboard, reports, export and configuration. Show provider setup as configuration capability. Do not present Meta, Google Ads, TikTok, LinkedIn, outbound email/WhatsApp or native Cloudflare Workers as connected or production-certified without the relevant client credentials, provider-side delivery tests and hosting acceptance.

GitHub Actions is blocked by account billing. Local verification and observed live demo checks are recorded separately; they do not constitute a green hosted CI run or a 90–100% independent score.

## Suggested demo route

1. Dashboard: explain open pipeline, won value, closed win rate and major stages.
2. Forms → General contact form → View: submit a fictional enquiry using an example.test email.
3. Leads: show the captured record and automatic High priority from Prioritise website enquiries.
4. Open Avery Chen: expand All captured answers; show Lakefield Consulting and the full enquiry.
5. Offer opportunities: Agency growth plan is qualified (USD 15,000 × 60% = USD 9,000 pipeline); Enterprise rollout is unqualified with a reason and excluded from pipeline.
6. Follow-up tasks and Notes: show the existing single discovery call and handoff context.
7. Reports and Export leads: demonstrate summaries and CSV download.
8. Integrations: demonstrate setup guidance and verification states, distinguishing configuration from a provider-confirmed live connection.

Use the existing General contact form for the pitch. The two empty intake drafts are intentionally not presented as published. Do not open external WhatsApp/email actions on fictional contacts. Browser-responsive checks are not iOS device certification.

## Deployment record

The production-target build for commit b0b3bd8cb2fab52f00641e6ca45cfb1727e99da0 passed health (200) and login rendering before promotion to leadops-crm.vercel.app. The authenticated owner session then verified the fixes against the actual workspace. No production credentials were copied into preview and no historical data was deleted. A subsequent schema-free follow-up aligns closed lead list pipeline display with dashboard/report exclusions.

## Local verification for the final follow-up

- 314 tests passed with zero failures or skips.
- Repository line coverage: 26.99%; business-contract aggregate line coverage: 87.44%. Both configured gates pass. The 80% figure applies to the named business contracts, not the entire repository.
- Explicit typecheck and lint pass. Dependency audit reports zero vulnerabilities.
- The profile-save, answer-display, form-readiness and closed-list-value regressions have dedicated checks. The full production build is required before source promotion.
