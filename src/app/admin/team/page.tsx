import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LeadTable } from "@/components/admin/LeadTable";
import { MetricCard } from "@/components/admin/MetricCard";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { TeamAvatar } from "@/components/admin/TeamAvatar";
import { getAdminAccessContext } from "@/lib/admin";
import {
  buildNextFollowUpByLeadId,
  buildTeamPerformance,
  isTaskOverdue,
} from "@/lib/admin-insights";
import { canViewSalesTeam } from "@/lib/admin-permissions";
import { crmLabelize } from "@/lib/crm/formatters";
import { loadAdminLeadReadContext } from "@/lib/crm/admin-read-context";
import { getCrmPageErrorCopy, logCrmPageError } from "@/lib/crm/runtime";
import { buildAdminLeadListItem } from "@/lib/crm/view-models";
import { leadStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

function safeNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

export default async function AdminTeamPage() {
  const { role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext("/admin/team");
  if (!canViewSalesTeam(accessLevel)) {
    redirect("/admin");
  }

  let pageData:
    | {
        users: Awaited<ReturnType<typeof leadStore.listCrmUsers>>;
        leads: Awaited<ReturnType<typeof leadStore.list>>;
        tasks: Awaited<ReturnType<typeof leadStore.listLeadTasks>>;
      }
    | null = null;
  let pageError: unknown = null;

  try {
    const [users, leads, tasks] = await Promise.all([
      leadStore.listCrmUsers(),
      leadStore.list(),
      leadStore.listLeadTasks(),
    ]);

    pageData = { users, leads, tasks };
  } catch (error) {
    pageError = error;
    logCrmPageError("team", error);
  }

  if (!pageData) {
    const errorCopy = getCrmPageErrorCopy(pageError);

    return (
      <AdminShell
        activeNav="team"
        accessLevel={accessLevel}
        role={role}
        actualAccessLevel={actualAccessLevel}
        canSwitchAccessViews={canSwitchAccessViews}
        title="Sales team"
        description="Rep performance, follow-up coverage, and lead ownership in one management view."
        actions={<AdminSignOutButton />}
      >
        <ErrorState
          title={errorCopy.title}
          description={errorCopy.description}
          details={errorCopy.details}
        />
      </AdminShell>
    );
  }

  const { users, leads, tasks } = pageData;
  const teamRows = buildTeamPerformance(users, leads, tasks);
  const nextFollowUpByLeadId = buildNextFollowUpByLeadId(tasks);
  const assigneeOptions = users
    .filter((user) => user.isActive)
    .map((user) => ({
      value: user.email,
      label: user.fullName || user.email,
    }));
  const unassignedLeads = leads.filter((lead) => !lead.assignedTo).slice(0, 8);
  const readContext = await loadAdminLeadReadContext(unassignedLeads);
  const unassignedLeadRows = unassignedLeads.map((lead) =>
    buildAdminLeadListItem(lead, {
      nextFollowUpAt: nextFollowUpByLeadId[lead.id],
      stage: lead.stageId ? readContext.stagesById.get(lead.stageId) ?? null : null,
      source: lead.sourceId ? readContext.sourcesById.get(lead.sourceId) ?? null : null,
      owner: lead.assignedUserId ? readContext.ownersById.get(lead.assignedUserId) ?? null : null,
    }),
  );
  const overdueTasks = tasks.filter((task) => isTaskOverdue(task));
  const teamQualifiedLeads = teamRows.reduce((total, row) => total + row.qualifiedLeads, 0);
  const teamConvertedLeads = teamRows.reduce((total, row) => total + row.convertedLeads, 0);

  return (
    <AdminShell
      activeNav="team"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Sales team"
      description="See workload, ownership, and follow-up pressure."
      actions={
        <>
          <Link
            href="/admin/tasks#create-task"
            className="admin-button-primary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold"
          >
            Assign task
          </Link>
          <Link
            href="/admin"
            className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
          >
            Open leads
          </Link>
          <AdminSignOutButton />
        </>
      }
    >
      <div className="space-y-6">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Active reps"
            value={safeNumber(teamRows.length)}
            supporting="Team members currently carrying active lead or task work."
            tone="accent"
          />
          <MetricCard
            label="Assigned leads"
            value={safeNumber(teamRows.reduce((total, row) => total + row.assignedLeads, 0))}
            supporting="Lead records already routed to named owners."
          />
          <MetricCard
            label="Open tasks"
            value={safeNumber(teamRows.reduce((total, row) => total + row.openTasks, 0))}
            supporting="Follow-ups that still need completion."
          />
          <MetricCard
            label="Qualified leads"
            value={safeNumber(teamQualifiedLeads)}
            supporting="Leads already progressing beyond first contact."
            tone="warning"
          />
          <MetricCard
            label="Converted leads"
            value={safeNumber(teamConvertedLeads)}
            supporting="Leads already moved into a completed outcome."
            tone="positive"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.92fr)]">
          <div className="space-y-6">
            <section className="admin-surface rounded-[28px] p-5 md:p-6">
              <SectionHeader
                eyebrow="Sales rep performance"
                title="Rep performance"
                description="See who is carrying the queue, where follow-ups are slipping, and who has room for more."
              />
              <div className="mt-4 overflow-x-auto">
                {teamRows.length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-white/10 text-white/50">
                      <tr>
                        {[
                          "Rep",
                          "Role",
                          "Assigned",
                          "Open tasks",
                          "Overdue",
                          "Won",
                        ].map((heading) => (
                          <th key={heading} className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em]">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {teamRows.map((row) => (
                        <tr key={row.id} className="border-b border-white/[0.055] align-top transition hover:bg-white/[0.045]">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <TeamAvatar
                                name={row.fullName}
                                email={row.email}
                                avatarUrl={row.avatarUrl}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-white">{row.fullName || row.email}</p>
                                <p className="mt-1 truncate text-xs text-white/52">{row.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-white/70">{crmLabelize(row.accessLevel)}</td>
                          <td className="px-4 py-4 text-white/70">{row.assignedLeads}</td>
                          <td className="px-4 py-4 text-white/70">{row.openTasks}</td>
                          <td className="px-4 py-4">
                            <span
                              className={
                                row.overdueTasks > 0
                                  ? "rounded-full border border-rose-300/24 bg-rose-400/12 px-3 py-1 text-xs font-semibold text-rose-100"
                                  : "rounded-full border border-emerald-300/24 bg-emerald-400/12 px-3 py-1 text-xs font-semibold text-emerald-100"
                              }
                            >
                              {row.overdueTasks}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-white/70">{row.convertedLeads}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyState
                    title="No sales team activity yet"
                    description="Rep performance will appear here once leads and tasks are assigned."
                  />
                )}
              </div>
            </section>

            <LeadTable
              leads={unassignedLeadRows}
              eyebrow="Needs assignment"
              title="Unassigned leads"
              description="Assign ownership before these leads lose momentum."
              emptyTitle="No unassigned leads"
              emptyDescription="Every lead currently in view already has an owner."
              assigneeOptions={assigneeOptions}
            />
          </div>

          <div className="space-y-6">
            <section className="admin-surface rounded-[28px] p-5 md:p-6">
              <SectionHeader
                eyebrow="Pressure points"
                title="Follow-up pressure"
                description="The clearest signals shaping team workload right now."
              />
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                <MetricCard
                  label="Overdue tasks"
                  value={safeNumber(overdueTasks.length)}
                  supporting="Tasks that have slipped past their due date."
                  tone={overdueTasks.length > 0 ? "danger" : "positive"}
                />
                <MetricCard
                  label="Reps with overdue work"
                  value={safeNumber(teamRows.filter((row) => row.overdueTasks > 0).length)}
                  supporting="People who may need support or rebalancing."
                  tone="warning"
                />
                <MetricCard
                  label="High-priority leads"
                  value={safeNumber(teamRows.reduce((total, row) => total + row.highPriorityLeads, 0))}
                  supporting="Priority leads that should be handled before routine work."
                />
              </div>
            </section>

            <section className="admin-surface rounded-[28px] p-5 md:p-6">
              <SectionHeader
                eyebrow="Task assignment"
                title="Who needs attention"
                description="Surface the teammates whose queue needs help first."
              />
              <div className="mt-4 space-y-3">
                {teamRows.filter((row) => row.overdueTasks > 0).length > 0 ? (
                  teamRows
                    .filter((row) => row.overdueTasks > 0)
                    .slice(0, 5)
                    .map((row) => (
                      <div
                        key={row.id}
                        className="admin-surface-soft rounded-[24px] px-4 py-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{row.fullName || row.email}</p>
                            <p className="mt-1 text-sm text-white/58">
                              {row.overdueTasks} overdue • {row.openTasks} open tasks
                            </p>
                          </div>
                          <Link
                            href={`/admin/tasks?assignedTo=${encodeURIComponent(row.email)}&view=all`}
                            className="rounded-full border border-cyan-200/18 bg-cyan-300/10 px-3 py-1.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/16"
                          >
                            Open tasks
                          </Link>
                        </div>
                      </div>
                    ))
                ) : (
                  <EmptyState
                    title="No overdue workload"
                    description="No team member currently needs task reassignment for overdue work."
                    action={
                      <Link
                        href="/admin/tasks"
                        className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
                      >
                        Open tasks
                      </Link>
                    }
                  />
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
