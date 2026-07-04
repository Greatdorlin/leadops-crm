
import type { ReactNode } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";

interface FormDetailTabsProps {
  formId: string;
}

const tabs = [
  { key: "overview", label: "Overview", href: (id: string) => `/admin/forms/${id}` },
  { key: "fields", label: "Fields", href: (id: string) => `/admin/forms/${id}/fields` },
  { key: "rules", label: "Rules", href: (id: string) => `/admin/forms/${id}/rules` },
  { key: "settings", label: "Settings", href: (id: string) => `/admin/forms/${id}/settings` },
  { key: "preview", label: "Preview", href: (id: string) => `/admin/forms/${id}/preview` },
  { key: "submissions", label: "Submissions", href: (id: string) => `/admin/forms/${id}/submissions` },
];

export function FormDetailTabs({ formId }: FormDetailTabsProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
      {tabs.map((tab) => {
        const href = tab.href(formId);
        const isActive = pathname === href || (tab.key === "overview" && pathname === `/admin/forms/${formId}`);
        return (
          <Link
            key={tab.key}
            href={href}
            className={cn(
              "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-white/[0.1] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                : "text-white/60 hover:bg-white/[0.05] hover:text-white"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
