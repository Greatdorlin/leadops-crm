import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function LegalPage() {
  return (
    <LegalPageLayout
      title="Legal Information"
      description="This page provides a placeholder overview of the legal disclosures that support the Pathway Finder experience."
      sections={[
        {
          heading: "Guidance, not legal advice",
          body:
            "The Pathway Finder is designed to help users understand possible travel and study directions. It does not replace formal legal, immigration, or regulated financial advice.",
        },
        {
          heading: "Use of the service",
          body:
            "Users should provide accurate information and review recommendations carefully before making decisions. Final eligibility, acceptance, and travel outcomes always depend on official requirements and third-party review.",
        },
      ]}
    />
  );
}
