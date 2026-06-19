# Leads Desk Demo Script

## Demo Goal

Show a buyer that Leads Desk is a private sales command center that captures leads, enforces follow-up, and gives managers clear sales visibility.

Before the walkthrough, populate a clean local demo workspace if needed:

```bash
npm run db:seed:demo
```

## Recommended 10 To 15 Minute Flow

1. Open the dashboard.
   - Show total leads, overdue follow-ups, pipeline value, won value, top sources, and intake activity.
2. Open `Settings -> Lead Fields`.
   - Create or show a business-specific custom field such as Budget or Property Type.
3. Open `Settings -> Form Sources`.
   - Show a form source, webhook URL, and sample payload.
4. Open `Settings -> Sales Targets`.
   - Show a monthly target and its current progress.
5. Add a manual lead.
   - Fill core fields and extra lead details.
6. Open the new lead.
   - Show custom field values, owner, stage, next follow-up, and sales value fields.
7. Set or update a follow-up.
   - Show how overdue and due-today visibility works.
8. Send a webhook test payload.
   - Confirm the lead is created or updated.
9. Open `Intake Log`.
   - Show the successful event and explain how failures are debugged.
10. Open notifications.
   - Show assigned-lead or webhook notifications.
11. Open reports.
   - Show source performance, stage performance, rep performance, and intake success/failure.
12. Export leads.
   - Confirm custom fields appear in the export.

## Talking Points

- privately installed
- one client, one app instance, one database
- custom fields and form mappings without code forks
- no per-user CRM subscription
- own the data, export the data, back up the data
