"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AssessmentShell } from "@/components/assessment/AssessmentShell";
import { PathwayFinderLogo } from "@/components/brand/PathwayFinderLogo";
import { useAssessmentStore } from "@/store/assessment-store";

function PathwayFinderLoadingState({ message }: { message: string }) {
  return (
    <main className="assessment-shell min-h-screen text-white">
      <div className="assessment-map-dots assessment-orbit-lines pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute inset-x-[10%] top-0 h-[28rem] rounded-full bg-[radial-gradient(circle,rgba(255,190,0,0.16),transparent_64%)] blur-3xl" />
      <div className="relative mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 py-12 text-center md:px-6">
        <div className="assessment-panel-soft rounded-[30px] px-6 py-4">
          <PathwayFinderLogo className="h-14 w-auto md:h-16" variant="dark" />
        </div>
        <div className="assessment-panel mt-6 max-w-2xl rounded-[30px] px-6 py-8 md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--fc-yellow)]">
            Preparing your pathway
          </p>
          <h1 className="mt-4 [font-family:var(--font-heading)] text-[2.3rem] font-bold leading-[0.92] tracking-[-0.04em] text-white md:text-[3.25rem]">
            One moment while we load your next step.
          </h1>
          <p className="mt-4 text-base leading-8 text-white/70">{message}</p>
        </div>
      </div>
    </main>
  );
}

function PathwayFinderPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    answers,
    currentStepIndex,
    hasHydrated,
    mergeAnswers,
    setCurrentStepIndex,
    setTrustAccepted,
  } = useAssessmentStore();
  const handoffGoal = searchParams.get("goal");
  const handoffStepParam = Number(searchParams.get("step") ?? "0");
  const handoffStepIndex = Number.isFinite(handoffStepParam) ? Math.max(4, handoffStepParam) : 4;
  const isStudyPath = answers.primaryGoal === "study_abroad";
  const isReady = hasHydrated && isStudyPath && currentStepIndex >= 4;

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (
      handoffGoal === "study_abroad" &&
      (!answers.primaryGoal || currentStepIndex < handoffStepIndex)
    ) {
      mergeAnswers({ primaryGoal: "study_abroad" });
      setTrustAccepted(true);
      setCurrentStepIndex(Math.max(currentStepIndex, handoffStepIndex));
      return;
    }

    if (!answers.primaryGoal) {
      try {
        const rawHandoff = window.sessionStorage.getItem("fly-connect-pathway-handoff");

        if (rawHandoff) {
          const parsedHandoff = JSON.parse(rawHandoff) as {
            currentStepIndex?: number;
            primaryGoal?: string;
            trustAccepted?: boolean;
          };

          if (parsedHandoff.primaryGoal === "study_abroad") {
            mergeAnswers({ primaryGoal: "study_abroad" });
            setTrustAccepted(parsedHandoff.trustAccepted ?? true);
            setCurrentStepIndex(Math.max(4, parsedHandoff.currentStepIndex ?? 4));
            return;
          }
        }
      } catch {
        // If the backup handoff cannot be read, the redirect below handles recovery.
      }
    }

    if (!answers.primaryGoal) {
      router.replace("/start");
      return;
    }

    if (!isStudyPath) {
      router.replace("/start");
      return;
    }

    if (currentStepIndex < 4) {
      setCurrentStepIndex(4);
    }
  }, [
    answers.primaryGoal,
    currentStepIndex,
    handoffGoal,
    handoffStepIndex,
    hasHydrated,
    isStudyPath,
    mergeAnswers,
    router,
    setCurrentStepIndex,
    setTrustAccepted,
  ]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    try {
      window.sessionStorage.removeItem("fly-connect-pathway-handoff");
    } catch {
      // Best-effort cleanup only.
    }
  }, [isReady]);

  if (!hasHydrated) {
    return <PathwayFinderLoadingState message="We’re restoring your saved session first." />;
  }

  if (!answers.primaryGoal || !isStudyPath) {
    return (
      <PathwayFinderLoadingState message="We’re checking your session and sending you to the right place." />
    );
  }

  if (!isReady) {
    return <PathwayFinderLoadingState message="Your study-abroad assessment is loading now." />;
  }

  return (
    <main className="assessment-shell min-h-screen text-white">
      <div className="assessment-map-dots assessment-orbit-lines pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute inset-x-[10%] top-0 h-[28rem] rounded-full bg-[radial-gradient(circle,rgba(255,190,0,0.16),transparent_64%)] blur-3xl" />
      <div className="relative pb-12 pt-4 md:pt-6">
        <AssessmentShell />
      </div>
    </main>
  );
}

export default function PathwayFinderPage() {
  return (
    <Suspense
      fallback={<PathwayFinderLoadingState message="We’re opening your study-abroad assessment now." />}
    >
      <PathwayFinderPageClient />
    </Suspense>
  );
}
