"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/cn";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export function AdminImageUpload({ label, value, onChange, description, className }: { label: string; value?: string | null; onChange: (value: string | null) => void; description?: string; className?: string }) {
  const [error, setError] = useState("");
  function choose(file?: File | null) {
    setError("");
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) { setError("Choose a PNG, JPG, WebP, or GIF image."); return; }
    if (file.size > MAX_IMAGE_BYTES) { setError("Keep the image under 2MB."); return; }
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" && onChange(reader.result);
    reader.readAsDataURL(file);
  }
  return <div className={cn("space-y-2", className)}><span className="block text-sm font-medium text-white/90">{label}</span><div className="flex min-w-0 items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.04] p-3"><div className="grid h-14 w-16 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-white/10 bg-black/15">{value ? <img src={value} alt="Logo preview" className="h-full w-full object-contain p-1.5" /> : <ImagePlus className="h-5 w-5 text-white/48" />}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">{value ? "Logo selected" : "Upload logo"}</p><p className="mt-1 text-xs leading-5 text-white/55">{description ?? "PNG, JPG, WebP, or GIF. Max 2MB."}</p><div className="mt-2 flex flex-wrap gap-2"><label className="admin-button-secondary inline-flex h-9 cursor-pointer items-center rounded-full px-3 text-xs font-semibold">Choose image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(event) => choose(event.target.files?.[0])} /></label>{value ? <button type="button" onClick={() => onChange(null)} className="ld-focus-ring inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 px-3 text-xs font-semibold text-white/64 hover:border-rose-300/25 hover:text-rose-100"><X className="h-3.5 w-3.5" />Remove</button> : null}</div></div></div>{error ? <p className="text-xs font-semibold text-rose-200">{error}</p> : null}</div>;
}
