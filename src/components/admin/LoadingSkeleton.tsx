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
      <div className="h-6 w-40 overflow-hidden rounded-full bg-white/[0.08]">
        <div className="h-full w-full ld-animate-shimmer" />
      </div>
      <div className="mt-5 space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="h-4 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full w-full ld-animate-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}
