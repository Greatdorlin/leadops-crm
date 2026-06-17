import Image from "next/image";
import { cn } from "@/lib/cn";

type LogoVariant = "light" | "dark";
type LogoSize = "header" | "footer";

const logoSizes: Record<LogoSize, string> = {
  header: "h-11 w-auto md:h-14",
  footer: "h-12 w-auto md:h-16",
};

const logoSources: Record<LogoVariant, { height: number; src: string; width: number }> = {
  light: {
    src: "/brand/pathway-finder-logo-light-cropped.png",
    width: 484,
    height: 168,
  },
  dark: {
    src: "/brand/pathway-finder-logo-dark-cropped.png",
    width: 466,
    height: 195,
  },
};

export function PathwayFinderLogo({
  className,
  size = "header",
  variant = "light",
}: {
  className?: string;
  size?: LogoSize;
  variant?: LogoVariant;
}) {
  const logo = logoSources[variant];

  return (
    <Image
      alt="Pathway Finder by Fly Connect Global"
      className={cn("shrink-0 object-contain", logoSizes[size], className)}
      height={logo.height}
      priority={size === "header"}
      sizes={size === "header" ? "180px" : "220px"}
      src={logo.src}
      width={logo.width}
    />
  );
}
