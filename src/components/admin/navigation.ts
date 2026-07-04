import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  FormInput,
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
import { appRoutes } from "@/lib/app-routes";

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
    href: appRoutes.dashboard,
    icon: LayoutDashboard,
    description: "Daily priorities, lead queues, and the clearest next actions.",
  },
  {
    key: "leads",
    label: "Leads",
    href: appRoutes.leads,
    icon: BriefcaseBusiness,
    description: "Lead queue, ownership, and follow-up context.",
  },
  {
    key: "forms",
    label: "Forms",
    href: appRoutes.forms,
    icon: FormInput,
    description: "Build forms, capture leads, and automate qualification.",
  },
  {
    key: "tasks",
    label: "Tasks",
    href: appRoutes.tasks,
    icon: ListTodo,
    description: "Today's follow-ups, overdue work, and completed activity.",
  },
  {
    key: "team",
    label: "Team",
    href: appRoutes.team,
    icon: Users2,
    description: "Rep coverage, workload, and sales performance.",
  },
  {
    key: "reports",
    label: "Reports",
    href: appRoutes.reports,
    icon: BarChart3,
    description: "Pipeline, source, and conversion performance.",
  },
  {
    key: "notifications",
    label: "Notifications",
    href: appRoutes.notifications,
    icon: Bell,
    description: "Assigned leads, follow-up alerts, and intake activity.",
  },
  {
    key: "integrations",
    label: "Intake",
    href: appRoutes.intake,
    icon: PlugZap,
    description: "Connected forms, imports, exports, and source activity.",
  },
  {
    key: "settings",
    label: "Settings",
    href: appRoutes.settings,
    icon: Settings2,
    description: "Brand, controls, team settings, and workspace setup.",
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
    case "forms":
      return "My Forms";
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
