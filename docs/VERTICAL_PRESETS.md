# Leads Desk Vertical Presets

## Purpose

Vertical presets help a business start quickly without locking it into a rigid industry template.

Presets should initialize:

- labels
- default stages
- default sources
- recommended custom fields
- dashboard widgets
- form source examples

## Preset Rule

Presets are defaults, not limits.

After setup, each client should still be able to customize:

- lead fields
- intake mappings
- stages
- sources
- branding
- dashboards

## Shared Preset Requirements

Every preset should define:

- entity labels
- role labels
- default lead stages
- default lead sources
- recommended core fields
- recommended custom fields
- default dashboard widgets
- sample intake forms and mappings

## Default Sources

Base source catalog:

- Website
- WordPress Form
- Manual Entry
- CSV Import
- Referral
- Call
- Walk-in
- Event
- WhatsApp
- Ads
- Other

## Preset Catalog

### 1. General Business

- stages: New Lead, Contacted, Interested, Follow-up, Converted, Lost
- recommended custom fields: interest, budget, urgency, location
- form examples: contact form, quote request, referral intake

### 2. Real Estate

- stages: New Inquiry, Contacted, Inspection Scheduled, Interested, Offer / Negotiation, Closed, Lost
- recommended custom fields: property type, preferred location, budget, inspection date
- form examples: property inquiry form, inspection request form

### 3. Insurance

- stages: New Prospect, Contacted, Needs Review, Quote Sent, Policy Started, Won, Lost
- recommended custom fields: policy type, coverage amount, renewal date, age bracket
- form examples: policy quote form, renewal form

### 4. Travel / Education Agency

- stages: New Inquiry, Contacted, Consultation Booked, Documents Pending, Application Started, Converted, Lost
- recommended custom fields: destination, program level, timeline, budget
- form examples: consultation form, document-readiness form

Important note:

- this preset does not make the inherited product logic the commercial product
- it is only one optional vertical among many

### 5. Service Business

- stages: New Request, Contacted, Estimate Sent, Job Scheduled, Completed, Won, Lost
- recommended custom fields: service type, location, urgency, preferred appointment date
- form examples: booking request form, estimate request form

### 6. Training / Coaching Business

- stages: New Inquiry, Contacted, Class Recommended, Payment Pending, Enrolled, Lost
- recommended custom fields: course interest, schedule preference, learning goal
- form examples: enrollment inquiry form, session booking form

## Preset Application Rules

- apply during onboarding or explicit reset flows
- never silently delete existing client configuration
- use a review flow when existing stages, fields, or sources are already present
- log preset application in audit logs

## Future Implementation Note

Preset definitions can start in code, but applied results should persist in database-backed settings and customization tables.
