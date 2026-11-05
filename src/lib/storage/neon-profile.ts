import { eq } from "drizzle-orm";
import { normalizeText } from "@/lib/crm/value-normalization";
import { leadEventTypes } from "@/lib/crm/lead-events";
import type { DatabaseExecutor } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";
import { buildLeadAuditChanges } from "@/lib/crm/lead-audit-events";
import type { LeadProfileUpdateInput, LeadStorage } from "./types";
import { parseOptionalNumeric, normalizeLeadRegion } from './values';
import { mapLeadRecord } from './mappers';

export async function updateLeadProfile(this: LeadStorage, getDatabase: () => DatabaseExecutor, id: string, input: LeadProfileUpdateInput, changedBy?: string | null) {
    const db = getDatabase();
    const existing = await db.query.leads.findFirst({
      where: eq(leads.id, id),
    });

    if (!existing) {
      return null;
    }

    const nextFirstName =
      input.firstName === undefined ? existing.firstName : input.firstName.trim();
    const nextLastName =
      input.lastName === undefined ? existing.lastName : normalizeText(input.lastName) ?? "";
    const nextEmail = input.email === undefined ? existing.email : normalizeText(input.email) ?? "";
    const nextWhatsappNumber =
      input.whatsappNumber === undefined
        ? existing.whatsappNumber
        : normalizeText(input.whatsappNumber) ?? "";
    const nextCallNumber =
      input.callNumber === undefined
        ? existing.callNumber
        : normalizeText(input.callNumber) ?? "";
    const nextState =
      input.state === undefined && input.region === undefined
        ? existing.state
        : normalizeLeadRegion(input.region ?? input.state) ?? null;
    const nextCountry =
      input.country === undefined ? existing.country : normalizeText(input.country) ?? null;
    const nextRegion =
      input.region === undefined ? existing.region : normalizeLeadRegion(input.region) ?? null;
    const nextCity = input.city === undefined ? existing.city : normalizeText(input.city) ?? null;
    const nextAddress =
      input.address === undefined ? existing.address : normalizeText(input.address) ?? null;
    const nextPostalCode =
      input.postalCode === undefined ? existing.postalCode : normalizeText(input.postalCode) ?? null;
    const nextCompanyName =
      input.companyName === undefined ? existing.companyName : normalizeText(input.companyName) ?? null;
    const nextLeadCustomerType =
      input.leadCustomerType === undefined
        ? existing.leadCustomerType
        : input.leadCustomerType ?? "direct";
    const nextCampaignId =
      input.campaignId === undefined ? existing.campaignId : normalizeText(input.campaignId) ?? null;
    const nextCampaignLabel =
      input.campaignLabel === undefined
        ? existing.campaignLabel
        : normalizeText(input.campaignLabel) ?? null;
    const nextAssignedUserId =
      input.assignedUserId === undefined ? existing.assignedUserId : input.assignedUserId ?? null;
    const nextTeamId = input.teamId === undefined ? existing.teamId : input.teamId ?? null;
    const nextBranchId = input.branchId === undefined ? existing.branchId : input.branchId ?? null;
    const nextDepartmentId =
      input.departmentId === undefined ? existing.departmentId : input.departmentId ?? null;
    const nextEstimatedValue =
      input.estimatedValue === undefined
        ? existing.estimatedValue
        : parseOptionalNumeric(input.estimatedValue)?.toString() ?? null;
    const nextExpectedValue =
      input.expectedValue === undefined
        ? existing.expectedValue
        : parseOptionalNumeric(input.expectedValue)?.toString() ?? null;
    const nextWonValue =
      input.wonValue === undefined
        ? existing.wonValue
        : parseOptionalNumeric(input.wonValue)?.toString() ?? null;
    const nextCloseProbability =
      input.closeProbability === undefined ? existing.closeProbability : input.closeProbability ?? null;
    const nextExpectedCloseDate =
      input.expectedCloseDate === undefined
        ? existing.expectedCloseDate
        : input.expectedCloseDate
          ? new Date(input.expectedCloseDate)
          : null;
    const nextWonAt =
      input.wonAt === undefined ? existing.wonAt : input.wonAt ? new Date(input.wonAt) : null;
    const nextLostAt =
      input.lostAt === undefined ? existing.lostAt : input.lostAt ? new Date(input.lostAt) : null;
    const nextLostReason =
      input.lostReason === undefined ? existing.lostReason : normalizeText(input.lostReason) ?? null;
    const nextFollowUpAt =
      input.nextFollowUpAt === undefined
        ? existing.nextFollowUpAt
        : input.nextFollowUpAt
          ? new Date(input.nextFollowUpAt)
          : null;

    const changes = buildLeadAuditChanges([
      { field: "firstName", label: "First name", before: existing.firstName, after: nextFirstName },
      { field: "lastName", label: "Last name", before: existing.lastName, after: nextLastName },
      { field: "email", label: "Email", before: existing.email, after: nextEmail },
      { field: "whatsappNumber", label: "WhatsApp number", before: existing.whatsappNumber, after: nextWhatsappNumber },
      { field: "callNumber", label: "Call number", before: existing.callNumber, after: nextCallNumber },
      { field: "state", label: "State", before: existing.state, after: nextState },
      { field: "country", label: "Country", before: existing.country, after: nextCountry },
      { field: "region", label: "Region", before: existing.region, after: nextRegion },
      { field: "city", label: "City", before: existing.city, after: nextCity },
      { field: "address", label: "Address", before: existing.address, after: nextAddress },
      { field: "postalCode", label: "Postal code", before: existing.postalCode, after: nextPostalCode },
      { field: "companyName", label: "Company", before: existing.companyName, after: nextCompanyName },
      { field: "leadCustomerType", label: "Customer type", before: existing.leadCustomerType, after: nextLeadCustomerType },
      { field: "campaignId", label: "Campaign ID", before: existing.campaignId, after: nextCampaignId },
      { field: "campaignLabel", label: "Campaign", before: existing.campaignLabel, after: nextCampaignLabel },
      { field: "assignedUserId", label: "Assigned user ID", before: existing.assignedUserId, after: nextAssignedUserId },
      { field: "teamId", label: "Team ID", before: existing.teamId, after: nextTeamId },
      { field: "branchId", label: "Branch ID", before: existing.branchId, after: nextBranchId },
      { field: "departmentId", label: "Department ID", before: existing.departmentId, after: nextDepartmentId },
      { field: "estimatedValue", label: "Estimated value", before: existing.estimatedValue, after: nextEstimatedValue },
      { field: "expectedValue", label: "Expected value", before: existing.expectedValue, after: nextExpectedValue },
      { field: "wonValue", label: "Won value", before: existing.wonValue, after: nextWonValue },
      { field: "closeProbability", label: "Close probability", before: existing.closeProbability, after: nextCloseProbability },
      { field: "expectedCloseDate", label: "Expected close date", before: existing.expectedCloseDate, after: nextExpectedCloseDate },
      { field: "wonAt", label: "Won at", before: existing.wonAt, after: nextWonAt },
      { field: "lostAt", label: "Lost at", before: existing.lostAt, after: nextLostAt },
      { field: "lostReason", label: "Lost reason", before: existing.lostReason, after: nextLostReason },
      { field: "nextFollowUpAt", label: "Next follow-up", before: existing.nextFollowUpAt, after: nextFollowUpAt },
    ]);

    if (changes.length === 0) {
      return mapLeadRecord(existing);
    }

    const [updated] = await db
      .update(leads)
      .set({
        firstName: nextFirstName,
        lastName: nextLastName,
        email: nextEmail,
        whatsappNumber: nextWhatsappNumber,
        callNumber: nextCallNumber,
        state: nextState,
        country: nextCountry,
        region: nextRegion,
        city: nextCity,
        address: nextAddress,
        postalCode: nextPostalCode,
        companyName: nextCompanyName,
        leadCustomerType: nextLeadCustomerType,
        campaignId: nextCampaignId,
        campaignLabel: nextCampaignLabel,
        assignedUserId: nextAssignedUserId,
        teamId: nextTeamId,
        branchId: nextBranchId,
        departmentId: nextDepartmentId,
        estimatedValue: nextEstimatedValue,
        expectedValue: nextExpectedValue,
        wonValue: nextWonValue,
        closeProbability: nextCloseProbability,
        expectedCloseDate: nextExpectedCloseDate,
        wonAt: nextWonAt,
        lostAt: nextLostAt,
        lostReason: nextLostReason,
        nextFollowUpAt: nextFollowUpAt,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    const lifecycleChanges = changes.filter((change) =>
      change.field === "wonAt" || change.field === "lostAt" || change.field === "lostReason",
    );
    const profileChanges = changes.filter((change) => !lifecycleChanges.includes(change));
    if (profileChanges.length > 0) {
      await this.addLeadEvent({
        leadId: id,
        eventType: leadEventTypes.leadProfileUpdated,
        eventData: {
          changedFields: profileChanges.map((change) => change.field),
          changes: profileChanges,
        },
        createdBy: changedBy ?? null,
      });
    }

    if (lifecycleChanges.length > 0) {
      await this.addLeadEvent({
        leadId: id,
        eventType: leadEventTypes.leadLifecycleChanged,
        eventData: { changes: lifecycleChanges },
        createdBy: changedBy ?? null,
      });
    }

    return updated ? mapLeadRecord(updated) : null;
  }
