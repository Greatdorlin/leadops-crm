import { logger, classifyError } from "@/lib/logger";
import { eq } from "drizzle-orm";
import { elevatePriority } from "@/lib/crm/assignments";
import {
  normalizeText,
  pickPreferredValue,
} from "@/lib/crm/value-normalization";
import { leadEventTypes } from "@/lib/crm/lead-events";
import type { DatabaseExecutor } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";
import { applyWorkspaceAutomationsToNewLead } from "@/lib/crm/workspace-automations";
import type {
  ExternalLeadUpsertInput,
  ExternalLeadUpsertResult,
  LeadStorage,
} from "./types";
import { parseOptionalNumeric, normalizeLeadRegion } from "./values";
import { mapLeadRecord } from "./mappers";
import { serializedLeadAssigneeValue } from "./filters";

export async function upsertExternalLead(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  input: ExternalLeadUpsertInput,
): Promise<ExternalLeadUpsertResult> {
  const db = getDatabase();
  const duplicate = input.alwaysCreateNewRecord
    ? null
    : await this.findDuplicateLead(input);

  if (!duplicate) {
    const created = await this.createExternalLead(input);
    await this.addLeadEvent({
      leadId: created.id,
      eventType: leadEventTypes.leadCreated,
      eventData: {
        source: input.source,
        sourceDetail: input.sourceDetail ?? null,
        externalLeadId: input.externalLeadId ?? null,
      },
    });

    const automationApplied = await applyWorkspaceAutomationsToNewLead(
      created.id,
      db,
    ).catch((error) => {
      logger.error(
        {
          scope: "workspace-automation:apply",
          leadId: created.id,
          error: classifyError(error),
        },
        "New lead automation failed",
      );
      return false;
    });
    const automatedLead = automationApplied
      ? await this.getById(created.id)
      : null;

    return {
      lead: automatedLead ?? created,
      created: true,
      duplicateOfId: null,
    };
  }
  const incomingSourceDetail = normalizeText(input.sourceDetail);
  const incomingLandingPage = normalizeText(input.landingPage);
  const shouldRefreshWebsiteAttribution = input.source === "website_form";
  const nextRegion = normalizeLeadRegion(input.region ?? input.state);

  const [updated] = await db
    .update(leads)
    .set({
      firstName: duplicate.firstName || normalizeText(input.firstName) || "",
      lastName: duplicate.lastName || normalizeText(input.lastName) || "",
      email: duplicate.email || normalizeText(input.email) || "",
      whatsappNumber:
        duplicate.whatsappNumber || normalizeText(input.whatsappNumber) || "",
      callNumber: duplicate.callNumber || normalizeText(input.callNumber) || "",
      leadCustomerType:
        input.leadCustomerType ?? duplicate.leadCustomerType ?? "direct",
      state: pickPreferredValue(duplicate.state, nextRegion),
      country: pickPreferredValue(
        duplicate.country ?? null,
        normalizeText(input.country),
      ),
      region: pickPreferredValue(duplicate.region ?? null, nextRegion),
      city: pickPreferredValue(
        duplicate.city ?? null,
        normalizeText(input.city),
      ),
      address: pickPreferredValue(
        duplicate.address ?? null,
        normalizeText(input.address),
      ),
      postalCode: pickPreferredValue(
        duplicate.postalCode ?? null,
        normalizeText(input.postalCode),
      ),
      companyName: pickPreferredValue(
        duplicate.companyName ?? null,
        normalizeText(input.companyName),
      ),
      sourceId: pickPreferredValue(
        duplicate.sourceId ?? null,
        input.sourceId ?? null,
      ),
      stageId: pickPreferredValue(
        duplicate.stageId ?? null,
        input.stageId ?? null,
      ),
      sourceDetail:
        shouldRefreshWebsiteAttribution && incomingSourceDetail
          ? incomingSourceDetail
          : pickPreferredValue(duplicate.sourceDetail, incomingSourceDetail),
      externalLeadId: pickPreferredValue(
        duplicate.externalLeadId,
        normalizeText(input.externalLeadId),
      ),
      externalFormId: pickPreferredValue(
        duplicate.externalFormId,
        normalizeText(input.externalFormId),
      ),
      priority: elevatePriority(duplicate.priority, input.priority),
      facebookLeadgenId: pickPreferredValue(
        duplicate.facebookLeadgenId,
        normalizeText(input.facebookLeadgenId),
      ),
      facebookFormId: pickPreferredValue(
        duplicate.facebookFormId,
        normalizeText(input.facebookFormId),
      ),
      facebookPageId: pickPreferredValue(
        duplicate.facebookPageId,
        normalizeText(input.facebookPageId),
      ),
      facebookCampaignId: pickPreferredValue(
        duplicate.facebookCampaignId,
        normalizeText(input.facebookCampaignId),
      ),
      facebookAdId: pickPreferredValue(
        duplicate.facebookAdId,
        normalizeText(input.facebookAdId),
      ),
      facebookAdsetId: pickPreferredValue(
        duplicate.facebookAdsetId,
        normalizeText(input.facebookAdsetId),
      ),
      googleClickId: pickPreferredValue(
        duplicate.googleClickId,
        normalizeText(input.googleClickId),
      ),
      googleCampaignId: pickPreferredValue(
        duplicate.googleCampaignId,
        normalizeText(input.googleCampaignId),
      ),
      googleAdGroupId: pickPreferredValue(
        duplicate.googleAdGroupId,
        normalizeText(input.googleAdGroupId),
      ),
      googleAdId: pickPreferredValue(
        duplicate.googleAdId,
        normalizeText(input.googleAdId),
      ),
      utmSource: pickPreferredValue(
        duplicate.utmSource,
        normalizeText(input.utmSource),
      ),
      utmMedium: pickPreferredValue(
        duplicate.utmMedium,
        normalizeText(input.utmMedium),
      ),
      utmCampaign: pickPreferredValue(
        duplicate.utmCampaign,
        normalizeText(input.utmCampaign),
      ),
      utmContent: pickPreferredValue(
        duplicate.utmContent,
        normalizeText(input.utmContent),
      ),
      utmTerm: pickPreferredValue(
        duplicate.utmTerm,
        normalizeText(input.utmTerm),
      ),
      assignedUserId: pickPreferredValue(
        duplicate.assignedUserId ?? null,
        input.assignedUserId ?? null,
      ),
      teamId: pickPreferredValue(
        duplicate.teamId ?? null,
        input.teamId ?? null,
      ),
      branchId: pickPreferredValue(
        duplicate.branchId ?? null,
        input.branchId ?? null,
      ),
      departmentId: pickPreferredValue(
        duplicate.departmentId ?? null,
        input.departmentId ?? null,
      ),
      campaignId: pickPreferredValue(
        duplicate.campaignId ?? null,
        normalizeText(input.campaignId),
      ),
      campaignLabel: pickPreferredValue(
        duplicate.campaignLabel ?? null,
        normalizeText(input.campaignLabel),
      ),
      estimatedValue:
        duplicate.estimatedValue !== null &&
        duplicate.estimatedValue !== undefined
          ? String(duplicate.estimatedValue)
          : (parseOptionalNumeric(input.estimatedValue)?.toString() ?? null),
      expectedValue:
        duplicate.expectedValue !== null &&
        duplicate.expectedValue !== undefined
          ? String(duplicate.expectedValue)
          : (parseOptionalNumeric(input.expectedValue)?.toString() ?? null),
      wonValue:
        duplicate.wonValue !== null && duplicate.wonValue !== undefined
          ? String(duplicate.wonValue)
          : (parseOptionalNumeric(input.wonValue)?.toString() ?? null),
      closeProbability:
        duplicate.closeProbability ??
        (input.closeProbability === undefined ? null : input.closeProbability),
      expectedCloseDate: duplicate.expectedCloseDate
        ? new Date(duplicate.expectedCloseDate)
        : input.expectedCloseDate
          ? new Date(input.expectedCloseDate)
          : null,
      wonAt: duplicate.wonAt
        ? new Date(duplicate.wonAt)
        : input.wonAt
          ? new Date(input.wonAt)
          : null,
      lostAt: duplicate.lostAt
        ? new Date(duplicate.lostAt)
        : input.lostAt
          ? new Date(input.lostAt)
          : null,
      lostReason: pickPreferredValue(
        duplicate.lostReason ?? null,
        normalizeText(input.lostReason),
      ),
      nextFollowUpAt: duplicate.nextFollowUpAt
        ? new Date(duplicate.nextFollowUpAt)
        : input.nextFollowUpAt
          ? new Date(input.nextFollowUpAt)
          : null,
      landingPage:
        shouldRefreshWebsiteAttribution && incomingLandingPage
          ? incomingLandingPage
          : pickPreferredValue(duplicate.landingPage, incomingLandingPage),
      sourcePayload: input.sourcePayload ?? duplicate.sourcePayload,
      deletedAt: null,
      deletedBy: null,
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    })
    .where(eq(leads.id, duplicate.id))
    .returning();

  await this.addLeadEvent({
    leadId: duplicate.id,
    eventType: leadEventTypes.leadUpdatedFromSource,
    eventData: {
      source: input.source,
      sourceDetail: input.sourceDetail ?? null,
      externalLeadId: input.externalLeadId ?? null,
      facebookLeadgenId: input.facebookLeadgenId ?? null,
      googleClickId: input.googleClickId ?? null,
    },
  });

  return {
    lead: mapLeadRecord(updated),
    created: false,
    duplicateOfId: duplicate.id,
  };
}

export async function createExternalLead(
  this: LeadStorage,
  getDatabase: () => DatabaseExecutor,
  input: ExternalLeadUpsertInput,
) {
  const db = getDatabase();
  const now = new Date();
  const region = normalizeLeadRegion(input.region ?? input.state);

  const [created] = await db
    .insert(leads)
    .values({
      source: input.source,
      sourceId: input.sourceId ?? null,
      stageId: input.stageId ?? null,
      sourceDetail: normalizeText(input.sourceDetail),
      priority: input.priority ?? "medium",
      leadCustomerType: input.leadCustomerType ?? "direct",
      assignedTo: serializedLeadAssigneeValue({
        primary: input.assignedTo,
        assignees: input.assignedToList ?? null,
      }),
      affiliateReferrerId: input.affiliateReferrerId ?? null,
      assignedUserId: input.assignedUserId ?? null,
      teamId: input.teamId ?? null,
      branchId: input.branchId ?? null,
      departmentId: input.departmentId ?? null,
      companyName: normalizeText(input.companyName),
      campaignId: normalizeText(input.campaignId),
      campaignLabel: normalizeText(input.campaignLabel),
      estimatedValue:
        parseOptionalNumeric(input.estimatedValue)?.toString() ?? null,
      expectedValue:
        parseOptionalNumeric(input.expectedValue)?.toString() ?? null,
      wonValue: parseOptionalNumeric(input.wonValue)?.toString() ?? null,
      closeProbability: input.closeProbability ?? null,
      expectedCloseDate: input.expectedCloseDate
        ? new Date(input.expectedCloseDate)
        : null,
      wonAt: input.wonAt ? new Date(input.wonAt) : null,
      lostAt: input.lostAt ? new Date(input.lostAt) : null,
      lostReason: normalizeText(input.lostReason),
      nextFollowUpAt: input.nextFollowUpAt
        ? new Date(input.nextFollowUpAt)
        : null,
      firstName: normalizeText(input.firstName) ?? "",
      lastName: normalizeText(input.lastName) ?? "",
      email: normalizeText(input.email) ?? "",
      whatsappNumber: normalizeText(input.whatsappNumber) ?? "",
      callNumber: normalizeText(input.callNumber) ?? "",
      state: region,
      country: normalizeText(input.country),
      region,
      city: normalizeText(input.city),
      address: normalizeText(input.address),
      postalCode: normalizeText(input.postalCode),
      externalLeadId: normalizeText(input.externalLeadId),
      externalFormId: normalizeText(input.externalFormId),
      facebookLeadgenId: normalizeText(input.facebookLeadgenId),
      facebookFormId: normalizeText(input.facebookFormId),
      facebookPageId: normalizeText(input.facebookPageId),
      facebookCampaignId: normalizeText(input.facebookCampaignId),
      facebookAdId: normalizeText(input.facebookAdId),
      facebookAdsetId: normalizeText(input.facebookAdsetId),
      googleClickId: normalizeText(input.googleClickId),
      googleCampaignId: normalizeText(input.googleCampaignId),
      googleAdGroupId: normalizeText(input.googleAdGroupId),
      googleAdId: normalizeText(input.googleAdId),
      utmSource: normalizeText(input.utmSource),
      utmMedium: normalizeText(input.utmMedium),
      utmCampaign: normalizeText(input.utmCampaign),
      utmContent: normalizeText(input.utmContent),
      utmTerm: normalizeText(input.utmTerm),
      landingPage: normalizeText(input.landingPage),
      sourcePayload: input.sourcePayload ?? null,
      deletedAt: null,
      deletedBy: null,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    })
    .returning();

  return mapLeadRecord(created);
}
