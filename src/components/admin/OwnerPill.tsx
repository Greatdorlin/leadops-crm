import { cn } from "@/lib/cn";
import { AnimatedCard } from "./ui/AnimatedCard";
import { TeamAvatar } from "./TeamAvatar";

export function OwnerPill({
  name,
  email,
  avatarUrl,
  className,
}: {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  className?: string;
}) {
  const label = name || email || "Unassigned";

  return (
    <AnimatedCard
      variant="default"
      animation="fadeIn"
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] py-1 pl-1 pr-3 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        className,
      )}
      style={{ borderRadius: '9999px' }}
    >
      <TeamAvatar name={name} email={email} avatarUrl={avatarUrl} size="sm" />
      <span className="truncate">{label}</span>
    </AnimatedCard>
  );
}
