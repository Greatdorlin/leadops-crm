import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { leadCustomFieldValues, leadEvents, leads, leadSources } from "@/lib/db/schema";
import type { AdminLeadProfileInput } from "@/lib/crm/form-contracts";
import { buildLeadAuditChanges, type LeadAuditChange } from "@/lib/crm/lead-audit-events";
import { leadEventTypes } from "@/lib/crm/lead-events";
import type {
  CustomFieldDefinitionWithOptions,
  LeadCustomFieldValueInputRecord,
} from "@/lib/crm/custom-field-values";
import { upsertLeadCustomFieldValues } from "@/lib/crm/custom-field-values-store";

export class LeadBusinessFieldUpdateError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "LeadBusinessFieldUpdateError";
  }
}

type LeadBusinessFieldRow = Pick<
  typeof leads.$inferSelect,
  | "firstName"
  | "lastName"
  | "email"
  | "whatsappNumber"
  | "country"
  | "region"
  | "city"
  | "address"
  | "postalCode"
  | "companyName"
  | "leadCustomerType"
  | "sourceId"
  | "sourceDetail"
  | "campaignLabel"
  | "utmSource"
  | "utmMedium"
  | "utmCampaign"
  | "utmContent"
  | "utmTerm"
  | "landingPage"
>;

function text(value: string | null | undefined) {
  return value?.trim() || null;
}

export function buildLeadBusinessFieldUpdate(
  existing: LeadBusinessFieldRow,
  input: AdminLeadProfileInput,
): LeadBusinessFieldRow {
  return {
    firstName: input.firstName === undefined ? existing.firstName : input.firstName.trim(),
    lastName: input.lastName === undefined ? existing.lastName : text(input.lastName) ?? "",
    email: input.email === undefined ? existing.email : text(input.email) ?? "",
    whatsappNumber:
      input.whatsappNumber === undefined
        ? existing.whatsappNumber
        : text(input.whatsappNumber) ?? "",
    country: input.country === undefined ? existing.country : text(input.country),
    region: input.region === undefined ? existing.region : text(input.region),
    city: input.city === undefined ? existing.city : text(input.city),
    address: input.address === undefined ? existing.address : text(input.address),
    postalCode: input.postalCode === undefined ? existing.postalCode : text(input.postalCode),
    companyName: input.companyName === undefined ? existing.companyName : text(input.companyName),
    leadCustomerType:
      input.leadCustomerType === undefined
        ? existing.leadCustomerType
        : input.leadCustomerType ?? "direct",
    sourceId: input.sourceId === undefined ? existing.sourceId : input.sourceId,
    sourceDetail:
      input.sourceDetail === undefined ? existing.sourceDetail : text(input.sourceDetail),
    campaignLabel:
      input.campaignLabel === undefined ? existing.campaignLabel : text(input.campaignLabel),
    utmSource: input.utmSource === undefined ? existing.utmSource : text(input.utmSource),
    utmMedium: input.utmMedium === undefined ? existing.utmMedium : text(input.utmMedium),
    utmCampaign:
      input.utmCampaign === undefined ? existing.utmCampaign : text(input.utmCampaign),
    utmContent: input.utmContent === undefined ? existing.utmContent : text(input.utmContent),
    utmTerm: input.utmTerm === undefined ? existing.utmTerm : text(input.utmTerm),
    landingPage:
      input.landingPage === undefined ? existing.landingPage : text(input.landingPage),
  };
}

export function buildLeadBusinessFieldChanges(
  before: LeadBusinessFieldRow,
  after: LeadBusinessFieldRow,
  sourceNames: { before: string | null; after: string | null },
): LeadAuditChange[] {
  return buildLeadAuditChanges([
    { field: "firstName", label: "First name", before: before.firstName, after: after.firstName },
    { field: "lastName", label: "Last name", before: before.lastName, after: after.lastName },
    { field: "email", label: "Email", before: before.email, after: after.email },
    { field: "whatsappNumber", label: "WhatsApp number", before: before.whatsappNumber, after: after.whatsappNumber },
    { field: "country", label: "Country", before: before.country, after: after.country },
    { field: "region", label: "State / province / region", before: before.region, after: after.region },
    { field: "city", label: "City", before: before.city, after: after.city },
    { field: "address", label: "Address", before: before.address, after: after.address },
    { field: "postalCode", label: "Postal code", before: before.postalCode, after: after.postalCode },
    { field: "companyName", label: "Company", before: before.companyName, after: after.companyName },
    { field: "leadCustomerType", label: "Lead type", before: before.leadCustomerType, after: after.leadCustomerType },
    { field: "source", label: "Source", before: sourceNames.before, after: sourceNames.after },
    { field: "sourceDetail", label: "Source detail", before: before.sourceDetail, after: after.sourceDetail },
    { field: "campaignLabel", label: "Campaign", before: before.campaignLabel, after: after.campaignLabel },
    { field: "utmSource", label: "UTM source", before: before.utmSource, after: after.utmSource },
    { field: "utmMedium", label: "UTM medium", before: before.utmMedium, after: after.utmMedium },
    { field: "utmCampaign", label: "UTM campaign", before: before.utmCampaign, after: after.utmCampaign },
    { field: "utmContent", label: "UTM content", before: before.utmContent, after: after.utmContent },
    { field: "utmTerm", label: "UTM term", before: before.utmTerm, after: after.utmTerm },
    { field: "landingPage", label: "Landing page", before: before.landingPage, after: after.landingPage },
  ]);
}

function buildCustomFieldChanges(
  values: LeadCustomFieldValueInputRecord[],
  definitions: CustomFieldDefinitionWithOptions[],
  existingValues: Array<{ customFieldId: string; displayValue: string | null }>,
) {
  const labels = new Map(definitions.map((field) => [field.id, field.label]));
  const previous = new Map(existingValues.map((value) => [value.customFieldId, value.displayValue]));

  return buildLeadAuditChanges(
    values.map((value) => ({
      field: `customField:${value.customFieldId}`,
      label: labels.get(value.customFieldId) ?? "Custom field",
      before: previous.get(value.customFieldId) ?? null,
      after: value.displayValue,
    })),
  );
}

export async function updateLeadBusinessFields(input: {
  leadId: string;
  actorEmail: string;
  profile: AdminLeadProfileInput;
  customFieldValues: LeadCustomFieldValueInputRecord[];
  customFieldDefinitions: CustomFieldDefinitionWithOptions[];
}) {
  const actorEmail = input.actorEmail.trim().toLowerCase();
  if (!actorEmail) {
    throw new LeadBusinessFieldUpdateError("An authenticated actor is required for lead updates.", 401);
  }

  return getDb().transaction(async (tx) => {
    const [existing] = await tx.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);
    if (!existing) return null;

    const next = buildLeadBusinessFieldUpdate(existing, input.profile);
    const sourceIds = [existing.sourceId, next.sourceId].filter((value): value is string => Boolean(value));
    const sourceRows = sourceIds.length
      ? await tx
          .select({ id: leadSources.id, name: leadSources.name, archived: leadSources.archived })
          .from(leadSources)
          .where(inArray(leadSources.id, sourceIds))
      : [];
    const sourceById = new Map(sourceRows.map((source) => [source.id, source]));
    const selectedSource = next.sourceId ? sourceById.get(next.sourceId) : null;
    if (
      next.sourceId &&
      (!selectedSource || (selectedSource.archived && next.sourceId !== existing.sourceId))
    ) {
      throw new LeadBusinessFieldUpdateError("Choose an active lead source.");
    }

    const customFieldIds = input.customFieldValues.map((value) => value.customFieldId);
    const existingCustomValues = customFieldIds.length
      ? await tx
          .select({
            customFieldId: leadCustomFieldValues.customFieldId,
            displayValue: leadCustomFieldValues.displayValue,
          })
          .from(leadCustomFieldValues)
          .where(
            and(
              eq(leadCustomFieldValues.leadId, input.leadId),
              inArray(leadCustomFieldValues.customFieldId, customFieldIds),
            ),
          )
      : [];

    const changes = [
      ...buildLeadBusinessFieldChanges(existing, next, {
        before: existing.sourceId ? sourceById.get(existing.sourceId)?.name ?? null : null,
        after: next.sourceId ? sourceById.get(next.sourceId)?.name ?? null : null,
      }),
      ...buildCustomFieldChanges(
        input.customFieldValues,
        input.customFieldDefinitions,
        existingCustomValues,
      ),
    ];

    if (changes.length === 0) return existing;

    const now = new Date();
    const [updated] = await tx
      .update(leads)
      .set({ ...next, updatedAt: now, lastActivityAt: now })
      .where(eq(leads.id, input.leadId))
      .returning();

    await upsertLeadCustomFieldValues(input.leadId, input.customFieldValues, tx);
    await tx.insert(leadEvents).values({
      leadId: input.leadId,
      eventType: leadEventTypes.leadProfileUpdated,
      eventData: {
        category: "business_fields",
        changedFields: changes.map((change) => change.field),
        changes,
      },
      createdBy: actorEmail,
    });

    return updated ?? null;
  });
}
