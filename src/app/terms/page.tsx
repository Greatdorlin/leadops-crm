import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      description="The basic operating terms for an organization using a Leads Desk workspace."
      sections={[
        {
          heading: "Workspace use",
          body:
            "Leads Desk provides a private workspace for lead capture, assignment, follow-up, customization, reporting, and exports. Availability and configuration depend on your deployment setup.",
        },
        {
          heading: "Customer responsibility",
          body:
            "You are responsible for the accuracy of the data you enter, the users you authorize, and the policies you apply to communication, retention, and export activity.",
        },
        {
          heading: "Acceptable use",
          body:
            "Do not use the workspace to collect data unlawfully, bypass access controls, distribute harmful content, or contact people without the permissions required in the regions where you operate.",
        },
      ]}
    />
  );
}
