import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  Clock3,
  FileText,
  ListTodo,
  Mail,
  MapPin,
  MessageCircle,
  NotebookPen,
  PhoneCall,
  TriangleAlert,
  UserRound,
  UserRoundPlus,
} from "lucide-react";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { ErrorState } from "@/components/admin/ErrorState";
import { LeadLifecycleButton } from "@/components/admin/LeadLifecycleButton";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { LeadNoteForm } from "@/components/admin/LeadNoteForm";
import { LeadOpportunityManager } from "@/components/admin/LeadOpportunityManager";
import { LeadProfileForm } from "@/components/admin/LeadProfileForm";
import { LeadStatusForm } from "@/components/admin/LeadStatusForm";
import { LeadSyncActions } from "@/components/admin/LeadSyncActions";
import { LeadTaskCompleteButton } from "@/components/admin/LeadTaskCompleteButton";
import { LeadTaskForm } from "@/components/admin/LeadTaskForm";
import { NoteCard } from "@/components/admin/NoteCard";
import { PriorityBadge } from "@/components/admin/PriorityBadge";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { SourceBadge } from "@/components/admin/SourceBadge";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { TaskCard } from "@/components/admin/TaskCard";
import { TimelineItem } from "@/components/admin/TimelineItem";
import { getAdminAccessContext } from "@/lib/admin";
import { appRoutes } from "@/lib/app-routes";
import {
  canAccessLeadTrash,
  canSoftDeleteLead,
  canViewLeadRecord,
  canViewTechnicalLeadContext,
} from "@/lib/admin-permissions";
import { canAssignLeads } from "@/lib/crm/authz";
import {
  crmLabelize,
  formatCrmDateTime,
  formatCrmRoleLabel,
  formatLeadEventLabel,
  formatLeadStateLabel,
  formatLeadSourceLabel,
  formatSyncStateLabel,
} from "@/lib/crm/formatters";
import { loadAdminLeadReadContext } from "@/lib/crm/admin-read-context";
import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import { buildLeadOpportunityRollup, listLeadOpportunities } from "@/lib/crm/lead-opportunities";
import { listLeadStages } from "@/lib/crm/lead-stages-admin";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import type { CrmStatus } from "@/lib/crm/types";
import { buildAdminLeadDetailView } from "@/lib/crm/view-models";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";
import { leadStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

function buildWhatsAppHref(value?: string | null) {
  const sanitized = value?.replace(/[^\d]/g, "") ?? "";
  return sanitized ? `https://wa.me/${sanitized}` : null;
}

function formatMoney(value: number | null | undefined, currency: string) {
  if (value === null || value === undefined) {
    return "Not set";
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function eventTone(eventType: string) {
  if (eventType.includes("task_completed") || eventType.includes("converted")) {
    return "success" as const;
  }

  if (eventType.includes("status_changed") || eventType.includes("priority_changed")) {
    return "warning" as const;
  }

  if (eventType.includes("lead_assigned")) {
    return "accent" as const;
  }

  return "neutral" as const;
}

function resolveLegacyStageBadge(stage?: string | null): CrmStatus {
  return (stage ?? "new") as CrmStatus;
}

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const {
    session,
    role,
    accessLevel,
    actualAccessLevel,
    canSwitchAccessViews,
    permissions,
  } =
    await getAdminAccessContext(appRoutes.lead(id));
  const canOpenLeadTrash = canAccessLeadTrash(accessLevel, permissions);
  let pageData:
    | {
        lead: NonNullable<Awaited<ReturnType<typeof leadStore.getById>>>;
        users: Awaited<ReturnType<typeof leadStore.listCrmUsers>>;
        notes: Awaited<ReturnType<typeof leadStore.listLeadNotes>>;
        tasks: Awaited<ReturnType<typeof leadStore.listLeadTasks>>;
        events: Awaited<ReturnType<typeof leadStore.listLeadEvents>>;
        duplicateCandidates: Awaited<ReturnType<typeof leadStore.listDuplicateLeads>>;
      }
    | null = null;
  let pageError: unknown = null;

  try {
    const lead = await leadStore.getById(id);

    if (!lead) {
      notFound();
    }

    if (
      (lead.deletedAt && !canOpenLeadTrash) ||
      !canViewLeadRecord(accessLevel, lead, session.user?.email, permissions)
    ) {
      notFound();
    }

    let users: Awaited<ReturnType<typeof leadStore.listCrmUsers>>;
    let notes: Awaited<ReturnType<typeof leadStore.listLeadNotes>>;
    let tasks: Awaited<ReturnType<typeof leadStore.listLeadTasks>>;
    let events: Awaited<ReturnType<typeof leadStore.listLeadEvents>>;
    let duplicateCandidates: Awaited<ReturnType<typeof leadStore.listDuplicateLeads>>;

    try {
      [users, notes, tasks, events, duplicateCandidates] = await Promise.all([
        leadStore.listCrmUsers(),
        leadStore.listLeadNotes(id),
        leadStore.listLeadTasks({ leadId: id }),
        leadStore.listLeadEvents(id),
        leadStore.listDuplicateLeads({
          excludeId: lead.id,
          email: lead.email,
          whatsappNumber: lead.whatsappNumber,
          assignedTo: accessLevel === "sales_rep" ? session.user?.email ?? undefined : undefined,
        }),
      ]);
    } catch (relatedDataError) {
      if (process.env.NODE_ENV === "production") {
        throw relatedDataError;
      }

      logCrmPageError(`lead:${id}:related-data`, relatedDataError);
      users = [];
      notes = [];
      tasks = [];
      events = [];
      duplicateCandidates = [];
    }

    pageData = {
      lead,
      users,
      notes,
      tasks,
      events,
      duplicateCandidates,
    };
  } catch (error) {
    pageError = error;
    logCrmPageError(`lead:${id}`, error);
  }

  if (!pageData) {
    const errorCopy = getCrmPageErrorCopy(pageError);

    return (
      <AdminShell
        activeNav="leads"
        accessLevel={accessLevel}
        role={role}
        actualAccessLevel={actualAccessLevel}
        canSwitchAccessViews={canSwitchAccessViews}
        title="Lead detail"
        description="Contact actions, next steps, notes, and lead context in one place."
        actions={
          <>
            <Link
              href={appRoutes.leads}
              className="admin-button-secondary ld-focus-ring inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
            >
              Back to leads
            </Link>
            <AdminSignOutButton />
          </>
        }
      >
        <ErrorState
          title={errorCopy.title}
          description={errorCopy.description}
          details={errorCopy.details}
        />
      </AdminShell>
    );
  }

  const { lead, users, notes, tasks, events, duplicateCandidates } = pageData;
  const workspaceSettings = await getCompanySettings();
  const currency = workspaceSettings.globalCurrency;
  const canTrashLead = canSoftDeleteLead(accessLevel, permissions) && !lead.deletedAt;
  const canRestoreDeletedLead = canOpenLeadTrash && Boolean(lead.deletedAt);
  const showTechnicalLeadContext = canViewTechnicalLeadContext(
    accessLevel,
    role,
    permissions,
  );
  const showAttributionDetails = accessLevel !== "sales_rep";
  const canReassignOwner = canAssignLeads({ accessLevel, permissions, role });
  const visibleUsers =
    accessLevel === "sales_rep"
      ? users.filter((user) => user.email === session.user?.email && user.isActive)
      : users.filter((user) => user.isActive);
  const assigneeOptions = visibleUsers.map((user) => ({
    avatarUrl: user.avatarUrl,
    detail: formatCrmRoleLabel(user.role),
    label: user.fullName || user.email,
    value: user.email,
  }));

  if (session.user?.email && !assigneeOptions.some((option) => option.value === session.user?.email)) {
    assigneeOptions.unshift({
      avatarUrl: session.user.image,
      detail: "Admin access",
      label: session.user.name || session.user.email,
      value: session.user.email,
    });
  }

  const nextTask = tasks
    .filter((task) => !task.completedAt)
    .sort((left, right) => {
      const leftTime = left.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const rightTime = right.dueAt ? new Date(right.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    })[0];
  const whatsappHref = buildWhatsAppHref(lead.whatsappNumber);
  let readContext: Awaited<ReturnType<typeof loadAdminLeadReadContext>>;
  let editableCustomFields: Awaited<ReturnType<typeof listCustomFields>>;
  let configuredStageOptions: Awaited<ReturnType<typeof listLeadStages>>;
  let opportunityRows: Awaited<ReturnType<typeof listLeadOpportunities>>;

  try {
    [readContext, editableCustomFields, configuredStageOptions, opportunityRows] = await Promise.all([
      loadAdminLeadReadContext([lead], { includeCustomFields: true }),
      listCustomFields(),
      listLeadStages(),
      listLeadOpportunities(lead.id),
    ]);
  } catch (relatedModelError) {
    if (process.env.NODE_ENV === "production") {
      throw relatedModelError;
    }

    logCrmPageError(`lead:${id}:read-model`, relatedModelError);
    readContext = {
      stagesById: new Map(),
      sourcesById: new Map(),
      ownersById: new Map(),
      customFieldDefinitionsByLeadId: new Map(),
      customFieldValuesByLeadId: new Map(),
    };
    editableCustomFields = [];
    configuredStageOptions = [];
    opportunityRows = [];
  }

  editableCustomFields = editableCustomFields.filter(
    (field) => field.showInForm && !field.archived,
  );
  configuredStageOptions = configuredStageOptions.filter((stage) => !stage.archived);
  const leadView = buildAdminLeadDetailView(lead, {
    nextFollowUpAt: lead.nextFollowUpAt ?? nextTask?.dueAt ?? null,
    stage: lead.stageId ? readContext.stagesById.get(lead.stageId) ?? null : null,
    source: lead.sourceId ? readContext.sourcesById.get(lead.sourceId) ?? null : null,
    owner: lead.assignedUserId ? readContext.ownersById.get(lead.assignedUserId) ?? null : null,
    customFieldDefinitions: readContext.customFieldDefinitionsByLeadId.get(lead.id) ?? [],
    customFieldValues: readContext.customFieldValuesByLeadId.get(lead.id) ?? [],
  });
  const stageOptions = configuredStageOptions.length > 0
    ? configuredStageOptions.map((stage) => ({
        value: stage.id,
        key: stage.key,
        label: stage.name,
        stageId: stage.id,
        sortOrder: stage.sortOrder,
        isWon: stage.isWon,
        isLost: stage.isLost,
      }))
    : undefined;
  const opportunityRollup = buildLeadOpportunityRollup(opportunityRows);

  return (
    <AdminShell
      activeNav="leads"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title={leadView.leadName}
      description="Contact actions, next steps, notes, and lead context in one place."
      actions={
        <>
          <Link
            href={lead.deletedAt ? appRoutes.leadsTrash : appRoutes.leads}
            className="admin-button-secondary ld-focus-ring inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
          >
            {lead.deletedAt ? "Back to trash" : "Back to leads"}
          </Link>
          <div className="ld-floating-control hidden rounded-full px-4 py-2 text-sm md:block">
            {session.user?.email}
          </div>
          <AdminSignOutButton />
        </>
      }
    >
      <div className="space-y-6">
        {lead.deletedAt ? (
          <section className="rounded-[24px] border border-amber-300/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
            This lead is in trash. Restore it to return it to the active queue, or delete it permanently.
          </section>
        ) : null}

        <section className="admin-surface overflow-hidden rounded-[30px] p-0 ld-animate-fade-in-up">
          <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--ld-color-primary)_18%,transparent),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.2),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.035)_100%)] px-5 py-6 sm:px-6 sm:py-7">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.92fr)] xl:items-center">
              <div className="flex items-start gap-4 sm:gap-5">
                <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-[28px] border border-white/14 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--ld-color-primary)_34%,transparent),rgba(139,92,246,0.24))] text-[2rem] font-semibold tracking-[-0.05em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_42px_rgba(15,23,42,0.22)] sm:h-24 sm:w-24 sm:text-[2.5rem]">
                    {leadView.initials}
                </div>

                <div className="min-w-0">
                  <h2 className="break-words font-[family:var(--font-heading)] text-[2.25rem] leading-[1.08] tracking-[-0.055em] text-white sm:text-[3.2rem] sm:leading-[1.02]">
                    {leadView.leadName}
                  </h2>
                  <p className="mt-3 max-w-[24ch] text-base leading-7 text-white/70 sm:max-w-none sm:text-[1.05rem] [overflow-wrap:anywhere]">
                    {lead.email || "No email yet"}
                  </p>
                  {leadView.routeLine ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">
                      {leadView.routeLine}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4 xl:justify-self-end xl:text-right">
                <div className="flex flex-wrap gap-2 xl:justify-end">
                  <SourceBadge source={lead.source} label={leadView.sourceLabel} />
                  <StatusBadge
                    status={resolveLegacyStageBadge(leadView.stage)}
                    label={leadView.stageLabel}
                  />
                  <PriorityBadge priority={lead.priority} />
                  {lead.state ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ld-color-primary)]/24 bg-[var(--ld-color-primary)]/12 px-3 py-1.5 text-sm font-medium text-white shadow-[0_8px_18px_color-mix(in_srgb,var(--ld-color-primary)_8%,transparent)]">
                      <MapPin className="h-4 w-4" />
                      {formatLeadStateLabel(lead.state)}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-base text-white/80 xl:justify-end">
                  <span className="inline-flex items-center gap-2 font-medium text-white/90">
                    <BadgeCheck className="h-5 w-5 text-[#2252db]" />
                    {leadView.stageLabel}
                  </span>
                  <span className="text-white/60">•</span>
                  <span>{leadView.completionLabel}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                  <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-sm font-medium text-white/80 shadow-[0_8px_18px_rgba(0,0,0,0.06)]">
                    {leadView.completionLabel}
                  </span>
                  {leadView.fitSignalLabel !== "Not provided" ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-sm font-medium text-white/80 shadow-[0_8px_18px_rgba(0,0,0,0.04)]">
                      {leadView.fitSignalLabel}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-0 xl:grid-cols-3">
            <div className="border-b border-white/10/80 px-5 py-6 sm:px-6 xl:border-b-0 xl:border-r">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#243f7e]">Contact</p>
              <div className="mt-4 h-px bg-[linear-gradient(90deg,rgba(158,183,255,0.75)_0%,rgba(158,183,255,0.18)_100%)]" />

              <div className="mt-6 space-y-6">
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#e7f1ff_0%,#d5e7ff_100%)] text-[#2252db] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <Mail className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/60">Email</p>
                    <p className="mt-1 text-[1.05rem] leading-8 text-white [overflow-wrap:anywhere]">
                      {lead.email || "No email yet"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#def6ee_0%,#cff1e6_100%)] text-[#159b6b] shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
                    <PhoneCall className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/60">Phone</p>
                    <p className="mt-1 text-[1.05rem] leading-8 text-white [overflow-wrap:anywhere]">
                      {lead.whatsappNumber || "No phone yet"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#e5f3ff_0%,#d7eaff_100%)] text-[#1d69d7] shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/60">Region</p>
                    <p className="mt-1 text-[1.05rem] leading-8 text-white [overflow-wrap:anywhere]">
                      {lead.state ? formatLeadStateLabel(lead.state) : "Region not captured yet"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-b border-white/10/80 px-5 py-6 sm:px-6 xl:border-b-0 xl:border-r">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#243f7e]">Lead details</p>
              <div className="mt-4 h-px bg-[linear-gradient(90deg,rgba(158,183,255,0.75)_0%,rgba(158,183,255,0.18)_100%)]" />

              <div className="mt-6 space-y-6">
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#e5f0ff_0%,#d5e6ff_100%)] text-[#3571d8] shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/60">Lead summary</p>
                    <p className="mt-1 text-[1.05rem] leading-8 text-white [overflow-wrap:anywhere]">
                      {leadView.summaryLabel}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#ecedff_0%,#e2e5ff_100%)] text-[#6a63d9] shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/60">Owner</p>
                    <p className="mt-1 text-[1.05rem] leading-8 text-white [overflow-wrap:anywhere]">
                      {leadView.assignedUserName}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#fff2d9_0%,#ffebc4_100%)] text-[#9a5a06] shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
                    <Clock3 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 text-[1.02rem] leading-8 text-white/80">
                    <p className="text-sm font-medium text-white/60">Activity</p>
                    <p className="mt-1">
                      <span className="font-medium text-white">Created:</span> {formatCrmDateTime(lead.createdAt)}
                    </p>
                    <p>
                      <span className="font-medium text-white">Last activity:</span>{" "}
                      {formatCrmDateTime(lead.lastActivityAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-6 sm:px-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#243f7e]">Next touch</p>
              <div className="mt-4 h-px bg-[linear-gradient(90deg,rgba(158,183,255,0.75)_0%,rgba(158,183,255,0.18)_100%)]" />

              <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.06] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ld-animate-fade-in">
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--ld-color-primary)]/20 bg-[var(--ld-color-primary)]/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <CalendarDays className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[1.75rem] font-semibold tracking-[-0.05em] text-white">
                      {nextTask?.title || "Not scheduled"}
                    </p>
                    <p className="mt-3 text-[1.05rem] leading-8 text-white/70">
                      {nextTask?.dueAt
                        ? `Due ${formatCrmDateTime(nextTask.dueAt)}`
                        : "No follow-up has been set for this lead."}
                    </p>
                  </div>
                </div>

                <a
                  href="#lead-tasks"
                  className="ld-floating-control mt-6 inline-flex h-12 w-full items-center justify-center rounded-2xl px-5 text-base font-semibold sm:w-auto"
                >
                  <ListTodo className="mr-2 h-5 w-5" />
                  Schedule follow-up
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10/80 px-5 py-5 sm:px-6">
            <div className="flex flex-wrap gap-3">
              <a
                href="#lead-tasks"
                className="ld-focus-ring inline-flex h-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#09174b_0%,#17348b_100%)] px-6 text-base font-semibold text-white shadow-[0_16px_34px_rgba(14,28,88,0.24)] transition hover:brightness-[1.04]"
              >
                Add next touch
              </a>
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-button-secondary ld-focus-ring inline-flex h-12 items-center justify-center rounded-2xl px-5 text-base font-medium"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Message
                </a>
              ) : null}
              {lead.email ? (
                <a
                  href={`mailto:${lead.email}`}
                  className="admin-button-secondary ld-focus-ring inline-flex h-12 items-center justify-center rounded-2xl px-5 text-base font-medium"
                >
                  <Mail className="mr-2 h-5 w-5" />
                  Email
                </a>
              ) : null}
              {lead.whatsappNumber ? (
                <a
                  href={`tel:${lead.whatsappNumber}`}
                  className="admin-button-secondary ld-focus-ring inline-flex h-12 items-center justify-center rounded-2xl px-5 text-base font-medium"
                >
                  <PhoneCall className="mr-2 h-5 w-5" />
                  Call
                </a>
              ) : null}
              <a
                href="#lead-notes"
                className="admin-button-secondary ld-focus-ring inline-flex h-12 items-center justify-center rounded-2xl px-5 text-base font-medium"
              >
                <NotebookPen className="mr-2 h-5 w-5" />
                Add note
              </a>
              {canTrashLead ? (
                <LeadLifecycleButton
                  leadId={lead.id}
                  action="trash"
                  onSuccessHref={appRoutes.leads}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-500/10 px-5 text-base font-medium text-rose-100 transition hover:bg-rose-500/15"
                />
              ) : null}
              {canRestoreDeletedLead ? (
                <>
                  <LeadLifecycleButton
                    leadId={lead.id}
                    action="restore"
                    onSuccessHref={appRoutes.leadsTrash}
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-5 text-base font-medium text-emerald-100 transition hover:bg-emerald-500/15"
                  />
                  <LeadLifecycleButton
                    leadId={lead.id}
                    action="delete"
                    onSuccessHref={appRoutes.leadsTrash}
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-500/10 px-5 text-base font-medium text-rose-100 transition hover:bg-rose-500/15"
                  />
                </>
              ) : null}
            </div>
          </div>
        </section>

        {duplicateCandidates.length > 0 ? (
          <section className="rounded-[24px] border border-amber-300/20 bg-amber-400/[0.06] p-5 ld-animate-fade-in-up" style={{animationDelay: "80ms"}}>
            <div className="flex gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-300/20 bg-white/[0.08] text-amber-300">
                <TriangleAlert className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-semibold text-white">Possible duplicate lead</p>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  {duplicateCandidates.length} other lead{duplicateCandidates.length === 1 ? "" : "s"} share this
                  contact information. Review before starting a separate follow-up.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {duplicateCandidates.slice(0, 4).map((candidate) => (
                    <Link
                      key={candidate.id}
                      href={appRoutes.lead(candidate.id)}
                      className="admin-button-secondary rounded-full px-3 py-2 text-sm"
                    >
                      {[`${candidate.firstName || "Lead"} ${candidate.lastName}`.trim(), candidate.state ? formatLeadStateLabel(candidate.state) : null]
                        .filter(Boolean)
                        .join(" • ")}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[minmax(320px,0.94fr)_minmax(0,1.18fr)] ld-animate-fade-in-up" style={{animationDelay: "100ms"}}>
          <div className="space-y-6">
            <section className="admin-surface rounded-[24px] p-5 ld-animate-fade-in-up" style={{animationDelay: "120ms"}}>
              <SectionHeader
                eyebrow="Ownership"
                title="Stage, priority, and owner"
                description="Keep the lead’s current stage aligned with the next best action."
              />
              <div className="mt-4">
                {lead.deletedAt ? (
                  <EmptyState
                    title="Lead is in trash"
                    description="Restore this lead before changing status, priority, or owner."
                  />
                ) : (
                  <LeadStatusForm
                    leadId={lead.id}
                    initialStage={
                      lead.stageId ??
                      stageOptions?.find((stage) => stage.key === leadView.stageDisplay.key)?.value ??
                      resolveLegacyStageBadge(leadView.stage)
                    }
                    initialStageKey={leadView.stageDisplay.key ?? resolveLegacyStageBadge(leadView.stage)}
                    initialPriority={lead.priority}
                    initialAssignedTo={lead.assignedTo}
                    initialAssignedToList={lead.assignedToList}
                    initialNextFollowUpAt={leadView.nextFollowUpAt}
                    assigneeOptions={assigneeOptions}
                    canReassignOwner={canReassignOwner}
                    stageOptions={stageOptions}
                  />
                )}
              </div>
            </section>

            <section className="admin-surface rounded-[24px] p-5">
              <SectionHeader
                eyebrow="Profile"
                title="Contact details"
                description="Edit the live lead profile without breaking exports or follow-up context."
              />
              <div className="mt-4 space-y-4">
                {lead.deletedAt ? (
                  <EmptyState
                    title="Lead is in trash"
                    description="Restore this lead before editing contact details."
                  />
                ) : (
                  <LeadProfileForm
                    key={`${lead.id}-${lead.updatedAt}`}
                    leadId={lead.id}
                    initialFirstName={leadView.profile.firstName}
                    initialLastName={leadView.profile.lastName}
                    initialEmail={leadView.profile.email}
                    initialWhatsappNumber={leadView.profile.whatsappNumber}
                    initialState={leadView.profile.state}
                    initialCountry={leadView.profile.country}
                    initialRegion={leadView.profile.region}
                    initialCity={leadView.profile.city}
                    initialAddress={leadView.profile.address}
                    initialPostalCode={leadView.profile.postalCode}
                    initialCompanyName={leadView.profile.companyName}
                    initialLeadCustomerType={leadView.profile.leadCustomerType}
                    initialEstimatedValue={leadView.estimatedValue}
                    initialCloseProbability={leadView.closeProbability}
                    initialExpectedCloseDate={leadView.expectedCloseDate}
                    initialNextFollowUpAt={leadView.nextFollowUpAt}
                    initialWonValue={leadView.wonValue}
                    initialLostReason={leadView.lostReason}
                    customFieldDefinitions={editableCustomFields}
                    initialCustomFieldValues={readContext.customFieldValuesByLeadId.get(lead.id) ?? []}
                  />
                )}

                <div className="grid gap-4 text-sm text-white/70">
                  {[
                    ["Company", leadView.companyName || "Not set"],
                    ["Next follow-up", leadView.nextFollowUpAt ? formatCrmDateTime(leadView.nextFollowUpAt) : "Not scheduled"],
                    ["Estimated value", formatMoney(leadView.estimatedValue, currency)],
                    ["Expected value", formatMoney(leadView.expectedValue, currency)],
                    ["Close probability", leadView.closeProbability !== null && leadView.closeProbability !== undefined ? `${leadView.closeProbability}%` : "Not set"],
                    ["Expected close", leadView.expectedCloseDate ? formatCrmDateTime(leadView.expectedCloseDate) : "Not set"],
                    ["Won value", formatMoney(leadView.wonValue, currency)],
                    ["Lost reason", leadView.lostReason || "Not set"],
                    ["Fit signal", leadView.fitSignalLabel],
                    ["Top interest", leadView.interestLabel],
                    ["Last updated", formatCrmDateTime(lead.updatedAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60">{label}</p>
                      <p className="mt-1.5 text-sm text-white/72">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="admin-surface rounded-[24px] p-5">
              <SectionHeader
                eyebrow="Offer tracking"
                title="Offer opportunities"
                description="Track multiple offers per lead so lost or unqualified options stop inflating pipeline."
              />
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 text-sm text-white/70 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["Pipeline value", formatMoney(opportunityRollup.expectedValue, currency)],
                    ["Open offers", `${opportunityRollup.activeCount}`],
                    ["Removed from pipeline", `${opportunityRollup.inactiveCount}`],
                    ["Won offers", `${opportunityRollup.wonCount}`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60">{label}</p>
                      <p className="mt-1.5 text-sm text-white/72">{value}</p>
                    </div>
                  ))}
                </div>
                {lead.deletedAt ? (
                  <EmptyState
                    title="Lead is in trash"
                    description="Restore this lead before editing offer opportunities."
                  />
                ) : (
                  <LeadOpportunityManager leadId={lead.id} initialOpportunities={opportunityRows} />
                )}
              </div>
            </section>

            {showAttributionDetails ? (
              <section className="admin-surface rounded-[24px] p-5 ld-animate-fade-in-up" style={{animationDelay: "240ms"}}>
                <SectionHeader
                  eyebrow="Campaign context"
                  title="Source details"
                  description="Secondary source and campaign context connected to this lead."
                />
                <div className="mt-4 grid gap-4 text-sm text-white/70">
                  {leadView.attributionDetails.map(({ label, value }) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60">{label}</p>
                      <p className="mt-1.5 text-sm text-white/72">{value}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {leadView.customFieldDisplayValues.some(
              (field) => field.showInDetails && field.displayValue,
            ) ? (
              <section className="admin-surface rounded-[24px] p-5">
                <SectionHeader
                  eyebrow="Custom fields"
                  title="Extra lead details"
                  description="Additional business-specific details captured for this lead."
                />
                <div className="mt-4 grid gap-4 text-sm text-white/70">
                  {leadView.customFieldDisplayValues
                    .filter((field) => field.showInDetails && field.displayValue)
                    .map((field) => (
                      <div
                        key={field.fieldId}
                        className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60">
                          {field.label}
                        </p>
                        <p className="mt-1.5 text-sm text-white/72">{field.displayValue}</p>
                      </div>
                    ))}
                </div>
              </section>
            ) : null}

            {showTechnicalLeadContext ? (
              <section className="admin-surface rounded-[24px] p-5 ld-animate-fade-in-up" style={{animationDelay: "320ms"}}>
                <SectionHeader
                  eyebrow="Connected tools"
                  title="Tool updates"
                  description="Current sync status for this lead."
                />
                <div className="mt-4 grid gap-3">
                  <div className="admin-surface-muted rounded-2xl p-4 ld-animate-fade-in">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                      Google Sheets
                    </p>
                    <p className="mt-2 text-base font-semibold text-white">
                      {formatSyncStateLabel(lead.sync.googleSheets.status)}
                    </p>
                    <p className="mt-1.5 text-sm leading-6 text-white/70">
                      {lead.sync.googleSheets.message || "No recent update yet."}
                    </p>
                  </div>
                  <div className="admin-surface-muted rounded-2xl p-4 ld-animate-fade-in">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">Sender</p>
                    <p className="mt-2 text-base font-semibold text-white">
                      {formatSyncStateLabel(lead.sync.sender.status)}
                    </p>
                    <p className="mt-1.5 text-sm leading-6 text-white/70">
                      {lead.sync.sender.message || "No recent update yet."}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <LeadSyncActions leadId={lead.id} canSyncSender={leadView.marketingConsent} />
                </div>
              </section>
            ) : null}
          </div>

          <div className="space-y-6">
            <section id="lead-notes" className="admin-surface rounded-[24px] p-5 ld-animate-fade-in-up" style={{animationDelay: "140ms"}}>
              <SectionHeader
                eyebrow="Notes"
                title="Notes"
                description="Capture nuance, objections, and context for the next handoff."
              />
              <div className="mt-4">
                {lead.deletedAt ? (
                  <EmptyState
                    title="Lead is in trash"
                    description="Restore this lead before adding new notes."
                  />
                ) : (
                  <LeadNoteForm leadId={lead.id} />
                )}
              </div>
              <div className="mt-4 space-y-4">
                {notes.length > 0 ? (
                  notes.map((note, idx) => <NoteCard key={note.id} note={note} index={idx} />)
                ) : (
                  <EmptyState
                    title="No notes yet"
                    description="Use notes to keep handoffs and follow-up context clean for the team."
                  />
                )}
              </div>
            </section>

            <section id="lead-tasks" className="admin-surface rounded-[24px] p-5 ld-animate-fade-in-up" style={{animationDelay: "180ms"}}>
              <SectionHeader
                eyebrow="Tasks"
                title="Follow-up tasks"
                description="Create clear next steps, due dates, and ownership."
              />
              <div className="mt-4">
                {lead.deletedAt ? (
                  <EmptyState
                    title="Lead is in trash"
                    description="Restore this lead before adding follow-up tasks."
                  />
                ) : (
                  <LeadTaskForm
                    leadId={lead.id}
                    assigneeOptions={assigneeOptions}
                    defaultAssignedTo={accessLevel === "sales_rep" ? session.user?.email ?? "" : ""}
                  />
                )}
              </div>
              <div className="mt-4 grid gap-4">
                {tasks.length > 0 ? (
                  tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      actions={!task.completedAt ? <LeadTaskCompleteButton taskId={task.id} /> : undefined}
                    />
                  ))
                ) : (
                  <EmptyState
                    title="No tasks yet"
                    description="Add a first follow-up task so ownership and due dates are explicit."
                  />
                )}
              </div>
            </section>

            <section className="admin-surface rounded-[24px] p-5 ld-animate-fade-in-up" style={{animationDelay: "220ms"}}>
              <SectionHeader
                eyebrow="Activity"
                title="Activity feed"
                description="Status changes, task actions, and captured notes stay visible here."
              />
              <div className="mt-4 space-y-4">
                {events.length > 0 ? (
                  events.map((event) => (
                    <TimelineItem
                      key={event.id}
                      title={formatLeadEventLabel(event.eventType)}
                      description={
                        typeof event.eventData?.preview === "string"
                          ? event.eventData.preview
                          : typeof event.eventData?.to === "string"
                            ? `Changed to ${crmLabelize(event.eventData.to)}`
                            : lead.email || lead.whatsappNumber || "Lead activity recorded."
                      }
                      meta={event.createdBy || formatLeadSourceLabel(lead.source)}
                      timestamp={event.createdAt}
                      tone={eventTone(event.eventType)}
                    />
                  ))
                ) : (
                  <EmptyState
                    title="No activity yet"
                    description="Activity will appear here once the team starts updating this lead."
                    icon={UserRoundPlus}
                  />
                )}
              </div>
            </section>
            <section className="admin-surface rounded-[24px] p-5">
              <SectionHeader
                eyebrow="Lead summary"
                title="What this lead wants"
                description="What this person wants, how ready they are, and what to do next."
              />
              {leadView.reportSummary ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,#0b123f_0%,#121a3f_100%)] p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                      Summary
                    </p>
                    <p className="mt-2 text-sm leading-7 text-white/84">{leadView.reportSummary.summaryDiagnosis}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="admin-surface-muted rounded-2xl p-4 ld-animate-fade-in">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                        Fit signal
                      </p>
                      <p className="mt-2 text-base font-semibold text-white">
                        {leadView.reportSummary.fitSignalLabel}
                      </p>
                      <p className="mt-1.5 text-sm leading-6 text-white/70">{leadView.reportSummary.fitSignalSummary}</p>
                    </div>
                    <div className="admin-surface-muted rounded-2xl p-4 ld-animate-fade-in">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                        First practical step
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/80">{leadView.reportSummary.firstAction}</p>
                    </div>
                  </div>
                  <div className="admin-surface-muted rounded-2xl p-4 ld-animate-fade-in">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                      Recommended offer
                    </p>
                    <p className="mt-2 text-base font-semibold text-white">
                      {leadView.reportSummary.recommendedOfferTitle}
                    </p>
                    <p className="mt-1.5 text-sm leading-6 text-white/70">
                      {leadView.reportSummary.recommendedOfferDescription}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/70">{leadView.reportSummary.recommendedOfferReason}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <EmptyState
                    title="No final report yet"
                    description="This lead is still incomplete, so the summary will appear after more intake details are captured."
                  />
                </div>
              )}
            </section>

            <section className="admin-surface rounded-[24px] p-5 ld-animate-fade-in-up" style={{animationDelay: "300ms"}}>
              <SectionHeader
                eyebrow="Key answers"
                title="What they told us"
                description="The quickest answers to scan before outreach."
              />
              <div className="mt-4 grid gap-3">
                {leadView.keyFacts.map(({ label, value }) => (
                  <div key={label} className="admin-surface-muted rounded-2xl px-4 py-3 ld-animate-fade-in">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60">{label}</p>
                    <p className="mt-1.5 text-sm text-white/72">{value}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="admin-surface rounded-[24px] p-5">
          <SectionHeader
            eyebrow="Lead intake"
            title="Captured intake answers"
            description="Submitted answers that inform qualification and next-step guidance."
          />
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {leadView.intakeAnswers.length > 0 ? (
              leadView.intakeAnswers.map(({ label, value }) => (
                <div key={label} className="admin-surface-muted rounded-2xl p-4 ld-animate-fade-in">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60">
                    {label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/80">{value}</p>
                </div>
              ))
            ) : (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState
                  title="No intake answers yet"
                  description="Captured answers will appear here after the lead completes more of the intake journey."
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
