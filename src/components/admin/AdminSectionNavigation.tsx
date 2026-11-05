"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function AdminSectionNavigation() {
  const pathname = usePathname();

  useEffect(() => {
    function scrollToSection() {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      try {
        document.getElementById(decodeURIComponent(hash))?.scrollIntoView({ block: "start" });
      } catch {
        // An invalid fragment should not prevent the page from opening.
      }
    }

    const frame = window.requestAnimationFrame(scrollToSection);
    window.addEventListener("hashchange", scrollToSection);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", scrollToSection);
    };
  }, [pathname]);

  return null;
}
