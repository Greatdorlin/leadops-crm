import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function LegalPage() {
  return (
    <LegalPageLayout
      title="Legal Information"
      description="This page provides a placeholder overview of the legal disclosures that support the Leads Desk workspace."
      sections={[
        {
          heading: "Service scope",
          body:
            "Leads Desk is a private lead management system. It helps teams organize lead capture, follow-up, reporting, and exports inside a branded workspace.",
        },
        {
          heading: "Use of the service",
          body:
            "Customers are responsible for collecting, storing, and using lead data lawfully, and for reviewing their own business processes, exports, and downstream actions.",
        },
      ]}
    />
  );
}
