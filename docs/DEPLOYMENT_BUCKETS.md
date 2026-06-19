# Leads Desk Deployment Buckets

## Purpose

This document translates the infrastructure strategy into practical deployment buckets for Leads Desk.

Clients should not be forced to choose these buckets directly. They are internal planning buckets.

## Bucket 1: Demo / Trial

Purpose:

- sales demos
- preview links
- temporary prototype environments

Possible stack:

- Vercel Hobby or similar
- low-cost Postgres
- demo data only

Rules:

- not for serious client production data
- useful for showing product value before payment

Backup and restore expectation:

- lightweight backup only if demo data matters
- no production-grade restore promise

## Bucket 2: Low-Cost VPS Production

Purpose:

- entry clients
- small teams
- lower monthly infrastructure burden

Possible stack:

- low-cost VPS
- Docker Compose
- Postgres on the same server
- Caddy or Nginx
- scheduled `pg_dump`

Rules:

- suitable for the entry commercial package when the client profile fits
- security and backups still matter

Backup and restore expectation:

- scheduled dumps
- off-server copy
- documented restore steps

## Bucket 3: Stronger VPS / Small-Business Production

Purpose:

- growing clients
- higher lead volume
- better stability requirements

Possible stack:

- stronger VPS
- Dockerized app
- Postgres
- automated backups
- basic monitoring

Backup and restore expectation:

- automated backups
- retention policy
- periodic restore verification

## Bucket 4: Managed Cloud / Vercel-Compatible Production

Purpose:

- clients who want easier platform operations
- stronger app/database separation
- better operational flexibility

Possible stack:

- Vercel or other managed app hosting
- managed Postgres
- managed backup paths

Rules:

- app must stay provider-neutral
- this is an internal deployment choice, not customer-facing jargon

Backup and restore expectation:

- managed backup policy
- defined recovery process
- export and restore expectations documented

## Bucket 5: Enterprise

Purpose:

- large teams
- very high lead volume
- stronger security and reliability requirements

Possible stack:

- dedicated app infrastructure
- dedicated managed Postgres or RDS
- monitoring
- stronger backup policy
- room for async workers later

Backup and restore expectation:

- contract-aware retention
- documented recovery ownership
- restore rehearsal expectation

## Common Rules Across Buckets

- one client = one app instance
- one client = one Postgres database
- one client = one configuration
- `DATABASE_URL` is the primary database contract
- provider-specific env names are compatibility fallbacks, not the product standard
- no hardcoded hosting provider assumptions in app logic

## Customer-Facing Message

Customers should hear:

- we install and configure your private lead management system
- your team gets a branded dashboard
- your workflow is customized around your business

Customers should not be pushed into choosing technical deployment jargon unless they are technical buyers.
