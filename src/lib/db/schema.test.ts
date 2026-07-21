import assert from "node:assert/strict";
import test from "node:test";
import { getTableColumns } from "drizzle-orm";
import {
  branches,
  companySettings,
  currencyExchangeRates,
  crmUsers,
  customFieldOptions,
  customFields,
  departments,
  formFieldMappings,
  formSources,
  leadCustomFieldValues,
  leadIntakeEvents,
  leadOpportunities,
  paymentClaims,
  leadSources,
  leadStages,
  leads,
  teams,
} from "@/lib/db/schema";
import {
  DEFAULT_LEADS_DESK_SOURCE_ROWS,
  DEFAULT_LEADS_DESK_STAGE_ROWS,
  LEADS_DESK_ASSIGNED_USER_BACKFILL_RULES,
  LEADS_DESK_SOURCE_BACKFILL_PLAN,
  LEADS_DESK_STAGE_BACKFILL_PLAN,
  RECOMMENDED_GENERAL_CUSTOM_FIELDS,
} from "@/lib/db/defaults";
import {
  CUSTOM_FIELD_TYPES,
  FORM_FIELD_TARGET_TYPES,
  FORM_SOURCE_TYPES,
  LEAD_INTAKE_EVENT_STATUSES,
} from "@/lib/crm/domain";

test("phase 2C additive schema exports the first neutral tables", () => {
  assert.deepEqual(Object.keys(getTableColumns(branches)), [
    "id",
    "name",
    "location",
    "managerUserId",
    "currency",
    "archived",
    "createdAt",
    "updatedAt",
  ]);
  assert.deepEqual(Object.keys(getTableColumns(departments)), [
    "id",
    "name",
    "managerUserId",
    "archived",
    "createdAt",
    "updatedAt",
  ]);
  assert.deepEqual(Object.keys(getTableColumns(teams)), [
    "id",
    "name",
    "managerUserId",
    "branchId",
    "departmentId",
    "archived",
    "createdAt",
    "updatedAt",
  ]);
  assert.deepEqual(Object.keys(getTableColumns(leadStages)), [
    "id",
    "name",
    "key",
    "color",
    "sortOrder",
    "isWon",
    "isLost",
    "archived",
    "createdAt",
    "updatedAt",
  ]);
  assert.deepEqual(Object.keys(getTableColumns(leadSources)), [
    "id",
    "name",
    "key",
    "type",
    "color",
    "archived",
    "createdAt",
    "updatedAt",
  ]);
});

test("currency and finance persistence stays additive and auditable", () => {
  assert.deepEqual(Object.keys(getTableColumns(currencyExchangeRates)), [
    "id", "baseCurrency", "quoteCurrency", "rate", "source", "updatedBy",
    "fetchedAt", "createdAt", "updatedAt",
  ]);
  assert.deepEqual(Object.keys(getTableColumns(paymentClaims)), [
    "id", "leadId", "amount", "currency", "status", "submittedByUserId",
    "submittedByEmail", "reviewedByUserId", "reviewedByEmail", "reviewedAt",
    "rejectionReason", "commissionAmount", "commissionRecipientUserId",
    "commissionConfirmedAt", "commissionConfirmedByUserId", "createdAt", "updatedAt",
  ]);
});

test("phase 2C adds only additive nullable sales-command columns to leads", () => {
  const columns = Object.keys(getTableColumns(leads));

  assert.equal(columns.includes("companyName"), true);
  assert.equal(columns.includes("sourceId"), true);
  assert.equal(columns.includes("stageId"), true);
  assert.equal(columns.includes("campaignId"), true);
  assert.equal(columns.includes("campaignLabel"), true);
  assert.equal(columns.includes("assignedUserId"), true);
  assert.equal(columns.includes("teamId"), true);
  assert.equal(columns.includes("branchId"), true);
  assert.equal(columns.includes("departmentId"), true);
  assert.equal(columns.includes("estimatedValue"), true);
  assert.equal(columns.includes("expectedValue"), true);
  assert.equal(columns.includes("wonValue"), true);
  assert.equal(columns.includes("closeProbability"), true);
  assert.equal(columns.includes("expectedCloseDate"), true);
  assert.equal(columns.includes("wonAt"), true);
  assert.equal(columns.includes("lostAt"), true);
  assert.equal(columns.includes("lostReason"), true);
  assert.equal(columns.includes("nextFollowUpAt"), true);
  assert.equal(columns.includes("archivedAt"), true);
  assert.equal(columns.includes("country"), true);
  assert.equal(columns.includes("region"), true);
  assert.equal(columns.includes("city"), true);
  assert.equal(columns.includes("address"), true);
  assert.equal(columns.includes("postalCode"), true);
});

test("default stage and source rows match the phase 2C schema foundation", () => {
  assert.deepEqual(
    DEFAULT_LEADS_DESK_STAGE_ROWS.map((stage) => stage.key),
    ["new", "contacted", "follow_up", "qualified", "proposal", "won", "lost"],
  );
  assert.deepEqual(
    DEFAULT_LEADS_DESK_SOURCE_ROWS.map((source) => source.key),
    [
      "website",
      "wordpress_form",
      "facebook_ads",
      "google_ads",
      "tiktok_ads",
      "instagram",
      "referral",
      "call",
      "walk_in",
      "csv_import",
      "manual_entry",
      "other",
    ],
  );
});

test("backfill plan metadata includes known status mappings and stays non-destructive", () => {
  assert.equal(LEADS_DESK_STAGE_BACKFILL_PLAN.converted, "won");
  assert.equal(LEADS_DESK_STAGE_BACKFILL_PLAN.documents_pending, "follow_up");
  assert.equal(LEADS_DESK_SOURCE_BACKFILL_PLAN.website_form, "website");
  assert.equal(LEADS_DESK_SOURCE_BACKFILL_PLAN.google_sheets, "csv_import");
  assert.equal(LEADS_DESK_ASSIGNED_USER_BACKFILL_RULES.legacyField, "assignedTo");
  assert.equal(LEADS_DESK_ASSIGNED_USER_BACKFILL_RULES.futureField, "assignedUserId");
});

test("phase 2D additive schema exports custom-field, form-source, and intake tables", () => {
  assert.deepEqual(Object.keys(getTableColumns(customFields)), [
    "id",
    "key",
    "label",
    "type",
    "description",
    "placeholder",
    "required",
    "archived",
    "showInTable",
    "showInForm",
    "showInDetails",
    "searchable",
    "filterable",
    "sortOrder",
    "createdAt",
    "updatedAt",
  ]);
  assert.deepEqual(Object.keys(getTableColumns(customFieldOptions)), [
    "id",
    "customFieldId",
    "label",
    "value",
    "color",
    "sortOrder",
    "archived",
    "createdAt",
    "updatedAt",
  ]);
  assert.deepEqual(Object.keys(getTableColumns(leadCustomFieldValues)), [
    "id",
    "leadId",
    "customFieldId",
    "value",
    "displayValue",
    "createdAt",
    "updatedAt",
  ]);
  assert.deepEqual(Object.keys(getTableColumns(formSources)), [
    "id",
    "name",
    "type",
    "sourceId",
    "webhookKey",
    "isActive",
    "defaultStageId",
    "defaultAssignedUserId",
    "defaultTeamId",
    "defaultBranchId",
    "defaultDepartmentId",
    "defaultPriority",
    "createdAt",
    "updatedAt",
  ]);
  assert.deepEqual(Object.keys(getTableColumns(formFieldMappings)), [
    "id",
    "formSourceId",
    "externalFieldName",
    "externalFieldLabel",
    "targetType",
    "targetField",
    "customFieldId",
    "required",
    "transformRule",
    "fallbackValue",
    "createdAt",
    "updatedAt",
  ]);
  assert.deepEqual(Object.keys(getTableColumns(leadIntakeEvents)), [
    "id",
    "formSourceId",
    "leadId",
    "rawPayload",
    "normalizedPayload",
    "status",
    "errorMessage",
    "createdAt",
  ]);
  assert.deepEqual(Object.keys(getTableColumns(leadOpportunities)), [
    "id",
    "leadId",
    "offerLabel",
    "status",
    "estimatedValue",
    "expectedValue",
    "currency",
    "exchangeRateToGlobal",
    "closeProbability",
    "expectedCloseDate",
    "reason",
    "notes",
    "isPrimary",
    "sortOrder",
    "archivedAt",
    "createdAt",
    "updatedAt",
  ]);
});

test("phase 2D schema constants stay aligned with neutral domain contracts", () => {
  assert.equal(CUSTOM_FIELD_TYPES.includes("multi_select"), true);
  assert.deepEqual(FORM_SOURCE_TYPES, [
    "website",
    "wordpress",
    "webhook",
    "csv",
    "manual",
    "ads",
    "other",
  ]);
  assert.deepEqual(FORM_FIELD_TARGET_TYPES, ["core", "custom"]);
  assert.deepEqual(LEAD_INTAKE_EVENT_STATUSES, [
    "received",
    "mapped",
    "lead_created",
    "failed",
    "ignored",
  ]);
});

test("recommended general custom fields stay seed-ready without runtime wiring", () => {
  assert.deepEqual(
    RECOMMENDED_GENERAL_CUSTOM_FIELDS.map((field) => field.key),
    ["budget", "interest", "preferred_contact_time", "urgency", "location", "form_notes"],
  );
});

test("premium UI pass adds additive company settings storage for runtime customization", () => {
  assert.deepEqual(Object.keys(getTableColumns(companySettings)), [
    "id",
    "companyName",
    "logoUrl",
    "logoUrlLightMode",
    "logoUrlDarkMode",
    "faviconUrl",
    "loginLogoUrl",
    "loginLogoUrlLightMode",
    "loginLogoUrlDarkMode",
    "primaryColor",
    "accentColor",
    "backgroundColor",
    "surfaceColor",
    "cardColor",
    "sidebarColor",
    "textColor",
    "borderColor",
    "borderRadius",
    "fontScale",
    "fontPreset",
    "density",
    "themeMode",
    "designStyle",
    "glassEnabled",
    "glassOpacity",
    "glassBlur",
    "celebrationsEnabled",
    "stageCelebrationsEnabled",
    "targetCelebrationsEnabled",
    "celebrationStyle",
    "loginBackgroundUrl",
    "loginHeadline",
    "loginSubheadline",
    "navigationConfig",
    "dashboardConfig",
    "leadPreviewConfig",
    "industryPreset",
    "globalCurrency",
    "domainRegistrationEnabled",
    "approvedRegistrationDomains",
    "createdAt",
    "updatedAt",
  ]);
});

test("phase 1 schema slice adds crm user avatar support", () => {
  assert.equal(Object.keys(getTableColumns(crmUsers)).includes("avatarUrl"), true);
});
