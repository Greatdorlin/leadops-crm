import type { LeadsDeskRole } from "./roles";
import type { PermissionKey } from "./role-permissions-contract";
export const GUIDE_VERSION = 1;
export type GuideStep = {
  title: string;
  description: string;
  href: string;
  label: string;
};
export function workspaceGuide(
  role: LeadsDeskRole,
  permissions: readonly PermissionKey[],
): GuideStep[] {
  const steps: GuideStep[] = [
    {
      title: "Your workspace, at a glance",
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
      title: "Every conversation has a next step",
      description:
        "Open a lead to review notes and tasks. Lost removes open pipeline value. Unqualified asks whether one product or all current products are affected.",
      href: "/leads",
      label: "Open leads",
    });
  if (permissions.includes("canEditLeads"))
    steps.push({
      title: "Keep follow-ups moving",
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
      title: "Understand what is working",
      description:
        "Reports show sales outcomes in your access scope. Review the period and currency before comparing results.",
      href: "/reports",
      label: "Open reports",
    });
  steps.push({
    title: "A private place for conversations",
    description:
      "Inbox keeps team conversations limited to their participants. Linking a lead also requires current access to that lead. Customer email becomes available after the owner verifies a mailbox.",
    href: "/inbox",
    label: "Open Inbox",
  });
  if (role === "owner" || role === "admin")
    steps.push({
      title: "Make the workspace yours",
      description:
        "Set your currency, products, essential stages and appearance in Settings. Automatic exchange rates are available, with optional manual overrides.",
      href: "/settings",
      label: "Open settings",
    });
  steps.push({
    title: "You can revisit this guide",
    description:
      "Open Settings → Workspace guide, or find Workspace guide in My profile. You can repeat it whenever you need a refresher.",
    href: "/profile",
    label: "Open my profile",
  });
  return steps;
}
