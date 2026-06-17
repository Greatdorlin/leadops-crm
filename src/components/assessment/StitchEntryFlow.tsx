"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Check,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CircleX,
  GraduationCap,
  HandHeart,
  LockKeyhole,
  MapPinned,
  PlaneTakeoff,
  ScanSearch,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PathwayFinderLogo } from "@/components/brand/PathwayFinderLogo";
import { saveAssessmentDraft } from "@/lib/assessment/draft-client";
import { calculateProgressPercent } from "@/lib/assessment/progress";
import { cn } from "@/lib/cn";
import { getAssessmentFlow } from "@/lib/pathway-engine/questions";
import type { AssessmentAnswers, AssessmentStepKey } from "@/lib/pathway-engine/types";
import { useAssessmentStore } from "@/store/assessment-store";
import { GoalWaitlistDialog } from "./GoalWaitlistDialog";

type EntryStage = "trust" | "first-name" | "greeting" | "goal";
type PrimaryGoalValue = NonNullable<AssessmentAnswers["primaryGoal"]>;
type NavigatorWithDeviceMemory = Navigator & { deviceMemory?: number };

const introDots = [0, 1, 2, 3];

const greetingSlides = [
  {
    alt: "Saanu greeting scene",
    greeting: "Sàánu,",
    greetingClassName: "text-[color:var(--fc-yellow)]",
    nameClassName: "text-white",
    personClassName:
      "h-[53svh] w-[74svw] max-w-[18rem] sm:h-[68svh] sm:w-[48svw] sm:max-w-[26rem] lg:h-[88svh] lg:w-[34rem] lg:max-w-[34rem] xl:h-[92svh] xl:w-[36rem] xl:max-w-[36rem]",
    personSrc: "/pathway/greeting-cast-clean/saanu.png",
  },
  {
    alt: "Migwo greeting scene",
    greeting: "Migwo,",
    greetingClassName: "text-[color:var(--fc-yellow)]",
    nameClassName: "text-white",
    personClassName:
      "h-[52svh] w-[73svw] max-w-[17.75rem] sm:h-[64svh] sm:w-[46svw] sm:max-w-[25rem] lg:h-[83svh] lg:w-[31rem] lg:max-w-[31rem] xl:h-[88svh] xl:w-[33rem] xl:max-w-[33rem]",
    personSrc: "/pathway/greeting-cast-clean/migwo.png",
  },
  {
    alt: "Bawo ni greeting scene",
    greeting: "Bawo ni,",
    greetingClassName: "text-[color:var(--fc-yellow)]",
    nameClassName: "text-white",
    personClassName:
      "h-[52svh] w-[73svw] max-w-[17.75rem] sm:h-[65svh] sm:w-[46svw] sm:max-w-[25rem] lg:h-[84svh] lg:w-[31rem] lg:max-w-[31rem] xl:h-[89svh] xl:w-[33rem] xl:max-w-[33rem]",
    personSrc: "/pathway/greeting-cast-clean/bawo-ni.png",
  },
  {
    alt: "Hello greeting scene",
    greeting: "Hello,",
    greetingClassName: "text-white",
    nameClassName: "text-[color:var(--fc-yellow)]",
    personClassName:
      "h-[54svh] w-[74svw] max-w-[18rem] sm:h-[66svh] sm:w-[47svw] sm:max-w-[25rem] lg:h-[86svh] lg:w-[32rem] lg:max-w-[32rem] xl:h-[90svh] xl:w-[34rem] xl:max-w-[34rem]",
    personSrc: "/pathway/greeting-cast-clean/hello.png",
  },
  {
    alt: "Ndewo greeting scene",
    greeting: "Ndewo,",
    greetingClassName: "text-white",
    nameClassName: "text-[color:var(--fc-yellow)]",
    personClassName:
      "h-[55svh] w-[76svw] max-w-[18.5rem] sm:h-[69svh] sm:w-[49svw] sm:max-w-[27rem] lg:h-[90svh] lg:w-[34rem] lg:max-w-[34rem] xl:h-[94svh] xl:w-[36rem] xl:max-w-[36rem]",
    personSrc: "/pathway/greeting-cast-clean/ndewo.png",
  },
] as const;

const GREETING_SLIDE_MS = 1780;
const GREETING_FINAL_HOLD_MS = 800;
const GREETING_TRANSITION_SECONDS = 0.68;

const trustHighlights = [
  "No document uploads",
  "Private answers",
  "Clear first step",
];

const goalCards: Array<{
  description: string;
  detailBullets: string[];
  icon: LucideIcon;
  liveLabel: string;
  title: string;
  value: PrimaryGoalValue;
  status: "live" | "coming_soon";
}> = [
  {
    value: "study_abroad",
    title: "Study Abroad",
    description: "Higher education or specialized training abroad.",
    detailBullets: [
      "See study routes tailored to your profile",
      "Uncover opportunities that fit your ambition",
      "Explore pathways aligned with your dreams",
    ],
    icon: GraduationCap,
    liveLabel: "Live now",
    status: "live",
  },
  {
    value: "work_and_relocate",
    title: "Work Overseas",
    description: "Employment and long-term relocation support.",
    detailBullets: [
      "Track upcoming overseas work pathways",
      "Join the first release list for relocation updates",
      "Get notified as soon as the work route opens",
    ],
    icon: BriefcaseBusiness,
    liveLabel: "Coming soon",
    status: "coming_soon",
  },
  {
    value: "business_abroad",
    title: "Business Travel",
    description: "Short-term business, meetings, and event trips.",
    detailBullets: [
      "Prepare for future business travel guidance",
      "Receive launch updates for business trip support",
      "Be first to access the business planning route",
    ],
    icon: BriefcaseBusiness,
    liveLabel: "Coming soon",
    status: "coming_soon",
  },
  {
    value: "family_relocation",
    title: "Relocation",
    description: "A move built around family, stability, and settlement.",
    detailBullets: [
      "Plan around family relocation priorities",
      "Get early updates when relocation pathways launch",
      "Reserve your place for the release announcement",
    ],
    icon: HandHeart,
    liveLabel: "Coming soon",
    status: "coming_soon",
  },
  {
    value: "visit_or_tour",
    title: "Visit / Tourism",
    description: "Short visits, tourism, or personal travel plans.",
    detailBullets: [
      "Get alerted when visitor planning opens",
      "Access future tourism-focused travel support",
      "Stay ready for the upcoming visit route release",
    ],
    icon: MapPinned,
    liveLabel: "Coming soon",
    status: "coming_soon",
  },
];

const trustPoints = [
  {
    icon: ShieldCheck,
    title: "Proactive Pathway Support",
    body:
      "Your details stay confidential, and our Fly Connect team may review your profile to guide your next step. We do not ask for:",
    bullets: [
      "Passport numbers",
      "Bank statements",
      "BVN/NIN details",
      "Document uploads",
    ],
  },
  {
    icon: ScanSearch,
    title: "How This Tool Works",
    body:
      "The Pathway Finder turns your answers into directional guidance. It helps you see a likely pathway, what needs review, and what to do next.",
  },
  {
    icon: HandHeart,
    title: "Concierge Service Agreement",
    body:
      "By continuing, you agree that we can use your answers to calculate your initial readiness and tailor your experience.",
  },
];

function goalBackgroundClass(goal: PrimaryGoalValue) {
  switch (goal) {
    case "study_abroad":
      return "from-[#4f6b96] via-[#263b67] to-[#0f1930]";
    case "work_and_relocate":
      return "from-[#606c7e] via-[#202c4f] to-[#11182d]";
    case "business_abroad":
      return "from-[#7b6134] via-[#2f2652] to-[#13182e]";
    case "family_relocation":
      return "from-[#406f73] via-[#1c3250] to-[#11182d]";
    case "visit_or_tour":
      return "from-[#51706e] via-[#1a3148] to-[#11182d]";
  }
}

function StepDotStrip({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="flex items-center justify-center gap-2.5">
      {introDots.map((dot) => (
        <span
          key={dot}
          className={cn(
            "rounded-full transition",
            dot === activeIndex
              ? "h-2.5 w-10 bg-[linear-gradient(90deg,#FFBE00_0%,#FFD766_100%)] shadow-[0_0_24px_rgba(255,190,0,0.34)]"
              : "h-2.5 w-2.5 bg-[#101052]/14",
          )}
        />
      ))}
    </div>
  );
}

function EntryBackground({
  glowClassName = "absolute inset-0 bg-[radial-gradient(circle_at_26%_10%,rgba(255,255,255,0.9),transparent_18rem)] lg:bg-[radial-gradient(circle_at_24%_18%,rgba(255,255,255,0.82),transparent_26rem)]",
  imageClassName = "object-cover object-[78%_center] sm:object-[80%_center] lg:object-[76%_center]",
  overlayClassName = "absolute inset-0 bg-[linear-gradient(180deg,rgba(248,244,236,0.98)_0%,rgba(248,244,236,0.92)_26%,rgba(248,244,236,0.72)_58%,rgba(248,244,236,0.9)_100%)] lg:bg-[linear-gradient(90deg,rgba(248,244,236,0.97)_0%,rgba(248,244,236,0.94)_32%,rgba(248,244,236,0.78)_58%,rgba(248,244,236,0.34)_100%)]",
  src = "/pathway/start-intro-background.png",
}: {
  glowClassName?: string;
  imageClassName?: string;
  overlayClassName?: string;
  src?: string;
}) {
  return (
    <>
      <Image
        src={src}
        alt=""
        fill
        priority
        aria-hidden="true"
        sizes="100vw"
        className={cn("object-cover", imageClassName)}
        unoptimized
      />
      {overlayClassName ? <div className={overlayClassName} /> : null}
      {glowClassName ? <div className={glowClassName} /> : null}
    </>
  );
}

function shouldUseLiteEntryExperience() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const nav = navigator as NavigatorWithDeviceMemory;
  const userAgent = nav.userAgent ?? "";
  const isAppleMobile = /iP(hone|od|ad)/.test(userAgent);
  const isOlderAppleMobile = isAppleMobile && /OS (?:9|10|11|12|13|14|15)_/.test(userAgent);
  const smallestViewport = Math.min(window.innerWidth, window.innerHeight);
  const isPhoneSizedViewport = smallestViewport <= 430;
  const hasLimitedCpu =
    typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 2;
  const hasLimitedMemory = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;

  return isPhoneSizedViewport && (isOlderAppleMobile || hasLimitedCpu || hasLimitedMemory);
}

export function StitchEntryFlow() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const {
    answers,
    hasHydrated,
    leadId,
    trustAccepted,
    setLeadId,
    mergeAnswers,
    setTrustAccepted,
    setCurrentStepIndex,
  } = useAssessmentStore();

  const [stageOverride, setStageOverride] = useState<EntryStage | null>(null);
  const [nameInput, setNameInput] = useState(() => answers.firstName);
  const [nameError, setNameError] = useState("");
  const [greetingIndex, setGreetingIndex] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<PrimaryGoalValue | null>(
    answers.primaryGoal === "study_abroad" ? answers.primaryGoal : "study_abroad",
  );
  const [waitlistGoal, setWaitlistGoal] = useState<{
    title: string;
    value: PrimaryGoalValue;
  } | null>(null);
  const [saveError, setSaveError] = useState("");
  const latestIntroStateRef = useRef({ answers, leadId });
  const derivedStage: EntryStage = !trustAccepted
    ? "trust"
    : answers.firstName.trim()
      ? "goal"
      : "first-name";
  const stage = stageOverride ?? derivedStage;
  const useLiteEntryFlow = hasHydrated && shouldUseLiteEntryExperience();
  const disableStageMotion = prefersReducedMotion || useLiteEntryFlow;

  useEffect(() => {
    if (!hasHydrated || useLiteEntryFlow) {
      return;
    }

    router.prefetch("/pathway-finder");
  }, [hasHydrated, router, useLiteEntryFlow]);

  useEffect(() => {
    if (!hasHydrated || stage !== "greeting" || useLiteEntryFlow) {
      return;
    }

    const nextSlide = greetingSlides[greetingIndex + 1];

    if (!nextSlide) {
      return;
    }

    const image = new window.Image();
    image.src = nextSlide.personSrc;
  }, [greetingIndex, hasHydrated, stage, useLiteEntryFlow]);

  useEffect(() => {
    latestIntroStateRef.current = { answers, leadId };
  }, [answers, leadId]);

  const trimmedFirstName = useMemo(() => answers.firstName.trim(), [answers.firstName]);
  const trimmedNameInput = nameInput.trim();
  const hasMultipleNames = trimmedNameInput.length > 0 && trimmedNameInput.split(/\s+/).length > 1;
  const canContinueWithFirstName = trimmedNameInput.length >= 2 && !hasMultipleNames;
  const activeGreetingSlide = greetingSlides[greetingIndex] ?? greetingSlides[0];
  const activeGoalCard =
    goalCards.find((goal) => goal.value === selectedGoal) ??
    goalCards.find((goal) => goal.status === "live") ??
    goalCards[0];
  const ActiveGoalIcon = activeGoalCard.icon;
  const greetingProgressPercent = ((greetingIndex + 1) / greetingSlides.length) * 100;
  const stageAnimation = {
    initial: { opacity: disableStageMotion ? 1 : 0, y: disableStageMotion ? 0 : 18 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: disableStageMotion ? 1 : 0, y: disableStageMotion ? 0 : -18 },
    transition: {
      duration: disableStageMotion ? 0 : 0.35,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  };

  const persistIntroDraft = useCallback(
    async ({
      nextAnswers,
      nextStepIndex,
      nextStepKey,
      quietError = false,
      totalSteps = 4,
    }: {
      nextAnswers: AssessmentAnswers;
      nextStepIndex: number;
      nextStepKey: AssessmentStepKey;
      quietError?: boolean;
      totalSteps?: number;
    }) => {
      try {
        const result = await saveAssessmentDraft({
          leadId,
          answers: nextAnswers,
          currentStepKey: nextStepKey,
          currentStepIndex: nextStepIndex,
          progressPercent: calculateProgressPercent(nextStepIndex, totalSteps),
        });

        setLeadId(result.leadId);
        setSaveError("");
      } catch (error) {
        setSaveError(
          quietError
            ? ""
            : error instanceof Error
              ? error.message
              : "We couldn't save your progress right now.",
        );
      }
    },
    [leadId, setLeadId],
  );

  const persistGreetingTransition = useCallback(() => {
    const latestState = latestIntroStateRef.current;

    setStageOverride(null);
    void persistIntroDraft({
      nextAnswers: {
        ...latestState.answers,
        firstName: latestState.answers.firstName.trim(),
      },
      nextStepIndex: 3,
      nextStepKey: "primary_goal",
    });
  }, [persistIntroDraft]);

  useEffect(() => {
    if (stage !== "greeting") {
      return;
    }

    const greetingStepDuration = GREETING_SLIDE_MS;
    let greetingTimer = 0;

    greetingTimer = window.setInterval(() => {
      setGreetingIndex((current) => {
        if (current >= greetingSlides.length - 1) {
          window.clearInterval(greetingTimer);
          return current;
        }

        return current + 1;
      });
    }, greetingStepDuration);

    const nextStageTimer = window.setTimeout(() => {
      persistGreetingTransition();
    }, greetingSlides.length * greetingStepDuration + GREETING_FINAL_HOLD_MS);

    return () => {
      window.clearInterval(greetingTimer);
      window.clearTimeout(nextStageTimer);
    };
  }, [persistGreetingTransition, stage]);

  function continueFromTrust() {
    setTrustAccepted(true);
    setStageOverride(null);
    void persistIntroDraft({
      nextAnswers: answers,
      nextStepIndex: 1,
      nextStepKey: "first_name",
      quietError: true,
    });
  }

  function submitFirstName() {
    const value = trimmedNameInput;

    if (value.length < 2) {
      setNameError("Please enter your first name.");
      return;
    }

    if (value.split(/\s+/).length > 1) {
      setNameError("Just your first name, please.");
      return;
    }

    mergeAnswers({ firstName: value });
    setNameError("");
    setGreetingIndex(0);
    setStageOverride(useLiteEntryFlow ? null : "greeting");
    void persistIntroDraft({
      nextAnswers: {
        ...answers,
        firstName: value,
      },
      nextStepIndex: useLiteEntryFlow ? 3 : 2,
      nextStepKey: useLiteEntryFlow ? "primary_goal" : "greeting",
    });
  }

  function continueToAssessment() {
    if (!selectedGoal) {
      return;
    }

    const nextAnswers = {
      ...answers,
      primaryGoal: selectedGoal,
    };
    const nextFlow = getAssessmentFlow(nextAnswers);

    mergeAnswers({ primaryGoal: selectedGoal });
    setCurrentStepIndex(4);
    void persistIntroDraft({
      nextAnswers,
      nextStepIndex: 4,
      nextStepKey: nextFlow[4]?.stepKey ?? "country_clarity",
      totalSteps: nextFlow.length,
    });

    try {
      router.replace("/pathway-finder");
    } catch {
      window.location.assign("/pathway-finder");
    }
  }

  function openWaitlist(goal: { title: string; value: PrimaryGoalValue }) {
    setWaitlistGoal(goal);
  }

  return (
    <main className="min-h-[100svh]">
      <AnimatePresence mode="wait">
        {stage === "trust" ? (
          <motion.section
            key="trust"
            {...stageAnimation}
            className="assessment-shell min-h-[100svh] overflow-y-auto px-4 py-3 text-[#101052] md:px-6 md:py-4 lg:h-[100svh] lg:overflow-hidden"
          >
            <EntryBackground
              src="/pathway/start-security-background.png"
              imageClassName="object-cover object-[74%_center]"
              overlayClassName="absolute inset-0 bg-[linear-gradient(90deg,rgba(248,244,236,0.96)_0%,rgba(248,244,236,0.93)_34%,rgba(248,244,236,0.82)_58%,rgba(248,244,236,0.54)_100%)]"
              glowClassName="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.72),transparent_28rem)]"
            />
            <div className="relative mx-auto grid min-h-[calc(100vh-1.5rem)] min-h-[calc(100svh-1.5rem)] w-full max-w-[1180px] gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <section className="flex flex-col justify-center px-1 py-2 lg:pr-6">
                <PathwayFinderLogo className="-ml-1 h-11 w-auto self-start md:h-12" variant="light" />
                <p className="mt-5 text-[0.74rem] font-bold uppercase tracking-[0.26em] text-[#7d87ae]">
                  Before your report
                </p>
                <h1 className="mt-3 max-w-[11ch] [font-family:var(--font-heading)] text-[2.55rem] font-bold leading-[0.9] tracking-[-0.03em] text-[#101052] sm:text-[2.9rem] lg:text-[3.35rem]">
                  Privacy first. No sensitive uploads.
                </h1>
                <p className="mt-3 max-w-[34rem] text-sm leading-6 text-[#101052]/68 md:text-[0.98rem] md:leading-7">
                  We only ask what helps us shape your pathway. No passport numbers, bank
                  statements, or document uploads are required.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {trustHighlights.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-[#101052]/10 bg-white px-4 py-2 text-[0.9rem] font-semibold text-[#101052]/72 shadow-[0_10px_28px_rgba(16,16,82,0.05)]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </section>

              <section className="rounded-[32px] border border-[#101052]/10 bg-[rgba(255,255,255,0.95)] p-[0.95rem] shadow-[0_24px_60px_rgba(16,16,82,0.1)] md:p-4 lg:p-[1.15rem]">
                <div className="inline-flex h-[3rem] w-[3rem] items-center justify-center rounded-[18px] bg-[color:var(--fc-yellow)] text-[#101052] shadow-[0_16px_32px_rgba(255,190,0,0.2)]">
                  <ShieldCheck className="h-[1.15rem] w-[1.15rem]" />
                </div>
                <h2 className="mt-2.5 [font-family:var(--font-heading)] text-[1.82rem] font-bold leading-[0.94] tracking-[-0.03em] text-[#101052] md:text-[2.2rem]">
                  Before we begin
                </h2>
                <p className="mt-2 max-w-[34rem] text-sm leading-6 text-[#101052]/62 md:text-[0.9rem]">
                  A quick privacy and use note before we personalize your pathway.
                </p>

                <div className="mt-3.5 grid gap-2.5 lg:grid-cols-2">
                  {trustPoints.map((point, index) => {
                    const Icon = point.icon;

                    return (
                      <section
                        key={point.title}
                        className={cn(
                          "rounded-[24px] border border-[#101052]/8 bg-[#fbf9f4] px-4 py-3.5 md:px-5",
                          index === 0 && "lg:col-span-2",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-[#101052] text-[color:var(--fc-yellow)] shadow-[0_12px_24px_rgba(16,16,82,0.18)]">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 pt-0.5">
                            <h3 className="text-[0.98rem] font-bold leading-6 text-[#101052]">
                              {point.title}
                            </h3>
                            <p className="mt-1.5 text-[0.84rem] leading-6 text-[#101052]/62">
                              {point.body}
                            </p>
                          </div>
                        </div>

                        {point.bullets ? (
                          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                            {point.bullets.map((bullet) => (
                              <div
                                key={bullet}
                                className="inline-flex items-center gap-2 rounded-full border border-[#101052]/10 bg-white px-3.5 py-2 text-[#101052]/68 shadow-[0_8px_18px_rgba(16,16,82,0.03)]"
                              >
                                <CircleX className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                                <span className="text-[0.74rem] leading-4">{bullet}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </section>
                    );
                  })}
                </div>

                <div className="mt-3 border-t border-[#101052]/10 pt-3">
                  <button
                    type="button"
                    onClick={continueFromTrust}
                    className="assessment-button-primary h-12 w-full px-4 text-[0.76rem] sm:text-sm"
                  >
                    I agree, continue
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <div className="mt-3 flex items-center justify-center gap-2 text-center text-[0.74rem] text-[#101052]/54 md:text-[0.82rem]">
                    <LockKeyhole className="h-3.5 w-3.5" />
                    Your data stays protected and is used only for your pathway guidance.
                  </div>
                  {saveError ? (
                    <p className="mt-2 text-center text-xs text-red-500">{saveError}</p>
                  ) : null}
                </div>
              </section>
            </div>
          </motion.section>
        ) : null}

        {stage === "first-name" ? (
          <motion.section
            key="first-name"
            {...stageAnimation}
            className="assessment-shell relative min-h-[100svh] overflow-y-auto px-4 py-5 text-[#101052] md:px-6 md:py-5 lg:h-[100svh] lg:overflow-hidden"
          >
            <EntryBackground
              imageClassName="object-cover object-[86%_center] sm:object-[79%_center] lg:object-[74%_center] xl:object-[72%_center]"
              overlayClassName=""
              glowClassName=""
            />

            <div className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] min-h-[calc(100svh-2.5rem)] w-full max-w-[1180px] items-center justify-center lg:justify-start">
              <section className="w-full max-w-[22rem] py-1 text-center sm:max-w-[32rem] lg:max-w-[41rem] lg:py-4 lg:text-left">
                <div className="flex flex-col items-center lg:items-start">
                  <div className="flex flex-col items-center lg:items-start">
                    <StepDotStrip activeIndex={0} />
                  </div>
                </div>

                <div className="mt-6 rounded-[2rem] bg-white/76 px-4 py-5 shadow-[0_24px_54px_rgba(16,16,82,0.14)] backdrop-blur-xl sm:mt-7 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none sm:backdrop-blur-0 lg:mt-8">
                  <p className="[font-family:var(--font-heading)] text-[1.85rem] font-medium leading-none tracking-[-0.03em] text-[#50639f] sm:text-[2.18rem] lg:text-[2.9rem]">
                    Hi there
                  </p>
                  <h1 className="mx-auto mt-2 max-w-[10.5ch] [font-family:var(--font-heading)] text-[2.3rem] font-bold leading-[0.9] tracking-[-0.055em] text-[#08134a] sm:max-w-[11.25ch] sm:text-[3.25rem] lg:mx-0 lg:max-w-[11.5ch] lg:text-[4.35rem]">
                    Let&apos;s begin your pathway
                  </h1>
                  <p className="mx-auto mt-3 max-w-[20rem] text-[1rem] leading-7 text-[#1f2e68] sm:mt-4 sm:max-w-[28rem] sm:text-sm md:text-base lg:mx-0 lg:max-w-[31rem]">
                    Enter your first name so we can personalize the next steps.
                  </p>

                  <div className="mx-auto mt-6 w-full max-w-[35rem] lg:mx-0">
                    <label htmlFor="first-name-input" className="sr-only">
                      First name
                    </label>
                    <input
                      id="first-name-input"
                      autoComplete="given-name"
                      value={nameInput}
                      onChange={(event) => {
                        setNameInput(event.target.value);
                        setNameError(
                          event.target.value.trim().split(/\s+/).filter(Boolean).length > 1
                            ? "Just your first name, please."
                            : "",
                        );
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          submitFirstName();
                        }
                      }}
                      type="text"
                      placeholder="Enter your first name"
                      className="h-14 w-full rounded-full border border-white/90 bg-white/94 px-6 text-center [font-family:var(--font-body)] text-[1rem] font-semibold tracking-tight text-[#0f1d5e] shadow-[0_24px_56px_rgba(16,16,82,0.12)] outline-none transition placeholder:text-[#20316e]/42 focus:border-[#101052]/24 focus:bg-white focus:shadow-[0_28px_60px_rgba(16,16,82,0.16)] sm:h-16 sm:px-8 sm:text-[1.18rem] lg:text-left"
                    />
                    <div className="mt-3 h-5 text-center text-xs font-semibold text-[#b77b00] md:text-sm lg:text-left">
                      {nameError}
                    </div>
                  </div>

                  <div className="mt-4 flex justify-center sm:mt-5 lg:justify-start">
                    <button
                      type="button"
                      onClick={submitFirstName}
                      disabled={!canContinueWithFirstName}
                      className={cn(
                        "group inline-flex h-11 items-center gap-2.5 rounded-full px-7 text-[0.78rem] font-bold uppercase tracking-[0.16em] transition sm:h-12 sm:px-8 sm:text-sm",
                        canContinueWithFirstName
                          ? "assessment-button-primary shadow-[0_20px_44px_rgba(255,190,0,0.28)]"
                          : "cursor-not-allowed border border-[#101052]/10 bg-white text-[#101052]/34 shadow-[0_14px_30px_rgba(16,16,82,0.04)]",
                      )}
                    >
                      Next
                      <PlaneTakeoff className="h-5 w-5 transition group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </motion.section>
        ) : null}

        {stage === "greeting" ? (
          <motion.section
            key="greeting"
            {...stageAnimation}
            className="assessment-shell relative flex min-h-screen min-h-[100svh] flex-col overflow-hidden bg-[#040b2d] text-white"
          >
            <Image
              src="/pathway/greeting-background.png"
              alt=""
              fill
              priority
              aria-hidden="true"
              sizes="100vw"
              className="object-cover object-[62%_center] sm:object-center"
              unoptimized
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,10,42,0.16)_0%,rgba(3,10,42,0.12)_24%,rgba(3,10,42,0.68)_72%,#040b2d_100%)] sm:bg-[linear-gradient(90deg,rgba(3,10,42,0.74)_0%,rgba(3,10,42,0.56)_28%,rgba(3,10,42,0.18)_56%,rgba(3,10,42,0.08)_100%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,190,0,0.12),transparent_18rem),radial-gradient(circle_at_80%_78%,rgba(255,255,255,0.08),transparent_18rem)]" />

            <div className="relative flex min-h-screen min-h-[100svh] flex-1 items-start justify-center overflow-hidden sm:items-center">
              <div className="pointer-events-none absolute inset-y-0 right-0 w-full overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={activeGreetingSlide.personSrc}
                    initial={{
                      opacity: 0,
                      scale: prefersReducedMotion ? 1 : 1.018,
                      x: prefersReducedMotion ? 0 : 24,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      x: 0,
                    }}
                    exit={{
                      opacity: 0,
                      scale: prefersReducedMotion ? 1 : 1.01,
                      x: prefersReducedMotion ? 0 : -10,
                    }}
                    transition={{
                      duration: prefersReducedMotion ? 0.16 : GREETING_TRANSITION_SECONDS,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className={cn(
                      "absolute bottom-4 right-[-4%] sm:bottom-0 sm:right-0 lg:right-[1.5%] xl:right-[3%]",
                      activeGreetingSlide.personClassName,
                    )}
                  >
                    <div className="pointer-events-none absolute inset-x-[6%] bottom-[8%] h-24 rounded-full bg-[radial-gradient(circle,rgba(255,190,0,0.18)_0%,rgba(255,190,0,0.08)_42%,transparent_72%)] blur-2xl sm:hidden" />
                    <Image
                      src={activeGreetingSlide.personSrc}
                      alt={activeGreetingSlide.alt}
                      fill
                      priority
                      sizes="(max-width: 640px) 70vw, (max-width: 1024px) 48vw, 36rem"
                      className="object-contain object-bottom [mask-image:linear-gradient(180deg,#000_0%,#000_92%,transparent_100%)] sm:[mask-image:none] drop-shadow-[0_24px_70px_rgba(2,6,23,0.3)]"
                      unoptimized
                    />
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="relative z-10 mx-auto flex w-full max-w-[1680px] items-start px-4 pb-6 pt-6 sm:items-center sm:px-10 sm:py-10 md:px-14 lg:px-20">
                <div className="w-full max-w-[18rem] pb-[18.5rem] text-left sm:max-w-[32rem] sm:pb-[18rem] md:max-w-[40rem] md:pb-[20rem] lg:max-w-[52rem] lg:pb-0">
                  <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,18,58,0.82)_0%,rgba(6,14,48,0.54)_100%)] px-5 py-5 shadow-[0_22px_60px_rgba(0,0,0,0.24)] backdrop-blur-md sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none sm:backdrop-blur-0">
                    <span className="inline-flex rounded-full border border-white/14 bg-white/[0.08] px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-white/74 sm:text-[0.72rem]">
                      Pathway in motion
                    </span>

                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={`copy-${activeGreetingSlide.personSrc}`}
                        initial={{
                          opacity: 0,
                          y: prefersReducedMotion ? 0 : 16,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        exit={{
                          opacity: 0,
                          y: prefersReducedMotion ? 0 : -10,
                        }}
                        transition={{
                          duration: prefersReducedMotion ? 0.16 : GREETING_TRANSITION_SECONDS,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        <h1
                          className={cn(
                            "mt-4 max-w-[7ch] text-balance [font-family:var(--font-heading)] text-[2.9rem] font-bold leading-[0.9] tracking-[-0.06em] drop-shadow-[0_12px_36px_rgba(2,6,23,0.28)] sm:mt-5 sm:max-w-[8.2ch] sm:text-[4.5rem] md:text-[5.3rem] lg:text-[6.55rem]",
                            activeGreetingSlide.greetingClassName,
                          )}
                        >
                          {activeGreetingSlide.greeting}
                        </h1>
                        <h2
                          className={cn(
                            "max-w-[7.8ch] text-balance [font-family:var(--font-heading)] text-[2.75rem] font-bold leading-[0.92] tracking-[-0.06em] drop-shadow-[0_12px_36px_rgba(2,6,23,0.28)] sm:max-w-[8.8ch] sm:text-[4.4rem] md:text-[5.2rem] lg:text-[6.42rem]",
                            activeGreetingSlide.nameClassName,
                          )}
                        >
                          {trimmedFirstName || "Traveler"}
                        </h2>
                      </motion.div>
                    </AnimatePresence>

                    <p className="mt-3 text-[0.92rem] font-semibold leading-6 text-white/90 sm:mt-4 sm:text-[1.24rem] md:text-[1.56rem] lg:text-[1.9rem]">
                      Establishing your pathway...
                    </p>

                    <div className="mt-4 w-full max-w-[15rem] sm:mt-9 sm:max-w-[31rem] md:max-w-[38rem] lg:max-w-[46rem]">
                      <div className="mb-2 flex items-center justify-between text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/58 sm:text-[0.74rem]">
                        <span>Building route</span>
                        <span>{Math.round(greetingProgressPercent)}%</span>
                      </div>
                      <div className="relative h-3 overflow-hidden rounded-full border border-[rgba(255,190,0,0.24)] bg-[rgba(255,255,255,0.08)] shadow-[0_0_0_1px_rgba(255,190,0,0.08),0_0_34px_rgba(255,190,0,0.08)] sm:h-4">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${greetingProgressPercent}%` }}
                          transition={{
                            duration: prefersReducedMotion ? 0.2 : GREETING_SLIDE_MS / 1000,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#FFBE00_0%,#FFD766_56%,rgba(255,255,255,0.98)_100%)] shadow-[0_0_26px_rgba(255,190,0,0.54)]"
                        />
                        <div className="absolute inset-0 animate-[shimmer_2.4s_linear_infinite] bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.12)_40%,transparent_72%)] [background-size:200%_100%]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        ) : null}

        {stage === "goal" ? (
          <motion.section
            key="goal"
            {...stageAnimation}
            className="assessment-shell relative box-border min-h-[100svh] overflow-y-auto bg-[#060d2e] px-3 py-3 text-white sm:px-4 sm:py-4 md:px-6 md:py-5 lg:h-[100svh] lg:overflow-hidden"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(30,51,111,0.55),transparent_40%),linear-gradient(180deg,#09143f_0%,#060d2e_100%)]" />
            <div className="relative mx-auto flex min-h-[calc(100vh-1.5rem)] min-h-[calc(100svh-1.5rem)] w-full max-w-[1440px] flex-col rounded-[26px] border border-white/12 bg-[linear-gradient(180deg,rgba(10,21,67,0.96)_0%,rgba(6,14,48,0.98)_100%)] px-5 py-5 shadow-[0_28px_80px_rgba(0,0,0,0.34)] sm:rounded-[30px] sm:px-7 sm:py-6 lg:h-[calc(100svh-2rem)] lg:min-h-0 lg:px-10 lg:py-5 xl:px-12">
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(answers.firstName);
                    setStageOverride("first-name");
                  }}
                  className="inline-flex h-11 items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-5 text-[0.98rem] font-semibold text-white/90 shadow-[0_14px_30px_rgba(2,6,23,0.2)] transition hover:border-white/16 hover:bg-white/[0.08] lg:h-10 lg:px-4 lg:text-[0.94rem]"
                >
                  <ArrowLeft className="h-5 w-5" />
                  Back
                </button>
                <span className="inline-flex h-11 items-center rounded-full border border-[#4c5b9c] bg-[#17245d] px-5 text-[0.84rem] font-bold uppercase tracking-[0.14em] text-white/90 shadow-[0_14px_30px_rgba(2,6,23,0.2)] lg:h-10 lg:px-4 lg:text-[0.8rem]">
                  Step 1 of 6
                </span>
              </div>

              <div className="mt-5 h-[3px] overflow-hidden rounded-full bg-white/14 lg:mt-4">
                <div className="h-full w-1/6 rounded-full bg-[linear-gradient(90deg,#FFBE00_0%,#FFD766_100%)] shadow-[0_0_18px_rgba(255,190,0,0.45)]" />
              </div>

              <header className="mt-5 max-w-[760px] text-left lg:mx-auto lg:mt-3 lg:text-center">
                <h1 className="max-w-[11ch] text-balance [font-family:var(--font-heading)] text-[2rem] font-bold leading-[0.94] tracking-[-0.05em] text-white sm:text-[2.8rem] lg:mx-auto lg:max-w-none lg:text-[2.95rem] xl:text-[3.2rem]">
                  What is your primary travel goal?
                </h1>
                <p className="mt-2 max-w-[18rem] text-[0.98rem] leading-7 text-white/78 sm:max-w-[32rem] sm:text-[1.08rem] lg:mx-auto lg:max-w-[40rem] lg:text-[1rem] lg:leading-6 xl:text-[1.08rem]">
                  Choose the option that best describes your plan.
                </p>
              </header>

              <section className="relative mt-5 flex-1 overflow-hidden rounded-[32px] lg:mt-3 lg:min-h-0">
                <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-50", goalBackgroundClass(activeGoalCard.value))} />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_18%,rgba(255,255,255,0.16),transparent_22rem),radial-gradient(circle_at_72%_88%,rgba(255,190,0,0.1),transparent_18rem)]" />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(7,14,44,0.14)_0%,rgba(7,14,44,0.08)_26%,rgba(7,14,44,0.36)_56%,rgba(7,14,44,0.12)_100%)]" />
                <div className="pointer-events-none absolute inset-0 rounded-[32px] border border-white/8" />

                <div className="relative grid h-full grid-cols-1 gap-4 p-1 lg:grid-cols-[0.72fr_1.28fr] lg:items-stretch lg:gap-5">
                  <aside className="order-1 relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,38,91,0.42)_0%,rgba(11,22,62,0.24)_54%,rgba(9,18,54,0.42)_100%)] px-5 py-[1.125rem] shadow-[0_26px_60px_rgba(0,0,0,0.18)] sm:px-6 sm:py-6 lg:order-2 lg:flex lg:min-h-0 lg:items-center lg:border-white/0 lg:bg-transparent lg:px-7 lg:py-3 lg:shadow-none">
                    <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_24%_16%,rgba(255,255,255,0.12),transparent_16rem),radial-gradient(circle_at_65%_86%,rgba(255,190,0,0.08),transparent_14rem)] lg:hidden" />

                    <div className="relative z-10 flex h-full w-full flex-col items-start text-left lg:max-w-[30rem] lg:justify-center">
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-[color:var(--fc-yellow)]/90 bg-[rgba(11,22,62,0.28)] text-[color:var(--fc-yellow)] shadow-[0_0_34px_rgba(255,190,0,0.12)] sm:h-[5rem] sm:w-[5rem]">
                        <ActiveGoalIcon className="h-7 w-7 sm:h-9 sm:w-9" />
                      </div>

                      <div className="mt-4 lg:mt-6">
                        <h2 className="max-w-[11ch] [font-family:var(--font-heading)] text-[1.95rem] font-bold leading-[0.95] tracking-[-0.04em] text-white sm:text-[2.75rem] lg:max-w-[10ch] lg:text-[2.85rem] xl:text-[3rem]">
                          {activeGoalCard.title}
                        </h2>
                        <span className="mt-2.5 inline-flex rounded-full bg-[color:var(--fc-yellow)] px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[#08123b] sm:px-3.5 sm:text-[0.74rem]">
                          {activeGoalCard.liveLabel}
                        </span>
                      </div>

                      <p className="mt-3.5 max-w-[18rem] text-[0.96rem] leading-6 text-white/82 sm:max-w-[27rem] sm:text-[1.06rem] sm:leading-7 lg:max-w-[24rem] lg:text-[0.98rem]">
                        {activeGoalCard.description}
                      </p>

                      <div className="mt-5 hidden w-full max-w-[31rem] space-y-3 text-left sm:block lg:mt-5 lg:max-w-[24rem] lg:space-y-2.5">
                        {activeGoalCard.detailBullets.map((item) => (
                          <div key={item} className="flex items-start gap-3 text-white/92">
                            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[color:var(--fc-yellow)]/65">
                              <Check className="h-3.5 w-3.5 text-[color:var(--fc-yellow)]" />
                            </span>
                            <span className="text-[0.96rem] leading-7 sm:text-[1rem] lg:text-[0.92rem] lg:leading-6">
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={continueToAssessment}
                        disabled={!selectedGoal}
                        className={cn(
                          "mt-5 inline-flex h-[3.3rem] w-full items-center justify-center gap-3 rounded-full px-6 text-[0.94rem] font-extrabold uppercase tracking-[0.08em] transition sm:mt-7 sm:h-14 sm:max-w-[24rem] sm:px-7 sm:text-[1rem] lg:mt-5 lg:h-12 lg:max-w-[19rem] lg:text-[0.9rem]",
                          selectedGoal
                            ? "bg-[linear-gradient(180deg,#FFCB21_0%,#FFBE00_100%)] text-[#08123b] shadow-[0_20px_36px_rgba(255,190,0,0.2)] hover:translate-y-[-1px]"
                            : "cursor-not-allowed bg-white/10 text-white/35",
                        )}
                      >
                        Let&apos;s Go
                        <ArrowRight className="h-5 w-5" />
                      </button>
                    </div>
                  </aside>

                  <div className="order-2 space-y-2.5 lg:order-1 lg:space-y-2 lg:pr-2">
                    {goalCards.map((goal) => {
                      const Icon = goal.icon;
                      const selected = selectedGoal === goal.value && goal.status === "live";

                      return (
                        <button
                          key={goal.value}
                          type="button"
                          onClick={() => {
                            if (goal.status === "coming_soon") {
                              openWaitlist({ title: goal.title, value: goal.value });
                              return;
                            }

                            setSelectedGoal(goal.value);
                          }}
                          className={cn(
                            selected && "hidden lg:flex",
                            "group relative flex w-full items-center gap-3 overflow-hidden rounded-[22px] border px-4 py-3.5 text-left transition duration-300 lg:min-h-[60px] lg:gap-3 lg:px-3.5 lg:py-2.5",
                            selected
                              ? "border-[color:var(--fc-yellow)] bg-[linear-gradient(180deg,rgba(17,31,89,0.84)_0%,rgba(9,19,60,0.92)_100%)] shadow-[0_0_0_1px_rgba(255,190,0,0.08),0_14px_28px_rgba(0,0,0,0.2)]"
                              : "border-white/10 bg-[linear-gradient(180deg,rgba(17,28,74,0.54)_0%,rgba(11,20,58,0.74)_100%)] shadow-[0_12px_22px_rgba(0,0,0,0.14)] hover:border-white/16 hover:bg-[linear-gradient(180deg,rgba(20,32,84,0.7)_0%,rgba(12,21,61,0.84)_100%)]",
                          )}
                        >
                          <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-28", goalBackgroundClass(goal.value))} />
                          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(6,14,48,0.06),rgba(6,14,48,0.48))]" />
                          <div className="relative z-10 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-current/18 text-[color:var(--fc-yellow)] lg:h-10 lg:w-10">
                            <Icon
                              className={cn(
                                "h-[1.25rem] w-[1.25rem] lg:h-[1.15rem] lg:w-[1.15rem]",
                                goal.status === "coming_soon" && "text-white/72",
                              )}
                            />
                          </div>

                          <div className="relative z-10 min-w-0 flex-1">
                            <h2 className="truncate [font-family:var(--font-heading)] text-[1.02rem] font-bold leading-none text-white sm:text-[1.16rem] lg:text-[0.94rem] xl:text-[1rem]">
                              {goal.title}
                            </h2>
                            <span
                              className={cn(
                                "mt-1.5 inline-flex rounded-full px-2.5 py-0.5 text-[0.66rem] font-bold uppercase tracking-[0.08em] lg:mt-1 lg:px-2 lg:text-[0.58rem]",
                                goal.status === "live"
                                  ? "bg-[color:var(--fc-yellow)] text-[#0a133d]"
                                  : "bg-white/[0.06] text-white/68",
                              )}
                            >
                              {goal.liveLabel}
                            </span>
                          </div>

                          <ArrowRight
                            className={cn(
                              "relative z-10 h-5 w-5 shrink-0 transition lg:h-[1.125rem] lg:w-[1.125rem]",
                              selected ? "text-[color:var(--fc-yellow)]" : "text-white/62",
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              <footer className="mt-5 flex items-center gap-4 text-white/62 lg:mt-1.5">
                <span className="hidden h-px flex-1 bg-white/14 sm:block" />
                <p className="mx-auto text-center text-[1rem] leading-7 sm:text-[1.06rem] lg:text-[0.88rem]">
                  Study is live. Other pathways are opening soon.
                </p>
                <span className="hidden h-px flex-1 bg-white/14 sm:block" />
              </footer>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <GoalWaitlistDialog
        open={Boolean(waitlistGoal)}
        goalValue={waitlistGoal?.value ?? ""}
        goalLabel={waitlistGoal?.title ?? ""}
        defaultFirstName={trimmedFirstName}
        onClose={() => setWaitlistGoal(null)}
      />
    </main>
  );
}
