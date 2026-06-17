"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BellRing, CheckCircle2, LoaderCircle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { cn } from "@/lib/cn";

const waitlistSchema = z.object({
  firstName: z.string().trim().min(2, "Please enter your first name."),
  email: z.email("Please enter a valid email address."),
  whatsappNumber: z.string().trim().min(7, "Please enter your WhatsApp number."),
});

type WaitlistFormValues = z.infer<typeof waitlistSchema>;

interface GoalWaitlistDialogProps {
  open: boolean;
  goalValue: string;
  goalLabel: string;
  defaultFirstName: string;
  onClose: () => void;
}

interface WaitlistDialogContentProps {
  goalValue: string;
  goalLabel: string;
  defaultFirstName: string;
  onClose: () => void;
}

function WaitlistField({
  error,
  id,
  label,
  placeholder,
  autoComplete,
  register,
}: {
  error?: string;
  id: string;
  label: string;
  placeholder: string;
  autoComplete: string;
  register: ReturnType<typeof useForm<WaitlistFormValues>>["register"];
}) {
  return (
    <div className="space-y-2.5">
      <label className="text-sm font-medium text-white/80" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        autoComplete={autoComplete}
        className="h-14 w-full rounded-[18px] border border-white/12 bg-white/[0.05] px-4 text-white outline-none transition placeholder:text-white/28 focus:border-[rgba(255,190,0,0.4)] focus:bg-white/[0.08]"
        placeholder={placeholder}
        {...register(id as keyof WaitlistFormValues)}
      />
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}

function WaitlistDialogContent({
  goalValue,
  goalLabel,
  defaultFirstName,
  onClose,
}: WaitlistDialogContentProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<WaitlistFormValues>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      firstName: defaultFirstName,
      email: "",
      whatsappNumber: "",
    },
  });

  const headline = useMemo(() => `Get notified when ${goalLabel} goes live.`, [goalLabel]);

  async function handleSubmit(values: WaitlistFormValues) {
    setSubmitError("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/waitlist/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          goalValue,
          goalLabel,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to save request." }));
        throw new Error(data.error ?? "Unable to save request.");
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
        const hashedEmail = await hashForTikTok(values.email);
        const hashedPhone = await hashForTikTok(values.whatsappNumber.replace(/\D/g, ""));

        ttq.identify?.({
          ...(hashedEmail ? { email: hashedEmail } : {}),
          ...(hashedPhone ? { phone_number: hashedPhone } : {}),
        });

        ttq.track?.("Lead", {
          contents: [
            {
              content_id: `waitlist-${goalValue}`,
              content_type: "product",
              content_name: `${goalLabel} Waitlist`,
            },
          ],
          value: 0,
          currency: "USD",
        });
      }

      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save request.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <motion.div
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="flex max-h-[min(92svh,44rem)] w-full max-w-[72rem] flex-col overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,#14156a_0%,#0c0f43_100%)] text-white shadow-[0_26px_90px_rgba(0,0,0,0.42)] md:max-h-[min(92svh,39rem)] md:rounded-[34px]"
      exit={{ opacity: 0, y: 24, scale: 0.985 }}
      initial={{ opacity: 0, y: 24, scale: 0.985 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="waitlist-title"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="px-4 pb-3 pt-3 md:px-6 md:pb-3 md:pt-4">
        <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-white/18 md:hidden" />
        <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-3">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[color:rgba(255,190,0,0.22)] bg-[rgba(255,190,0,0.08)] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--fc-yellow)]">
              <BellRing className="h-3.5 w-3.5" />
              Coming soon
            </span>
            <p className="text-sm font-medium leading-6 text-white/70">
              Study is already live. We&apos;ll notify you when this pathway opens.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/72 transition hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--fc-yellow)]"
            aria-label="Close waitlist dialog"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto md:overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[1.08fr_0.92fr]">
          <div className="hidden border-r border-white/8 px-6 py-6 md:block">
            <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-[0_20px_56px_rgba(0,0,0,0.18)] md:p-6">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-[color:var(--fc-yellow)]">
                Pathway waitlist
              </p>
              <h2
                id="waitlist-title"
                className="mt-4 max-w-[11ch] [font-family:var(--font-heading)] text-[2.2rem] font-semibold leading-[0.92] text-white md:max-w-[10.5ch] md:text-[3.2rem] lg:text-[3.55rem]"
              >
                {submitted ? "You’re on the list." : headline}
              </h2>
              <p className="mt-4 max-w-[24rem] text-[0.98rem] leading-7 text-white/74 md:text-[1.02rem] md:leading-7">
                {submitted
                  ? "We’ll let you know as soon as this pathway becomes available."
                  : "Leave your details and we’ll reach out as soon as this pathway opens."}
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[22px] border border-[rgba(255,190,0,0.16)] bg-[rgba(255,190,0,0.06)] px-4 py-4 text-sm leading-7 text-white/78">
                  Selected interest: <span className="font-semibold text-white">{goalLabel}</span>
                </div>
                {!submitted ? (
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-white/70">
                    We&apos;ll send one direct update when this route opens.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="px-4 py-4 md:px-6 md:py-6">
            {submitted ? (
              <div className="flex h-full min-h-[18rem] flex-col justify-center rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 md:p-6">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(255,190,0,0.3)] bg-[rgba(255,190,0,0.1)] text-[color:var(--fc-yellow)]">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <p className="mt-5 [font-family:var(--font-heading)] text-[2.2rem] leading-none text-white md:text-[2.6rem]">
                  Request received
                </p>
                <p className="mt-4 max-w-[24rem] text-base leading-8 text-white/72">
                  Thanks, {form.getValues("firstName") || defaultFirstName || "there"}. We’ll keep
                  you posted.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[color:var(--fc-yellow)] px-6 [font-family:var(--font-heading)] text-lg font-semibold uppercase tracking-[0.12em] text-[color:var(--fc-navy)] transition hover:translate-y-[-1px]"
                  >
                    Close
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
                <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 md:p-6">
                  <div className="mb-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--fc-yellow)]">
                      Join the waitlist
                    </p>
                    <h3 className="mt-2 [font-family:var(--font-heading)] text-[1.7rem] font-semibold leading-none text-white md:text-[2rem]">
                      Be first to hear about {goalLabel}.
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-white/68">
                      Add your details and we&apos;ll reach out as soon as it is available.
                    </p>
                    <div className="mt-4 rounded-[20px] border border-[rgba(255,190,0,0.16)] bg-[rgba(255,190,0,0.06)] px-4 py-3 text-sm leading-6 text-white/80 md:hidden">
                      Selected interest: <span className="font-semibold text-white">{goalLabel}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <WaitlistField
                        id="firstName"
                        label="First name"
                        placeholder="Enter your first name"
                        autoComplete="given-name"
                        register={form.register}
                        error={form.formState.errors.firstName?.message}
                      />

                      <WaitlistField
                        id="email"
                        label="Email address"
                        placeholder="Enter your email"
                        autoComplete="email"
                        register={form.register}
                        error={form.formState.errors.email?.message}
                      />
                    </div>
                    <WaitlistField
                      id="whatsappNumber"
                      label="WhatsApp number"
                      placeholder="Enter your WhatsApp number"
                      autoComplete="tel"
                      register={form.register}
                      error={form.formState.errors.whatsappNumber?.message}
                    />
                  </div>

                  {submitError ? (
                    <p className="mt-4 rounded-[18px] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                      {submitError}
                    </p>
                  ) : null}

                  <div className="mt-5">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className={cn(
                        "inline-flex h-14 w-full items-center justify-center gap-2 rounded-full px-5 [font-family:var(--font-heading)] text-lg font-semibold uppercase tracking-[0.14em] transition",
                        isSaving
                          ? "cursor-wait bg-white/16 text-white/48"
                          : "bg-[color:var(--fc-yellow)] text-[color:var(--fc-navy)] hover:translate-y-[-1px]",
                      )}
                    >
                      {isSaving ? (
                        <>
                          Saving
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        </>
                      ) : (
                        <>
                          Notify me
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-white/52">
                    We’ll only use these details to notify you when this pathway becomes available.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function GoalWaitlistDialog({
  open,
  goalValue,
  goalLabel,
  defaultFirstName,
  onClose,
}: GoalWaitlistDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-[#050816]/76 px-3 py-3 backdrop-blur-md md:items-center md:px-6 md:py-8"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onPointerDown={onClose}
        >
          <WaitlistDialogContent
            key={`${goalValue}-${goalLabel}`}
            goalValue={goalValue}
            goalLabel={goalLabel}
            defaultFirstName={defaultFirstName}
            onClose={onClose}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
