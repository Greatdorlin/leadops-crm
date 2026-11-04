"use client";

import { IconInput } from "./IconInput";
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
    <IconInput
      icon={<Search />}
      type="search"
      name={name}
      aria-label={placeholder}
      defaultValue={defaultValue}
      placeholder={placeholder}
    />
  );
}
