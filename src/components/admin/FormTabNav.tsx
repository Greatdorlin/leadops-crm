"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appRoutes } from "@/lib/app-routes";
import { cn } from "@/lib/cn";

const tabs = [
  { id: "fields", label: "1. Build", path: (id: string) => `${appRoutes.form(id)}/fields`, primary: true },
  { id: "preview", label: "2. Preview", path: (id: string) => `${appRoutes.form(id)}/preview`, primary: true },
  { id: "embed", label: "3. Share", path: (id: string) => `${appRoutes.form(id)}/embed`, primary: true },
  { id: "submissions", label: "Responses", path: (id: string) => `${appRoutes.form(id)}/submissions` },
  { id: "settings", label: "Settings", path: (id: string) => `${appRoutes.form(id)}/settings` },
  { id: "rules", label: "Logic", path: (id: string) => `${appRoutes.form(id)}/rules` },
  { id: "overview", label: "Overview", path: (id: string) => appRoutes.form(id) },
];

export function FormTabNav({ formId }: { formId: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Form builder" className="flex flex-wrap items-center gap-2">
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
                : tab.primary
                  ? "border border-white/12 bg-white/[0.04] text-white/78 hover:bg-white/[0.08] hover:text-white"
                  : "border border-transparent text-white/55 hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
