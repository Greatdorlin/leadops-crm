"use client";
import { type ReactNode, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Clock3,
  Compass,
  FileText,
  Landmark,
  Globe2,
  GraduationCap,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { PathwayFinderLogo } from "@/components/brand/PathwayFinderLogo";
import { cn } from "@/lib/cn";
import type {
  PublicDocumentItem,
  PublicFundingCheckItem,
  PublicRouteCard,
  PublicSnapshotItem,
  PublicStudyReport,
} from "@/lib/pathway-engine/report/public-report.types";

type ActionChecklistItem = {
  title: string;
  body: string;
  tone: "alert" | "review" | "ready";
};

function readinessLabel(status: PublicDocumentItem["status"]) {
  switch (status) {
    case "confirmed":
      return "Reported ready";
    case "missing":
      return "Prepare before review";
    case "blocked":
      return "Blocked";
    case "not_required":
      return "Not needed";
    default:
      return "Prepare for review";
  }
}

function pathwayLabel(role: PublicRouteCard["role"]) {
  switch (role) {
    case "primary":
      return "Strongest pathway to review first";
    case "supporting":
      return "Supporting pathway";
    case "backup":
      return "Backup pathway";
    case "not_recommended":
      return "Keep in reserve";
  }
}

function displayCopy(value: string) {
  return value
    .replace(/\broutes\b/g, "pathways")
    .replace(/\bRoutes\b/g, "Pathways")
    .replace(/\broute\b/g, "pathway")
    .replace(/\bRoute\b/g, "Pathway");
}

function extractGreetingName(title: string) {
  const [name] = title.split(",");
  return name?.trim() || "there";
}

function buildActionChecklist(report: PublicStudyReport): ActionChecklistItem[] {
  const blockerItems = report.blockers.slice(0, 3).map<ActionChecklistItem>((blocker) => ({
    title: blocker.title,
    body: blocker.body,
    tone: blocker.priority === "critical" || blocker.priority === "high" ? "alert" : "review",
  }));

  if (blockerItems.length > 0) {
    return blockerItems;
  }

  const documentItems = report.documentsToPrepare
    .filter((item) => item.status !== "confirmed" && item.status !== "not_required")
    .slice(0, 3)
    .map<ActionChecklistItem>((item) => ({
      title: item.title,
      body: item.body,
      tone: item.status === "missing" || item.status === "blocked" ? "alert" : "review",
    }));

  if (documentItems.length > 0) {
    return documentItems;
  }

  return report.smartNextSteps.slice(0, 3).map((step) => ({
    title: step.title,
    body: step.body,
    tone: "ready",
  }));
}

function buildSnapshotItems(report: PublicStudyReport) {
  const icons: LucideIcon[] = [
    Compass,
    Globe2,
    GraduationCap,
    Landmark,
    ShieldCheck,
    FileText,
    Clock3,
  ];

  return report.snapshot.items.map((item, index) => ({
    ...item,
    icon: icons[index % icons.length],
  }));
}

function buildFocusAreas(report: PublicStudyReport) {
  return buildActionChecklist(report)
    .slice(0, 3)
    .map((item) => item.title);
}

function buildAlternativeRoutes(report: PublicStudyReport) {
  return [...report.supportingRoutes, ...report.backupRoutes, ...report.notRecommendedRoutes].slice(0, 2);
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h2 className="report-display text-[1.85rem] leading-[0.94] text-white print:text-slate-950 md:text-[2.25rem]">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 max-w-[56ch] text-[0.96rem] leading-7 text-white/68 print:text-slate-600">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function GlanceCard({
  eyebrow,
  title,
  body,
  tone = "default",
  children,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  tone?: "default" | "warm" | "navy";
  children?: ReactNode;
}) {
  return (
    <article
      className={cn(
        "rounded-[24px] border p-5 shadow-[0_18px_50px_rgba(0,0,0,0.14)] md:p-6",
        tone === "warm"
          ? "border-[rgba(255,190,0,0.28)] bg-[#fff7e8] text-slate-950"
          : tone === "navy"
            ? "border-white/10 bg-[linear-gradient(180deg,rgba(28,31,112,0.96),rgba(15,17,74,0.98))] text-white"
            : "border-[rgba(17,24,39,0.08)] bg-white text-slate-950",
      )}
    >
      <p
        className={cn(
          "text-[0.72rem] font-semibold uppercase tracking-[0.18em]",
          tone === "navy" ? "text-[color:var(--fc-yellow)]" : "text-slate-500",
        )}
      >
        {eyebrow}
      </p>
      <p className="mt-3 text-[1.35rem] font-semibold leading-[1.1] md:text-[1.6rem]">
        {title}
      </p>
      {body ? (
        <p
          className={cn(
            "mt-3 text-[0.95rem] leading-7",
            tone === "navy" ? "text-white/78" : "text-slate-600",
          )}
        >
          {body}
        </p>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </article>
  );
}

function SnapshotRow({ item }: { item: PublicSnapshotItem & { icon: LucideIcon } }) {
  const Icon = item.icon;

  return (
    <article className="rounded-[18px] border border-white/10 bg-white/[0.05] px-4 py-4 print:border-slate-200 print:bg-slate-50">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white/52 print:text-slate-500">
            {item.label}
          </p>
          <p className="mt-2 text-[1.15rem] font-semibold leading-6 text-white print:text-slate-950 md:text-[1.35rem]">
            {item.value}
          </p>
        </div>
        <div
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] print:border-slate-200",
            item.tone === "caution"
              ? "text-amber-300 print:text-amber-700"
              : item.tone === "positive"
                ? "text-emerald-300 print:text-emerald-700"
                : "text-[color:var(--fc-yellow)] print:text-amber-700",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </article>
  );
}

function OpportunityCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-[20px] border border-white/10 bg-white/[0.05] p-5 print:border-slate-200 print:bg-white">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-400 print:text-emerald-700" />
        <div>
          <p className="text-base font-semibold text-white print:text-slate-950">
            {displayCopy(title)}
          </p>
          <p className="mt-2 text-[0.95rem] leading-7 text-white/72 print:text-slate-700">
            {displayCopy(body)}
          </p>
        </div>
      </div>
    </article>
  );
}

function FundingCheckCard({ item }: { item: PublicFundingCheckItem }) {
  return (
    <article className="rounded-[20px] border border-white/10 bg-white/[0.05] p-5 print:border-slate-200 print:bg-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-white print:text-slate-950">
            {displayCopy(item.title)}
          </p>
          <span className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/72 print:border-slate-200 print:text-slate-600">
            {displayCopy(item.statusLabel)}
          </span>
          <p className="mt-3 text-[0.95rem] leading-7 text-white/72 print:text-slate-700">
            {displayCopy(item.body)}
          </p>
          <p className="mt-3 text-[0.9rem] leading-7 text-white/60 print:text-slate-600">
            Next action: {displayCopy(item.nextAction)}
          </p>
        </div>
      </div>
    </article>
  );
}

function ChecklistCard({ item }: { item: ActionChecklistItem }) {
  const Icon = item.tone === "alert" ? X : item.tone === "ready" ? CheckCircle2 : Clock3;

  return (
    <article className="rounded-[20px] border border-white/10 bg-white/[0.05] px-4 py-4 print:border-slate-200 print:bg-white">
      <div className="flex items-start gap-3">
        <Icon
          className={cn(
            "mt-1 h-5 w-5 shrink-0",
            item.tone === "alert"
              ? "text-rose-300 print:text-rose-700"
              : item.tone === "ready"
                ? "text-emerald-400 print:text-emerald-700"
                : "text-[color:var(--fc-yellow)] print:text-amber-700",
          )}
        />
        <div>
          <p className="text-base font-semibold text-white print:text-slate-950">
            {displayCopy(item.title)}
          </p>
          <p className="mt-2 text-[0.95rem] leading-7 text-white/72 print:text-slate-700">
            {displayCopy(item.body)}
          </p>
        </div>
      </div>
    </article>
  );
}

function DocumentRow({ item }: { item: PublicDocumentItem }) {
  return (
    <article className="rounded-[18px] border border-white/10 bg-white/[0.05] px-4 py-4 print:border-slate-200 print:bg-white">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <FileText className="h-4 w-4 shrink-0 text-[color:var(--fc-yellow)] print:text-amber-700" />
            <p className="text-base font-semibold text-white print:text-slate-950">
              {displayCopy(item.title)}
            </p>
          </div>
          <p className="mt-2 pl-7 text-[0.94rem] leading-7 text-white/70 print:text-slate-700">
            {displayCopy(item.body)}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/64 print:border-slate-200 print:bg-slate-50 print:text-slate-600">
          {readinessLabel(item.status)}
        </span>
      </div>
    </article>
  );
}

function AlternativeCard({ route }: { route: PublicRouteCard }) {
  return (
    <article className="rounded-[20px] border border-white/10 bg-white/[0.05] p-5 print:border-slate-200 print:bg-white">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/68 print:border-slate-200 print:text-slate-600">
          {pathwayLabel(route.role)}
        </span>
        <span className="rounded-full border border-white/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/52 print:border-slate-200 print:text-slate-500">
          {route.countryLabel}
        </span>
      </div>
      <p className="mt-4 text-[1.1rem] font-semibold leading-6 text-white print:text-slate-950">
        {displayCopy(route.title)}
      </p>
      <p className="mt-3 text-[0.94rem] leading-7 text-white/70 print:text-slate-700">
        {displayCopy(route.reason)}
      </p>
    </article>
  );
}

export function PublicStudyReportView({ report }: { report: PublicStudyReport }) {
  const [reportMode, setReportMode] = useState<"glance" | "full">("glance");
  const fullReportRef = useRef<HTMLDivElement | null>(null);
  const greetingName = extractGreetingName(report.hero.title);
  const actionChecklist = buildActionChecklist(report);
  const snapshotItems = buildSnapshotItems(report);
  const focusAreas = buildFocusAreas(report);
  const alternativeRoutes = buildAlternativeRoutes(report);
  const primaryStep = report.smartNextSteps[0];
  const nextSteps = report.smartNextSteps.slice(1, 3);
  const watchOutItem = actionChecklist[0];
  const quickReasons = report.whyThisFits.slice(0, 3);
  const isFullReport = reportMode === "full";
  const visibleSnapshotItems = isFullReport ? snapshotItems : snapshotItems.slice(0, 3);
  const visibleFocusAreas = isFullReport ? focusAreas : focusAreas.slice(0, 2);

  function openFullReport() {
    setReportMode("full");
    setTimeout(() => {
      fullReportRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#16156b_0%,#12135a_42%,#080b30_100%)] text-white print:bg-white print:text-slate-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-white/[0.04] print:hidden" />

      <div className="relative mx-auto w-full max-w-[1180px] px-4 py-6 md:px-8 md:py-8 print:max-w-none print:px-0">
        <header className="flex items-center justify-between pb-5 print:hidden">
          <PathwayFinderLogo className="h-7 w-auto md:h-8" size="header" variant="light" />
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/64">
            {report.metadata.readinessLevel}
          </span>
        </header>

        <section className="rounded-[26px] border border-white/10 bg-white/[0.05] p-3 shadow-[0_18px_60px_rgba(0,0,0,0.16)] print:hidden md:p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white/56">
                Start with what matters most
              </p>
              <p className="mt-2 max-w-[52ch] text-sm leading-7 text-white/74 md:text-[0.96rem]">
                Begin with the quick summary, then open the full report when you want the full explanation.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setReportMode("glance")}
                className={cn(
                  "rounded-full border px-4 py-2.5 text-sm font-semibold transition md:px-5",
                  !isFullReport
                    ? "border-[color:var(--fc-yellow)] bg-[color:var(--fc-yellow)] text-[color:var(--fc-navy)]"
                    : "border-white/12 bg-white/[0.03] text-white/78 hover:bg-white/[0.07]",
                )}
              >
                Quick summary
              </button>
              <button
                type="button"
                onClick={openFullReport}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition md:px-5",
                  isFullReport
                    ? "border-white/18 bg-white/[0.1] text-white"
                    : "border-white/12 bg-white/[0.03] text-white/78 hover:bg-white/[0.07]",
                )}
              >
                Full report
                {isFullReport ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 py-4 md:py-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="max-w-[40rem]">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-[color:var(--fc-yellow)] px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--fc-navy)]">
                Personal pathway report
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/66">
                {report.primaryRoute.countryLabel}
              </span>
            </div>

            <h1 className="report-display text-[2.85rem] leading-[0.9] text-white md:text-[4.8rem]">
              Hello {greetingName},
              <br />
              <span className="text-[color:var(--fc-yellow)]">your best study route is clear.</span>
            </h1>

            <p className="mt-5 max-w-[50ch] text-[0.98rem] leading-8 text-white/72">
              {isFullReport
                ? displayCopy(report.hero.opening)
                : "This quick summary gives you the main answer, the biggest watch-out, and the next step to take before you go deeper."}
            </p>

            <article className="mt-6 rounded-[24px] border border-[rgba(255,190,0,0.22)] bg-[rgba(255,190,0,0.08)] p-5 print:border-amber-200 print:bg-amber-50">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--fc-yellow)] print:text-amber-800">
                {displayCopy(report.primaryRoute.statusLabel ?? "Best route for you")}
              </p>
              <p className="report-display mt-3 text-[1.65rem] leading-[0.96] text-white print:text-slate-950 md:text-[2rem]">
                {displayCopy(report.primaryRoute.title)}
              </p>
              <p className="mt-3 text-[0.95rem] leading-7 text-white/78 print:text-slate-700">
                {displayCopy(report.primaryRoute.reason)}
              </p>
              {!isFullReport ? (
                <div className="mt-4 print:hidden">
                  <button
                    type="button"
                    onClick={openFullReport}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[color:var(--fc-navy)] transition hover:bg-white/90"
                  >
                    Read the full report
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </article>
          </div>

          <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(33,34,122,0.86),rgba(18,20,94,0.88))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] print:border-slate-200 print:bg-white print:text-slate-950 print:shadow-none md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="report-display text-[1.9rem] leading-[0.95] text-[color:var(--fc-yellow)] print:text-slate-950 md:text-[2.35rem]">
                  {report.metadata.readinessLevel}
                </p>
                <p className="mt-2 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-white/58 print:text-slate-500">
                  {displayCopy(report.snapshot.title)}
                </p>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-emerald-400 print:border-slate-200 print:text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {visibleSnapshotItems.map((item) => (
                <SnapshotRow key={item.label} item={item} />
              ))}
            </div>

            {visibleFocusAreas.length ? (
              <div className="mt-5">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white/52 print:text-slate-500">
                  Main focus areas
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {visibleFocusAreas.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[0.78rem] font-semibold text-white/82 print:border-slate-200 print:bg-white print:text-slate-700"
                    >
                      {displayCopy(item)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </section>

        <section className="border-t border-white/10 py-8 md:py-9 print:border-slate-200">
          <SectionHeader
            title="Your route at a glance"
            description="If you only read one section, make it this one."
          />

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <GlanceCard
              eyebrow="Best route"
              title={displayCopy(report.primaryRoute.title)}
              body={displayCopy(report.primaryRoute.reason)}
              tone="warm"
            />

            <GlanceCard
              eyebrow="What could delay you"
              title={displayCopy(watchOutItem?.title ?? "Your plan still needs a quick review")}
              body={displayCopy(watchOutItem?.body ?? report.metadata.readinessSummary)}
            />

            <GlanceCard
              eyebrow="Why it fits"
              title={displayCopy(report.snapshot.title)}
              tone="default"
            >
              <ul className="space-y-3">
                {quickReasons.map((item) => (
                  <li key={item.title} className="flex items-start gap-3 text-[0.95rem] leading-7 text-slate-700">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{displayCopy(item.title)}</span>
                  </li>
                ))}
              </ul>
            </GlanceCard>

            <GlanceCard
              eyebrow="First step"
              title={displayCopy(primaryStep?.title ?? report.cta.title)}
              body={displayCopy(primaryStep?.body ?? report.cta.body)}
              tone="navy"
            />
          </div>

          {!isFullReport ? (
            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.05] p-5 print:hidden md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="max-w-[56ch]">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white/52">
                    Open the full report when you need more
                  </p>
                  <p className="mt-2 text-[0.95rem] leading-7 text-white/72">
                    You&apos;ll see your funding checks, documents to prepare, backup pathways, and the full next-step plan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openFullReport}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--fc-yellow)] px-5 py-3 text-sm font-semibold text-[color:var(--fc-navy)] transition hover:brightness-[0.98]"
                >
                  Read full report
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <div
          ref={fullReportRef}
          className={cn(
            isFullReport ? "block" : "hidden print:block",
          )}
        >
          <section className="grid gap-6 border-t border-white/10 py-8 md:py-9 lg:grid-cols-[0.96fr_1.04fr]">
          <div>
            <SectionHeader
              title="Why this was recommended"
            />
            <div className="mt-5 space-y-3">
              {report.whyThisFits.map((item) => (
                <OpportunityCard key={item.title} title={item.title} body={item.body} />
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <section className="rounded-[24px] border border-white/10 bg-white/[0.05] p-5 print:border-slate-200 print:bg-white">
              <SectionHeader title="Funding and opportunity check" />
              <div className="mt-5 space-y-3">
                {report.fundingChecks.map((item) => (
                  <FundingCheckCard key={item.title} item={item} />
                ))}
              </div>
            </section>
          </div>
          </section>

          <section className="grid gap-6 border-t border-white/10 py-8 md:py-9 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-[24px] border border-white/10 bg-white/[0.05] p-5 print:border-slate-200 print:bg-white">
              <SectionHeader title="What needs attention" />
              <div className="mt-5 space-y-3">
                {actionChecklist.map((item) => (
                  <ChecklistCard key={item.title} item={item} />
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-white/10 bg-white/[0.05] p-5 print:border-slate-200 print:bg-white">
              <SectionHeader title="Documents to prepare" />
              <div className="mt-5 space-y-3">
                {report.documentsToPrepare.map((item) => (
                  <DocumentRow key={item.title} item={item} />
                ))}
              </div>
            </section>
          </section>

          <section className="border-t border-white/10 py-8 md:py-9">
            <section className="rounded-[24px] border border-white/10 bg-white/[0.05] p-5 print:border-slate-200 print:bg-white">
              <SectionHeader title="Next best step" />

              <div className="mt-5 rounded-[20px] border border-[rgba(255,190,0,0.2)] bg-[rgba(255,190,0,0.08)] p-5 print:border-amber-200 print:bg-amber-50">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--fc-yellow)] print:text-amber-800">
                  Next best step
                </p>
                <p className="report-display mt-3 text-[1.75rem] leading-[0.96] text-white print:text-slate-950 md:text-[2.05rem]">
                  {displayCopy(primaryStep?.title ?? report.cta.title)}
                </p>
                <p className="mt-3 text-[0.96rem] leading-8 text-white/78 print:text-slate-700">
                  {displayCopy(primaryStep?.body ?? report.cta.body)}
                </p>
              </div>

              {nextSteps.length ? (
                <div className="mt-4 space-y-3">
                  {nextSteps.map((step, index) => (
                    <article
                      key={step.title}
                      className="flex items-start gap-4 rounded-[18px] border border-white/10 bg-white/[0.04] p-4 print:border-slate-200 print:bg-slate-50"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color:var(--fc-yellow)] text-sm font-bold text-[color:var(--fc-navy)]">
                        {index + 2}
                      </span>
                      <div>
                        <p className="text-base font-semibold text-white print:text-slate-950">
                          {displayCopy(step.title)}
                        </p>
                        <p className="mt-2 text-[0.94rem] leading-7 text-white/70 print:text-slate-700">
                          {displayCopy(step.body)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          </section>

          {alternativeRoutes.length ? (
            <section className="border-t border-white/10 py-8 md:py-9">
              <SectionHeader title="Backup pathways" />
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {alternativeRoutes.map((route) => (
                  <AlternativeCard key={`${route.role}-${route.title}`} route={route} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <section className="border-t border-white/10 py-8 print:border-slate-200">
          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-5 py-5 text-sm leading-7 text-white/58 print:border-slate-200 print:bg-white print:text-slate-600">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-1 h-5 w-5 shrink-0 text-[color:var(--fc-yellow)] print:text-amber-700" />
              <div>
                <p>{displayCopy(report.metadata.accuracyNotice)}</p>
                <p className="mt-3">{displayCopy(report.disclaimer)}</p>
                <p className="mt-3 text-white/42 print:text-slate-500">
                  Report ID: {report.metadata.reportId}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
