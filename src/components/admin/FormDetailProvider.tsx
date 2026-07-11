"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type {
  FormRow,
  FormFieldRow,
} from "@/lib/db/schema";

interface FormDetailContextValue {
  form: FormRow | null;
  formId: string;
  fields: FormFieldRow[];
}

const FormDetailContext = createContext<FormDetailContextValue | null>(null);

export function FormDetailProvider({
  form,
  formId,
  fields,
  children,
}: {
  form: FormRow | null;
  formId: string;
  fields: FormFieldRow[];
  children: ReactNode;
}) {
  return (
    <FormDetailContext.Provider
      value={{
        form,
        formId,
        fields,
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
