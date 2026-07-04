import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { EmptyState } from "@/components/admin/EmptyState";
import { SmoothButton } from "@/components/admin/ui/SmoothButton";

export const dynamic = "force-dynamic";

interface Submission {
  id: string;
  data: Record<string, unknown>;
  status: string;
  createdAt: string;
  leadId: string | null;
}

async function fetchFormSubmissions(formId: string): Promise<Submission[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/admin/forms/${formId}/submissions`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.submissions as Submission[]) ?? [];
}

export default async function FormSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const submissions = await fetchFormSubmissions(id);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Submissions"
        title={`${submissions.length} submission${submissions.length === 1 ? "" : "s"}`}
        description="All submissions for this form."
      />

      {submissions.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          description="Submissions will appear here when leads fill out this form."
          icon={Inbox}
        />
      ) : (
        <div className="space-y-3">
          {submissions.map((submission) => (
            <GlassSurface key={submission.id} intensity="soft" className="rounded-[22px] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{submission.id.slice(0, 8)}</p>
                  <p className="text-xs text-white/50">
                    {new Date(submission.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] ${
                      submission.status === "processed"
                        ? "border-emerald-400/25 bg-emerald-500/12 text-emerald-100"
                        : "border-amber-400/25 bg-amber-500/12 text-amber-100"
                    }`}
                  >
                    {submission.status}
                  </span>
                  {submission.leadId ? (
                    <Link href={`/leads/${submission.leadId}`}>
                      <SmoothButton variant="ghost" size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />}>
                        View lead
                      </SmoothButton>
                    </Link>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 rounded-[14px] border border-white/10 bg-white/[0.04] p-3">
                <pre className="max-h-32 overflow-auto text-xs text-white/70">
                  {JSON.stringify(submission.data, null, 2)}
                </pre>
              </div>
            </GlassSurface>
          ))}
        </div>
      )}
    </div>
  );
}
