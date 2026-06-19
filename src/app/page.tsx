import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Download,
  Filter,
  ShieldCheck,
  UsersRound,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { LeadsDeskWordmark } from "@/components/brand/LeadsDeskWordmark";

const featureCards: Array<{
  description: string;
  icon: LucideIcon;
  title: string;
}> = [
  {
    title: "Capture leads",
    description: "Keep every new contact in one private workspace.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Assign follow-ups",
    description: "Route ownership clearly across reps and teams.",
    icon: UsersRound,
  },
  {
    title: "Track performance",
    description: "See pipeline movement, overdue work, and outcomes.",
    icon: Filter,
  },
  {
    title: "Customize workflow",
    description: "Adapt stages, fields, views, and branding safely.",
    icon: Workflow,
  },
  {
    title: "Export data",
    description: "Keep reporting and data access in your control.",
    icon: Download,
  },
  {
    title: "Private deployment",
    description: "Run a branded system built for your organization.",
    icon: ShieldCheck,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#08112f_0%,#0d1741_28%,#edf2fb_28%,#f7f9fc_100%)] text-[#101052]">
      <header className="px-4 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/12 bg-white/6 px-4 py-3 text-white shadow-[0_18px_48px_rgba(2,8,24,0.22)] backdrop-blur-xl">
          <LeadsDeskWordmark tone="light" />
          <div className="flex items-center gap-2">
            <Link
              href="#overview"
              className="hidden rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/8 hover:text-white sm:inline-flex"
            >
              Learn more
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-full bg-[#f5c84c] px-4 py-2 text-sm font-bold text-[#101052] shadow-[0_14px_32px_rgba(245,200,76,0.28)] transition hover:-translate-y-0.5 sm:px-5"
            >
              View dashboard
            </Link>
          </div>
        </div>
      </header>

      <section className="px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8 lg:pb-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center">
          <div className="max-w-3xl text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f5c84c]">
              Leads Desk
            </p>
            <h1 className="mt-4 font-[family:var(--font-heading)] text-[3rem] font-bold leading-[0.9] tracking-[-0.05em] sm:text-[4.25rem] lg:text-[5rem]">
              Private lead management for growing sales teams.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/72 sm:text-lg">
              Capture, assign, follow up, customize, and report on every lead in one branded system.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-[#f5c84c] px-7 text-sm font-bold text-[#101052] shadow-[0_18px_40px_rgba(245,200,76,0.26)] transition hover:-translate-y-0.5 sm:text-base"
              >
                View dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#overview"
                className="inline-flex h-13 items-center justify-center rounded-full border border-white/14 bg-white/6 px-7 text-sm font-semibold text-white/84 backdrop-blur transition hover:bg-white/10 sm:text-base"
              >
                Learn more
              </Link>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/8 p-5 text-white shadow-[0_24px_60px_rgba(2,8,24,0.24)] backdrop-blur-xl sm:p-6">
            <div className="rounded-[26px] border border-white/10 bg-[#101a48]/88 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/48">
                    Workspace view
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">Daily lead operations</p>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#f5c84c] text-[#101052]">
                  <Building2 className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-5 grid gap-3">
                {[
                  ["New leads", "128"],
                  ["Overdue follow-ups", "12"],
                  ["Assigned today", "34"],
                  ["Converted this month", "19"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-3"
                  >
                    <span className="text-sm text-white/68">{label}</span>
                    <span className="text-base font-semibold text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="overview" className="px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#101052]/54">
              What it covers
            </p>
            <h2 className="mt-3 font-[family:var(--font-heading)] text-[2.35rem] font-bold leading-[0.92] tracking-[-0.04em] text-[#101052] sm:text-[3.35rem]">
              A clean commercial placeholder for the Leads Desk rebuild.
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featureCards.map((card) => {
              const Icon = card.icon;

              return (
                <article
                  key={card.title}
                  className="rounded-[28px] border border-[#101052]/8 bg-white p-5 shadow-[0_18px_44px_rgba(16,24,56,0.06)]"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#edf2fb] text-[#101052]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-[#101052]">{card.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#101052]/64">{card.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#101052]/8 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <LeadsDeskWordmark />
          <div className="flex flex-wrap gap-4 text-sm text-[#101052]/62">
            <Link href="/privacy" className="transition hover:text-[#101052]">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-[#101052]">
              Terms
            </Link>
            <Link href="/security" className="transition hover:text-[#101052]">
              Security
            </Link>
            <Link href="/legal" className="transition hover:text-[#101052]">
              Legal
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
