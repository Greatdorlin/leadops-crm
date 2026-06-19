# Leads Desk Backup And Restore

## Purpose

Leads Desk is a private client system. Operators must be able to back up and restore Postgres safely before go-live.

## Daily Backup Recommendation

- run at least one daily logical backup
- keep multiple retention points
- store backups outside the app server when possible
- test restore regularly

## Standard `pg_dump` Backup

```bash
pg_dump "$DATABASE_URL" --format=custom --file=leads-desk.backup
```

## Plain SQL Backup

```bash
pg_dump "$DATABASE_URL" --file=leads-desk.sql
```

## Docker Compose Backup

```bash
docker compose exec -T postgres pg_dump -U postgres -d leads_desk --format=custom > leads-desk.backup
```

Adjust database name and user if your Postgres service uses different credentials.

## Restore From Custom Backup

```bash
pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" leads-desk.backup
```

## Restore From Plain SQL

```bash
psql "$DATABASE_URL" -f leads-desk.sql
```

## Docker Compose Restore

```bash
cat leads-desk.sql | docker compose exec -T postgres psql -U postgres -d leads_desk
```

## Restore Drill

Before client handover, prove restore works by:

1. restoring into a staging database
2. logging into the app against that database
3. checking leads, custom fields, webhook setup, notifications, and exports

## Operator Responsibilities

- keep backup credentials private
- monitor backup success
- test restore before calling a deployment production-ready
- agree with the client on who owns ongoing backup operations
