"use client";

import { ResilientImage } from "@/components/ui/ResilientImage";

function DefaultBrandMark() {
  return (
    <span className="ld-brand-mark" aria-hidden="true">
      <span />
    </span>
  );
}

export function BrandLogoAsset({ companyName, src }: { companyName: string; src?: string | null }) {
  if (!src) {
    return <DefaultBrandMark />;
  }

  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[16px] border border-white/10 bg-white/90 shadow-[0_14px_30px_rgba(15,23,42,0.12)]">
      <ResilientImage
        src={src}
        alt={`${companyName} logo`}
        className="h-full w-full object-contain p-1"
        fallback={<DefaultBrandMark />}
      />
    </span>
  );
}
