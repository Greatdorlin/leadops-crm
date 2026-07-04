"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type {
  FormRow,
  FormFieldRow,
  FormRuleRow,
  FormSubmissionRow,
} from "@/lib/db/schema";

interface FormDetailContextValue {
  form: FormRow | null;
  formId: string;
  fields: FormFieldRow[];
  rules: FormRuleRow[];
  submissions: FormSubmissionRow[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  refresh: () => void;
  refreshKey: number;
}

const FormDetailContext = createContext<FormDetailContextValue | null>(null);

export function FormDetailProvider({
  form,
  formId,
  fields,
  rules,
  submissions,
  children,
}: {
  form: FormRow | null;
  formId: string;
  fields: FormFieldRow[];
  rules: FormRuleRow[];
  submissions: FormSubmissionRow[];
  children: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <FormDetailContext.Provider
      value={{
        form,
        formId,
        fields,
        rules,
        submissions,
        activeTab,
        setActiveTab,
        refresh,
        refreshKey,
      }}
    >
      {children}
    </FormDetailContext.Provider>
  );
}

export function useFormDetail() {
  const ctx = useContext(FormDetailContext);
  if (!ctx) {
    throw new Error("useFormDetail must be used within FormDetailProvider");
  }
  return ctx;
}
