"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PermissionKey } from "@/lib/crm/role-permissions-contract";

const AdminAuthorizationContext = createContext<readonly PermissionKey[] | null>(null);

export function AdminAuthorizationProvider({
  children,
  permissions,
}: {
  children: ReactNode;
  permissions: readonly PermissionKey[] | null;
}) {
  return (
    <AdminAuthorizationContext.Provider value={permissions}>
      {children}
    </AdminAuthorizationContext.Provider>
  );
}

export function useAdminPermissions() {
  return useContext(AdminAuthorizationContext);
}
