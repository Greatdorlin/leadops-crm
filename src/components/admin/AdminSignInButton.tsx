"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function AdminSignInButton({ callbackUrl }: { callbackUrl: string }) {
  return (
    <Button
      type="button"
      onClick={() => signIn("google", { callbackUrl })}
      variant="outline"
      className="w-full"
    >
      Continue with Google
    </Button>
  );
}
