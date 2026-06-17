import Image from "next/image";
import { cn } from "@/lib/cn";

type FlyConnectLogoVariant = "nav" | "primary";

const flyConnectLogoMeta: Record<
  FlyConnectLogoVariant,
  { height: number; sizes: string; src: string; width: number }
> = {
  nav: {
    src: "/brand/fly-connect-nav-logo.png",
    width: 120,
    height: 66,
    sizes: "120px",
  },
  primary: {
    src: "/brand/fly-connect-global-logo.png",
    width: 720,
    height: 373,
    sizes: "320px",
  },
};

export function FlyConnectLogo({
  className,
  priority = false,
  variant = "primary",
}: {
  className?: string;
  priority?: boolean;
  variant?: FlyConnectLogoVariant;
}) {
  const logo = flyConnectLogoMeta[variant];

  return (
    <Image
      alt="Fly Connect Global"
      className={cn("h-auto w-auto object-contain", className)}
      height={logo.height}
      priority={priority}
      sizes={logo.sizes}
      src={logo.src}
      width={logo.width}
    />
  );
}
