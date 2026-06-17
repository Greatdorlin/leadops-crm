import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      description="These placeholder terms explain the basic expectations for using the Fly Connect Global Pathway Finder experience."
      sections={[
        {
          heading: "Service scope",
          body:
            "The tool provides directional insight based on the information you submit. Reports are intended to help you prepare for the next step, not guarantee approvals or outcomes.",
        },
        {
          heading: "User responsibility",
          body:
            "You are responsible for ensuring the information you provide is accurate and up to date. Inaccurate answers can reduce the quality and relevance of your report.",
        },
      ]}
    />
  );
}
