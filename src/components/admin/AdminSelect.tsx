import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export function AdminSelect({
  children,
  className,
  icon,
  ...props
}: ComponentPropsWithoutRef<"select"> & {
  icon?: ReactNode;
}) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn(
          "admin-select h-12 w-full appearance-none rounded-[20px] pl-4 pr-12 text-sm outline-none",
          className,
        )}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-1.5 right-1.5 inline-flex w-9 items-center justify-center rounded-[14px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(244,247,252,0.94)_100%)] text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
        {icon ?? <ChevronDown className="h-4 w-4" />}
      </span>
    </div>
  );
}
