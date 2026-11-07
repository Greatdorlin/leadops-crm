"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";

type Status = { enabled: boolean; available: boolean; recoveryCodesRemaining: number };
type Action = "begin" | "enable" | "disable";

export function TwoFactorSettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [secret, setSecret] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/mfa", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Could not load two-factor settings.");
        return response.json() as Promise<Status>;
      })
      .then(setStatus)
      .catch(() => {
        if (!controller.signal.aborted) setNotice("Could not load two-factor settings. Reload this page to try again.");
      });
    return () => controller.abort();
  }, []);

  async function send(op: Action) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op, password, code }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (op === "begin") {
        setSecret(result.secret);
        setPassword("");
      } else {
        setCodes(result.recoveryCodes ?? []);
        setSecret("");
        setCode("");
        setPassword("");
        setDone(true);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Please try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="admin-surface min-w-0 space-y-4 rounded-2xl p-5" aria-labelledby="two-factor-title">
      <h2 id="two-factor-title" className="text-lg font-semibold">Two-factor authentication</h2>
      {notice ? <p role="alert" className="text-sm text-amber-200">{notice}</p> : null}
      {done ? (
        <>
          <p className="text-sm text-white/65">
            {codes.length
              ? "Save these recovery codes somewhere private. Each code works once. Your previous sessions are now invalid. Sign in with a fresh code from your authenticator."
              : "Two-factor authentication is off. Sign in again to continue."}
          </p>
          {codes.length ? <pre className="overflow-x-auto rounded-xl border border-white/15 p-4 text-sm">{codes.join("\n")}</pre> : null}
          <button className="admin-button-primary min-h-11 px-4" onClick={() => void signOut({ callbackUrl: "/login" })}>Sign in again</button>
        </>
      ) : status ? (
        <>
          <p className="text-sm text-white/65">
            {status.enabled ? `Enabled. ${status.recoveryCodesRemaining} recovery codes remain.` : "Use an authenticator app to add a second check when signing in."}
          </p>
          {!status.available ? <p className="text-sm text-amber-200">The workspace owner must configure the encryption key before setup is available.</p> : null}
          {!secret ? (
            <label className="block text-sm">Current password
              <input type="password" autoComplete="current-password" className="admin-input mt-2 min-h-11 w-full px-3" value={password} onChange={event => setPassword(event.target.value)} maxLength={128} />
            </label>
          ) : (
            <>
              <p className="text-sm text-white/65">In your authenticator app, add a time-based account for Leads Desk and enter this setup key. Setup expires after five minutes.</p>
              <code className="block break-all rounded-xl border border-white/15 p-3 text-sm select-all">{secret}</code>
            </>
          )}
          {secret || status.enabled ? (
            <label className="block text-sm">{status.enabled ? "Authenticator or recovery code" : "Six-digit authenticator code"}
              <input className="admin-input mt-2 min-h-11 w-full px-3" autoComplete="one-time-code" value={code} onChange={event => setCode(event.target.value)} maxLength={32} />
            </label>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button disabled={busy || !status.available || (!secret && !password) || ((!!secret || status.enabled) && !code)} className="admin-button-primary min-h-11 px-4 text-sm" onClick={() => void send(status.enabled ? "disable" : secret ? "enable" : "begin")}>
              {busy ? "Checking…" : status.enabled ? "Turn off two-factor authentication" : secret ? "Confirm and enable" : "Set up authenticator"}
            </button>
            {secret ? <button disabled={busy} className="admin-button-secondary min-h-11 px-4 text-sm" onClick={() => { setSecret(""); setCode(""); setNotice(""); }}>Start again</button> : null}
          </div>
        </>
      ) : !notice ? <p className="text-sm text-white/60">Loading security settings…</p> : null}
    </section>
  );
}
