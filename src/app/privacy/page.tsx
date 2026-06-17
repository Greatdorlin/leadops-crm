import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      description="This page explains how Fly Connect Global handles the information you share while using the Pathway Finder tool."
      sections={[
        {
          heading: "What we collect",
          body:
            "We collect the answers you provide in the assessment, along with the contact details you choose to share so we can prepare your pathway report and, if requested, follow up with support.",
        },
        {
          heading: "How we use your information",
          body:
            "Your information is used to generate guidance, improve your report accuracy, and help our team understand when additional advisor support may be useful. We do not ask for sensitive financial or identity documents during this early assessment flow.",
        },
        {
          heading: "How long we keep it",
          body:
            "Assessment data is retained only as long as needed for service delivery, support, compliance, and legitimate operational review.",
        },
      ]}
    />
  );
}
