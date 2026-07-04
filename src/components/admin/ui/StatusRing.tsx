import { cn } from "@/lib/cn";
import type { ComponentPropsWithoutRef } from "react";

export interface StatusRingProps extends ComponentPropsWithoutRef<"svg"> {
  progress: number;
  size?: number;
  color?: string;
  trackColor?: string;
  strokeWidth?: number;
  animated?: boolean;
}

export function StatusRing({
  progress,
  size = 64,
  color = "var(--ld-color-primary)",
  trackColor = "rgba(255, 255, 255, 0.08)",
  strokeWidth = 6,
  animated = true,
  className,
  ...props
}: StatusRingProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedProgress / 100) * circumference;

  return (
    <svg
      {...props}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("-rotate-90", className)}
      aria-label={`Progress: ${Math.round(clampedProgress)}%`}
      role="progressbar"
      aria-valuenow={clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{
          transition: animated ? "stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)" : undefined,
        }}
      />
    </svg>
  );
}
