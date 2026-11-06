"use client";
import { useEffect, useState } from "react";
import { ResponsivePopover } from "@/components/admin/ResponsivePopover";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { inboxRequest } from "./client";
type Settings = {
  fromEmail: string;
  fromName: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  passwordsSaved?: boolean;
};
const defaults: Settings = {
  fromEmail: "",
  fromName: "Sales team",
  smtpHost: "smtp.hostinger.com",
  smtpPort: 465,
  smtpUser: "",
  imapHost: "imap.hostinger.com",
  imapPort: 993,
  imapUser: "",
};
export function MailboxSettings({
  anchorRef,
  onClose,
  onConnected,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onConnected: () => void;
}) {
  const [settings, setSettings] = useState<Settings>(defaults),
    [password, setPassword] = useState(""),
    [incomingPassword, setIncomingPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    inboxRequest<{ settings: Settings | null }>("?op=mailbox")
      .then((d) => {
        if (active && d.settings) setSettings(d.settings);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  function field(key: keyof Settings, value: string | number) {
    setSettings((s) => ({ ...s, [key]: value }));
  }
  async function connect() {
    setBusy(true);
    setError("");
    try {
      await inboxRequest("", {
        op: "mailbox",
        ...settings,
        smtpUser: settings.smtpUser || settings.fromEmail,
        imapUser: settings.imapUser || settings.fromEmail,
        smtpPassword: password,
        imapPassword: incomingPassword || password,
      });
      setPassword("");
      setIncomingPassword("");
      onConnected();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The mailbox could not be connected.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <ResponsivePopover
      open
      anchorRef={anchorRef}
      onClose={onClose}
      ariaLabel="Connect sales mailbox"
      desktopWidth={560}
    >
      <div className="flex min-h-0 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 p-5">
          <h2 className="text-lg font-semibold">Connect sales mailbox</h2>
          <button
            className="admin-button-secondary min-h-11 px-3"
            onClick={onClose}
          >
            Close
          </button>
        </header>
        <form
          className="min-h-0 space-y-4 overflow-y-auto overscroll-contain p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void connect();
          }}
        >
          <p className="text-sm text-white/65">
            Connect a shared sales mailbox using secure SMTP and IMAP.
            Credentials are encrypted and never sent back to this page.
          </p>
          <label className="block text-sm">
            Email address
            <input
              className="admin-input mt-2 min-h-11 w-full"
              type="email"
              autoComplete="off"
              value={settings.fromEmail}
              onChange={(e) => {
                const value = e.target.value;
                setSettings((s) => ({
                  ...s,
                  fromEmail: value,
                  smtpUser: s.smtpUser === s.fromEmail ? value : s.smtpUser,
                  imapUser: s.imapUser === s.fromEmail ? value : s.imapUser,
                }));
              }}
              required
              maxLength={254}
            />
          </label>
          <label className="block text-sm">
            Sender name
            <input
              className="admin-input mt-2 min-h-11 w-full"
              value={settings.fromName}
              onChange={(e) => field("fromName", e.target.value)}
              maxLength={80}
            />
          </label>
          <label className="block text-sm">
            Mailbox or app password
            <input
              className="admin-input mt-2 min-h-11 w-full"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!settings.passwordsSaved}
              placeholder={
                settings.passwordsSaved
                  ? "Saved securely—leave blank to keep"
                  : "Your provider’s mailbox or app password"
              }
            />
          </label>
          <details>
            <summary className="cursor-pointer py-2 text-sm font-medium">
              Server details · Hostinger defaults
            </summary>
            <p className="mb-3 text-xs text-white/55">
              For another provider, enter its SMTP and IMAP settings. Accounts
              that require OAuth instead of app passwords are not supported by
              this connection.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["smtpHost", "SMTP host"],
                  ["smtpUser", "SMTP username"],
                  ["imapHost", "IMAP host"],
                  ["imapUser", "IMAP username"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block min-w-0 text-sm">
                  {label}
                  <input
                    className="admin-input mt-2 min-h-11 w-full"
                    value={settings[key]}
                    onChange={(e) => field(key, e.target.value)}
                    placeholder={
                      key.endsWith("User") ? "Uses email address" : ""
                    }
                  />
                </label>
              ))}
              <label className="block text-sm">
                SMTP port
                <AdminSelect
                  className="mt-2 min-h-11"
                  value={String(settings.smtpPort)}
                  onChange={(e) => field("smtpPort", Number(e.target.value))}
                >
                  <option value="465">465 · TLS</option>
                  <option value="587">587 · STARTTLS required</option>
                </AdminSelect>
              </label>
              <label className="block text-sm">
                IMAP port
                <AdminSelect
                  className="mt-2 min-h-11"
                  value={String(settings.imapPort)}
                  onChange={(e) => field("imapPort", Number(e.target.value))}
                >
                  <option value="993">993 · TLS</option>
                  <option value="143">143 · STARTTLS required</option>
                </AdminSelect>
              </label>
            </div>
            <label className="mt-4 block text-sm">
              Incoming password, if different
              <input
                type="password"
                autoComplete="new-password"
                className="admin-input mt-2 min-h-11 w-full"
                value={incomingPassword}
                onChange={(e) => setIncomingPassword(e.target.value)}
                placeholder="Uses the password above"
              />
            </label>
          </details>
          {error ? (
            <p role="alert" className="text-sm text-rose-200">
              {error}
            </p>
          ) : null}
          <button
            className="admin-button-primary min-h-11 w-full px-4 py-2"
            disabled={busy || loading}
          >
            {busy ? "Verifying secure connections…" : "Verify and connect"}
          </button>
          <p className="text-xs text-white/45">
            We verify both servers before enabling email. First sync imports the
            latest 50 emails; older mail stays in your mailbox. Attachments
            remain in the original mailbox.
          </p>
        </form>
      </div>
    </ResponsivePopover>
  );
}
