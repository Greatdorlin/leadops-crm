import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function IconInput({
  icon,
  as: Wrapper = "label",
  wrapperClassName,
  className,
  ...props
}: ComponentProps<"input"> & { icon: ReactNode; wrapperClassName?: string; as?: "label" | "span" }) {
  return (
    <Wrapper className={cn("admin-input flex items-center gap-3 px-3.5", wrapperClassName)}>
      <span aria-hidden="true" data-input-icon className="inline-flex shrink-0 items-center text-white/55 [&>svg]:size-4">
        {icon}
      </span>
      <input
        {...props}
        className={cn(
          "min-h-11 min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-inherit outline-none placeholder:text-white/55 sm:text-sm",
          className,
        )}
      />
    </Wrapper>
  );
}
