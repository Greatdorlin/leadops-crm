"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
export function AssistantLauncher() {
  const pathname = usePathname();
  const [name, setName] = useState("Yapper");
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let active = true;
    function update() {
      fetch("/api/assistant/name", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (active) {
            if (typeof d.name === "string") setName(d.name);
            setVisible(d.showLauncher === true);
          }
        })
        .catch(() => {});
    }
    update();
    window.addEventListener("assistant:name", update);
    return () => {
      active = false;
      window.removeEventListener("assistant:name", update);
    };
  }, []);
  if (!visible || pathname === "/inbox" || pathname === "/assistant" || pathname?.startsWith("/assistant/") || pathname === "/settings/assistant") return null;
  return (
    <Link
      href="/assistant"
      aria-label={`Talk to ${name}`}
      title={`Talk to ${name}`}
      className="ld-focus-ring fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 inline-flex max-w-[calc(100vw-2rem)] min-h-11 min-w-11 justify-center items-center gap-2 rounded-full border border-white/20 bg-slate-950/95 p-3 sm:px-4 sm:py-3 text-sm font-semibold text-white shadow-xl backdrop-blur-xl"
    >
      <MessageCircle className="size-4 shrink-0" />
      <span className="hidden max-w-40 truncate sm:inline">Talk to {name}</span>
    </Link>
  );
}
