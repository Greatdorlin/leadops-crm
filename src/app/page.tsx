"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  FileText,
  GraduationCap,
  ListChecks,
  Menu,
  MessageCircle,
  Sparkles,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { PathwayFinderLogo } from "@/components/brand/PathwayFinderLogo";
import { cn } from "@/lib/cn";

const navLinks = [
  { label: "Process", href: "#process" },
  { label: "Privacy", href: "/privacy" },
];

const proofPoints = [
  "Private by design",
  "No document uploads",
  "Ready report in 2 minutes",
];

const audienceCards: Array<{
  body: string;
  icon: LucideIcon;
  title: string;
}> = [
  {
    title: "Study plans",
    body: "You want to study abroad but do not know which route or first step makes sense.",
    icon: GraduationCap,
  },
  {
    title: "Work or travel",
    body: "You are considering work, visits, relocation, or business travel and need a clear start.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Family decisions",
    body: "You are helping a child, partner, or family member make a wise move without rushing.",
    icon: UserRound,
  },
  {
    title: "Money clarity",
    body: "You do not want to waste application fees, agent fees, or time on the wrong direction.",
    icon: WalletCards,
  },
];

const processSteps = [
  {
    label: "Choose your goal",
    description: "Pick study, work, visit, relocation, business travel, or family planning.",
  },
  {
    label: "Answer simple questions",
    description: "Tell us where you are now and what you need help with. No sensitive uploads.",
  },
  {
    label: "Get your report",
    description: "See your likely route, readiness level, blockers, and next practical move.",
  },
  {
    label: "Get support if needed",
    description: "If your situation needs a closer look, an advisor can review it with you.",
  },
];

const heroReportLines = [
  "You may qualify for a potential study loan in Canada",
  "You may qualify for a potential scholarship",
  "Your best route is a master's in the UK",
];

const radarSignals: Array<{
  className: string;
  icon: LucideIcon;
  label: string;
  value: string;
}> = [
  {
    label: "Study fit",
    value: "Strong",
    icon: GraduationCap,
    className: "left-[7%] top-[22%]",
  },
  {
    label: "Canada loan",
    value: "Possible",
    icon: WalletCards,
    className: "right-[-4%] top-[18%]",
  },
  {
    label: "Documents",
    value: "Needs review",
    icon: FileText,
    className: "left-[-5%] bottom-[24%]",
  },
  {
    label: "UK route",
    value: "Best fit",
    icon: Compass,
    className: "right-[-3%] bottom-[27%]",
  },
];

const legalLinks = [
  { label: "Process", href: "#process" },
  { label: "Privacy", href: "/privacy" },
];

function linkIsActive(pathname: string, href: string) {
  if (href.startsWith("/")) {
    return pathname === href;
  }

  return pathname === "/" && href.startsWith("#");
}

function renderNavLink(pathname: string, link: (typeof navLinks)[number], mobile?: boolean) {
  const active = linkIsActive(pathname, link.href);
  const classes = mobile
    ? cn(
        "rounded-2xl px-3 py-2 transition",
        active ? "bg-white/10 text-[color:var(--fc-yellow)]" : "text-white/78 hover:bg-white/8",
      )
    : cn(
        "text-sm font-semibold transition",
        active ? "text-[color:var(--fc-yellow)]" : "text-white/76 hover:text-white",
      );

  return link.href.startsWith("/") ? (
    <Link key={link.label} href={link.href} className={classes}>
      {link.label}
    </Link>
  ) : (
    <a key={link.label} href={link.href} className={classes}>
      {link.label}
    </a>
  );
}

function OpinionNoiseScene() {
  return (
    <div className="opinion-noise-scene">
      <Image
        src="/pathway/opinion-noise-overwhelmed.png"
        alt="Woman reviewing conflicting travel advice on her laptop"
        fill
        sizes="100vw"
        className="object-cover object-[58%_center]"
        unoptimized
      />
      <div className="opinion-noise-shade" />
    </div>
  );
}

function DecisionRadar() {
  return (
    <div className="decision-radar-shell">
      <div className="decision-radar">
        <div className="decision-radar-sweep" />
        <div className="decision-radar-route decision-radar-route-one" />
        <div className="decision-radar-route decision-radar-route-two" />

        {radarSignals.map((signal) => {
          const Icon = signal.icon;

          return (
            <div key={signal.label} className={cn("decision-radar-signal", signal.className)}>
              <span>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div>
                <p>{signal.label}</p>
                <strong>{signal.value}</strong>
              </div>
            </div>
          );
        })}

        <div className="decision-radar-core">
          <span className="grid h-12 w-12 place-items-center rounded-[18px] bg-[color:var(--fc-yellow)] text-[#101052]">
            <Compass className="h-5 w-5" />
          </span>
          <p>Pathway signal</p>
          <div className="hero-report-rotator decision-radar-rotator">
            {heroReportLines.map((line) => (
              <strong key={line}>{line}</strong>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileReportPreview() {
  return (
    <div className="mt-9 rounded-[24px] border border-white/14 bg-[#101052]/88 p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.3)] backdrop-blur-md md:hidden">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[color:var(--fc-yellow)] text-[#101052]">
          <Compass className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[0.66rem] font-bold uppercase tracking-[0.22em] text-white/52">
            Your Report
          </p>
          <p className="mt-1 text-sm font-semibold text-white/82">
            Personal pathway snapshot
          </p>
        </div>
      </div>
      <div className="hero-report-rotator mt-4 rounded-[18px] border border-white/10 bg-white/[0.06]">
        {heroReportLines.map((line) => (
          <p key={line} className="text-[1.02rem] font-bold leading-6 text-white">
            {line}
          </p>
        ))}
      </div>
      <p className="mt-4 text-sm leading-6 text-white/70">
        A readable report that shows what fits, what needs review, and what to do first.
      </p>
    </div>
  );
}

export default function HomePage() {
  const pathname = usePathname();

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f4ee] text-[#101052]">
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-8">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between rounded-full border border-white/14 bg-[#101052]/82 px-4 shadow-[0_22px_70px_rgba(8,12,48,0.22)] backdrop-blur-xl md:px-5">
          <Link href="/" aria-label="Fly Connect Pathway Finder home">
            <PathwayFinderLogo className="h-10 w-auto md:h-11" size="header" variant="dark" />
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => renderNavLink(pathname, link))}
          </nav>

          <Link
            href="/start"
            className="hidden h-11 items-center justify-center rounded-full bg-[color:var(--fc-yellow)] px-6 text-sm font-bold text-[#101052] shadow-[0_14px_36px_rgba(255,190,0,0.28)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--fc-yellow)] md:inline-flex"
          >
            Start assessment
          </Link>

          <details className="relative md:hidden">
            <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-white/14 bg-white/8 text-white [&::-webkit-details-marker]:hidden">
              <Menu className="h-4 w-4" />
            </summary>
            <div className="absolute right-0 top-[calc(100%+0.8rem)] w-56 rounded-[24px] border border-white/12 bg-[#101052] p-3 shadow-[0_24px_70px_rgba(4,8,32,0.34)]">
              <nav className="grid gap-1 text-sm">
                {navLinks.map((link) => renderNavLink(pathname, link, true))}
                <Link
                  href="/start"
                  className="mt-2 inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--fc-yellow)] px-4 font-bold text-[#101052]"
                >
                  Start assessment
                </Link>
              </nav>
            </div>
          </details>
        </div>
      </header>

      <section
        id="pathways"
        className="relative box-border min-h-screen bg-[#050825] px-5 pb-10 pt-24 text-white sm:px-8 md:min-h-[100svh] md:px-10 md:pb-10 md:pt-24 lg:px-16"
      >
        <Image
          src="/pathway/guidance-session.png"
          alt=""
          fill
          priority
          aria-hidden="true"
          sizes="100vw"
          className="object-cover object-[70%_center]"
          unoptimized
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,37,0.98)_0%,rgba(8,10,49,0.94)_38%,rgba(8,10,49,0.78)_62%,rgba(8,10,49,0.62)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,16,82,0.82)_0%,rgba(5,8,37,0.9)_100%)]" />
        <div className="relative mx-auto grid min-h-[calc(100vh-8.5rem)] max-w-[1180px] gap-9 md:min-h-[calc(100svh-8.5rem)] lg:grid-cols-[1.04fr_0.96fr] lg:items-center">
          <div className="max-w-[43rem] lg:-mt-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[color:var(--fc-yellow)]">
              <Sparkles className="h-4 w-4" />
              Free pathway assessment
            </div>
            <h1 className="mt-6 [font-family:var(--font-heading)] text-[2.65rem] font-bold leading-[0.96] tracking-[-0.004em] text-white sm:text-[3.8rem] md:text-[3.95rem] lg:text-[4.12rem]">
              <span className="block lg:whitespace-nowrap">Check your path</span>
              <span className="block lg:whitespace-nowrap">before you spend.</span>
            </h1>
            <p className="mt-5 max-w-[37rem] text-base leading-8 text-white/76 md:text-lg">
              Fly Connect Pathway Finder helps you understand your options before you pay for an
              agent, school application, or visa service.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/start"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[color:var(--fc-yellow)] px-8 text-base font-bold text-[#101052] shadow-[0_18px_44px_rgba(255,190,0,0.28)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--fc-yellow)]"
              >
                Start your pathway check
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#process"
                className="inline-flex h-14 items-center justify-center rounded-full border border-white/14 bg-white/[0.06] px-8 text-base font-bold text-white/86 backdrop-blur transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                See how it works
              </a>
            </div>
            <div className="mt-6 flex flex-wrap gap-3 sm:flex-nowrap">
              {proofPoints.map((point) => (
                <span
                  key={point}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm text-white/78"
                >
                  <CheckCircle2 className="h-4 w-4 text-[color:var(--fc-yellow)]" />
                  {point}
                </span>
              ))}
            </div>
            <MobileReportPreview />
          </div>

          <div className="relative hidden items-center justify-center md:flex lg:justify-end lg:pl-2">
            <DecisionRadar />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#07122c] text-white">
        <OpinionNoiseScene />
        <div className="relative z-10 mx-auto flex min-h-[38rem] max-w-[1320px] items-start px-5 py-14 sm:px-8 md:min-h-[46rem] md:items-center md:px-10 lg:px-12">
          <div className="w-full max-w-[35rem] text-left md:w-[48%] lg:max-w-[38rem]">
            <p className="text-[0.75rem] font-bold uppercase tracking-[0.24em] text-[color:var(--fc-yellow)]">
              Too many confident answers
            </p>
            <h2 className="mt-4 [font-family:var(--font-heading)] text-[3.1rem] font-bold leading-[0.9] tracking-[-0.02em] text-white md:text-[4.75rem]">
              Overwhelmed by opinions?
            </h2>
            <p className="mt-6 max-w-[34rem] text-base leading-8 text-white/74 md:text-lg">
              One person says Canada. Another says the UK. Someone says pay first. You hear too
              many confident answers, but still do not know which path actually fits you.
            </p>
            <div className="mt-8 max-w-[31rem] rounded-[26px] border border-white/12 bg-[#101052]/70 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] backdrop-blur-md">
              <p className="text-sm font-semibold leading-7 text-white/78">
                Pathway Finder slows the noise down for you and turns your goals and background
                into a clear travel plan.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative bg-[#f7f4ee] px-5 py-16 sm:px-8 md:px-10 md:py-24 lg:px-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="max-w-[46rem]">
            <p className="text-[0.75rem] font-bold uppercase tracking-[0.24em] text-[#101052]/54">
              This is for you if
            </p>
            <h2 className="mt-4 [font-family:var(--font-heading)] text-[3.5rem] font-bold leading-[0.88] tracking-[-0.03em] text-[#101052] md:text-[4.8rem]">
              You want to move with sense, not stress.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {audienceCards.map((card, index) => {
              const Icon = card.icon;

              return (
                <article
                  key={card.title}
                  className="rounded-[30px] border border-[#101052]/8 bg-white p-6 shadow-[0_18px_50px_rgba(16,16,82,0.06)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#101052]/7 text-[#101052]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="[font-family:var(--font-heading)] text-3xl font-bold text-[#101052]/12">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-bold text-[#101052]">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#101052]/64">{card.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="process" className="relative bg-[#101052] px-5 py-16 text-white sm:px-8 md:px-10 md:py-24 lg:px-16">
        <div className="absolute inset-0 bg-[#101052]" />
        <div className="relative mx-auto max-w-[1180px]">
          <div className="max-w-[44rem]">
            <p className="text-[0.75rem] font-bold uppercase tracking-[0.24em] text-[color:var(--fc-yellow)]">
              How it works
            </p>
            <h2 className="mt-4 [font-family:var(--font-heading)] text-[3.6rem] font-bold leading-[0.88] tracking-[-0.03em] text-white md:text-[5rem]">
              Four steps. Minutes, not days.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-4">
            {processSteps.map((step, index) => (
              <article key={step.label} className="relative rounded-[28px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
                <div className="mb-8 flex items-center gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-full border border-[color:rgba(255,190,0,0.5)] text-sm font-bold text-[color:var(--fc-yellow)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {index < processSteps.length - 1 ? (
                    <span className="hidden h-px flex-1 bg-[linear-gradient(90deg,rgba(255,190,0,0.5),transparent)] lg:block" />
                  ) : null}
                </div>
                <h3 className="[font-family:var(--font-heading)] text-[1.8rem] font-bold leading-none text-white">
                  {step.label}
                </h3>
                <p className="mt-4 text-sm leading-7 text-white/60">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="support" className="relative scroll-mt-24 overflow-hidden bg-[#070a2d] px-5 py-16 text-white sm:scroll-mt-28 sm:px-8 md:scroll-mt-32 md:px-10 md:py-24 lg:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_12%,rgba(255,190,0,0.11),transparent_22rem)]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[49%] overflow-hidden lg:block">
          <Image
            src="/pathway/advisor-support.png"
            alt=""
            fill
            aria-hidden="true"
            sizes="49vw"
            className="object-cover object-[58%_center]"
            unoptimized
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#070a2d_0%,rgba(7,10,45,0.9)_12%,rgba(7,10,45,0.52)_36%,rgba(7,10,45,0.18)_62%,rgba(7,10,45,0.56)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_36%,rgba(255,255,255,0.22),transparent_26rem)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,45,0.08)_0%,rgba(7,10,45,0.24)_62%,rgba(7,10,45,0.72)_100%)]" />
        </div>

        <div className="relative mx-auto max-w-[1180px] lg:min-h-[36rem]">
          <div className="max-w-[37rem] lg:pr-10">
            <div className="max-w-[37rem]">
              <p className="text-[0.75rem] font-bold uppercase tracking-[0.24em] text-[color:var(--fc-yellow)]">
                Need extra help?
              </p>
              <h2 className="mt-4 [font-family:var(--font-heading)] text-[2.45rem] font-bold leading-[0.92] tracking-[-0.02em] text-white sm:text-[3.15rem] md:text-[4.25rem]">
                <span className="block">Some paths need</span>
                <span className="block">a closer look.</span>
              </h2>
              <div className="relative mt-6 min-h-[22rem] overflow-hidden rounded-[30px] border border-white/12 bg-[#f8f5ef] shadow-[0_30px_90px_rgba(0,0,0,0.28)] sm:min-h-[26rem] lg:hidden">
                <Image
                  src="/pathway/advisor-support.png"
                  alt="Fly Connect support advisor ready to help with pathway questions"
                  fill
                  sizes="100vw"
                  className="object-cover object-[58%_center]"
                  unoptimized
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,45,0.04)_0%,rgba(7,10,45,0.16)_30%,rgba(7,10,45,0.72)_100%)]" />
                <div className="absolute bottom-5 left-5 right-5 rounded-[24px] border border-white/16 bg-[#101052]/82 p-5 shadow-[0_20px_55px_rgba(0,0,0,0.26)] backdrop-blur-md sm:left-6 sm:right-auto sm:w-[22rem]">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[color:var(--fc-yellow)]">
                    Advisor review
                  </p>
                  <p className="mt-2 text-base font-bold leading-6 text-white">
                    Clear guidance when your pathway needs a human second look.
                  </p>
                </div>
              </div>
              <p className="mt-5 max-w-[34rem] text-base leading-8 text-white/72 md:text-lg">
                If your situation is complex or your report raises questions, a Fly Connect advisor
                can review your details and guide you with real support, not guesswork.
              </p>
              <div className="mt-8 grid gap-3">
                {[
                  ["Review unclear route options", ListChecks],
                  ["Check document and timing gaps", ClipboardCheck],
                  ["Talk through your next move", MessageCircle],
                ].map(([label, Icon]) => {
                  const SupportIcon = Icon as LucideIcon;

                  return (
                    <div
                      key={label as string}
                      className="flex items-center gap-4 rounded-[22px] border border-white/10 bg-white/[0.06] p-4 text-sm font-semibold text-white/82"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/[0.08] text-[color:var(--fc-yellow)]">
                        <SupportIcon className="h-4 w-4" />
                      </span>
                      {label as string}
                    </div>
                  );
                })}
              </div>
              <Link
                href="/start"
                className="mt-8 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[color:var(--fc-yellow)] px-8 text-base font-bold text-[#101052] shadow-[0_18px_44px_rgba(255,190,0,0.28)] transition hover:-translate-y-0.5 sm:w-auto"
              >
                Start your pathway check
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer id="footer" className="bg-[#101052] px-5 py-10 text-white sm:px-8 md:px-10 lg:px-16">
        <div className="mx-auto grid max-w-[1180px] gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <PathwayFinderLogo className="h-11 w-auto" size="footer" variant="dark" />
            <p className="mt-5 max-w-[28rem] text-sm leading-7 text-white/58">
              Fly Connect Global helps people make better first moves toward study, travel, work,
              business, and relocation pathways.
            </p>
          </div>

          <div>
            <section id="contact" className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[color:var(--fc-yellow)]">
                Contact
              </p>
              <p className="mt-3 text-sm leading-7 text-white/72">
                For questions about your pathway report or support options, email{" "}
                <a className="font-bold text-white underline underline-offset-4" href="mailto:support@pathway.flyconnectglobal.com">
                  support@pathway.flyconnectglobal.com
                </a>
                .
              </p>
            </section>

            <div className="mt-5 flex flex-wrap gap-x-7 gap-y-3 text-sm text-white/64">
              {legalLinks.map((link) => (
                <Link key={link.label} href={link.href} className="transition hover:text-white">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
