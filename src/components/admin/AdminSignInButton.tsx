"use client";

import { signIn } from "next-auth/react";

export function AdminSignInButton({ callbackUrl }: { callbackUrl: string }) {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl })}
      className="admin-button-primary inline-flex h-12 w-full items-center justify-center rounded-2xl px-6 text-sm font-semibold"
    >
      Continue with Google
    </button>
  );
}
