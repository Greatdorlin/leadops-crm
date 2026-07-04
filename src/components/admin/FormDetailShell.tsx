"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { SmoothButton } from "@/components/admin/ui/SmoothButton";
import { useFormDetail } from "@/components/admin/FormDetailProvider";
import { cn } from "@/lib/cn";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import type { CrmUserRole } from "@/lib/crm/types";
import type { ReactNode } from "react";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "fields", label: "Fields" },
  { id: "rules", label: "Rules" },
  { id: "settings", label: "Settings" },
  { id: "preview", label: "Preview" },
  { id: "submissions", label: "Submissions" },
];

export function FormDetailShell({
  children,
  accessLevel,
  role,
  actualAccessLevel,
  canSwitchAccessViews,
  userName,
  userEmail,
  userAvatarUrl,
}: {
  children: ReactNode;
  accessLevel: AdminAccessLevel;
  role?: CrmUserRole | null;
  actualAccessLevel?: AdminAccessLevel;
  canSwitchAccessViews?: boolean;
  userName?: string | null;
  userEmail?: string | null;
  userAvatarUrl?: string | null;
}) {
  const { form, activeTab, setActiveTab } = useFormDetail();

  return (
    <AdminShell
      activeNav="forms"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title={form?.name || "Form"}
      description="Build, preview, and manage form fields, rules, and submissions."
      userName={userName}
      userEmail={userEmail}
      userAvatarUrl={userAvatarUrl}
      actions={<AdminSignOutButton />}
    >
      <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {tabs.map((tab) => (
          <SmoothButton
            key={tab.id}
            variant={activeTab === tab.id ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "transition-all duration-200",
              activeTab === tab.id
                ? "shadow-[0_8px_24px_color-mix(in_srgb,var(--ld-color-primary)_20%,transparent)]"
                : "hover:bg-white/[0.06]"
            )}
          >
            {tab.label}
          </SmoothButton>
        ))}
      </div>
      <div className="min-h-[400px]">{children}</div>
    </AdminShell>
  );
}
