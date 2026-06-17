import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PathwayFinderLogo } from "@/components/brand/PathwayFinderLogo";

interface LegalPageLayoutProps {
  title: string;
  description: string;
  sections: Array<{
    body: string;
    heading: string;
  }>;
}

export function LegalPageLayout({ title, description, sections }: LegalPageLayoutProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f8f5ef] text-[#101052]">
      <div className="absolute inset-x-0 top-0 h-[22rem] bg-[radial-gradient(circle_at_24%_10%,rgba(255,190,0,0.18),transparent_28%),linear-gradient(180deg,#101052_0%,#101052_70%,rgba(16,16,82,0)_100%)]" />
      <div className="relative mx-auto max-w-[1060px] px-5 py-7 sm:px-8 md:px-10 md:py-9 lg:px-16">
        <div className="flex items-center justify-between gap-4">
          <PathwayFinderLogo className="h-10 w-auto md:h-12" size="header" variant="dark" />
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/16"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>

        <section className="mt-14 overflow-hidden rounded-[38px] border border-[#101052]/10 bg-white p-6 shadow-[0_28px_80px_rgba(16,16,82,0.12)] md:p-9">
          <p className="text-[0.74rem] font-bold uppercase tracking-[0.24em] text-[#101052]/56">
            Fly Connect Global
          </p>
          <h1 className="mt-4 max-w-[12ch] [font-family:var(--font-heading)] text-[3.65rem] font-bold leading-[0.88] tracking-[-0.03em] text-[#101052] md:text-[4.85rem]">
            {title}
          </h1>
          <p className="mt-5 max-w-[46rem] text-base leading-[1.78] text-[#101052]/68 md:text-lg">
            {description}
          </p>

          <div className="mt-9 grid gap-4">
            {sections.map((section) => (
              <section
                key={section.heading}
                className="rounded-[28px] border border-[#101052]/10 bg-[#f8f5ef] p-5 md:p-6"
              >
                <h2 className="[font-family:var(--font-heading)] text-[1.7rem] font-bold leading-none text-[#101052]">
                  {section.heading}
                </h2>
                <p className="mt-3 text-[0.98rem] leading-[1.78] text-[#101052]/66">{section.body}</p>
              </section>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
