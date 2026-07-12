"use client";

import type { LeadAccessScope } from "@/lib/crm/types";
import { AdminSelect } from "./AdminSelect";

export type ScopeOption = { id: string; name: string };

export function LeadAccessScopeFields({
  accessScope,
  onAccessScopeChange,
  scopeId,
  onScopeIdChange,
  branches,
  departments,
  teams,
}: {
  accessScope: LeadAccessScope;
  onAccessScopeChange: (scope: LeadAccessScope) => void;
  scopeId: string;
  onScopeIdChange: (id: string) => void;
  branches: ScopeOption[];
  departments: ScopeOption[];
  teams: ScopeOption[];
}) {
  const options =
    accessScope === "branch" ? branches : accessScope === "department" ? departments : teams;

  return (
    <>
      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Lead access</span>
        <AdminSelect
          value={accessScope}
          onChange={(event) => {
            onAccessScopeChange(event.target.value as LeadAccessScope);
            onScopeIdChange("");
          }}
          className="h-11"
        >
          <option value="own">Own leads</option>
          <option value="team">One team</option>
          <option value="department">One department</option>
          <option value="branch">One branch</option>
          <option value="all">All leads</option>
        </AdminSelect>
      </label>
      {accessScope === "branch" || accessScope === "department" || accessScope === "team" ? (
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
            {accessScope}
          </span>
          <AdminSelect value={scopeId} onChange={(event) => onScopeIdChange(event.target.value)} className="h-11">
            <option value="">Choose {accessScope}</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </AdminSelect>
        </label>
      ) : null}
    </>
  );
}
