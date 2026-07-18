"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function EmailPasswordSignInForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      callbackUrl,
      email,
      password,
      redirect: false,
    });

    setPassword("");
    setIsSubmitting(false);

    if (!result?.ok) {
      setError("We couldn't verify those access details.");
      return;
    }

    router.push(result.url ?? callbackUrl);
    router.refresh();
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="sign-in-email">Email</label>
      <input id="sign-in-email" autoComplete="username" className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/35 px-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-200/45 focus:ring-2 focus:ring-cyan-200/15" onChange={(event) => setEmail(event.target.value)} placeholder="Email address" required type="email" value={email} />
      <label className="sr-only" htmlFor="sign-in-password">Password</label>
      <input id="sign-in-password" autoComplete="current-password" className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/35 px-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-200/45 focus:ring-2 focus:ring-cyan-200/15" onChange={(event) => setPassword(event.target.value)} placeholder="Password" required type="password" value={password} />
      {error ? <p className="text-sm text-rose-200">{error}</p> : null}
      <button className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/15 bg-white/[0.09] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.15] disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
