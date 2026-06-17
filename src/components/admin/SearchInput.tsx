"use client";

import { Search } from "lucide-react";

export function SearchInput({
  name = "search",
  defaultValue,
  placeholder = "Search leads, email, phone, source, or owner",
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="admin-input flex h-12 items-center gap-3 rounded-[20px] px-4">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
        <Search className="h-4 w-4" />
      </span>
      <input
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
      />
    </label>
  );
}
