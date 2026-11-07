"use client";
import { useRef, useState } from "react";
import { Phone, MessageSquare, MessageCircle } from "lucide-react";
import { ResponsivePopover } from "./ResponsivePopover";
export function PhoneActions({ number }: { number: string }) {
  const ref = useRef<HTMLButtonElement>(null),
    [open, setOpen] = useState(false);
  const phone = number.trim().replace(/[^+\d]/g, "");
  if (!/^\+?\d{7,15}$/.test(phone)) return <span>{number}</span>;
  return (
    <>
      <button
        type="button"
        ref={ref}
        onClick={() => setOpen(true)}
        className="ld-focus-ring min-h-11 max-w-full break-all text-left underline decoration-white/25 underline-offset-4"
        aria-label={`Contact ${number}`}
      >
        {number}
      </button>
      <ResponsivePopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={ref}
        ariaLabel="Contact lead"
        desktopWidth={280}
      >
        <div className="p-3">
          <p className="mb-2 break-all px-3 text-xs text-white/55">{number}</p>
          {[
            { label: "Call", href: `tel:${phone}`, icon: Phone },
            {
              label: "Text message",
              href: `sms:${phone}`,
              icon: MessageSquare,
            },
            {
              label: "WhatsApp",
              href: `https://wa.me/${phone.replace(/\D/g, "")}`,
              icon: MessageCircle,
            },
          ].map((a) => (
            <a
              key={a.label}
              href={a.href}
              className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm hover:bg-white/5"
              onClick={() => setOpen(false)}
            >
              <a.icon className="size-4" />
              {a.label}
            </a>
          ))}
        </div>
      </ResponsivePopover>
    </>
  );
}
