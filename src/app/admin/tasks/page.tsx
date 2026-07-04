import Link from "next/link";
import { AlarmClockCheck, CircleAlert, ListTodo, Users2 } from "lucide-react";
import { AdminWorkspaceComposer } from "@/components/admin/AdminWorkspaceComposer";
import { AdminShell } from "@/components/admin/AdminShell";
import { ErrorState } from "@/components/admin/ErrorState";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { FilterBar } from "@/components/admin/FilterBar";
import { MetricCard } from "@/components/admin/MetricCard";
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { SmoothButton } from "@/components/admin/ui/SmoothButton";
import { QueueStatChip } from "@/components/admin/QueueStatChip";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { TaskQueueTable } from "@/components/admin/TaskQueueTable";
import { getAdminAccessContext } from "@/lib/admin";
import { isDateToday, isTaskOverdue } from "@/lib/admin-insights";
import { canAssignTasksToOthers } from "@/lib/admin-permissions";
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
  const lead = {
    id: "demo-task-lead",
    firstName: "Michael",
    lastName: "Anderson",
    email: "michael@vertexlabs.example",
    whatsappNumber: "+1 (415) 555-0198",
    state: "San Francisco",
    country: "United States",
    region: "California",
    city: "San Francisco",
    companyName: "Vertex Labs",
    assignedTo: "sarah@local.leadsdesk.test",
    stageId: null,
    priority: "high",
  } as Awaited<ReturnType<typeof leadStore.list>>[number];
  const dueToday = new Date(now);
  dueToday.setHours(16, 0, 0, 0);

  return {
    users: [
      {
        id: "demo-user-sarah",
        email: "sarah@local.leadsdesk.test",
        fullName: "Sarah Kim",
        role: "manager",
        isActive: true,
        avatarUrl: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: "demo-user-james",
        email: "james@local.leadsdesk.test",
        fullName: "James Lee",
        role: "sales_agent",
        isActive: true,
        avatarUrl: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ] as Awaited<ReturnType<typeof leadStore.listCrmUsers>>,
    tasks: [
      {
        id: "demo-task-follow-up",
        leadId: lead.id,
        title: "Follow up with Vertex Labs",
        description: "Confirm timeline and decision maker before the proposal call.",
        dueAt: dueToday.toISOString(),
        completedAt: null,
        assignedTo: "sarah@local.leadsdesk.test",
        createdBy: "preview@local.leadsdesk.test",
        createdAt: now.toISOString(),
      },
    ] as Awaited<ReturnType<typeof leadStore.listLeadTasks>>,
    leads: [lead] as Awaited<ReturnType<typeof leadStore.list>>,
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
  } = await getAdminAccessContext(appRoutes.tasks);
  const params = await searchParams;
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
        tasks: Awaited<ReturnType<typeof leadStore.listLeadTasks>>;
        leads: Awaited<ReturnType<typeof leadStore.list>>;
      }
    | null = null;
  let pageError: unknown = null;

  try {
    const [users, tasks, leads] = await Promise.all([
      leadStore.listCrmUsers(),
      leadStore.listLeadTasks({
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
      }),
      leadStore.list(
        accessLevel === "sales_rep" ? { assignedTo: session.user?.email ?? undefined } : undefined,
      ),
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

  try {
    leadCaptureCustomFields = (await listCustomFields()).filter(
      (field) => field.showInForm && !field.archived,
    );
  } catch (error) {
    logCrmPageError("tasks-custom-fields", error);
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
    accessLevel === "sales_rep"
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
  const leadStateById = Object.fromEntries(pageData.leads.map((lead) => [lead.id, lead.state]));
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
          <Link
            href="#task-action-center"
            className="admin-button-primary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold"
          >
            {canAssignTasksToOthers(accessLevel) ? "Assign task" : "Create task"}
          </Link>
          <AdminSignOutButton />
        </>
      }
    >
      <div className="space-y-6">
        <SectionHeader
          eyebrow="Task queue"
          title={accessLevel === "sales_rep" ? "My Tasks" : "Tasks"}
          description={
            accessLevel === "sales_rep"
              ? "Your follow-up queue, due dates, and completed work in one compact view."
              : "A table-first task queue for assigning, scanning, and clearing follow-up work quickly."
          }
          className="ld-animate-fade-in-up"
        />
        <FilterBar>
          <div className="flex flex-col gap-3">
            <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Task views">
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

        <section className="space-y-6 ld-animate-fade-in-up">
          <GlassSurface as="section" className="rounded-[28px] p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              <QueueStatChip
                label="Visible tasks"
                value={pageData.tasks.length}
                hint="Tasks inside the current view."
                icon={ListTodo}
                tone="accent"
              />
              <QueueStatChip
                label="Overdue"
                value={overdueCount}
                hint="Follow-ups that need a catch-up today."
                icon={CircleAlert}
                tone={overdueCount > 0 ? "danger" : "positive"}
              />
              <QueueStatChip
                label="Due today"
                value={todayCount}
                hint="Tasks scheduled for today."
                icon={AlarmClockCheck}
                tone="warning"
              />
              <QueueStatChip
                label="Linked leads"
                value={linkedLeadCount}
                hint="Lead records represented in this queue."
                icon={Users2}
              />
            </div>
          </GlassSurface>

          <div id="task-action-center">
            <AdminWorkspaceComposer
              accessLevel={accessLevel}
              leadOptions={leadOptions}
              assignmentLeadOptions={assignmentLeadOptions}
              assigneeOptions={assigneeOptions}
              defaultAssignedTo={accessLevel === "sales_rep" ? session.user?.email ?? "" : ""}
              defaultLeadId={defaultLeadId}
              variant="compact"
              leadCaptureCustomFields={leadCaptureCustomFields}
              allowedModes={["task"]}
            />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-8">
            <GlassSurface as="section" className="rounded-[28px] p-5 sm:p-6 ld-animate-fade-in-up">
              <SectionHeader
                eyebrow="Work queue"
                title={formatTaskView(view)}
                description="Every task stays tied to its lead so the next action and handoff remain obvious."
              />
              <div className="mt-4">
                <TaskQueueTable
                  tasks={pageData.tasks}
                  leadNamesById={leadNamesById}
                  leadStateById={leadStateById}
                  emptyTitle="No tasks match this view"
                  emptyDescription="Create a task from the action center to keep follow-up work visible."
                />
              </div>
            </GlassSurface>
          </div>

          <div className="space-y-6 xl:col-span-4">
            <GlassSurface as="section" className="rounded-[28px] p-5 ld-animate-fade-in-up">
              <SectionHeader
                eyebrow={accessLevel === "sales_rep" ? "My task health" : "Queue health"}
                title={accessLevel === "sales_rep" ? "Today at a glance" : "Task coverage"}
                description={
                  accessLevel === "sales_rep"
                    ? "The small numbers that tell you what to clear first."
                    : "Quick signals for balancing the current follow-up load."
                }
              />
              <div className="mt-4 grid gap-3">
                <MetricCard
                  label="Open tasks"
                  value={openTasks.length}
                  supporting="Tasks still waiting to be closed."
                />
                <MetricCard
                  label="Completed"
                  value={completedCount}
                  supporting="Tasks already finished in this view."
                  tone="positive"
                />
                <MetricCard
                  label="My open tasks"
                  value={
                    pageData.tasks.filter(
                      (task) =>
                        task.assignedTo?.toLowerCase() === session.user?.email?.toLowerCase() &&
                        !task.completedAt,
                    ).length
                  }
                  supporting="Visible open tasks assigned to you."
                />
                <MetricCard
                  label="Overdue"
                  value={overdueCount}
                  supporting="Work that needs immediate attention."
                  tone="danger"
                />
              </div>
            </GlassSurface>

            <GlassSurface as="section" className="rounded-[28px] p-5 ld-animate-fade-in-up">
              <SectionHeader
                eyebrow="Completed work"
                title="Recently closed"
                description="A quick count so the queue doesn't feel endless."
              />
              <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/70">
                {completedCount > 0
                  ? `${completedCount} task${completedCount === 1 ? "" : "s"} already completed in this view.`
                  : "No completed tasks in this view yet."}
              </div>
            </GlassSurface>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
