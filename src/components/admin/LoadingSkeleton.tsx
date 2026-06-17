import { cn } from "@/lib/cn";

export function LoadingSkeleton({
  className,
  rows = 4,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <div className={cn("admin-surface-soft rounded-2xl p-6", className)}>
      <div className="h-6 w-40 animate-pulse rounded-full bg-slate-200" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="h-4 animate-pulse rounded-full bg-[linear-gradient(90deg,#e5e7eb,#f8fafc,#e5e7eb)] bg-[length:180%_100%]"
          />
        ))}
      </div>
    </div>
  );
}
