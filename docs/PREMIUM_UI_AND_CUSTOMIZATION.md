# Leads Desk Premium UI And Customization

## Purpose

This pass upgrades Leads Desk from a functional admin workspace into a premium, configurable product experience.

## Runtime Capabilities

Owner and admin can now configure:

- company name
- logo URL
- light-mode logo URL
- dark-mode logo URL
- favicon URL
- login logo URL
- light-mode login logo URL
- dark-mode login logo URL
- primary, accent, background, surface, card, sidebar, text, and border colors
- border radius
- font preset
- density
- theme mode
- design style
- liquid glass settings
- celebration toggles for stage milestones and goal wins
- login headline, subheadline, and background image
- sidebar labels, visibility, and order
- lead preview columns and mobile preview fields
- dashboard widget visibility and order
- industry preset defaults

## Runtime Boundaries

- Settings are stored in `company_settings`.
- No secrets are stored in customization settings.
- Critical navigation items stay visible for owner and admin.
- Custom lead preview fields only use active, non-archived fields.
- Dashboard customization is read-only presentation control. It does not change core sales calculations.
- Goal and stage celebrations are presentation-layer feedback only. They do not alter lead, target, or notification persistence.
- Database connection and auth secrets remain deployment-managed, not app-editable.

## Key Routes

- `/admin/settings/appearance`
- `/admin/settings/navigation`
- `/admin/settings/lead-preview`
- `/admin/settings/dashboard`
- `/admin/settings/industry`
- `/admin/settings/system-status`

## Sellable Demo Outcome

This customization layer supports private-label demos by allowing a buyer to see:

- their own brand name
- their preferred color direction
- a branded login experience
- automatic light/dark logo selection on branded surfaces
- a cleaner sidebar structure
- lead-table previews aligned to their workflow
- dashboard emphasis aligned to their sales priorities
- small celebration moments when leads progress and targets are achieved
