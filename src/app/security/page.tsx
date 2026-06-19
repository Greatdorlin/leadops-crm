import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function SecurityPage() {
  return (
    <LegalPageLayout
      title="Security"
      description="This page outlines the placeholder security commitments behind the Leads Desk workspace."
      sections={[
        {
          heading: "Data handling",
          body:
            "Leads Desk should collect only the operational data needed to manage leads, assignments, follow-ups, reporting, and exports.",
        },
        {
          heading: "Operational safeguards",
          body:
            "Access should be limited to authorized users and supported by role-based permissions, audit review, and environment-specific deployment controls.",
        },
      ]}
    />
  );
}
