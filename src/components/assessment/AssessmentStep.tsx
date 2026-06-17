"use client";

import { motion } from "framer-motion";
import type { PropsWithChildren } from "react";
import { cn } from "@/lib/cn";

interface AssessmentStepProps extends PropsWithChildren {
  eyebrow: string;
  title: string;
  description: string;
  helperText?: string;
  contentClassName?: string;
  titleClassName?: string;
}

export function AssessmentStep({
  eyebrow,
  title,
  description,
  helperText,
  contentClassName,
  titleClassName,
  children,
}: AssessmentStepProps) {
  return (
    <motion.section
      key={title}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-[1040px] px-3 py-2 md:px-5 md:py-3"
    >
      <div className="space-y-4 text-center">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[color:var(--fc-yellow)] md:text-[0.76rem]">
          {eyebrow}
        </p>
        <div className="space-y-3">
          <h1
            className={cn(
              "mx-auto max-w-[17ch] text-balance [font-family:var(--font-heading)] text-[2.8rem] font-bold leading-[0.88] tracking-[-0.03em] text-white sm:text-[3.35rem] md:text-[3.75rem] lg:text-[4.2rem] xl:text-[4.45rem]",
              titleClassName,
            )}
          >
            {title}
          </h1>
          {description.trim() ? (
            <p className="mx-auto max-w-2xl text-sm leading-7 text-white/68 md:text-[1rem] md:leading-8">
              {description}
            </p>
          ) : null}
          {helperText ? (
            <p className="mx-auto max-w-xl text-[0.76rem] leading-6 text-white/55 md:text-[0.84rem] md:leading-6">
              {helperText}
            </p>
          ) : null}
        </div>
      </div>
      <div className={cn("mt-7 md:mt-8", contentClassName)}>{children}</div>
    </motion.section>
  );
}

