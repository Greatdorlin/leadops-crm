import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function SecurityPage() {
  return (
    <LegalPageLayout
      title="Security"
      description="This page outlines the placeholder security commitments behind the Pathway Finder tool."
      sections={[
        {
          heading: "Data handling",
          body:
            "We aim to collect only the information needed for the assessment and avoid requesting high-risk documents during the first interaction.",
        },
        {
          heading: "Operational safeguards",
          body:
            "Access to assessment data is intended to be limited to authorized team members and operational systems involved in generating reports, support, and quality review.",
        },
      ]}
    />
  );
}
