import { InvitationActivationForm } from "@/components/admin/InvitationActivationForm";
import { LeadsDeskWordmark } from "@/components/brand/LeadsDeskWordmark";

export const dynamic = "force-dynamic";

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;

  return (
    <main className="admin-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 text-white sm:px-6">
      <div className="ld-bg-overlay" aria-hidden="true" />
      <section className="ld-glass ld-glass-vibrant ld-glass-card ld-inner-highlight relative w-full max-w-md rounded-[30px] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.42)] sm:p-8">
        <div className="flex justify-center"><LeadsDeskWordmark tone="light" /></div>
        <div className="mt-7 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Invitation only</p>
          <h1 className="mt-3 font-[family:var(--font-heading)] text-3xl tracking-[-0.045em] text-white">Activate your workspace access</h1>
          <p className="mt-3 text-sm leading-6 text-white/70">Create the password you will use with your invited email address.</p>
        </div>
        <div className="mt-7 rounded-[22px] border border-white/10 bg-white/[0.055] p-5">
          <InvitationActivationForm token={token} />
        </div>
      </section>
    </main>
  );
}
