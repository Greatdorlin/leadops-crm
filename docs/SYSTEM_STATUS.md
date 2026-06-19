# Leads Desk System Status

## Purpose

The system status page gives owner and admin a safe operational snapshot without exposing secrets.

## Current Signals

- database connection configured: yes/no
- auth environment configured: yes/no
- current environment
- app version
- webhook base URL
- backup reminder note
- production checklist links

## Security Rules

- never show `DATABASE_URL`
- never show OAuth secrets
- never show auth secrets

## Runtime Route

- `/admin/settings/system-status`
