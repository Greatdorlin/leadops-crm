"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { emptyAnswers } from "@/lib/assessment/defaults";
import type {
  AssessmentAnswers,
  PublicAssessmentResult,
  PublicGeneratedReport,
} from "@/lib/pathway-engine/types";

type StoredPublicResult = PublicAssessmentResult | PublicGeneratedReport;
const ASSESSMENT_STORAGE_KEY = "fly-connect-pathway-finder-session";
const inMemoryAssessmentStorage = new Map<string, string>();

const fallbackAssessmentStorage: StateStorage = {
  getItem: (name) => inMemoryAssessmentStorage.get(name) ?? null,
  removeItem: (name) => {
    inMemoryAssessmentStorage.delete(name);
  },
  setItem: (name, value) => {
    inMemoryAssessmentStorage.set(name, value);
  },
};

function getAssessmentSessionStorage(): StateStorage {
  if (typeof window === "undefined") {
    return fallbackAssessmentStorage;
  }

  try {
    const storage = window.sessionStorage;
    const probeKey = "__fly_connect_pathway_probe__";
    storage.setItem(probeKey, "1");
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return fallbackAssessmentStorage;
  }
}

interface AssessmentStore {
  hasHydrated: boolean;
  trustAccepted: boolean;
  currentStepIndex: number;
  isAnalyzing: boolean;
  analysisProgress: number;
  answers: AssessmentAnswers;
  leadId: string | null;
  token: string | null;
  generatedReport: StoredPublicResult | null;
  setTrustAccepted: (value: boolean) => void;
  setHasHydrated: (value: boolean) => void;
  setCurrentStepIndex: (value: number) => void;
  setAnalyzing: (value: boolean) => void;
  setAnalysisProgress: (value: number) => void;
  setLeadId: (value: string | null) => void;
  setAnswer: <K extends keyof AssessmentAnswers>(field: K, value: AssessmentAnswers[K]) => void;
  mergeAnswers: (value: Partial<AssessmentAnswers>) => void;
  setGeneratedResult: (token: string, report: StoredPublicResult) => void;
  resetAssessment: () => void;
}

export const useAssessmentStore = create<AssessmentStore>()(
  persist(
    (set) => ({
      hasHydrated: false,
      trustAccepted: false,
      currentStepIndex: 0,
      isAnalyzing: false,
      analysisProgress: 12,
      answers: emptyAnswers,
      leadId: null,
      token: null,
      generatedReport: null,
      setTrustAccepted(value) {
        set({ trustAccepted: value });
      },
      setHasHydrated(value) {
        set({ hasHydrated: value });
      },
      setCurrentStepIndex(value) {
        set({ currentStepIndex: value });
      },
      setAnalyzing(value) {
        set({ isAnalyzing: value });
      },
      setAnalysisProgress(value) {
        set({ analysisProgress: value });
      },
      setLeadId(value) {
        set({ leadId: value });
      },
      setAnswer(field, value) {
        set((state) => ({
          answers: {
            ...state.answers,
            [field]: value,
          },
        }));
      },
      mergeAnswers(value) {
        set((state) => ({
          answers: {
            ...state.answers,
            ...value,
          },
        }));
      },
      setGeneratedResult(token, report) {
        set({
          token,
          generatedReport: report,
          isAnalyzing: false,
          analysisProgress: 100,
        });
      },
      resetAssessment() {
        set({
          trustAccepted: false,
          currentStepIndex: 0,
          isAnalyzing: false,
          analysisProgress: 12,
          answers: emptyAnswers,
          leadId: null,
          token: null,
          generatedReport: null,
        });
      },
    }),
    {
      name: ASSESSMENT_STORAGE_KEY,
      storage: createJSONStorage(getAssessmentSessionStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          try {
            getAssessmentSessionStorage().removeItem(ASSESSMENT_STORAGE_KEY);
          } catch {
            // Fall back to a clean in-memory session when browser storage misbehaves.
          }
        }

        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        trustAccepted: state.trustAccepted,
        currentStepIndex: state.currentStepIndex,
        answers: state.answers,
        leadId: state.leadId,
        token: state.token,
        generatedReport: state.generatedReport,
      }),
    },
  ),
);
