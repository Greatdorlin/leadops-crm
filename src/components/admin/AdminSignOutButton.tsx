"use client";

import { signOut } from "next-auth/react";
import { appRoutes } from "@/lib/app-routes";

export function AdminSignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: appRoutes.login })}
      className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
    >
      Sign out
    </button>
  );
}
