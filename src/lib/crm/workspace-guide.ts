import type { LeadsDeskRole } from "./roles";
import type { PermissionKey } from "./role-permissions-contract";
export const GUIDE_VERSION = 2;
export type GuideStep = {
  title: string;
  description: string;
  href: string;
  label: string;
  target?: string;
  action?: string;
};
export function workspaceGuide(
  role: LeadsDeskRole,
  permissions: readonly PermissionKey[],
): GuideStep[] {
  const steps: GuideStep[] = [
    {
      title: "Dashboard",
      description:
        role === "affiliate"
          ? "See the enquiries you referred and their current progress. Your access stays limited to your own records."
          : "Your dashboard brings together the leads, follow-ups and results your role can access.",
      href: "/dashboard",
      label: "Open dashboard",
    },
  ];
  if (permissions.includes("canViewLeads"))
    steps.push({
      title: "Leads",
      description:
        "Open a lead to review notes and tasks. Lost removes open pipeline value. Unqualified asks whether one product or all current products are affected.",
      href: "/leads",
      label: "Open leads",
    });
  if (permissions.includes("canEditLeads"))
    steps.push({
      title: "Tasks",
      description:
        "Use tasks to record the next action and due date. A promised payment belongs in a note until money is actually received.",
      href: "/tasks",
      label: "Open tasks",
    });
  if (role === "finance")
    steps.push({
      title: "Review recorded payments",
      description:
        "Check submitted payments and their supporting details. Confirm only payments you have verified; a promise to pay is not received revenue.",
      href: "/leads",
      label: "Review leads",
    });
  if (permissions.includes("canViewReports"))
    steps.push({
      title: "Reports",
      description:
        "Reports show sales outcomes in your access scope. Use the report sections to review pipeline, team performance and source quality.",
      href: "/reports",
      label: "Open reports",
    });
  steps.push({
    title: "Inbox",
    description:
      "Inbox keeps team conversations limited to their participants. Linking a lead also requires current access to that lead. Choose one teammate for a direct message or several for a private group.",
    href: "/inbox",
    label: "Open Inbox",
  });
  if (role === "owner" || role === "admin")
    steps.push({
      title: "Settings",
      description:
        "Set your currency, products, essential stages and appearance in Settings. Automatic exchange rates are available, with optional manual overrides.",
      href: "/settings",
      label: "Open settings",
    });
  if (permissions.includes("canViewLeads"))
    steps.push({
      title: "Assistant",
      description:
        "Try “Find a lead named Mathew” or “What are our main objections?” The assistant searches records and saved notes within your access. If no lead matches, it says so.",
      href: "/assistant",
      label: "Open assistant",
      action:
        "Try a question in the message box. No changes are made without review.",
    });
  steps.push({
    title: "Profile",
    description:
      "Open Settings → Workspace guide, or find Workspace guide in My profile. You can repeat it whenever you need a refresher.",
    href: "/profile",
    label: "Open my profile",
  });
  return steps.map((step) => ({
    ...step,
    target:
      (
        {
          "/dashboard":
            '[data-tour="dashboard-results"], [data-tour-page="dashboard"] > :first-child',
          "/leads": '[data-tour="lead-queue"]',
          "/tasks": '[data-tour="task-queue"]',
          "/inbox": '[data-tour="team-inbox"]',
        } as Record<string, string>
      )[step.href] ?? `[data-tour-page="${step.href.slice(1)}"] > :first-child`,
    action:
      step.action ??
      (
        {
          "/dashboard":
            "Check your target period and currency, then explore the figures.",
          "/leads":
            "Use search or filters to find a lead. Open a record to see notes and follow-ups.",
          "/tasks":
            "Switch between overdue, today and completed work to see what needs attention.",
          "/reports":
            "Use the report sections to compare outcomes and follow-up pressure.",
          "/inbox": "Use + to choose teammates and start a private message.",
          "/settings":
            "Open a setting to see its controls. The tour does not save any changes.",
          "/profile": "Your details and personal preferences live here.",
        } as Record<string, string>
      )[step.href],
  }));
}
