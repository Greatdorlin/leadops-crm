"use client";

import type { ImgHTMLAttributes, ReactNode } from "react";
import { useState } from "react";

type ResilientImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  fallback?: ReactNode;
  src: string;
};

export function ResilientImage({
  alt = "",
  fallback = null,
  onError,
  src,
  ...props
}: ResilientImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (failedSrc === src) {
    return <>{fallback}</>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt={alt}
      src={src}
      onError={(event) => {
        setFailedSrc(src);
        onError?.(event);
      }}
    />
  );
}
