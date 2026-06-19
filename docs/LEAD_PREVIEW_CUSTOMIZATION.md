# Leads Desk Lead Preview Customization

## Purpose

Lead preview customization controls what appears in:

- lead table desktop columns
- mobile lead preview cards

## Supported Preview Fields

Core options include:

- name
- phone
- email
- company
- source
- stage
- owner
- priority
- next follow-up
- follow-up status
- estimated value
- expected close date
- created date
- last activity
- campaign
- team
- branch
- department

Custom fields can also appear when they are:

- active
- non-archived
- marked for table visibility

## Guardrails

- archived fields are hidden by default
- no raw JSON is shown in preview surfaces
- custom-field columns remain capped for readability

## Runtime Route

- `/admin/settings/lead-preview`
