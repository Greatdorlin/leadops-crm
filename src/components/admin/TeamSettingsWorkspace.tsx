"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpDown, Search, ShieldCheck, UsersRound } from "lucide-react";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import { formatAdminAccessLevelLabel } from "@/lib/crm/formatters";
import { appRoutes } from "@/lib/app-routes";
import { AdminSelect } from "./AdminSelect";
import { EmptyState } from "./EmptyState";
import { GlassCard } from "./GlassCard";
import { SectionHeader } from "./SectionHeader";
import { TeamAccessForm } from "./TeamAccessForm";
import { TeamAvatar } from "./TeamAvatar";
import { TeamMemberAccessButton } from "./TeamMemberAccessButton";
import { TeamMemberProfileForm } from "./TeamMemberProfileForm";

type TeamSettingsMember = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  accessLevel: AdminAccessLevel;
  isActive: boolean;
  canManageMember: boolean;
};

export function TeamSettingsWorkspace({
  currentUser,
  members,
  canGrantAccess,
  canEditRoster,
  grantableAccessLevels,
}: {
  currentUser:
    | {
        id: string;
        fullName: string;
        email: string;
        avatarUrl?: string | null;
        accessLevel: AdminAccessLevel;
      }
    | null;
  members: TeamSettingsMember[];
  canGrantAccess: boolean;
  canEditRoster: boolean;
  grantableAccessLevels: AdminAccessLevel[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");
  const [accessFilter, setAccessFilter] = useState<"all" | AdminAccessLevel>("all");
  const [sortBy, setSortBy] = useState<"name" | "access" | "status">("name");

  const summary = useMemo(() => {
    const activeMembers = members.filter((member) => member.isActive);
    const inactiveMembers = members.filter((member) => !member.isActive);

    return {
      active: activeMembers.length,
      inactive: inactiveMembers.length,
      ownersAndAdmins: activeMembers.filter((member) =>
        ["master_admin", "general_admin"].includes(member.accessLevel),
      ).length,
      salesOperators: activeMembers.filter((member) =>
        ["lead_sales_rep", "sales_rep"].includes(member.accessLevel),
      ).length,
      finance: activeMembers.filter((member) => member.accessLevel === "finance").length,
      affiliates: activeMembers.filter((member) => member.accessLevel === "affiliate").length,
    };
  }, [members]);

  const filteredMembers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return members
      .filter((member) => {
        if (statusFilter === "active" && !member.isActive) {
          return false;
        }

        if (statusFilter === "inactive" && member.isActive) {
          return false;
        }

        if (accessFilter !== "all" && member.accessLevel !== accessFilter) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return (
          member.fullName.toLowerCase().includes(normalizedSearch) ||
          member.email.toLowerCase().includes(normalizedSearch) ||
          formatAdminAccessLevelLabel(member.accessLevel).toLowerCase().includes(normalizedSearch)
        );
      })
      .sort((left, right) => {
        if (sortBy === "access") {
          return formatAdminAccessLevelLabel(left.accessLevel).localeCompare(
            formatAdminAccessLevelLabel(right.accessLevel),
          );
        }

        if (sortBy === "status") {
          return Number(right.isActive) - Number(left.isActive);
        }

        return (left.fullName || left.email).localeCompare(right.fullName || right.email);
      });
  }, [accessFilter, members, search, sortBy, statusFilter]);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <GlassCard glassStyle="soft" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
            Active team
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">{summary.active}</p>
          <p className="mt-2 text-sm text-white/70">People who can work the workspace today.</p>
        </GlassCard>
        <GlassCard glassStyle="soft" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
            Inactive
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">{summary.inactive}</p>
          <p className="mt-2 text-sm text-white/70">Archived access that can be restored if needed.</p>
        </GlassCard>
        <GlassCard glassStyle="soft" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
            Admin coverage
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">{summary.ownersAndAdmins}</p>
          <p className="mt-2 text-sm text-white/70">Owners and admins protecting the workspace.</p>
        </GlassCard>
        <GlassCard glassStyle="soft" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
            Sales operators
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">{summary.salesOperators}</p>
          <p className="mt-2 text-sm text-white/70">Team leads and reps carrying active lead work.</p>
        </GlassCard>
        <GlassCard glassStyle="soft" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
            Protected roles
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
            {summary.finance + summary.affiliates}
          </p>
          <p className="mt-2 text-sm text-white/70">
            Finance reviewers and affiliates with limited workspaces.
          </p>
        </GlassCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <GlassCard glassStyle="vibrant" className="p-5 sm:p-6">
          <SectionHeader
            eyebrow="Team settings"
            title="Control access with clarity"
            description="Search, sort, and update people without cramming roster, profile, and settings into one page."
          />
          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email, or access level"
                className="admin-input h-12 w-full rounded-[20px] pl-11 pr-4 text-sm outline-none"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "all", label: "All" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatusFilter(option.value as typeof statusFilter)}
                  className={[
                    "inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition",
                    statusFilter === option.value
                      ? "border border-white/20 bg-white/[0.08] text-white shadow-[0_16px_40px_rgba(0,0,0,0.2)]"
                      : "border border-white/10 bg-white/[0.045] text-white/70 hover:bg-white/[0.08] hover:text-white",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <AdminSelect
              value={accessFilter}
              onChange={(event) => setAccessFilter(event.target.value as "all" | AdminAccessLevel)}
              className="h-12"
            >
              <option value="all">All access levels</option>
              {Array.from(new Set(members.map((member) => member.accessLevel))).map((level) => (
                <option key={level} value={level}>
                  {formatAdminAccessLevelLabel(level)}
                </option>
              ))}
            </AdminSelect>
            <AdminSelect
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
              className="h-12"
            >
              <option value="name">Sort by name</option>
              <option value="access">Sort by access</option>
              <option value="status">Sort by status</option>
            </AdminSelect>
            <div className="flex items-center gap-2 rounded-[20px] border border-white/10 bg-white/[0.04] px-4 text-sm text-white/70">
              <ArrowUpDown className="h-4 w-4 text-white/70" />
              {filteredMembers.length} people in view
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 shadow-[0_24px_64px_rgba(5,10,30,0.24)]"
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <TeamAvatar
                        name={member.fullName}
                        email={member.email}
                        avatarUrl={member.avatarUrl}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-white">
                          {member.fullName || member.email}
                        </p>
                        <p className="truncate text-sm text-white/70">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                        {formatAdminAccessLevelLabel(member.accessLevel)}
                      </span>
                      <span
                        className={[
                          "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
                          member.isActive
                            ? "border-emerald-300/24 bg-emerald-300/10 text-emerald-100"
                            : "border-white/10 bg-white/[0.05] text-white/70",
                        ].join(" ")}
                      >
                        {member.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  <TeamMemberProfileForm
                    userId={member.id}
                    fullName={member.fullName}
                    email={member.email}
                    avatarUrl={member.avatarUrl}
                    accessLevel={member.accessLevel}
                    isActive={member.isActive}
                    grantableAccessLevels={grantableAccessLevels}
                    canEditAccess={canEditRoster && member.canManageMember}
                    canEditActive={canEditRoster && member.canManageMember}
                    compact
                  />

                  {canEditRoster && member.canManageMember ? (
                    <div className="mt-4 border-t border-white/10 pt-4">
                      <TeamMemberAccessButton
                        userId={member.id}
                        isActive={member.isActive}
                        className={[
                          "inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition",
                          member.isActive
                            ? "border border-rose-300/24 bg-rose-300/10 text-rose-100 hover:bg-rose-300/16"
                            : "border border-emerald-300/24 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/16",
                        ].join(" ")}
                      />
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <EmptyState
                title="No team members match this view"
                description="Broaden the filters or search term to see more of the roster."
              />
            )}
          </div>
        </GlassCard>

        <div className="space-y-6">
          {currentUser ? (
            <GlassCard glassStyle="soft" className="p-5">
              <SectionHeader
                eyebrow="My profile"
                title="Your account"
                description="Open your profile if you want to update your own display name or photo."
              />
              <div className="mt-4 flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <TeamAvatar
                  name={currentUser.fullName}
                  email={currentUser.email}
                  avatarUrl={currentUser.avatarUrl}
                  size="lg"
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-white">
                    {currentUser.fullName || currentUser.email}
                  </p>
                  <p className="truncate text-sm text-white/70">{currentUser.email}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/70">
                    {formatAdminAccessLevelLabel(currentUser.accessLevel)}
                  </p>
                </div>
              </div>
              <Link
                href={appRoutes.profile}
                className="admin-button-secondary mt-4 inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
              >
                Open profile
              </Link>
            </GlassCard>
          ) : null}

          {canGrantAccess ? (
            <GlassCard glassStyle="soft" className="p-5">
              <SectionHeader
                eyebrow="Invite or add"
                title="Create team access"
                description="Add a new person with the right access level and optional profile photo."
              />
              <div className="mt-4">
                <TeamAccessForm grantableAccessLevels={grantableAccessLevels} />
              </div>
            </GlassCard>
          ) : null}

          <GlassCard glassStyle="soft" className="p-5">
            <SectionHeader
              eyebrow="Workspace rules"
              title="Protection by design"
              description="The owner and admin controls still protect the workspace while keeping everyday changes simple."
            />
            <div className="mt-4 space-y-3">
              {[
                "Sales reps can keep their own name and photo current without waiting for admin help.",
                "Only allowed roles can grant or change access levels.",
                "Inactive people disappear from assignment choices until they are restored.",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-[20px] border border-white/10 bg-white/[0.045] px-4 py-3"
                >
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-white/70" />
                  <p className="text-sm leading-6 text-white/70">{item}</p>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard glassStyle="soft" className="p-5">
            <SectionHeader
              eyebrow="Scales better"
              title="Built for a larger team"
              description="Search, filter, and sort now so this page still works when the roster grows."
            />
            <div className="mt-4 grid gap-3">
              {[
                {
                  icon: UsersRound,
                  title: "Search by person",
                  copy: "Jump to a teammate quickly by name or email instead of scrolling cards.",
                },
                {
                  icon: ArrowUpDown,
                  title: "Sort by role or status",
                  copy: "Bring admins, team leads, or inactive users into view faster when the roster grows.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 text-white/70" />
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/70">{item.copy}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
