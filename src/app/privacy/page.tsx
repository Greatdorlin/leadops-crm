import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      description="This page explains how Leads Desk handles information stored in a private lead management workspace."
      sections={[
        {
          heading: "What we collect",
          body:
            "Leads Desk stores the business contact details, ownership updates, notes, tasks, and workflow settings needed to run daily lead operations.",
        },
        {
          heading: "How we use your information",
          body:
            "Your information is used to capture leads, assign work, track follow-ups, power reports, and support exports inside the private workspace your organization controls.",
        },
        {
          heading: "Access and retention",
          body:
            "Access should be limited to authorized users. Retention, exports, and removal policies should follow your organization’s operational and compliance requirements.",
        },
      ]}
    />
  );
}
