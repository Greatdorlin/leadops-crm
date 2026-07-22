import type { CrmUserRecord, LeadEventRecord, LeadNoteRecord, LeadRecord, LeadTaskRecord } from "@/lib/crm/types";
import type { TeamPerformanceRow } from "@/lib/admin-insights";
import type { AdminFormSourceRecord } from "@/lib/crm/form-sources-admin";
import type { IntakeEventAdminRow } from "@/lib/crm/intake-runtime";
import type { FormFieldRow, FormRow } from "@/lib/db/schema";

export type DemoFormRecord = FormRow & { fieldCount: number; submissionCount: number };

export function buildDemoForms(): DemoFormRecord[] {
  const createdAt = new Date("2026-05-14T09:00:00.000Z");
  const updatedAt = new Date("2026-07-12T08:30:00.000Z");
  const shared = {
    workspaceId: "demo-workspace", status: "active", isActive: true, isPublic: true,
    successMessage: "Thank you. A member of our team will contact you shortly.", submitButtonLabel: "Send enquiry", redirectUrl: null,
    primaryColor: "#4f8cff", accentColor: "#5eead4", logoUrl: null,
    defaultStatus: "new", defaultPriority: "high", defaultSource: "website_form", defaultOwnerId: null,
    createdAt, updatedAt,
  };
  return [
    { ...shared, id: "demo-form-consultation", name: "Executive consultation", slug: "executive-consultation", description: "Qualifies high-intent enquiries and routes them to the right advisor.", enableAutoQualify: true, autoQualifyRules: [{ field: "budget", operator: "gte", value: 500000 }], fieldCount: 8, submissionCount: 184 },
    { ...shared, id: "demo-form-product-fit", name: "Product fit assessment", slug: "product-fit", description: "Captures product interest, budget, timeline, and qualification signals.", enableAutoQualify: true, autoQualifyRules: [{ field: "timeline", operator: "in", value: ["now", "30_days"] }], fieldCount: 11, submissionCount: 129 },
    { ...shared, id: "demo-form-partner-referral", name: "Partner referral", slug: "partner-referral", description: "Gives approved partners a clean path to submit and track referrals.", enableAutoQualify: false, autoQualifyRules: null, defaultPriority: "medium", defaultSource: "referral", fieldCount: 7, submissionCount: 76 },
  ];
}

export function buildDemoPublicForm(slug: string) {
  const form = buildDemoForms().find((item) => item.slug === slug);
  if (!form) return null;

  const createdAt = form.createdAt;
  const updatedAt = form.updatedAt;
  const field = (
    id: string,
    order: number,
    input: Pick<FormFieldRow, "fieldType" | "label"> & Partial<FormFieldRow>,
  ): FormFieldRow => ({
    id,
    formId: form.id,
    fieldType: input.fieldType,
    label: input.label,
    placeholder: input.placeholder ?? null,
    helpText: input.helpText ?? null,
    isRequired: input.isRequired ?? false,
    isVisible: true,
    order,
    options: input.options ?? null,
    validationRules: input.validationRules ?? null,
    mapsToLeadField: input.mapsToLeadField ?? null,
    showWhen: input.showWhen ?? null,
    defaultValue: input.defaultValue ?? null,
    createdAt,
    updatedAt,
  });

  const fields = [
    field("demo-field-first-name", 0, { fieldType: "text", label: "First name", placeholder: "Ada", isRequired: true, mapsToLeadField: "firstName" }),
    field("demo-field-last-name", 1, { fieldType: "text", label: "Last name", placeholder: "Okafor", isRequired: true, mapsToLeadField: "lastName" }),
    field("demo-field-email", 2, { fieldType: "email", label: "Work email", placeholder: "ada@company.com", isRequired: true, mapsToLeadField: "email" }),
    field("demo-field-phone", 3, { fieldType: "phone", label: "Phone", placeholder: "+234 801 234 5678", mapsToLeadField: "phone" }),
    field("demo-field-company", 4, { fieldType: "text", label: "Company", placeholder: "Northwind Ventures", mapsToLeadField: "companyName" }),
    field("demo-field-interest", 5, {
      fieldType: "select",
      label: "What would you like help with?",
      isRequired: true,
      options: [
        { label: "Sales operations", value: "sales_operations" },
        { label: "Lead generation", value: "lead_generation" },
        { label: "Reporting and automation", value: "reporting_automation" },
      ],
    }),
    field("demo-field-timeline", 6, {
      fieldType: "radio",
      label: "When would you like to start?",
      isRequired: true,
      options: [
        { label: "As soon as possible", value: "now" },
        { label: "Within 30 days", value: "30_days" },
        { label: "Still exploring", value: "exploring" },
      ],
    }),
    field("demo-field-notes", 7, { fieldType: "textarea", label: "What should we know?", placeholder: "Share the outcome you want to achieve." }),
  ];

  return { form, fields };
}

export function buildDemoTeamPerformance(): TeamPerformanceRow[] {
  return [
    { id: "demo-user-ada", email: "ada@auroragrowth.demo", fullName: "Ada Okafor", avatarUrl: null, role: "sales_agent", accessLevel: "sales_rep", assignedLeads: 18, openTasks: 7, overdueTasks: 1, dueTodayTasks: 3, completedTasks: 42, contactedLeads: 14, qualifiedLeads: 9, convertedLeads: 4, highPriorityLeads: 5, lastActivityAt: "2026-07-12T09:24:00.000Z" },
    { id: "demo-user-malik", email: "malik@auroragrowth.demo", fullName: "Malik Bello", avatarUrl: null, role: "sales_agent", accessLevel: "sales_rep", assignedLeads: 15, openTasks: 5, overdueTasks: 0, dueTodayTasks: 2, completedTasks: 38, contactedLeads: 12, qualifiedLeads: 7, convertedLeads: 3, highPriorityLeads: 4, lastActivityAt: "2026-07-12T09:18:00.000Z" },
    { id: "demo-user-zara", email: "zara@auroragrowth.demo", fullName: "Zara Mensah", avatarUrl: null, role: "manager", accessLevel: "lead_sales_rep", assignedLeads: 12, openTasks: 4, overdueTasks: 1, dueTodayTasks: 1, completedTasks: 31, contactedLeads: 10, qualifiedLeads: 6, convertedLeads: 3, highPriorityLeads: 2, lastActivityAt: "2026-07-12T08:56:00.000Z" },
    { id: "demo-user-daniel", email: "daniel@auroragrowth.demo", fullName: "Daniel Reed", avatarUrl: null, role: "sales_agent", accessLevel: "sales_rep", assignedLeads: 11, openTasks: 3, overdueTasks: 0, dueTodayTasks: 1, completedTasks: 29, contactedLeads: 8, qualifiedLeads: 5, convertedLeads: 2, highPriorityLeads: 3, lastActivityAt: "2026-07-12T08:42:00.000Z" },
  ];
}

export function buildDemoIntakeData(): { sources: AdminFormSourceRecord[]; events: IntakeEventAdminRow[] } {
  const baseSource = { sourceId: null, webhookKey: null, isActive: true, defaultStageId: null, defaultAssignedUserId: null, defaultTeamId: null, defaultBranchId: null, defaultDepartmentId: null, defaultPriority: "high" as const, createdAt: "2026-05-14T09:00:00.000Z", updatedAt: "2026-07-12T08:30:00.000Z", mappings: [] };
  const sources: AdminFormSourceRecord[] = [
    { ...baseSource, id: "demo-source-web", name: "Website consultation form", type: "website" },
    { ...baseSource, id: "demo-source-meta", name: "Meta lead campaign", type: "ads" },
    { ...baseSource, id: "demo-source-partner", name: "Partner referral webhook", type: "webhook", defaultPriority: "normal" },
  ];
  const events: IntakeEventAdminRow[] = [
    { id: "demo-intake-1", status: "lead_created", sourceName: sources[0].name, leadId: "demo-lead-aurelia", leadName: "Aurelia Hart", errorMessage: null, normalizedSummary: [{ label: "Company", value: "Aurelia Studio" }, { label: "Interest", value: "Growth advisory" }, { label: "Budget", value: "NGN 3,200,000" }], rawPayload: null, createdAt: "2026-07-12T09:22:00.000Z" },
    { id: "demo-intake-2", status: "lead_created", sourceName: sources[1].name, leadId: "demo-lead-vertex", leadName: "Ibrahim Musa", errorMessage: null, normalizedSummary: [{ label: "Campaign", value: "Q3 Scale Programme" }, { label: "Company", value: "Vertex Logistics" }, { label: "Team size", value: "45" }], rawPayload: null, createdAt: "2026-07-12T08:48:00.000Z" },
    { id: "demo-intake-3", status: "mapped", sourceName: sources[2].name, leadId: null, leadName: "Nadia Cole", errorMessage: null, normalizedSummary: [{ label: "Partner", value: "Northstar Advisory" }, { label: "Interest", value: "Sales enablement" }], rawPayload: null, createdAt: "2026-07-12T08:16:00.000Z" },
    { id: "demo-intake-4", status: "lead_created", sourceName: sources[0].name, leadId: "demo-lead-northwind", leadName: "Grace Mensah", errorMessage: null, normalizedSummary: [{ label: "Company", value: "Northwind Health" }, { label: "Timeline", value: "Within 30 days" }], rawPayload: null, createdAt: "2026-07-11T16:05:00.000Z" },
  ];
  return { sources, events };
}

const DEMO_LEADS = {
  "demo-lead-aurelia": { firstName: "Aurelia", lastName: "Systems", companyName: "Aurelia Systems", email: "hello@aurelia.example", city: "Austin", country: "United States", source: "website_form", status: "qualified", priority: "high", owner: "sarah.kim@local.leadsdesk.test", value: 280000 },
  "demo-lead-vertex": { firstName: "Michael", lastName: "Anderson", companyName: "Vertex Labs", email: "michael@vertexlabs.example", city: "San Francisco", country: "United States", source: "referral", status: "contacted", priority: "medium", owner: "james.lee@local.leadsdesk.test", value: 125000 },
  "demo-lead-northwind": { firstName: "Northwind", lastName: "Co.", companyName: "Northwind Co.", email: "ops@northwind.example", city: "London", country: "United Kingdom", source: "google_ads", status: "consultation_booked", priority: "urgent", owner: "priya.shah@local.leadsdesk.test", value: 420000 },
} as const;

export function buildDemoLeadDetail(id: string) {
  const input = DEMO_LEADS[id as keyof typeof DEMO_LEADS] ?? DEMO_LEADS["demo-lead-aurelia"];
  const now = new Date();
  const createdAt = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString();
  const followUpAt = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const lead = {
    id,
    createdAt,
    updatedAt: now.toISOString(),
    lastActivityAt: now.toISOString(),
    deletedAt: null,
    deletedBy: null,
    crmStatus: input.status,
    source: input.source,
    sourceDetail: "Buyer demo campaign",
    priority: input.priority,
    assignedTo: input.owner,
    assignedToList: [input.owner],
    leadCustomerType: "business",
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    whatsappNumber: "+1 555 019 2201",
    state: input.city,
    country: input.country,
    region: input.city,
    city: input.city,
    address: null,
    postalCode: null,
    companyName: input.companyName,
    sourceId: null,
    stageId: `demo-stage-${input.status}`,
    campaignId: "demo-growth-2026",
    campaignLabel: "Executive growth campaign",
    assignedUserId: null,
    teamId: null,
    branchId: null,
    departmentId: null,
    estimatedValue: input.value,
    expectedValue: Math.round(input.value * 0.68),
    wonValue: null,
    closeProbability: 68,
    expectedCloseDate: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    wonAt: null,
    lostAt: null,
    lostReason: null,
    nextFollowUpAt: followUpAt,
    archivedAt: null,
    externalLeadId: null,
    externalFormId: null,
    facebookLeadgenId: null,
    facebookFormId: null,
    facebookPageId: null,
    facebookCampaignId: null,
    facebookAdId: null,
    facebookAdsetId: null,
    googleClickId: null,
    googleCampaignId: null,
    googleAdGroupId: null,
    googleAdId: null,
    utmSource: "demo",
    utmMedium: "campaign",
    utmCampaign: "executive-growth",
    utmContent: null,
    utmTerm: null,
    landingPage: "https://example.com/executive-growth",
    sourcePayload: null,
    sync: {
      googleSheets: { status: "skipped", message: "Demo record" },
      sender: { status: "success", message: "Contact synced" },
    },
  } as LeadRecord;

  const users = [
    { id: "demo-user-sarah", email: "sarah.kim@local.leadsdesk.test", fullName: "Sarah Kim", role: "sales_agent", isActive: true, avatarUrl: null, accessScope: "own", branchId: null, departmentId: null, teamId: null, createdAt, updatedAt: now.toISOString() },
    { id: "demo-user-james", email: "james.lee@local.leadsdesk.test", fullName: "James Lee", role: "sales_agent", isActive: true, avatarUrl: null, accessScope: "own", branchId: null, departmentId: null, teamId: null, createdAt, updatedAt: now.toISOString() },
    { id: "demo-user-priya", email: "priya.shah@local.leadsdesk.test", fullName: "Priya Shah", role: "sales_agent", isActive: true, avatarUrl: null, accessScope: "own", branchId: null, departmentId: null, teamId: null, createdAt, updatedAt: now.toISOString() },
  ] as CrmUserRecord[];
  const notes = [
    { id: "demo-note-1", leadId: id, note: "Decision team confirmed. Send the implementation outline before the next call.", createdBy: input.owner, createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString() },
  ] as LeadNoteRecord[];
  const tasks = [
    { id: "demo-task-detail-1", leadId: id, title: "Confirm proposal scope", description: "Review timeline, stakeholders, and next commercial step.", dueAt: followUpAt, completedAt: null, assignedTo: input.owner, createdBy: "owner@local.leadsdesk.test", createdAt },
  ] as LeadTaskRecord[];
  const events = [
    { id: "demo-event-1", leadId: id, eventType: "lead_created", eventData: { source: input.source }, createdBy: null, createdAt },
    { id: "demo-event-2", leadId: id, eventType: "lead_assigned", eventData: { assignedTo: input.owner }, createdBy: "owner@local.leadsdesk.test", createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() },
    { id: "demo-event-3", leadId: id, eventType: "status_changed", eventData: { status: input.status }, createdBy: input.owner, createdAt: now.toISOString() },
  ] as LeadEventRecord[];

  return { lead, users, notes, tasks, events, duplicateCandidates: [] as LeadRecord[] };
}
