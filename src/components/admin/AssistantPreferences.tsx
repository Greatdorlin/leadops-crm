"use client";
import { useState } from "react";
import { send, type State } from "./assistant-client";
export function AssistantPreferences({
  data,
  busy,
  run,
  refresh,
  setNotice,
}: {
  data: State;
  busy: boolean;
  run: (action: () => Promise<void>) => Promise<void>;
  refresh: () => Promise<void>;
  setNotice: (message: string) => void;
}) {
  const settingsOnly = true;
  const [personal, setPersonal] = useState(data.personalName),
    [workspaceName, setWorkspaceName] = useState(data.workspace.name),
    [locked, setLocked] = useState(data.workspace.nameLocked);
  return (
    <>
      {" "}
      {settingsOnly ? (
        <>
          <section className="admin-surface rounded-3xl p-5">
            <h2 className="text-xl font-semibold">Assistant name</h2>
            <label className="mt-4 block text-sm">
              My name for the assistant
              <input
                className="admin-input min-h-11 px-3 py-2 mt-2 w-full"
                value={personal}
                disabled={data.workspace.nameLocked || busy}
                maxLength={40}
                onChange={(e) => setPersonal(e.target.value)}
                placeholder={data.workspace.name}
              />
            </label>
            <p className="mt-2 text-xs text-white/55">
              {data.workspace.nameLocked
                ? "The owner has set one name for everyone."
                : "Only your account sees this name. Leave blank to use the workspace default."}
            </p>
            <button
              className="admin-button-primary min-h-11 px-4 py-2 mt-3"
              disabled={busy || data.workspace.nameLocked}
              onClick={() =>
                void run(async () => {
                  await send({ op: "personal_name", name: personal });
                  await refresh();
                  setNotice("Your assistant name is saved.");
                })
              }
            >
              Save my name
            </button>
            {data.owner ? (
              <div className="mt-6 border-t border-white/10 pt-4">
                <label className="block text-sm">
                  Workspace name
                  <input
                    className="admin-input min-h-11 px-3 py-2 mt-2 w-full"
                    value={workspaceName}
                    maxLength={40}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                  />
                </label>
                <label className="mt-3 flex gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={locked}
                    onChange={(e) => setLocked(e.target.checked)}
                  />
                  Use this name for everyone
                </label>
                <button
                  className="admin-button-primary min-h-11 px-4 py-2 mt-3"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await send({
                        op: "workspace_name",
                        name: workspaceName,
                        nameLocked: locked,
                      });
                      await refresh();
                      setNotice("Workspace name saved.");
                    })
                  }
                >
                  Save workspace name
                </button>
              </div>
            ) : null}
          </section>
          {data.owner ? (
            <section className="admin-surface rounded-3xl p-5">
              <h2 className="text-xl font-semibold">
                Who can use the assistant?
              </h2>
              <p className="mt-2 text-sm text-white/60">
                Read-only by default. Grant proposed changes separately. Saving
                access disconnects existing sessions so the member must
                reconnect.
              </p>
              <div className="mt-4 space-y-3">
                {data.members
                  ?.filter((m) => m.isActive && m.id !== data.currentUserId)
                  .map((m) => (
                    <GrantRow
                      key={m.id}
                      member={m}
                      grant={data.grants?.find((g) => g.userId === m.id)}
                      disabled={busy}
                      save={(value) =>
                        run(async () => {
                          await send({ op: "grant", userId: m.id, ...value });
                          await refresh();
                          setNotice(
                            "Access saved. Existing AI connections for this member were revoked.",
                          );
                        })
                      }
                    />
                  ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </>
  );
}
function GrantRow({
  member,
  grant,
  disabled,
  save,
}: {
  member: { id: string; name: string };
  grant?: { enabled: boolean; canWrite: boolean };
  disabled: boolean;
  save: (v: { enabled: boolean; canWrite: boolean }) => Promise<void>;
}) {
  const [access, setAccess] = useState(
    grant?.enabled ? (grant.canWrite ? "write" : "read") : "off",
  );
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 p-3">
      <p className="min-w-0 flex-1 text-sm [overflow-wrap:anywhere]">
        {member.name}
      </p>
      <select
        aria-label={`Assistant access for ${member.name}`}
        value={access}
        onChange={(e) => setAccess(e.target.value)}
        className="admin-input min-h-11 px-3 py-2"
      >
        <option value="off">No access</option>
        <option value="read">Read only</option>
        <option value="write">Read + propose changes</option>
      </select>
      <button
        disabled={disabled}
        className="admin-button-secondary min-h-11 px-4 py-2"
        onClick={() =>
          void save({ enabled: access !== "off", canWrite: access === "write" })
        }
      >
        Save access
      </button>
    </div>
  );
}
