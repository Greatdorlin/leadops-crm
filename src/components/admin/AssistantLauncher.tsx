"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
export function AssistantLauncher() {
  const [name, setName] = useState("Yapper");
  useEffect(() => {
    let active = true;
    function update() {
      fetch("/api/assistant/name", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (active && typeof d.name === "string") setName(d.name);
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
  return (
    <Link
      href="/assistant"
      className="ld-focus-ring fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 inline-flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-white/20 bg-slate-950/95 px-4 py-3 text-sm font-semibold text-white shadow-xl backdrop-blur-xl"
    >
      <MessageCircle className="size-4 shrink-0" />
      <span className="max-w-40 truncate">Talk to {name}</span>
    </Link>
  );
}
