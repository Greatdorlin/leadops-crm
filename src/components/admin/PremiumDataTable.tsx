import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { GlassCard } from "./GlassCard";

export interface PremiumDataTableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T, index: number) => ReactNode;
  className?: string;
}

export function PremiumDataTable<T>({
  columns,
  data,
  getRowKey,
  emptyState,
  className,
}: {
  columns: Array<PremiumDataTableColumn<T>>;
  data: T[];
  getRowKey: (row: T, index: number) => string;
  emptyState?: ReactNode;
  className?: string;
}) {
  return (
    <GlassCard className={cn("overflow-x-auto p-0", className)}>
      {data.length > 0 ? (
        <table className="ld-readable-table min-w-full">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "sticky top-0 z-10 border-b border-white/10 bg-[color:color-mix(in_srgb,var(--ld-color-background)_94%,#060812_6%)] backdrop-blur-md",
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={getRowKey(row, index)}
                className="transition-all duration-200 hover:bg-white/[0.06] ld-animate-fade-in-up"
                style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
              >
                {columns.map((column) => (
                  <td key={column.key} className={column.className}>
                    {column.render(row, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="p-6">{emptyState}</div>
      )}
    </GlassCard>
  );
}
