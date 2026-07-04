"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const tabs = [
  { id: "overview", label: "Overview", path: (id: string) => `/forms/${id}` },
  { id: "fields", label: "Fields", path: (id: string) => `/forms/${id}/fields` },
  { id: "rules", label: "Rules", path: (id: string) => `/forms/${id}/rules` },
  { id: "settings", label: "Settings", path: (id: string) => `/forms/${id}/settings` },
  { id: "embed", label: "Embed", path: (id: string) => `/forms/${id}/embed` },
  { id: "preview", label: "Preview", path: (id: string) => `/forms/${id}/preview` },
  { id: "submissions", label: "Submissions", path: (id: string) => `/forms/${id}/submissions` },
];

export function FormTabNav({ formId }: { formId: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const href = tab.path(formId);
        const isActive =
          tab.id === "overview"
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={tab.id}
            href={href}
            className={cn(
              "inline-flex h-9 items-center justify-center rounded-xl px-3.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "admin-button-primary shadow-[0_8px_24px_color-mix(in_srgb,var(--ld-color-primary)_20%,transparent)]"
                : "border border-transparent text-white/70 hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
