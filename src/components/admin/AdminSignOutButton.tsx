"use client";

import { signOut } from "next-auth/react";
import { appRoutes } from "@/lib/app-routes";

export function AdminSignOutButton({ mobile = false }: { mobile?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: appRoutes.login })}
      className={
        mobile
          ? "admin-button-secondary inline-flex h-11 w-full items-center justify-center rounded-2xl px-4 text-sm font-medium"
          : "admin-button-secondary !hidden h-10 items-center justify-center rounded-full px-4 text-sm font-medium sm:!inline-flex"
      }
    >
      Sign out
    </button>
  );
}
