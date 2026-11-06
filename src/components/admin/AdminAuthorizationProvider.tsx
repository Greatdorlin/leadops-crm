"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PermissionKey } from "@/lib/crm/role-permissions-contract";

const AdminAuthorizationContext = createContext<readonly PermissionKey[] | null>(null);

type Identity = { name?: string | null; email?: string | null; avatarUrl?: string | null };
const AdminIdentityContext = createContext<Identity | null>(null);
export function useAdminIdentity() { return useContext(AdminIdentityContext); }

export function AdminAuthorizationProvider({
  children,
  permissions,
  identity = null,
}: {
  children: ReactNode;
  permissions: readonly PermissionKey[] | null;
  identity?: Identity | null;
}) {
  return (
    <AdminAuthorizationContext.Provider value={permissions}>
      <AdminIdentityContext.Provider value={identity}>{children}</AdminIdentityContext.Provider>
    </AdminAuthorizationContext.Provider>
  );
}

export function useAdminPermissions() {
  return useContext(AdminAuthorizationContext);
}
