import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { SectionHeader } from "@/components/admin/ui/SectionHeader";

export interface ChartPreviewCardProps {
  title: string;
  description?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  actions?: ReactNode;
  fullWidth?: boolean;
}

export function ChartPreviewCard({
  title,
  description,
  eyebrow,
  children,
  className,
  bodyClassName,
  actions,
  fullWidth = false,
}: ChartPreviewCardProps) {
  return (
    <GlassSurface
      as="section"
      intensity="medium"
      border={true}
      className={cn(
        "rounded-[24px] p-5 ld-animate-fade-in-up",
        fullWidth && "xl:col-span-12",
        className
      )}
    >
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        variant="compact"
        actions={actions}
      />
      <div className={cn("mt-5", bodyClassName)}>{children}</div>
    </GlassSurface>
  );
}
