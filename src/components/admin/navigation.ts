import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  LayoutDashboard,
  ListTodo,
  PlugZap,
  Settings2,
  Users2,
} from "lucide-react";
import {
  getVisibleAdminNavKeys,
  type AdminAccessLevel,
} from "@/lib/admin-permissions";
import type { NavigationCustomizationConfig, NavigationItemKey } from "@/lib/crm/workspace-settings";
import { resolveNavigationItems } from "@/lib/crm/workspace-settings";
import type { CrmUserRole } from "@/lib/crm/types";

export interface AdminNavigationItem {
  key: NavigationItemKey;
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

const adminNavigation: AdminNavigationItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    description: "Daily priorities, lead queues, and the clearest next actions.",
  },
  {
    key: "leads",
    label: "Leads",
    href: "/admin/leads",
    icon: BriefcaseBusiness,
    description: "Lead queue, ownership, and follow-up context.",
  },
  {
    key: "tasks",
    label: "Tasks",
    href: "/admin/tasks",
    icon: ListTodo,
    description: "Today’s follow-ups, overdue work, and completed activity.",
  },
  {
    key: "team",
    label: "Team Dashboard",
    href: "/admin/team",
    icon: Users2,
    description: "Rep coverage, workload, and team performance.",
  },
  {
    key: "reports",
    label: "Reports",
    href: "/admin/reports",
    icon: BarChart3,
    description: "Pipeline, source, and conversion performance.",
  },
  {
    key: "notifications",
    label: "Notifications",
    href: "/admin/notifications",
    icon: Bell,
    description: "Assigned leads, follow-up alerts, and intake activity.",
  },
  {
    key: "integrations",
    label: "Integrations",
    href: "/admin/integrations",
    icon: PlugZap,
    description: "Connected tools, imports, exports, and sync activity.",
  },
  {
    key: "settings",
    label: "Settings",
    href: "/admin/settings",
    icon: Settings2,
    description: "Team roster, assignment rules, and admin setup.",
  },
];

function getRoleAwareLabel(item: AdminNavigationItem, accessLevel: AdminAccessLevel) {
  if (accessLevel !== "sales_rep") {
    return item.label;
  }

  switch (item.key) {
    case "dashboard":
      return "My Dashboard";
    case "leads":
      return "My Leads";
    case "tasks":
      return "My Tasks";
    case "reports":
      return "My Performance";
    default:
      return item.label;
  }
}

export function getAdminNavigation(
  accessLevel: AdminAccessLevel,
  role?: CrmUserRole | null,
  config?: NavigationCustomizationConfig,
) {
  const visibleKeys = new Set<string>(getVisibleAdminNavKeys(accessLevel, role));

  const visibleItems = adminNavigation
    .filter((item) => visibleKeys.has(item.key))
    .map((item) => ({
      ...item,
      label: getRoleAwareLabel(item, accessLevel),
    })) as AdminNavigationItem[];

  return config ? resolveNavigationItems<AdminNavigationItem>(visibleItems, config) : visibleItems;
}
