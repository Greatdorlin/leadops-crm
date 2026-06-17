"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, LoaderCircle, Mail, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { emptyAnswers } from "@/lib/assessment/defaults";
import { saveAssessmentDraft } from "@/lib/assessment/draft-client";
import { calculateProgressPercent } from "@/lib/assessment/progress";
import { cn } from "@/lib/cn";
import { REPORT_ACCURACY_WARNING } from "@/lib/pathway-engine/report-knowledge";
import { getAssessmentFlow } from "@/lib/pathway-engine/questions";
import { assessmentSubmissionSchema } from "@/lib/pathway-engine/schemas";
import type { AssessmentAnswers, AssessmentStepDefinition } from "@/lib/pathway-engine/types";
import { useAssessmentStore } from "@/store/assessment-store";
import { AssessmentStep } from "./AssessmentStep";
import { OptionCard } from "./OptionCard";
import { ProgressHeader } from "./ProgressHeader";

const contactSchema = assessmentSubmissionSchema.pick({
  lastName: true,
  whatsappNumber: true,
  email: true,
  wantsHumanSupport: true,
  marketingConsent: true,
});

const firstNameSchema = z.object({
  firstName: z.string().trim().min(2, "Please enter your first name."),
});

type ContactFormValues = z.infer<typeof contactSchema>;
type FirstNameFormValues = z.infer<typeof firstNameSchema>;
const JOURNEY_START_STEP_KEY = "primary_goal";
const DEFAULT_WHATSAPP_PREFIX = "+234";

function withDefaultWhatsappPrefix(value: string) {
  return value.trim().length > 0 ? value : DEFAULT_WHATSAPP_PREFIX;
}

function stepEyebrow(step: AssessmentStepDefinition) {
  switch (step.stepKey) {
    case "trust":
      return "Start with confidence";
    case "first_name":
      return "Tell us your name";
    case "greeting":
      return "We’re getting things ready";
    case "primary_goal":
      return "Choose your goal";
    case "contact":
      return "Generate your report";
    default:
      return "Shape your pathway";
  }
}

function titleClassForStep(
  step: AssessmentStepDefinition,
  isPostDestinationSingleSelect = false,
) {
  if (step.stepKey === "country_clarity") {
    return "text-[1.92rem] leading-[0.95] !max-w-[18ch] sm:text-[2.45rem] sm:!max-w-[18ch] md:text-[2.9rem] md:!max-w-[19ch] lg:text-[3.25rem] lg:!max-w-[20ch] xl:text-[3.45rem]";
  }

  if (step.stepKey === "destination_interest") {
    return "text-[1.72rem] leading-[0.95] !max-w-[18ch] sm:text-[2.15rem] sm:!max-w-[17ch] md:text-[2.55rem] md:!max-w-[18ch] lg:text-[2.95rem] lg:!max-w-[19ch] xl:text-[3.2rem]";
  }

  if (isPostDestinationSingleSelect) {
    return "text-[1.78rem] leading-[0.96] !max-w-[18ch] sm:text-[2.2rem] sm:!max-w-[17ch] md:text-[2.55rem] md:!max-w-[18ch] lg:text-[2.95rem] lg:!max-w-[19ch] xl:text-[3.2rem]";
  }

  if (step.stepKey === "contact") {
    return "lg:text-[3.5rem] xl:text-[3.7rem]";
  }

  if (step.kind === "single-select") {
    return "lg:text-[3.72rem] xl:text-[4rem]";
  }

  return "lg:text-[3.6rem] xl:text-[3.9rem]";
}

function selectPromptForStep(step: AssessmentStepDefinition) {
  switch (step.stepKey) {
    case "study_level":
      return "Choose the study track that matches your current goal.";
    case "age_range":
      return "Pick the range that fits you best.";
    case "highest_education":
      return "Choose the highest qualification you have completed.";
    case "study_funding_readiness":
      return "Pick the support style you want us to assess.";
    case "work_field":
      return "Choose the field that is closest to your work background.";
    case "work_experience_years":
      return "Select your most accurate experience band.";
    case "language_test_status":
      return "Choose the test status that best matches you today.";
    case "business_stage":
      return "Pick the stage that reflects where your business is now.";
    case "visit_travel_window":
      return "Choose the timeframe that feels most realistic.";
    case "event_purpose":
      return "Pick the purpose that matters most for this event.";
    case "passport_status":
      return "Select the passport status that is true right now.";
    case "state_of_residence":
      return "Select your current state.";
    case "passport_validity":
      return "Choose the closest validity range.";
    case "timeline":
      return "Pick the pace you want this journey to move at.";
    case "funding_readiness":
      return "Choose the funding posture that feels most realistic.";
    case "previous_refusal":
      return "Select the answer that matches your history.";
    default:
      return "Choose the option that fits you best.";
  }
}

function optionPresentation(
  step: AssessmentStepDefinition,
  option: { value: string; label: string; description?: string },
) {
  if (step.stepKey === "country_clarity") {
    if (option.value === "yes") {
      return {
        label: "Specific country",
        description: "Tailor the flow to one destination.",
      };
    }

    if (option.value === "few_options") {
      return {
        label: "Compare options",
        description: "Help me choose from a shortlist.",
      };
    }

    return {
      label: "Need recommendations",
      description: "Show the strongest-fit countries for me.",
    };
  }

  if (step.stepKey === "study_level") {
    if (option.value === "undergraduate") {
      return { label: "Undergraduate", description: "Bachelor's or first-degree route." };
    }

    if (option.value === "postgraduate") {
      return { label: "Master's or PhD", description: "Advanced study after your first degree." };
    }

    if (option.value === "diploma_foundation") {
      return {
        label: "Diploma or foundation",
        description: "A bridge into your main study route.",
      };
    }

    if (option.value === "professional_course") {
      return {
        label: "Professional course",
        description: "Career-focused training or certification.",
      };
    }
  }

  if (step.stepKey === "timeline") {
    if (option.value === "immediately") {
      return { label: "Within 3 months", description: "I want to move soon." };
    }

    if (option.value === "3_6_months") {
      return { label: "3 - 6 months", description: "I’m actively preparing." };
    }

    if (option.value === "6_12_months") {
      return { label: "6 - 12 months", description: "I’m planning ahead." };
    }

    if (option.value === "1_2_years") {
      return { label: "More than 12 months", description: "I’m still exploring." };
    }
  }

  if (step.stepKey === "passport_status") {
    if (option.value === "valid") {
      return { label: "Valid passport", description: "Your travel document is ready to use." };
    }

    if (option.value === "renewing") {
      return { label: "Renewing now", description: "Your passport is currently being updated." };
    }

    if (option.value === "no_passport") {
      return { label: "No passport yet", description: "We’ll factor that into your readiness." };
    }
  }

  if (step.stepKey === "language_test_status") {
    if (option.value === "valid_result") {
      return { label: "Valid result ready", description: "You already have a current score." };
    }

    if (option.value === "booked") {
      return { label: "Booked already", description: "You already have a test date." };
    }

    if (option.value === "not_taken") {
      return {
        label: "Not taken yet",
        description: "We should factor test timing into the route.",
      };
    }
  }

  return {
    label: option.label,
    description: option.description,
  };
}

function destinationVisual(value: string) {
  switch (value) {
    case "uk":
      return {
        flagSrc: "/flags/gb.svg",
        flagAlt: "United Kingdom flag",
        eyebrow: "United Kingdom",
      };
    case "canada":
      return {
        flagSrc: "/flags/ca.svg",
        flagAlt: "Canada flag",
        eyebrow: "North America",
      };
    case "usa":
      return {
        flagSrc: "/flags/us.svg",
        flagAlt: "United States flag",
        eyebrow: "United States",
      };
    case "australia":
      return {
        flagSrc: "/flags/au.svg",
        flagAlt: "Australia flag",
        eyebrow: "Oceania",
      };
    case "europe":
      return {
        flagSrc: "/flags/eu.svg",
        flagAlt: "European Union flag",
        eyebrow: "Regional routes",
      };
    case "finland":
      return {
        flagSrc: "/flags/fi.svg",
        flagAlt: "Finland flag",
        eyebrow: "Nordic route",
      };
    case "not_sure":
      return { icon: "compass" as const, eyebrow: "Need guidance" };
    case "other":
      return { icon: "sparkles" as const, eyebrow: "Custom route" };
    default:
      return { icon: "globe" as const, eyebrow: "Destination" };
  }
}

function CompactSelectOptions({
  currentField,
  currentSingleSelectValue,
  currentStep,
  onSelect,
}: {
  currentField: keyof AssessmentAnswers;
  currentSingleSelectValue: string;
  currentStep: AssessmentStepDefinition;
  onSelect: (field: keyof AssessmentAnswers, value: string) => void;
}) {
  return (
    <>
      {currentStep.options?.map((option) => {
        const presentation = optionPresentation(currentStep, option);
        const selected = currentSingleSelectValue === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onSelect(currentField, option.value)}
            className={cn(
              "flex w-full items-start justify-between gap-3 rounded-[20px] border px-4 py-3 text-left transition",
              selected
                ? "border-[rgba(255,190,0,0.38)] bg-[linear-gradient(135deg,rgba(255,190,0,0.14),rgba(255,255,255,0.05))]"
                : "border-white/8 bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.06]",
            )}
          >
            <div className="min-w-0">
              <p className={cn("text-base [font-family:var(--font-heading)]", selected ? "text-white" : "text-white/92")}>
                {presentation.label}
              </p>
              {presentation.description ? (
                <p className="mt-1 text-sm leading-6 text-white/58">
                  {presentation.description}
                </p>
              ) : null}
            </div>
            <span
              className={cn(
                "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                selected
                  ? "border-[color:var(--fc-yellow)] bg-[color:var(--fc-yellow)] text-[color:var(--fc-navy)]"
                  : "border-white/10 text-white/28",
              )}
            >
              {selected ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5" />
              )}
            </span>
          </button>
        );
      })}
    </>
  );
}

export function AssessmentShell() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    answers,
    trustAccepted,
    currentStepIndex,
    isAnalyzing,
    analysisProgress,
    leadId,
    setTrustAccepted,
    setCurrentStepIndex,
    setAnalyzing,
    setAnalysisProgress,
    setLeadId,
    setAnswer,
    mergeAnswers,
    setGeneratedResult,
    resetAssessment,
  } = useAssessmentStore();
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [draftError, setDraftError] = useState("");
  const [isCompactPickerOpen, setIsCompactPickerOpen] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const compactPickerRef = useRef<HTMLDivElement | null>(null);

  const steps = useMemo(() => getAssessmentFlow(answers), [answers]);
  const safeStepIndex = Math.min(currentStepIndex, steps.length - 1);
  const currentStep = steps[safeStepIndex];
  const destinationStepIndex = steps.findIndex((step) => step.stepKey === "destination_interest");
  const isCountryClarityStep = currentStep.stepKey === "country_clarity";
  const isDestinationStep = currentStep.stepKey === "destination_interest";
  const isContactStep = currentStep.stepKey === "contact";
  const isPostDestinationSingleSelect =
    currentStep.kind === "single-select" &&
      destinationStepIndex >= 0 &&
      safeStepIndex > destinationStepIndex;
  const usesCompactSelect =
    currentStep.kind === "single-select" &&
    (isPostDestinationSingleSelect || currentStep.stepKey === "state_of_residence");
  const journeyStartIndex = Math.max(
    0,
    steps.findIndex((step) => step.stepKey === JOURNEY_START_STEP_KEY),
  );
  const totalSteps = Math.max(2, steps.length - journeyStartIndex + 1);
  const displayStep = isAnalyzing
    ? totalSteps
    : Math.min(totalSteps - 1, Math.max(1, safeStepIndex - journeyStartIndex + 1));
  const canGoBackWithinJourney = safeStepIndex > journeyStartIndex && !isAnalyzing;
  const hasStartedJourney = safeStepIndex >= journeyStartIndex;

  const firstNameForm = useForm<FirstNameFormValues>({
    resolver: zodResolver(firstNameSchema),
    defaultValues: {
      firstName: answers.firstName,
    },
  });

  const contactForm = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      lastName: answers.lastName,
      whatsappNumber: withDefaultWhatsappPrefix(answers.whatsappNumber),
      email: answers.email,
      wantsHumanSupport: answers.wantsHumanSupport,
      marketingConsent: answers.marketingConsent,
    },
  });

  useEffect(() => {
    firstNameForm.reset({ firstName: answers.firstName });
  }, [answers.firstName, firstNameForm]);

  useEffect(() => {
    contactForm.reset({
      lastName: answers.lastName,
      whatsappNumber: withDefaultWhatsappPrefix(answers.whatsappNumber),
      email: answers.email,
      wantsHumanSupport: answers.wantsHumanSupport,
      marketingConsent: answers.marketingConsent,
    });
  }, [
    answers.email,
    answers.lastName,
    answers.marketingConsent,
    answers.wantsHumanSupport,
    answers.whatsappNumber,
    contactForm,
  ]);

  useEffect(() => {
    if (!isAnalyzing) {
      return;
    }

    const timer = window.setInterval(() => {
      setAnalysisProgress(Math.min(96, analysisProgress + 7));
    }, 240);

    return () => window.clearInterval(timer);
  }, [analysisProgress, isAnalyzing, setAnalysisProgress]);

  useEffect(() => {
    if (!isCompactPickerOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!compactPickerRef.current?.contains(event.target as Node)) {
        setIsCompactPickerOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsCompactPickerOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isCompactPickerOpen]);

  useEffect(() => {
    if (!isCompactPickerOpen || typeof window === "undefined") {
      return;
    }

    if (!window.matchMedia("(max-width: 767px)").matches) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isCompactPickerOpen]);

  const canContinue =
    currentStep.kind === "notice"
      ? currentStep.stepKey !== "trust" || trustAccepted
      : currentStep.kind === "text"
        ? (answers.firstName || "").trim().length >= 2
        : currentStep.kind === "single-select"
          ? Boolean(currentStep.field && answers[currentStep.field])
          : true;
  const currentField =
    currentStep.kind === "single-select" && currentStep.field ? currentStep.field : null;
  const usesCardSelect =
    currentStep.kind === "single-select" && Boolean(currentStep.options) && Boolean(currentField) && !usesCompactSelect;
  const currentSingleSelectValue =
    currentField && typeof answers[currentField] === "string" ? answers[currentField] : "";
  const selectedSingleSelectOption =
    currentField && currentStep.options
      ? currentStep.options.find((option) => option.value === currentSingleSelectValue) ?? null
      : null;
  const selectedSingleSelectPresentation = selectedSingleSelectOption
    ? optionPresentation(currentStep, selectedSingleSelectOption)
    : null;

  async function persistDraftStep({
    nextAnswers,
    nextStepIndex,
    nextStepKey,
  }: {
    nextAnswers: AssessmentAnswers;
    nextStepIndex: number;
    nextStepKey: AssessmentStepDefinition["stepKey"];
  }) {
    setDraftStatus("saving");
    setDraftError("");

    try {
      const result = await saveAssessmentDraft({
        leadId,
        answers: nextAnswers,
        currentStepKey: nextStepKey,
        currentStepIndex: nextStepIndex,
        progressPercent: calculateProgressPercent(nextStepIndex, steps.length),
      });

      setLeadId(result.leadId);
      setDraftStatus("saved");
    } catch (error) {
      setDraftStatus("error");
      setDraftError(
        error instanceof Error ? error.message : "We couldn't save your progress right now.",
      );
    }
  }

  function goBack() {
    if (isAnalyzing) {
      return;
    }

    setIsCompactPickerOpen(false);

    if (safeStepIndex <= journeyStartIndex + 1) {
      try {
        router.replace("/start");
      } catch {
        window.location.assign("/start");
      }
      return;
    }

    setCurrentStepIndex(
      hasStartedJourney
        ? Math.max(journeyStartIndex, safeStepIndex - 1)
        : Math.max(0, safeStepIndex - 1),
    );
  }

  function restartFlow() {
    useAssessmentStore.persist.clearStorage();
    resetAssessment();
    setIsCompactPickerOpen(false);
    firstNameForm.reset({ firstName: "" });
    contactForm.reset({
      lastName: "",
      whatsappNumber: DEFAULT_WHATSAPP_PREFIX,
      email: "",
      wantsHumanSupport: false,
      marketingConsent: false,
    });
    setDraftStatus("idle");
    setDraftError("");
    setSubmissionError("");

    try {
      router.replace("/start");
    } catch {
      window.location.assign("/start");
    }
  }

  function goForward() {
    if (!canContinue) {
      return;
    }

    setIsCompactPickerOpen(false);
    const nextStepIndex = Math.min(steps.length - 1, safeStepIndex + 1);
    const nextStep = steps[nextStepIndex];
    setCurrentStepIndex(nextStepIndex);
    void persistDraftStep({
      nextAnswers: answers,
      nextStepIndex,
      nextStepKey: nextStep.stepKey,
    });
  }

  function selectValue(field: keyof AssessmentAnswers, value: string) {
    if (field === "primaryGoal") {
      mergeAnswers({
        ...emptyAnswers,
        firstName: answers.firstName,
        primaryGoal: value as AssessmentAnswers["primaryGoal"],
      });
      setCurrentStepIndex(safeStepIndex);
      return;
    }

    setAnswer(field, value as AssessmentAnswers[typeof field]);
    setIsCompactPickerOpen(false);
  }

  function submitFirstName(values: FirstNameFormValues) {
    const nextAnswers = {
      ...answers,
      firstName: values.firstName.trim(),
    };

    mergeAnswers({ firstName: values.firstName.trim() });

    const nextStepIndex = Math.min(steps.length - 1, safeStepIndex + 1);
    const nextStep = steps[nextStepIndex];
    setCurrentStepIndex(nextStepIndex);
    void persistDraftStep({
      nextAnswers,
      nextStepIndex,
      nextStepKey: nextStep.stepKey,
    });
  }

  function submitContact(values: ContactFormValues) {
    const payload = {
      ...answers,
      ...values,
      firstName: answers.firstName.trim(),
      sendReportConsent: true,
      primaryGoal: answers.primaryGoal!,
    };

    startTransition(async () => {
      setSubmissionError("");
      mergeAnswers(values);
      setAnalyzing(true);
      setAnalysisProgress(22);

      try {
        let activeLeadId = leadId;

        if (!activeLeadId) {
          const draft = await saveAssessmentDraft({
            leadId: null,
            answers: payload,
            currentStepKey: "contact",
            currentStepIndex: safeStepIndex,
            progressPercent: calculateProgressPercent(safeStepIndex, steps.length),
          });

          activeLeadId = draft.leadId;
          setLeadId(activeLeadId);
        }

        const response = await fetch("/api/assessment/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...payload,
            leadId: activeLeadId,
          }),
        });

        if (!response.ok) {
          const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
          setAnalyzing(false);
          setAnalysisProgress(12);
          setSubmissionError(errorBody?.error ?? "We couldn't create your report right now.");
          return;
        }

        const result = await response.json();
        setAnalysisProgress(100);
        setGeneratedResult(result.token, result.report);

        if (!result.token) {
          setAnalyzing(false);
          setAnalysisProgress(12);
          setSubmissionError("Your report was created, but we couldn't open it automatically.");
          return;
        }
        const hashForTikTok = async (value: string) => {
          const cleanValue = value.trim().toLowerCase();

          if (!cleanValue) {
            return "";
          }

          const data = new TextEncoder().encode(cleanValue);
          const hashBuffer = await crypto.subtle.digest("SHA-256", data);

          return Array.from(new Uint8Array(hashBuffer))
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("");
        };

        const ttq = (
          window as Window & {
            ttq?: {
              identify?: (data: Record<string, string>) => void;
              track?: (eventName: string, data?: Record<string, unknown>) => void;
            };
          }
        ).ttq;

        if (ttq) {
          const hashedEmail = await hashForTikTok(payload.email);
          const hashedPhone = await hashForTikTok(payload.whatsappNumber.replace(/\D/g, ""));
          const hashedExternalId = activeLeadId ? await hashForTikTok(activeLeadId) : "";

          ttq.identify?.({
            ...(hashedEmail ? { email: hashedEmail } : {}),
            ...(hashedPhone ? { phone_number: hashedPhone } : {}),
            ...(hashedExternalId ? { external_id: hashedExternalId } : {}),
          });

          ttq.track?.("Lead", {
            contents: [
              {
                content_id: "pathway-finder-report",
                content_type: "product",
                content_name: "Pathway Finder Report",
              },
            ],
            value: 0,
            currency: "USD",
          });
        }
        router.push(`/results/${result.token}`);
      } catch {
        setAnalyzing(false);
        setAnalysisProgress(12);
        setSubmissionError("We couldn't create your report right now.");
      }
    });
  }

  if (isAnalyzing) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-10">
        <div className="space-y-6">
          <ProgressHeader
            currentStep={displayStep}
            currentStepKey="analysis"
            totalSteps={totalSteps}
          />
          <AssessmentStep
            eyebrow="Analysis in Progress"
            title="We’re weighing your strongest pathway directions."
            description="Your travel goals, background, readiness, and blockers are being turned into a tailored report now."
            titleClassName="lg:text-[4.6rem] xl:text-[4.9rem]"
          >
            <div className="space-y-6">
              <div className="assessment-panel mx-auto max-w-[1010px] rounded-[34px] p-6 md:p-8">
                <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                  <div className="assessment-panel-soft grid place-items-center rounded-[30px] bg-[radial-gradient(circle_at_top,rgba(255,190,0,0.22),transparent_40%),rgba(16,16,82,0.82)] p-10 md:p-12">
                    <LoaderCircle className="h-14 w-14 animate-spin text-[color:var(--fc-yellow)]" />
                  </div>
                  <div className="space-y-5">
                    <div className="flex items-center justify-between text-sm text-white/70">
                      <span>Pathway engine status</span>
                      <span>{analysisProgress}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#FFBE00_0%,#FFD54D_40%,#FFFFFF_100%)] transition-[width] duration-300"
                        style={{ width: `${analysisProgress}%` }}
                      />
                    </div>
                    <p className="text-base leading-8 text-white/68">
                      We’re turning your answers into a personalized report with pathway matches,
                      blockers, readiness level, and your practical next step.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {["Signals extracted", "Pathways ranked", "Report copy assembled"].map(
                  (label, index) => (
                    <div
                      key={label}
                      className="assessment-panel-soft rounded-[24px] p-5 text-sm text-white/70"
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--fc-yellow)]">
                        0{index + 1}
                      </p>
                      <p className="mt-3 font-medium text-white">{label}</p>
                    </div>
                  ),
                )}
              </div>
            </div>
          </AssessmentStep>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 md:px-6 md:py-7">
      <div className="space-y-4">
        {hasStartedJourney ? (
          <div className="mx-auto flex max-w-[980px] justify-end px-1 md:px-2">
            <button
              type="button"
              onClick={restartFlow}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/72 transition hover:border-white/16 hover:bg-white/[0.08] hover:text-[color:var(--fc-yellow)]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restart
            </button>
          </div>
        ) : null}
        <ProgressHeader
          currentStep={displayStep}
          currentStepKey={currentStep.stepKey}
          onBack={canGoBackWithinJourney ? goBack : undefined}
          totalSteps={totalSteps}
        />
        {draftStatus === "saving" ? (
          <p className="text-center text-xs uppercase tracking-[0.18em] text-white/44">
            Saving your progress...
          </p>
        ) : null}
        {draftStatus === "error" ? (
          <p className="text-center text-sm text-red-300">{draftError}</p>
        ) : null}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.stepKey}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "relative mx-auto w-full overflow-hidden px-1 py-2 md:px-3 lg:px-4",
              isContactStep
                ? "max-w-none px-0 py-0"
                : isDestinationStep
                  ? "max-w-[1320px]"
                : usesCompactSelect || isCountryClarityStep
                  ? "max-w-[980px]"
                  : "max-w-[1180px]",
            )}
          >
            <div className="pointer-events-none absolute inset-x-[6%] top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,190,0,0.45),transparent)]" />
            <div className="pointer-events-none absolute right-[-6rem] top-[-5rem] h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(255,190,0,0.15),transparent_66%)] blur-2xl" />
            {isContactStep ? (
              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full overflow-hidden"
              >
                <div className="relative min-h-[calc(100svh-11rem)] overflow-hidden bg-[#f8f8f4]">
                  <Image
                    src="/pathway/complete-report-background.png"
                    alt=""
                    fill
                    priority
                    aria-hidden="true"
                    sizes="100vw"
                    className="object-cover object-[76%_center] md:object-center"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(251,249,242,0.94)_0%,rgba(251,249,242,0.9)_36%,rgba(251,249,242,0.84)_100%)] lg:bg-[linear-gradient(90deg,rgba(251,249,242,0.96)_0%,rgba(251,249,242,0.9)_34%,rgba(251,249,242,0.52)_62%,rgba(251,249,242,0.18)_100%)]" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,190,0,0.18),transparent_18rem),radial-gradient(circle_at_85%_78%,rgba(255,214,102,0.12),transparent_18rem)]" />

                  <div className="relative mx-auto grid min-h-[calc(100svh-11rem)] max-w-[1480px] gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,29rem)] lg:items-center lg:gap-10 lg:px-20 lg:py-10">
                    <div className="max-w-[39rem] self-center space-y-5 lg:space-y-6">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[#101052]/10 bg-white/82 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#7d5a00] shadow-[0_12px_30px_rgba(16,16,82,0.08)] backdrop-blur-sm">
                        <Sparkles className="h-3.5 w-3.5 text-[#ffbe00]" />
                        Generate your report
                      </div>
                      <div className="space-y-3">
                        <p className="[font-family:var(--font-heading)] text-[1.45rem] font-medium leading-none tracking-[-0.03em] text-[#5f6d99] sm:text-[1.8rem] lg:text-[2.05rem]">
                          {answers.firstName || "Traveler"},
                        </p>
                        <h1 className="max-w-[10ch] [font-family:var(--font-heading)] text-[2.6rem] font-bold leading-[0.9] tracking-[-0.06em] text-[#08134a] sm:max-w-[11ch] sm:text-[3.45rem] lg:max-w-[9.8ch] lg:text-[4.6rem]">
                          Let&apos;s generate your pathway report.
                        </h1>
                        <p className="max-w-[28rem] text-[0.98rem] leading-7 text-[#20316e] sm:text-[1.02rem] lg:text-[1.08rem]">
                          Confirm the final contact details below and we&apos;ll generate your report
                          with your next-step guidance.
                        </p>
                      </div>

                      <div className="rounded-[1.1rem] border border-white/75 bg-white/72 px-4 py-3 text-sm leading-6 text-[#20316e] shadow-[0_14px_28px_rgba(16,16,82,0.07)] backdrop-blur-sm sm:hidden">
                        Last name, email, and WhatsApp only. Your report is delivered as soon as it
                        is generated.
                      </div>
                      <div className="hidden max-w-[35rem] gap-3 sm:grid sm:grid-cols-3">
                        {[
                          "Everything stays in one clear final step.",
                          "Your report is delivered as soon as it is generated.",
                          "Only your last name, email, and WhatsApp number are needed.",
                        ].map((item) => (
                          <div
                            key={item}
                            className="rounded-[1.25rem] border border-[#101052]/8 bg-white/78 px-4 py-3 text-sm leading-6 text-[#20316e] shadow-[0_16px_36px_rgba(16,16,82,0.08)] backdrop-blur-sm"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>

                    <form
                      onSubmit={contactForm.handleSubmit(submitContact)}
                      className="rounded-[1.75rem] border border-white/90 bg-white/74 p-4 shadow-[0_24px_70px_rgba(16,16,82,0.14)] backdrop-blur-xl sm:p-5 lg:p-6"
                    >
                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <label htmlFor="lastName" className="sr-only">
                              Last name
                            </label>
                            <input
                              id="lastName"
                              type="text"
                              autoComplete="family-name"
                              placeholder="Last name"
                              className="h-13 w-full rounded-full border border-[#101052]/10 bg-white px-5 text-[0.98rem] font-medium text-[#0f1d5e] shadow-[0_16px_34px_rgba(16,16,82,0.08)] outline-none transition placeholder:text-[#20316e]/40 focus:border-[#101052]/24 focus:shadow-[0_18px_38px_rgba(16,16,82,0.12)] sm:h-14"
                              {...contactForm.register("lastName")}
                            />
                            {contactForm.formState.errors.lastName ? (
                              <p className="px-2 text-xs font-medium text-red-500">
                                {contactForm.formState.errors.lastName.message}
                              </p>
                            ) : null}
                          </div>

                          <div className="space-y-2">
                            <label htmlFor="whatsappNumber" className="sr-only">
                              Active WhatsApp number
                            </label>
                            <input
                              id="whatsappNumber"
                              type="tel"
                              autoComplete="tel"
                              placeholder="WhatsApp number"
                              className="h-13 w-full rounded-full border border-[#101052]/10 bg-white px-5 text-[0.98rem] font-medium text-[#0f1d5e] shadow-[0_16px_34px_rgba(16,16,82,0.08)] outline-none transition placeholder:text-[#20316e]/40 focus:border-[#101052]/24 focus:shadow-[0_18px_38px_rgba(16,16,82,0.12)] sm:h-14"
                              {...contactForm.register("whatsappNumber")}
                            />
                            {contactForm.formState.errors.whatsappNumber ? (
                              <p className="px-2 text-xs font-medium text-red-500">
                                {contactForm.formState.errors.whatsappNumber.message}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="email" className="sr-only">
                            Email address
                          </label>
                          <div className="relative">
                            <Mail className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#20316e]/44" />
                            <input
                              id="email"
                              type="email"
                              autoComplete="email"
                              placeholder="Email address"
                              className="h-13 w-full rounded-full border border-[#101052]/10 bg-white pl-12 pr-5 text-[0.98rem] font-medium text-[#0f1d5e] shadow-[0_16px_34px_rgba(16,16,82,0.08)] outline-none transition placeholder:text-[#20316e]/40 focus:border-[#101052]/24 focus:shadow-[0_18px_38px_rgba(16,16,82,0.12)] sm:h-14"
                              {...contactForm.register("email")}
                            />
                          </div>
                          {contactForm.formState.errors.email ? (
                            <p className="px-2 text-xs font-medium text-red-500">
                              {contactForm.formState.errors.email.message}
                            </p>
                          ) : null}
                        </div>

                        <div className="rounded-[1.5rem] border border-[#101052]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,247,252,0.94))] p-4 shadow-[0_14px_30px_rgba(16,16,82,0.06)]">
                          <div className="flex items-start gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[rgba(255,190,0,0.14)] text-[#101052]">
                              <ShieldCheck className="h-5 w-5 text-[#b77b00]" />
                            </div>
                            <div className="min-w-0 space-y-3">
                              <div className="space-y-1">
                                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#7d5a00]">
                                  Final confirmation
                                </p>
                                <p className="text-sm leading-6 text-[#20316e]">
                                  {REPORT_ACCURACY_WARNING}
                                </p>
                              </div>
                              <label className="flex items-start gap-3 rounded-[1.1rem] border border-[#101052]/8 bg-white px-3.5 py-3 text-sm leading-6 text-[#20316e]">
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4 rounded border-[#101052]/20 accent-[color:var(--fc-yellow)]"
                                  {...contactForm.register("marketingConsent")}
                                />
                                <span>
                                  Generate and send my pathway report to me. I agree to receive
                                  occasional travel, study, work, and relocation updates from Fly
                                  Connect Global.
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <button
                            type="submit"
                            disabled={isPending}
                            className={cn(
                              "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-8 text-[0.82rem] font-bold uppercase tracking-[0.18em] transition sm:h-13",
                              isPending
                                ? "cursor-wait bg-[#101052]/10 text-[#101052]/40"
                                : "assessment-button-primary shadow-[0_22px_52px_rgba(255,190,0,0.28)]",
                            )}
                          >
                            {isPending ? "Generating report..." : "Generate My Report"}
                            {isPending ? (
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                              <ArrowRight className="h-4 w-4" />
                            )}
                          </button>
                          {submissionError ? (
                            <p className="text-center text-sm text-red-500">{submissionError}</p>
                          ) : null}
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </motion.section>
            ) : (
            <AssessmentStep
              eyebrow={stepEyebrow(currentStep)}
              title={currentStep.title}
              description={currentStep.description}
              helperText={currentStep.helperText}
              contentClassName={
                isDestinationStep || usesCompactSelect || isCountryClarityStep
                  ? "mt-5 md:mt-6"
                  : undefined
              }
              titleClassName={titleClassForStep(currentStep, isPostDestinationSingleSelect)}
            >
              {currentStep.stepKey === "trust" ? (
                <div className="space-y-6">
                  <div className="grid gap-3 md:grid-cols-3">
                    {["No passport number", "No bank statement", "No document upload"].map(
                      (item) => (
                        <div
                          key={item}
                          className="assessment-panel-soft flex items-center gap-3 rounded-[20px] p-4 text-sm font-medium text-white/80 md:text-base"
                        >
                          <ShieldCheck className="h-4 w-4 shrink-0 text-[color:var(--fc-yellow)]" />
                          {item}
                        </div>
                      ),
                    )}
                  </div>
                  <label className="assessment-panel-soft mx-auto flex max-w-3xl items-start gap-3 rounded-[22px] p-4 text-left text-sm text-white/72 md:p-5 md:text-base">
                    <input
                      checked={trustAccepted}
                      type="checkbox"
                      onChange={(event) => setTrustAccepted(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent accent-[color:var(--fc-yellow)]"
                    />
                    <span>
                      I understand this is an educational pathway-readiness assessment and not a
                      legal or visa guarantee.
                    </span>
                  </label>
                </div>
              ) : null}

              {currentStep.stepKey === "first_name" ? (
                <form onSubmit={firstNameForm.handleSubmit(submitFirstName)} className="space-y-5">
                  <div className="assessment-panel-soft rounded-[30px] px-5 py-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] sm:px-8 sm:py-5 md:px-10 md:py-6">
                    <input
                      id="firstName"
                      type="text"
                      autoComplete="given-name"
                      placeholder="Enter your first name"
                      className="w-full border-0 bg-transparent text-center [font-family:var(--font-heading)] text-[2.55rem] font-bold tracking-tight text-white outline-none placeholder:text-white/18 sm:text-[3.5rem] md:text-[4.1rem] lg:text-[4.6rem]"
                      {...firstNameForm.register("firstName")}
                    />
                    {firstNameForm.formState.errors.firstName ? (
                      <p className="mt-4 text-center text-sm text-red-300">
                        {firstNameForm.formState.errors.firstName.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col justify-center gap-3 sm:flex-row">
                    <button
                      type="submit"
                      className="assessment-button-primary h-12 px-7 text-base"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              ) : null}

              {currentStep.stepKey === "greeting" ? (
                <div className="space-y-5">
                  <div className="assessment-panel-soft rounded-[30px] bg-[radial-gradient(circle_at_top,rgba(255,190,0,0.22),transparent_44%),rgba(16,16,82,0.9)] px-7 py-8 text-center md:px-8 md:py-9">
                    <p className="[font-family:var(--font-heading)] text-[2.9rem] text-white sm:text-[3.8rem] md:text-[4.6rem]">
                      Hi {answers.firstName || "there"} 👋
                    </p>
                    <p className="mt-4 text-sm leading-7 text-white/70 md:text-lg">
                      One more question and we start building your route.
                    </p>
                  </div>
                </div>
              ) : null}

              {currentStep.kind === "single-select" && currentStep.options && currentField ? (
                usesCompactSelect ? (
                  <div className="mx-auto max-w-3xl space-y-4">
                    <div className="assessment-panel rounded-[28px] p-4 md:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--fc-yellow)]">
                            Quick answer
                          </p>
                          <p className="text-sm leading-6 text-white/64 md:text-[0.95rem]">
                            {selectPromptForStep(currentStep)}
                          </p>
                        </div>
                        <span className="assessment-chip shrink-0 border-white/10 bg-white/[0.04] px-3 py-2 text-white/68">
                          {currentStep.options.length} options
                        </span>
                      </div>

                      <div ref={compactPickerRef} className="relative mt-4">
                        <button
                          type="button"
                          aria-expanded={isCompactPickerOpen}
                          aria-haspopup="listbox"
                          onClick={() => setIsCompactPickerOpen((open) => !open)}
                          className={cn(
                            "assessment-panel-soft flex min-h-15 w-full items-center justify-between gap-4 rounded-[22px] border px-4 py-3 text-left transition md:px-5",
                            isCompactPickerOpen || currentSingleSelectValue
                              ? "border-[rgba(255,190,0,0.38)] bg-[linear-gradient(180deg,rgba(38,44,94,0.96),rgba(18,23,53,0.96))] shadow-[0_18px_40px_rgba(4,8,28,0.2)]"
                              : "border-white/10 bg-[linear-gradient(180deg,rgba(37,45,92,0.9),rgba(18,23,53,0.92))]",
                          )}
                        >
                          <div className="min-w-0">
                            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-white/46">
                              {currentSingleSelectValue ? "Selected answer" : "Select one"}
                            </p>
                            <p
                              className={cn(
                                "mt-1 truncate [font-family:var(--font-heading)] text-[1.08rem] md:text-[1.18rem]",
                                currentSingleSelectValue ? "text-white" : "text-white/72",
                              )}
                            >
                              {selectedSingleSelectPresentation?.label ?? "Choose your answer"}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition",
                              isCompactPickerOpen || currentSingleSelectValue
                                ? "border-[rgba(255,190,0,0.35)] bg-[rgba(255,190,0,0.08)] text-[color:var(--fc-yellow)]"
                                : "border-white/10 bg-white/[0.03] text-white/52",
                            )}
                          >
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform duration-200",
                                isCompactPickerOpen && "rotate-180",
                              )}
                            />
                          </span>
                        </button>

                        {isCompactPickerOpen ? (
                          <>
                            <div className="absolute inset-x-0 top-[calc(100%+0.75rem)] z-30 hidden overflow-hidden rounded-[26px] border border-[rgba(255,190,0,0.16)] bg-[linear-gradient(180deg,rgba(19,24,56,0.98),rgba(10,14,37,0.98))] shadow-[0_28px_70px_rgba(4,8,28,0.5)] backdrop-blur-xl md:block">
                              <div className="border-b border-white/8 px-4 py-3 md:px-5">
                                <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--fc-yellow)]">
                                  Pick your answer
                                </p>
                                <p className="mt-1 text-sm leading-6 text-white/62">
                                  Tap once and continue with a cleaner, faster flow.
                                </p>
                              </div>
                              <div
                                role="listbox"
                                aria-label={currentStep.title}
                                className="max-h-[22rem] space-y-2 overflow-y-auto px-3 py-3 md:px-4"
                              >
                                <CompactSelectOptions
                                  currentField={currentField}
                                  currentSingleSelectValue={currentSingleSelectValue}
                                  currentStep={currentStep}
                                  onSelect={selectValue}
                                />
                              </div>
                            </div>

                            <div className="fixed inset-0 z-40 md:hidden">
                              <button
                                type="button"
                                aria-label="Close answer picker"
                                onClick={() => setIsCompactPickerOpen(false)}
                                className="absolute inset-0 bg-[rgba(4,8,28,0.68)] backdrop-blur-[3px]"
                              />
                              <div className="absolute inset-x-0 bottom-0 rounded-t-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,24,56,0.99),rgba(8,12,31,0.995))] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-24px_70px_rgba(4,8,28,0.58)]">
                                <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-white/18" />
                                <div className="flex items-start justify-between gap-3 border-b border-white/8 pb-3">
                                  <div className="min-w-0">
                                    <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--fc-yellow)]">
                                      Pick your answer
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-white/62">
                                      Choose one option and keep moving.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setIsCompactPickerOpen(false)}
                                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/68"
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </button>
                                </div>
                                <div
                                  role="listbox"
                                  aria-label={currentStep.title}
                                  className="mt-3 max-h-[min(58svh,26rem)] space-y-2 overflow-y-auto pr-1"
                                >
                                  <CompactSelectOptions
                                    currentField={currentField}
                                    currentSingleSelectValue={currentSingleSelectValue}
                                    currentStep={currentStep}
                                    onSelect={selectValue}
                                  />
                                </div>
                              </div>
                            </div>
                          </>
                        ) : null}
                      </div>

                      {selectedSingleSelectPresentation ? (
                        <div className="mt-4 rounded-[22px] border border-[rgba(255,255,255,0.09)] bg-white/[0.04] px-4 py-4 text-left">
                          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--fc-yellow)]">
                            Selected answer
                          </p>
                          <p className="mt-2 [font-family:var(--font-heading)] text-[1.24rem] text-white md:text-[1.45rem]">
                            {selectedSingleSelectPresentation.label}
                          </p>
                          {selectedSingleSelectPresentation.description ? (
                            <p className="mt-2 text-sm leading-6 text-white/66">
                              {selectedSingleSelectPresentation.description}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="mt-5 flex flex-col gap-3 border-t border-white/8 pt-4 md:flex-row md:items-center md:justify-between">
                        <p className="text-sm leading-6 text-white/54">
                          Your answer is saved as you move through the next steps.
                        </p>
                        <button
                          type="button"
                          onClick={goForward}
                          disabled={!canContinue}
                          className={cn(
                            "inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 [font-family:var(--font-heading)] text-base font-semibold uppercase tracking-[0.08em] transition md:h-12 md:px-7",
                            canContinue
                              ? "assessment-button-primary"
                              : "cursor-not-allowed rounded-full bg-white/8 text-white/35",
                          )}
                        >
                          Continue
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5 pb-24 md:pb-0">
                    <div
                      className={cn(
                        "grid gap-3 md:gap-4",
                        isDestinationStep
                          ? "grid-cols-2 xl:grid-cols-4"
                          : isCountryClarityStep
                            ? "md:grid-cols-3"
                            : "md:grid-cols-2 xl:grid-cols-3",
                      )}
                    >
                      {(currentStep.options ?? []).map((option) => {
                        const presentation = optionPresentation(currentStep, option);
                        const visual = isDestinationStep
                          ? destinationVisual(option.value)
                          : undefined;

                        return (
                          <div key={option.value}>
                            <OptionCard
                              label={presentation.label}
                              description={isDestinationStep ? undefined : presentation.description}
                              flagAlt={visual?.flagAlt}
                              flagSrc={visual?.flagSrc}
                              icon={visual?.icon}
                              eyebrow={visual?.eyebrow}
                              singleLineLabel={isDestinationStep && option.value === "not_sure"}
                              size={
                                isDestinationStep
                                  ? "dense"
                                  : isCountryClarityStep
                                    ? "compact"
                                    : "default"
                              }
                              selected={answers[currentField] === option.value}
                              onClick={() => selectValue(currentField, option.value)}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="hidden justify-center pt-1 md:flex">
                      <button
                        type="button"
                        onClick={goForward}
                        disabled={!canContinue}
                        className={cn(
                          "inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 [font-family:var(--font-heading)] text-lg font-semibold uppercase tracking-[0.1em] transition",
                          canContinue
                            ? "assessment-button-primary"
                            : "cursor-not-allowed rounded-full bg-white/8 text-white/35",
                        )}
                      >
                        Continue
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                    {usesCardSelect ? (
                      <div className="fixed inset-x-4 bottom-4 z-30 md:hidden">
                        <div className="assessment-panel mx-auto flex max-w-sm items-center justify-between gap-3 rounded-[24px] px-4 py-3 shadow-[0_18px_50px_rgba(4,8,28,0.45)]">
                          <div className="min-w-0">
                            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--fc-yellow)]">
                              {canContinue ? "Choice selected" : "Next step"}
                            </p>
                            <p className="truncate [font-family:var(--font-heading)] text-[1.02rem] text-white">
                              {canContinue
                                ? "Continue to the next question"
                                : isDestinationStep
                                  ? "Select a destination to continue"
                                  : "Select an answer to continue"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={goForward}
                            disabled={!canContinue}
                            className={cn(
                              "h-11 shrink-0 px-5 text-sm uppercase tracking-[0.08em]",
                              canContinue
                                ? "assessment-button-primary"
                                : "cursor-not-allowed rounded-full bg-white/8 text-white/35",
                            )}
                          >
                            Continue
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              ) : null}

              {currentStep.stepKey === "contact" ? (
                <form
                  onSubmit={contactForm.handleSubmit(submitContact)}
                  className="mx-auto max-w-3xl space-y-5"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/78" htmlFor="lastName">
                        Last name
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        autoComplete="family-name"
                        className="assessment-panel-soft h-16 w-full rounded-[24px] px-5 text-lg text-white outline-none placeholder:text-white/35"
                        {...contactForm.register("lastName")}
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        className="text-sm font-medium text-white/78"
                        htmlFor="whatsappNumber"
                      >
                        Active WhatsApp number
                      </label>
                      <input
                        id="whatsappNumber"
                        type="tel"
                        autoComplete="tel"
                        className="assessment-panel-soft h-16 w-full rounded-[24px] px-5 text-lg text-white outline-none placeholder:text-white/35"
                        {...contactForm.register("whatsappNumber")}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/78" htmlFor="email">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      className="assessment-panel-soft h-16 w-full rounded-[24px] px-5 text-lg text-white outline-none placeholder:text-white/35"
                      {...contactForm.register("email")}
                    />
                  </div>

                  <div className="space-y-3 text-left">
                    <div className="rounded-[18px] border border-[rgba(255,190,0,0.26)] bg-[rgba(255,190,0,0.08)] p-4 text-sm leading-7 text-white/82">
                      {REPORT_ACCURACY_WARNING}
                    </div>
                    <label className="assessment-panel-soft flex items-start gap-3 rounded-[18px] p-4 text-sm text-white/72">
                      <input
                        type="checkbox"
                        checked
                        readOnly
                        className="mt-1 h-4 w-4 rounded accent-[color:var(--fc-yellow)]"
                      />
                      <span>Send my pathway report to me.</span>
                    </label>
                    <label className="assessment-panel-soft flex items-start gap-3 rounded-[18px] p-4 text-sm text-white/72">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded accent-[color:var(--fc-yellow)]"
                        {...contactForm.register("wantsHumanSupport")}
                      />
                      <span>
                        I would like further human expert support on my travel next step. Please
                        contact me.
                      </span>
                    </label>
                    <label className="assessment-panel-soft flex items-start gap-3 rounded-[18px] border-dashed p-4 text-sm text-white/72">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded accent-[color:var(--fc-yellow)]"
                        {...contactForm.register("marketingConsent")}
                      />
                      <span>
                        I agree to receive occasional travel, study, work, and relocation updates
                        from Fly Connect Global.
                      </span>
                    </label>
                  </div>

                  <div className="flex justify-center">
                    <button
                      type="submit"
                      disabled={isPending}
                      className={cn(
                        "inline-flex h-12 items-center justify-center gap-2 rounded-full px-8 [font-family:var(--font-heading)] text-lg font-semibold uppercase tracking-[0.1em] transition",
                        isPending
                          ? "cursor-wait bg-white/8 text-white/40"
                          : "assessment-button-primary",
                      )}
                    >
                      {isPending ? "Creating..." : "Create My Results"}
                      {isPending ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {submissionError ? (
                    <p className="text-center text-sm text-red-300">{submissionError}</p>
                  ) : null}
                </form>
              ) : null}

              {currentStep.kind === "notice" &&
              currentStep.stepKey !== "trust" &&
              currentStep.stepKey !== "greeting" ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={goForward}
                    className="assessment-button-primary h-12 px-6"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null}

              {currentStep.stepKey === "trust" || currentStep.stepKey === "greeting" ? (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={goForward}
                    disabled={!canContinue}
                    className={cn(
                      "inline-flex h-12 items-center justify-center gap-2 rounded-full px-8 [font-family:var(--font-heading)] text-lg font-semibold uppercase tracking-[0.1em] transition",
                      canContinue
                        ? "assessment-button-primary"
                        : "cursor-not-allowed rounded-full bg-white/8 text-white/35",
                    )}
                  >
                    {currentStep.stepKey === "trust"
                      ? "Start My Pathway Check"
                      : "Choose My Goal"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </AssessmentStep>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
