import { and, eq, inArray, sql } from "drizzle-orm";
import { listCustomFields, upsertCustomFieldOptions } from "@/lib/crm/custom-fields-admin";
import { validateCustomFieldValues } from "@/lib/crm/custom-field-values";
import { upsertLeadCustomFieldValues } from "@/lib/crm/custom-field-values-store";
import {
  createFormSource,
  listFormSources,
  updateFormSource,
  type AdminFormFieldMappingInput,
} from "@/lib/crm/form-sources-admin";
import { processWebhookIntake } from "@/lib/crm/intake-runtime";
import { createNotificationEvent } from "@/lib/crm/notification-events";
import {
  resolveCrmUserIdByEmail,
  resolveLeadSourceIdByLegacySource,
  resolveLeadStageIdByLegacyStatus,
  updateLeadSalesCommandFields,
} from "@/lib/crm/sales-command";
import { createSalesTarget, listSalesTargets, updateSalesTarget } from "@/lib/crm/sales-targets-admin";
import { getDb } from "@/lib/db/client";
import { seedLeadsDeskDefaults } from "@/lib/db/seed-defaults";
import {
  branches,
  companySettings,
  customFields,
  departments,
  formFieldMappings,
  leadIntakeEvents,
  notificationEvents,
  teams,
} from "@/lib/db/schema";
import { leadStore } from "@/lib/storage";
import type { CrmStatus, LeadPriority, LeadSource } from "@/lib/crm/types";

export interface LeadsDeskDemoSeedResult {
  usersSeeded: number;
  leadsPrepared: number;
  webhookLeadsCreated: number;
  failedIntakeEventsLogged: number;
  notificationsCreated: number;
  salesTargetsPrepared: number;
  formSourcesPrepared: number;
}

interface DemoUserSeed {
  email: string;
  fullName: string;
  role: "admin" | "manager" | "consultant" | "sales_agent" | "finance";
}

interface DemoLeadSeed {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  state: string;
  source: LeadSource;
  stageKey: CrmStatus;
  priority: LeadPriority;
  assignedTo: string;
  companyName: string;
  sourceId: string | null;
  stageId: string | null;
  estimatedValue: number | null;
  closeProbability: number | null;
  expectedCloseDate: string | null;
  nextFollowUpAt: string | null;
  wonValue?: number | null;
  wonAt?: string | null;
  lostAt?: string | null;
  lostReason?: string | null;
  campaignLabel?: string | null;
  customFieldValues: Record<string, unknown>;
  notes: string[];
  tasks: Array<{
    title: string;
    description?: string | null;
    dueAt?: string | null;
    complete?: boolean;
  }>;
}

const DEMO_USERS: DemoUserSeed[] = [
  { email: "preview@local.leadsdesk.test", fullName: "Local Preview", role: "admin" },
  { email: "owner@example.com", fullName: "Owner Admin", role: "admin" },
  { email: "manager@example.com", fullName: "Sales Manager", role: "manager" },
  { email: "lead@example.com", fullName: "Team Lead", role: "consultant" },
  { email: "rep@example.com", fullName: "Sales Rep", role: "sales_agent" },
];

const URGENCY_OPTIONS = [
  { label: "Low", value: "low", sortOrder: 0 },
  { label: "Normal", value: "normal", sortOrder: 1 },
  { label: "High", value: "high", sortOrder: 2 },
  { label: "Urgent", value: "urgent", sortOrder: 3 },
] as const;

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function endOfCurrentMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
}

function isoOffsetFromNow(days: number, hours = 9) {
  const next = new Date();
  next.setUTCDate(next.getUTCDate() + days);
  next.setUTCHours(hours, 0, 0, 0);
  return next.toISOString();
}

async function ensureBranch(name: string, location: string, managerUserId: string | null) {
  const db = getDb();
  const [existing] = await db.select().from(branches).where(eq(branches.name, name)).limit(1);
  if (existing) {
    await db
      .update(branches)
      .set({
        location,
        managerUserId,
        archived: false,
        updatedAt: new Date(),
      })
      .where(eq(branches.id, existing.id));
    return existing.id;
  }

  const [created] = await db
    .insert(branches)
    .values({
      name,
      location,
      managerUserId,
      archived: false,
    })
    .returning({ id: branches.id });

  return created.id;
}

async function ensureDepartment(name: string, managerUserId: string | null) {
  const db = getDb();
  const [existing] = await db.select().from(departments).where(eq(departments.name, name)).limit(1);
  if (existing) {
    await db
      .update(departments)
      .set({
        managerUserId,
        archived: false,
        updatedAt: new Date(),
      })
      .where(eq(departments.id, existing.id));
    return existing.id;
  }

  const [created] = await db
    .insert(departments)
    .values({
      name,
      managerUserId,
      archived: false,
    })
    .returning({ id: departments.id });

  return created.id;
}

async function ensureTeam(
  name: string,
  managerUserId: string | null,
  branchId: string | null,
  departmentId: string | null,
) {
  const db = getDb();
  const [existing] = await db.select().from(teams).where(eq(teams.name, name)).limit(1);
  if (existing) {
    await db
      .update(teams)
      .set({
        managerUserId,
        branchId,
        departmentId,
        archived: false,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, existing.id));
    return existing.id;
  }

  const [created] = await db
    .insert(teams)
    .values({
      name,
      managerUserId,
      branchId,
      departmentId,
      archived: false,
    })
    .returning({ id: teams.id });

  return created.id;
}

async function ensureUrgencyFieldOptions() {
  const fields = await listCustomFields({ includeArchived: true });
  const urgencyField = fields.find((field) => field.key === "urgency");

  if (!urgencyField) {
    return;
  }

  await upsertCustomFieldOptions(urgencyField.id, URGENCY_OPTIONS.map((option) => ({ ...option })));

  const db = getDb();
  await db
    .update(customFields)
    .set({
      showInTable: true,
      showInForm: true,
      showInDetails: true,
      filterable: true,
      updatedAt: new Date(),
    })
    .where(eq(customFields.id, urgencyField.id));
}

async function ensureDemoFieldVisibility() {
  const db = getDb();
  await db
    .update(customFields)
    .set({
      showInTable: true,
      showInForm: true,
      showInDetails: true,
      updatedAt: new Date(),
    })
    .where(inArray(customFields.key, ["budget", "interest", "urgency", "location"]));
}

async function ensureDemoAppearance() {
  const db = getDb();
  const demoAppearance = {
    companyName: "Leads Desk",
    primaryColor: "#5b7cfa",
    accentColor: "#8b5cf6",
    backgroundColor: "#060814",
    surfaceColor: "#10172a",
    cardColor: "#111827",
    sidebarColor: "#06111f",
    textColor: "#ffffff",
    borderColor: "#263452",
    borderRadius: 24,
    fontScale: "1.00",
    fontPreset: "brand",
    density: "comfortable",
    themeMode: "dark",
    designStyle: "liquid_glass",
    glassEnabled: true,
    glassOpacity: 52,
    glassBlur: 24,
    loginBackgroundUrl: "/backgrounds/bg-butterfly-glass.png",
    loginHeadline: "Welcome back",
    loginSubheadline: "Manage leads, follow-ups, and sales performance in one private workspace.",
    updatedAt: new Date(),
  };

  try {
    const [existing] = await db.select({ id: companySettings.id }).from(companySettings).limit(1);

    if (existing) {
      await db.update(companySettings).set(demoAppearance).where(eq(companySettings.id, existing.id));
      return;
    }

    await db.insert(companySettings).values(demoAppearance);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("company_settings")) {
      return;
    }

    throw error;
  }
}

async function ensureNotificationRecord(input: {
  type:
    | "new_lead_assigned"
    | "webhook_lead_captured"
    | "follow_up_due"
    | "follow_up_overdue"
    | "target_milestone_reached";
  recipientUserId?: string | null;
  leadId?: string | null;
  title: string;
  message: string;
}) {
  const db = getDb();
  const where = [
    eq(notificationEvents.type, input.type),
    eq(notificationEvents.title, input.title),
    eq(notificationEvents.message, input.message),
    input.recipientUserId
      ? eq(notificationEvents.recipientUserId, input.recipientUserId)
      : sql`${notificationEvents.recipientUserId} is null`,
    input.leadId ? eq(notificationEvents.leadId, input.leadId) : sql`${notificationEvents.leadId} is null`,
  ];

  const [existing] = await db
    .select({ id: notificationEvents.id })
    .from(notificationEvents)
    .where(and(...where))
    .limit(1);

  if (existing) {
    return false;
  }

  await createNotificationEvent({
    type: input.type,
    recipientUserId: input.recipientUserId ?? null,
    leadId: input.leadId ?? null,
    title: input.title,
    message: input.message,
  });
  return true;
}

async function ensureLeadNote(leadId: string, note: string) {
  const existing = await leadStore.listLeadNotes(leadId);
  if (existing.some((item) => item.note.trim() === note.trim())) {
    return false;
  }

  await leadStore.addLeadNote({
    leadId,
    note,
    createdBy: "demo-seed",
  });
  return true;
}

async function ensureLeadTask(
  leadId: string,
  task: { title: string; description?: string | null; dueAt?: string | null; complete?: boolean },
) {
  const existing = await leadStore.listLeadTasks({ leadId });
  const matched = existing.find((item) => item.title.trim() === task.title.trim());

  if (!matched) {
    const created = await leadStore.addLeadTask({
      leadId,
      title: task.title,
      description: task.description ?? null,
      dueAt: task.dueAt ?? null,
      createdBy: "demo-seed",
      assignedTo: null,
    });

    if (task.complete) {
      await leadStore.completeLeadTask(created.id, "demo-seed");
    }

    return true;
  }

  if (task.complete && !matched.completedAt) {
    await leadStore.completeLeadTask(matched.id, "demo-seed");
    return true;
  }

  return false;
}

async function ensureLeadEvent(leadId: string, eventType: string, eventData?: Record<string, unknown>) {
  const existing = await leadStore.listLeadEvents(leadId);
  if (existing.some((item) => item.eventType === eventType)) {
    return false;
  }

  await leadStore.addLeadEvent({
    leadId,
    eventType,
    eventData: eventData ?? null,
    createdBy: "demo-seed",
  });
  return true;
}

async function ensureDemoFormSource(input: {
  defaultAssignedUserId: string | null;
  defaultStageId: string | null;
  defaultTeamId: string | null;
  defaultBranchId: string | null;
  defaultDepartmentId: string | null;
}) {
  const existingSources = await listFormSources({
    includeInactive: true,
    includeMappings: true,
  });
  const existing = existingSources.find(
    (source) => source.webhookKey === "demo_main_website" || source.name === "Main Website Form",
  );

  const payload = {
    name: "Main Website Form",
    type: "website" as const,
    sourceId: "website",
    webhookKey: "demo_main_website",
    isActive: true,
    defaultStageId: input.defaultStageId,
    defaultAssignedUserId: input.defaultAssignedUserId,
    defaultTeamId: input.defaultTeamId,
    defaultBranchId: input.defaultBranchId,
    defaultDepartmentId: input.defaultDepartmentId,
    defaultPriority: "high" as const,
  };

  if (!existing) {
    return createFormSource(payload);
  }

  return updateFormSource(existing.id, payload);
}

async function ensureDemoFormMappings(
  formSourceId: string,
  customFieldIdsByKey: Record<string, string>,
) {
  const db = getDb();
  const mappings: AdminFormFieldMappingInput[] = [
    {
      externalFieldName: "full_name",
      externalFieldLabel: "Full Name",
      targetType: "core",
      targetField: "name",
      required: true,
    },
    {
      externalFieldName: "email",
      externalFieldLabel: "Email",
      targetType: "core",
      targetField: "email",
      required: false,
    },
    {
      externalFieldName: "phone",
      externalFieldLabel: "Phone",
      targetType: "core",
      targetField: "phone",
      required: false,
    },
    {
      externalFieldName: "company_name",
      externalFieldLabel: "Company Name",
      targetType: "core",
      targetField: "companyName",
    },
    {
      externalFieldName: "campaign",
      externalFieldLabel: "Campaign",
      targetType: "core",
      targetField: "campaignLabel",
    },
    {
      externalFieldName: "estimated_value",
      externalFieldLabel: "Estimated Value",
      targetType: "core",
      targetField: "estimatedValue",
    },
    {
      externalFieldName: "notes",
      externalFieldLabel: "Notes",
      targetType: "core",
      targetField: "notes",
    },
    {
      externalFieldName: "budget",
      externalFieldLabel: "Budget",
      targetType: "custom",
      customFieldId: customFieldIdsByKey.budget,
    },
    {
      externalFieldName: "interest",
      externalFieldLabel: "Interest",
      targetType: "custom",
      customFieldId: customFieldIdsByKey.interest,
    },
    {
      externalFieldName: "location",
      externalFieldLabel: "Location",
      targetType: "custom",
      customFieldId: customFieldIdsByKey.location,
    },
    {
      externalFieldName: "urgency",
      externalFieldLabel: "Urgency",
      targetType: "custom",
      customFieldId: customFieldIdsByKey.urgency,
      required: true,
      fallbackValue: "high",
    },
  ];

  const nextMappings = mappings.filter(
    (mapping) => mapping.targetType === "core" || Boolean(mapping.customFieldId),
  );
  const existingRows = await db
    .select({ id: formFieldMappings.id, externalFieldName: formFieldMappings.externalFieldName })
    .from(formFieldMappings)
    .where(eq(formFieldMappings.formSourceId, formSourceId));
  const existingByField = new Map(
    existingRows.map((row) => [row.externalFieldName.trim().toLowerCase(), row.id]),
  );
  const nextFieldNames = new Set(
    nextMappings.map((mapping) => mapping.externalFieldName.trim().toLowerCase()),
  );

  for (const row of existingRows) {
    if (!nextFieldNames.has(row.externalFieldName.trim().toLowerCase())) {
      await db.delete(formFieldMappings).where(eq(formFieldMappings.id, row.id));
    }
  }

  for (const mapping of nextMappings) {
    const existingId = existingByField.get(mapping.externalFieldName.trim().toLowerCase());
    const values = {
      formSourceId,
      externalFieldName: mapping.externalFieldName.trim(),
      externalFieldLabel: mapping.externalFieldLabel ?? null,
      targetType: mapping.targetType,
      targetField: mapping.targetType === "core" ? mapping.targetField ?? null : null,
      customFieldId: mapping.targetType === "custom" ? mapping.customFieldId ?? null : null,
      required: mapping.required ?? false,
      transformRule: mapping.transformRule ?? null,
      fallbackValue: mapping.fallbackValue ?? null,
      updatedAt: new Date(),
    };

    if (existingId) {
      await db.update(formFieldMappings).set(values).where(eq(formFieldMappings.id, existingId));
    } else {
      await db.insert(formFieldMappings).values(values);
    }
  }
}

async function ensureDemoLead(
  seed: DemoLeadSeed,
  customFieldDefinitions: Awaited<ReturnType<typeof listCustomFields>>,
  ids: {
    assignedUserId: string | null;
    teamId: string | null;
    branchId: string | null;
    departmentId: string | null;
  },
) {
  const result = await leadStore.upsertExternalLead({
    source: seed.source,
    sourceDetail: "demo_seed",
    alwaysCreateNewRecord: false,
    firstName: seed.firstName,
    lastName: seed.lastName,
    email: seed.email,
    whatsappNumber: seed.phone,
    state: seed.state,
    priority: seed.priority,
    assignedTo: seed.assignedTo,
    assignedToList: [seed.assignedTo],
    stageId: seed.stageId,
    sourcePayload: {
      seed: "leads_desk_demo",
      scenario: seed.stageKey,
    },
  });

  let lead = result.lead;

  if (lead.assignedTo !== seed.assignedTo) {
    const assignedLead = await leadStore.assignLead(lead.id, seed.assignedTo, "demo-seed");
    if (assignedLead) {
      lead = assignedLead;
    }
  }

  if (lead.priority !== seed.priority) {
    const priorityLead = await leadStore.updateLeadPriority(lead.id, seed.priority, "demo-seed");
    if (priorityLead) {
      lead = priorityLead;
    }
  }

  await updateLeadSalesCommandFields(lead.id, {
    companyName: seed.companyName,
    sourceId: seed.sourceId,
    stageId: seed.stageId,
    assignedUserId: ids.assignedUserId,
    teamId: ids.teamId,
    branchId: ids.branchId,
    departmentId: ids.departmentId,
    estimatedValue: seed.estimatedValue,
    closeProbability: seed.closeProbability,
    expectedCloseDate: seed.expectedCloseDate,
    nextFollowUpAt: seed.nextFollowUpAt,
    wonValue: seed.wonValue ?? null,
    wonAt: seed.wonAt ?? null,
    lostAt: seed.lostAt ?? null,
    lostReason: seed.lostReason ?? null,
    campaignLabel: seed.campaignLabel ?? null,
  });

  const submittedValues = Object.fromEntries(
    customFieldDefinitions.map((field) => [field.id, seed.customFieldValues[field.key] ?? ""]),
  );
  const validation = validateCustomFieldValues(customFieldDefinitions, submittedValues);
  if (!validation.success) {
    throw new Error(
      `Demo custom field values are invalid for ${seed.email}: ${Object.values(validation.fieldErrors).join(" ")}`,
    );
  }

  await upsertLeadCustomFieldValues(lead.id, validation.values);

  for (const note of seed.notes) {
    await ensureLeadNote(lead.id, note);
  }

  for (const task of seed.tasks) {
    await ensureLeadTask(lead.id, task);
  }

  await ensureLeadEvent(lead.id, "lead_created", {
    source: "demo_seed",
    scenario: seed.stageKey,
  });

  return lead.id;
}

export async function seedLeadsDeskDemoData(): Promise<LeadsDeskDemoSeedResult> {
  const db = getDb();

  await seedLeadsDeskDefaults({
    includeStages: true,
    includeSources: true,
    includeRecommendedCustomFields: true,
  }, db);
  await ensureUrgencyFieldOptions();
  await ensureDemoFieldVisibility();
  await ensureDemoAppearance();

  for (const user of DEMO_USERS) {
    await leadStore.upsertCrmUser({
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: true,
    });
  }

  const crmUserRows = await leadStore.listCrmUsers();
  const crmUsersByEmail = Object.fromEntries(crmUserRows.map((user) => [user.email, user]));

  const managerUserId = crmUsersByEmail["manager@example.com"]?.id ?? null;
  const previewUserId = crmUsersByEmail["preview@local.leadsdesk.test"]?.id ?? null;
  const leadUserId = crmUsersByEmail["lead@example.com"]?.id ?? null;
  const repUserId = crmUsersByEmail["rep@example.com"]?.id ?? null;

  const branchId = await ensureBranch("Lagos HQ", "Ikeja, Lagos", managerUserId);
  const departmentId = await ensureDepartment("Sales", managerUserId);
  const teamId = await ensureTeam("Inbound Sales", leadUserId, branchId, departmentId);

  const stageIds = {
    new: await resolveLeadStageIdByLegacyStatus("new"),
    qualified: await resolveLeadStageIdByLegacyStatus("qualified"),
    converted: await resolveLeadStageIdByLegacyStatus("converted"),
    lost: await resolveLeadStageIdByLegacyStatus("lost"),
  };
  const sourceIds = {
    website: await resolveLeadSourceIdByLegacySource("website_form"),
    referral: await resolveLeadSourceIdByLegacySource("referral"),
    manual: await resolveLeadSourceIdByLegacySource("manual_entry"),
    csv: await resolveLeadSourceIdByLegacySource("google_sheets"),
  };

  const customFieldDefinitions = (await listCustomFields())
    .filter((field) => !field.archived)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const customFieldIdsByKey = Object.fromEntries(customFieldDefinitions.map((field) => [field.key, field.id]));

  const demoFormSource = await ensureDemoFormSource({
    defaultAssignedUserId: repUserId,
    defaultStageId: stageIds.new,
    defaultTeamId: teamId,
    defaultBranchId: branchId,
    defaultDepartmentId: departmentId,
  });
  await ensureDemoFormMappings(demoFormSource.id, customFieldIdsByKey);

  const leads: DemoLeadSeed[] = [
    {
      firstName: "Ada",
      lastName: "Okafor",
      email: "ada.demo@local.leadsdesk.test",
      phone: "+2348011110001",
      state: "Lagos",
      source: "website_form",
      stageKey: "new",
      priority: "high",
      assignedTo: "rep@example.com",
      companyName: "Northwind Ventures",
      sourceId: sourceIds.website,
      stageId: stageIds.new,
      estimatedValue: 450000,
      closeProbability: 35,
      expectedCloseDate: isoOffsetFromNow(10),
      nextFollowUpAt: isoOffsetFromNow(-1),
      campaignLabel: "June Website Demo",
      customFieldValues: {
        budget: 500000,
        interest: "Private office subscription",
        urgency: "urgent",
        location: "Ikeja",
        preferred_contact_time: "9:00 AM",
        form_notes: "Asked for a same-day callback.",
      },
      notes: ["Customer requested a callback before noon."],
      tasks: [
        {
          title: "Call back before noon",
          description: "Confirm pricing and deployment timeline.",
          dueAt: isoOffsetFromNow(-1, 11),
        },
      ],
    },
    {
      firstName: "Chioma",
      lastName: "Nwosu",
      email: "chioma.demo@local.leadsdesk.test",
      phone: "+2348011110002",
      state: "Abuja",
      source: "referral",
      stageKey: "qualified",
      priority: "medium",
      assignedTo: "lead@example.com",
      companyName: "Prime Harbor Realty",
      sourceId: sourceIds.referral,
      stageId: stageIds.qualified,
      estimatedValue: 900000,
      closeProbability: 65,
      expectedCloseDate: isoOffsetFromNow(14),
      nextFollowUpAt: isoOffsetFromNow(0, 14),
      campaignLabel: "Partner Referrals",
      customFieldValues: {
        budget: 1200000,
        interest: "Multi-branch lead tracking",
        urgency: "high",
        location: "Wuse 2",
        preferred_contact_time: "2:00 PM",
        form_notes: "Needs role-based team visibility.",
      },
      notes: ["Interested in branch reporting and target tracking."],
      tasks: [
        {
          title: "Prepare branch reporting walkthrough",
          description: "Show team and branch performance visibility.",
          dueAt: isoOffsetFromNow(0, 15),
        },
      ],
    },
    {
      firstName: "Kola",
      lastName: "Adebayo",
      email: "kola.demo@local.leadsdesk.test",
      phone: "+2348011110003",
      state: "Lagos",
      source: "manual_entry",
      stageKey: "converted",
      priority: "high",
      assignedTo: "manager@example.com",
      companyName: "Bluepeak Insurance",
      sourceId: sourceIds.manual,
      stageId: stageIds.converted,
      estimatedValue: 1500000,
      closeProbability: 100,
      expectedCloseDate: isoOffsetFromNow(-5),
      nextFollowUpAt: null,
      wonValue: 1500000,
      wonAt: isoOffsetFromNow(-3),
      campaignLabel: "Owner Outreach",
      customFieldValues: {
        budget: 1500000,
        interest: "Insurance renewal pipeline",
        urgency: "normal",
        location: "Victoria Island",
        preferred_contact_time: "11:00 AM",
        form_notes: "Closed after product demo and access review.",
      },
      notes: ["Won after confirming export ownership and private deployment."],
      tasks: [
        {
          title: "Send onboarding checklist",
          description: "Share deployment and admin setup checklist.",
          dueAt: isoOffsetFromNow(-2, 10),
          complete: true,
        },
      ],
    },
    {
      firstName: "Musa",
      lastName: "Garba",
      email: "musa.demo@local.leadsdesk.test",
      phone: "+2348011110004",
      state: "Port Harcourt",
      source: "google_sheets",
      stageKey: "lost",
      priority: "low",
      assignedTo: "rep@example.com",
      companyName: "Vertex Training Hub",
      sourceId: sourceIds.csv,
      stageId: stageIds.lost,
      estimatedValue: 300000,
      closeProbability: 10,
      expectedCloseDate: isoOffsetFromNow(-7),
      nextFollowUpAt: null,
      lostAt: isoOffsetFromNow(-4),
      lostReason: "Budget postponed until next quarter.",
      campaignLabel: "CSV Demo Import",
      customFieldValues: {
        budget: 250000,
        interest: "Class enrollment dashboard",
        urgency: "low",
        location: "Port Harcourt",
        preferred_contact_time: "4:00 PM",
        form_notes: "Lead asked to revisit after budget review.",
      },
      notes: ["Lost because the buyer delayed rollout to next quarter."],
      tasks: [],
    },
  ];

  const leadIds: string[] = [];
  for (const lead of leads) {
    const assignedUserId = await resolveCrmUserIdByEmail(lead.assignedTo);
    const leadId = await ensureDemoLead(lead, customFieldDefinitions, {
      assignedUserId,
      teamId,
      branchId,
      departmentId,
    });
    leadIds.push(leadId);
  }

  const existingWebhookLead = await leadStore.findDuplicateLead({
    email: "kemi.webhook@local.leadsdesk.test",
  });
  let webhookLeadsCreated = 0;
  if (!existingWebhookLead) {
    const webhookResult = await processWebhookIntake({
      webhookKey: "demo_main_website",
      payload: {
        full_name: "Kemi Webhook",
        email: "kemi.webhook@local.leadsdesk.test",
        phone: "+2348011110010",
        company_name: "Apex Services",
        campaign: "Website Test Form",
        estimated_value: 700000,
        budget: 650000,
        interest: "Service request tracking",
        location: "Lekki",
        urgency: "high",
        notes: "Submitted through the public website form.",
      },
    });

    if (webhookResult.body.success && webhookResult.body.leadId) {
      webhookLeadsCreated += 1;
      leadIds.push(webhookResult.body.leadId);
    }
  }

  const [existingFailedCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leadIntakeEvents)
    .where(
      and(
        eq(leadIntakeEvents.formSourceId, demoFormSource.id),
        eq(leadIntakeEvents.status, "failed"),
      ),
    );

  let failedIntakeEventsLogged = 0;
  if ((existingFailedCount?.count ?? 0) === 0) {
    const failedWebhook = await processWebhookIntake({
      webhookKey: "demo_main_website",
      payload: {
        full_name: "Missing Contact",
        urgency: "high",
      },
    });

    if (!failedWebhook.body.success) {
      failedIntakeEventsLogged += 1;
    }
  }

  const monthStart = startOfCurrentMonth();
  const monthEnd = endOfCurrentMonth();
  const salesTargetName = "Monthly Revenue Target";
  const existingTarget = (await listSalesTargets({ includeArchived: true })).find(
    (target) => target.name === salesTargetName && target.scope === "global",
  );

  if (!existingTarget) {
    await createSalesTarget({
      name: salesTargetName,
      scope: "global",
      period: "monthly",
      targetValue: 5000000,
      currency: "NGN",
      startDate: monthStart.toISOString().slice(0, 10),
      endDate: monthEnd.toISOString().slice(0, 10),
      isActive: true,
    });
  } else {
    await updateSalesTarget(existingTarget.id, {
      name: salesTargetName,
      scope: "global",
      period: "monthly",
      targetValue: 5000000,
      currency: "NGN",
      startDate: monthStart.toISOString().slice(0, 10),
      endDate: monthEnd.toISOString().slice(0, 10),
      isActive: true,
    });
  }

  let notificationsCreated = 0;
  if (previewUserId && leadIds[0]) {
    if (
      await ensureNotificationRecord({
        type: "new_lead_assigned",
        recipientUserId: previewUserId,
        leadId: leadIds[0],
        title: "New lead assigned",
        message: "Ada Okafor is now in your queue.",
      })
    ) {
      notificationsCreated += 1;
    }

    if (
      await ensureNotificationRecord({
        type: "follow_up_overdue",
        recipientUserId: previewUserId,
        leadId: leadIds[0],
        title: "Follow-up overdue",
        message: "Ada Okafor is overdue since yesterday.",
      })
    ) {
      notificationsCreated += 1;
    }
  }

  if (
    await ensureNotificationRecord({
      type: "target_milestone_reached",
      recipientUserId: null,
      title: "Monthly target on track",
      message: "Won value is already moving against the current monthly target.",
    })
  ) {
    notificationsCreated += 1;
  }

  return {
    usersSeeded: DEMO_USERS.length,
    leadsPrepared: leadIds.length,
    webhookLeadsCreated,
    failedIntakeEventsLogged,
    notificationsCreated,
    salesTargetsPrepared: 1,
    formSourcesPrepared: 1,
  };
}
