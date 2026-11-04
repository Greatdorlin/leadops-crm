"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function EmailPasswordSignInForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await signIn("credentials", {
        callbackUrl,
        email: email.trim(),
        password,
        redirect: false,
      });
      if (!result?.ok || result.error) {
        setError("We couldn't verify those sign-in details.");
        return;
      }
      setPassword("");
      router.replace(result.url ?? callbackUrl);
      router.refresh();
    } catch {
      setError("We couldn't connect. Try signing in again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass = "mt-1.5 h-11 w-full rounded-lg border border-white/15 bg-[#15161a] px-3.5 text-base text-white outline-none transition placeholder:text-white/45 focus-visible:border-white/55 focus-visible:ring-2 focus-visible:ring-white/15 sm:text-sm";

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="text-sm font-medium text-white/85" htmlFor="sign-in-email">Email address</label>
        <input id="sign-in-email" name="email" autoComplete="username" className={inputClass} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required type="email" value={email} />
      </div>
      <div>
        <label className="text-sm font-medium text-white/85" htmlFor="sign-in-password">Password</label>
        <input id="sign-in-password" name="password" autoComplete="current-password" className={inputClass} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
      </div>
      {error ? <p role="alert" className="text-sm text-rose-200">{error}</p> : null}
      <Button className="w-full" disabled={isSubmitting} aria-busy={isSubmitting} type="submit">
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
