import Link from "next/link";
import { redirect } from "next/navigation";
import { AlarmClockCheck, CircleAlert, ListTodo, Users2 } from "lucide-react";
import { AdminWorkspaceComposer } from "@/components/admin/AdminWorkspaceComposer";
import { AdminShell } from "@/components/admin/AdminShell";
import { ErrorState } from "@/components/admin/ErrorState";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { FilterBar } from "@/components/admin/FilterBar";
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { SmoothButton } from "@/components/admin/ui/SmoothButton";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { TaskQueueTable } from "@/components/admin/TaskQueueTable";
import { getAdminAccessContext } from "@/lib/admin";
import { isLocalAdminPreviewEmail } from "@/lib/admin-access";
import { isDateToday, isTaskOverdue } from "@/lib/admin-insights";
import { canAssignTasksToOthers, scopeLeadListFilters } from "@/lib/admin-permissions";
import { canEditLeads, canViewLeads } from "@/lib/crm/authz";
import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import { buildLeadDisplayNameMap } from "@/lib/crm/lead-identity";
import { formatLeadStateLabel } from "@/lib/crm/formatters";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { appRoutes } from "@/lib/app-routes";
import { leadStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

const views = ["today", "overdue", "my", "all", "completed"] as const;

function buildDevelopmentTaskData() {
  const now = new Date();
  const makeDueDate = (dayOffset: number, hour: number) => {
    const dueAt = new Date(now);
    dueAt.setDate(dueAt.getDate() + dayOffset);
    dueAt.setHours(hour, 0, 0, 0);
    return dueAt.toISOString();
  };
  const leads = [
    { id: "demo-lead-aurelia", firstName: "Aurelia", lastName: "Hart", email: "aurelia@aureliastudio.demo", whatsappNumber: "+234 803 555 0142", state: "Lagos", country: "Nigeria", region: "Lagos", city: "Lagos", companyName: "Aurelia Studio", assignedTo: "ada@auroragrowth.demo", stageId: "qualified", priority: "high" },
    { id: "demo-lead-vertex", firstName: "Ibrahim", lastName: "Musa", email: "ibrahim@vertexlogistics.demo", whatsappNumber: "+234 806 555 0188", state: "Abuja", country: "Nigeria", region: "FCT", city: "Abuja", companyName: "Vertex Logistics", assignedTo: "malik@auroragrowth.demo", stageId: "contacted", priority: "urgent" },
    { id: "demo-lead-northwind", firstName: "Grace", lastName: "Mensah", email: "grace@northwindhealth.demo", whatsappNumber: "+233 24 555 0194", state: "Greater Accra", country: "Ghana", region: "Greater Accra", city: "Accra", companyName: "Northwind Health", assignedTo: "zara@auroragrowth.demo", stageId: "consultation_booked", priority: "high" },
  ] as Awaited<ReturnType<typeof leadStore.list>>;
  const leadById = Object.fromEntries(leads.map((lead) => [lead.id, lead]));
  const task = (
    id: string,
    leadId: string,
    title: string,
    description: string,
    dueAt: string,
    assignedTo: string,
    completedAt: string | null = null,
  ) => {
    const lead = leadById[leadId];
    return {
      id, leadId, title, description, dueAt, completedAt, assignedTo,
      createdBy: "preview@local.leadsdesk.test", createdAt: now.toISOString(),
      lead: { id: lead.id, firstName: lead.firstName, lastName: lead.lastName, companyName: lead.companyName, state: lead.state, country: lead.country, region: lead.region, city: lead.city },
    };
  };

  return {
    users: [
      {
        id: "demo-user-sarah",
        email: "ada@auroragrowth.demo",
        fullName: "Ada Okafor",
        role: "manager",
        isActive: true,
        avatarUrl: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: "demo-user-james",
        email: "malik@auroragrowth.demo",
        fullName: "Malik Bello",
        role: "sales_agent",
        isActive: true,
        avatarUrl: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ] as Awaited<ReturnType<typeof leadStore.listCrmUsers>>,
    tasks: [
      task("demo-task-1", "demo-lead-vertex", "Confirm proposal decision makers", "Validate budget ownership and invite the operations director to the proposal review.", makeDueDate(-1, 15), "malik@auroragrowth.demo"),
      task("demo-task-2", "demo-lead-aurelia", "Prepare advisory discovery call", "Review qualification answers and frame the three highest-value discovery questions.", makeDueDate(0, 11), "ada@auroragrowth.demo"),
      task("demo-task-3", "demo-lead-northwind", "Send consultation recap", "Share agreed outcomes, implementation timeline, and the next commercial step.", makeDueDate(0, 16), "zara@auroragrowth.demo"),
      task("demo-task-4", "demo-lead-vertex", "Review procurement requirements", "Confirm onboarding documentation before commercial approval.", makeDueDate(1, 10), "malik@auroragrowth.demo"),
      task("demo-task-5", "demo-lead-aurelia", "Share tailored service options", "Send the two offers Aurelia currently qualifies for with clear next steps.", makeDueDate(2, 14), "ada@auroragrowth.demo"),
      task("demo-task-6", "demo-lead-northwind", "Complete qualification notes", "Capture the confirmed timeline and stakeholder requirements.", makeDueDate(-2, 13), "zara@auroragrowth.demo", makeDueDate(-2, 12)),
    ] as Awaited<ReturnType<typeof leadStore.listLeadTaskQueue>>,
    leads,
  };
}

function formatTaskView(view: (typeof views)[number]) {
  const labels = {
    my: "My tasks",
    today: "Due today",
    overdue: "Overdue",
    all: "All tasks",
    completed: "Completed",
  };

  return labels[view];
}

function buildTaskViewHref(view: (typeof views)[number], assignedTo?: string) {
  const params = new URLSearchParams({ view });
  if (assignedTo) {
    params.set("assignedTo", assignedTo);
  }
  return `${appRoutes.tasks}?${params.toString()}`;
}

export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const {
    session,
    role,
    accessLevel,
    actualAccessLevel,
    canSwitchAccessViews,
    permissions,
    crmUser,
  } = await getAdminAccessContext(appRoutes.tasks);
  if (!canViewLeads({ accessLevel, permissions, role })) {
    redirect(appRoutes.dashboard);
  }

  const params = await searchParams;
  const canEditTasks = canEditLeads({ accessLevel, permissions, role });
  const canAssignOtherTasks = canAssignTasksToOthers(accessLevel, permissions);
  const availableViews: readonly (typeof views)[number][] =
    accessLevel === "sales_rep" ? ["today", "overdue", "my", "completed"] : views;
  const view =
    typeof params.view === "string" && availableViews.includes(params.view as (typeof availableViews)[number])
      ? (params.view as (typeof views)[number])
      : "today";
  const assignedTo = typeof params.assignedTo === "string" ? params.assignedTo : undefined;
  const requestedLeadId = typeof params.leadId === "string" ? params.leadId : undefined;
  let pageData:
    | {
        users: Awaited<ReturnType<typeof leadStore.listCrmUsers>>;
        tasks: Awaited<ReturnType<typeof leadStore.listLeadTaskQueue>>;
        leads: Awaited<ReturnType<typeof leadStore.list>>;
      }
    | null = null;
  let pageError: unknown = null;

  const usingDevelopmentDemoData = isLocalAdminPreviewEmail(session.user?.email);

  if (usingDevelopmentDemoData) {
    pageData = buildDevelopmentTaskData();
  } else try {
    const leadScope = scopeLeadListFilters({}, accessLevel, session.user?.email, crmUser);
    const [users, tasks, leads] = await Promise.all([
      leadStore.listCrmUsers(),
      leadStore.listLeadTaskQueue({
        assignedTo:
          accessLevel === "sales_rep"
            ? session.user?.email ?? undefined
            : view === "my"
              ? session.user?.email ?? undefined
              : assignedTo,
        completion:
          view === "completed" ? "completed" : view === "all" ? "all" : "open",
        overdueOnly: view === "overdue",
        dueAfter: view === "today" ? new Date(new Date().setHours(0, 0, 0, 0)) : undefined,
        dueBefore: view === "today" ? new Date(new Date().setHours(23, 59, 59, 999)) : undefined,
        limit: 100,
        branchId: leadScope.branchId,
        departmentId: leadScope.departmentId,
        teamId: leadScope.teamId,
        scopeDenied: leadScope.scopeDenied,
        leadAssignedTo: leadScope.assignedTo,
      }),
      leadStore.list({ ...leadScope, limit: 60 }),
    ]);

    pageData = { users, tasks, leads };
  } catch (error) {
    pageError = error;
    logCrmPageError("tasks", error);
    if (process.env.NODE_ENV !== "production") {
      pageData = buildDevelopmentTaskData();
    }
  }

  const errorCopy = pageError ? getCrmPageErrorCopy(pageError) : null;
  let leadCaptureCustomFields = [] as Awaited<ReturnType<typeof listCustomFields>>;

  if (!usingDevelopmentDemoData) {
    try {
      leadCaptureCustomFields = (await listCustomFields()).filter(
        (field) => field.showInForm && !field.archived,
      );
    } catch (error) {
      logCrmPageError("tasks-custom-fields", error);
    }
  }

  if (!pageData) {
    return (
      <AdminShell
        activeNav="tasks"
        accessLevel={accessLevel}
        role={role}
        actualAccessLevel={actualAccessLevel}
        canSwitchAccessViews={canSwitchAccessViews}
        title={accessLevel === "sales_rep" ? "My Tasks" : "Tasks"}
        description={
          accessLevel === "sales_rep"
            ? "Your due-today, overdue, and completed follow-ups in one clean queue."
            : "Create tasks, rebalance follow-up work, and keep the team queue moving."
        }
        actions={<AdminSignOutButton />}
      >
        <ErrorState
          title={errorCopy?.title ?? "We couldn't load tasks"}
          description={errorCopy?.description ?? "The task queue could not be loaded right now."}
          details={errorCopy?.details}
        />
      </AdminShell>
    );
  }

  const assigneeOptions =
    !canAssignOtherTasks
      ? [
          {
            label: session.user?.name || session.user?.email || "My queue",
            value: session.user?.email ?? "",
          },
        ]
      : pageData.users
          .filter((user) => user.isActive)
          .map((user) => ({
          label: user.fullName || user.email,
          value: user.email,
        }));
  const leadNamesById = buildLeadDisplayNameMap(pageData.leads);
  const leadOptions = pageData.leads.map((lead) => ({
    value: lead.id,
    label: `${leadNamesById[lead.id] || "Lead"} • ${lead.state ? `${formatLeadStateLabel(lead.state)} • ` : ""}${lead.email || lead.whatsappNumber || "No contact yet"}`.trim(),
  }));
  const defaultLeadId = requestedLeadId && pageData.leads.some((lead) => lead.id === requestedLeadId)
    ? requestedLeadId
    : undefined;
  const assignmentLeadOptions = pageData.leads
    .filter((lead) => !lead.assignedTo || !lead.stageId)
    .slice(0, 20)
    .map((lead) => ({
      value: lead.id,
      label: `${leadNamesById[lead.id] || "Lead"} • ${lead.state ? `${formatLeadStateLabel(lead.state)} • ` : ""}${lead.email || lead.whatsappNumber || "No contact yet"}`.trim(),
      assignedTo: lead.assignedTo,
      stage: lead.stageId ?? "new",
      priority: lead.priority,
    }));
  const openTasks = pageData.tasks.filter((task) => !task.completedAt);
  const overdueCount = pageData.tasks.filter((task) => isTaskOverdue(task)).length;
  const todayCount = pageData.tasks.filter((task) => isDateToday(task.dueAt) && !task.completedAt).length;
  const completedCount = pageData.tasks.filter((task) => Boolean(task.completedAt)).length;
  const linkedLeadCount = new Set(pageData.tasks.map((task) => task.leadId)).size;
  const myOpenTaskCount = pageData.tasks.filter(
    (task) =>
      task.assignedTo?.toLowerCase() === session.user?.email?.toLowerCase() &&
      !task.completedAt,
  ).length;
  const taskStats = [
    { label: "Visible", value: pageData.tasks.length, icon: ListTodo, tone: "text-cyan-200 bg-cyan-300/10 border-cyan-300/20" },
    { label: "Overdue", value: overdueCount, icon: CircleAlert, tone: "text-rose-200 bg-rose-300/10 border-rose-300/20" },
    { label: "Today", value: todayCount, icon: AlarmClockCheck, tone: "text-amber-200 bg-amber-300/10 border-amber-300/20" },
    { label: "Leads", value: linkedLeadCount, icon: Users2, tone: "text-emerald-200 bg-emerald-300/10 border-emerald-300/20" },
  ];

  return (
    <AdminShell
      activeNav="tasks"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title={accessLevel === "sales_rep" ? "My Tasks" : "Tasks"}
      description={
        accessLevel === "sales_rep"
          ? "Your follow-up queue, due dates, and completed work in one compact view."
          : "A table-first task queue for assigning, scanning, and clearing follow-up work quickly."
      }
      actions={
        <>
          {canEditTasks ? (
            <Link
              href="#task-action-center"
              className="admin-button-primary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold"
            >
              {canAssignOtherTasks ? "Assign task" : "Create task"}
            </Link>
          ) : null}
          <AdminSignOutButton />
        </>
      }
    >
      <div className="space-y-6">
        <FilterBar>
          <div className="flex flex-col gap-3">
            <nav className="flex flex-wrap gap-2" aria-label="Task views">
              {availableViews.map((option) => {
                const isActive = option === view;

                return (
                  <Link
                    key={option}
                    href={buildTaskViewHref(option, assignedTo)}
                    className={
                      isActive
                        ? "inline-flex shrink-0 items-center rounded-full border border-[#0b123f] bg-[#0b123f] px-4 py-2 text-sm font-semibold text-white"
                        : "admin-button-secondary inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium"
                    }
                  >
                    {formatTaskView(option)}
                  </Link>
                );
              })}
            </nav>

            {accessLevel === "sales_rep" ? null : (
              <form action={appRoutes.tasks} className="grid max-w-[640px] gap-2 sm:grid-cols-[minmax(0,240px)_150px_150px]">
                <input type="hidden" name="view" value={view} />
                <AdminSelect
                  name="assignedTo"
                  defaultValue={assignedTo ?? ""}
                  className="h-11"
                >
                  <option value="">All owners</option>
                  {pageData.users.map((user) => (
                    <option key={user.id} value={user.email}>
                      {user.fullName || user.email}{!user.isActive ? " (inactive)" : ""}
                    </option>
                  ))}
                </AdminSelect>
                <SmoothButton
                  type="submit"
                  variant="primary"
                  className="h-11 rounded-2xl"
                >
                  Apply
                </SmoothButton>
                <Link
                  href={`${appRoutes.tasks}?view=${view}`}
                  className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
                >
                  Clear
                </Link>
              </form>
            )}
          </div>
        </FilterBar>

        <section className="space-y-5 ld-animate-fade-in-up">
          <GlassSurface as="section" className="rounded-[24px] p-2.5 sm:p-3">
            <div className="grid gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4">
              {taskStats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex min-w-0 items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.045] px-3 py-3"
                >
                  <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] border ${stat.tone}`}>
                    <stat.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                      {stat.label}
                    </p>
                    <p className="mt-0.5 text-xl font-semibold tracking-[-0.04em] text-white">
                      {stat.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlassSurface>
        </section>

        <section className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0">
            <GlassSurface as="section" className="rounded-[28px] p-5 sm:p-6 ld-animate-fade-in-up">
              <SectionHeader
                eyebrow="Work queue"
                title={formatTaskView(view)}
                description="Tasks stay linked to their lead."
              />
              <div className="mt-4">
                <TaskQueueTable
                  tasks={pageData.tasks}
                  emptyTitle="No tasks match this view"
                  emptyDescription="Create a task from the action center to keep follow-up work visible."
                  canCompleteTasks={canEditTasks && !usingDevelopmentDemoData}
                />
              </div>
            </GlassSurface>
          </div>

          <div className="min-w-0">
            <GlassSurface as="section" className="rounded-[28px] p-5 ld-animate-fade-in-up">
              <SectionHeader
                eyebrow={accessLevel === "sales_rep" ? "My task health" : "Queue health"}
                title="At a glance"
              />
              <div className="mt-4 grid gap-2 min-[420px]:grid-cols-2 2xl:grid-cols-1">
                {[
                  { label: "Open", value: openTasks.length },
                  { label: "Mine", value: myOpenTaskCount },
                  { label: "Completed", value: completedCount },
                  { label: "Overdue", value: overdueCount, danger: overdueCount > 0 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3.5">
                    <span className="text-sm text-white/68">{item.label}</span>
                    <span className={item.danger ? "font-semibold text-rose-200" : "font-semibold text-white"}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </GlassSurface>
          </div>
        </section>

        {canEditTasks ? (
          <div id="task-action-center" className="scroll-mt-24">
            <AdminWorkspaceComposer
              accessLevel={accessLevel}
              leadOptions={leadOptions}
              assignmentLeadOptions={assignmentLeadOptions}
              assigneeOptions={assigneeOptions}
              defaultAssignedTo={canAssignOtherTasks ? "" : session.user?.email ?? ""}
              defaultLeadId={defaultLeadId}
              variant="compact"
              leadCaptureCustomFields={leadCaptureCustomFields}
              allowedModes={["task"]}
            />
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
