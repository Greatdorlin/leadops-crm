"use client";

import { ResilientImage } from "@/components/ui/ResilientImage";
import { cn } from "@/lib/cn";

function getInitials(name?: string | null, email?: string | null) {
  const source = (name || email || "Lead").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function TeamAvatar({
  name,
  email,
  avatarUrl,
  size = "md",
  className,
}: {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-base",
  }[size];

  const fallback = (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-white/16 bg-[linear-gradient(135deg,var(--ld-color-primary),var(--ld-color-accent))] font-semibold text-[color:var(--ld-color-on-primary)] shadow-[0_10px_24px_rgba(0,0,0,0.22)]",
        sizeClass,
        className,
      )}
      aria-hidden="true"
    >
      {getInitials(name, email)}
    </span>
  );

  if (avatarUrl) {
    return (
      <ResilientImage
        src={avatarUrl}
        alt={name || email || "Team member"}
        className={cn(
          "shrink-0 rounded-full border border-white/16 object-cover shadow-[0_10px_24px_rgba(0,0,0,0.22)]",
          sizeClass,
          className,
        )}
        fallback={fallback}
      />
    );
  }

  return fallback;
}
