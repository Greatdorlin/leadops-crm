import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function SecurityPage() {
  return (
    <LegalPageLayout
      title="Security"
      description="How Leads Desk supports secure access, scoped visibility, and private deployment."
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
        {
          heading: "Private infrastructure",
          body:
            "Leads Desk uses a dedicated PostgreSQL database contract per client deployment. Secrets stay server-side, permissions are enforced by backend routes, and production environments should use encrypted transport, managed backups, and monitored access logs.",
        },
      ]}
    />
  );
}
