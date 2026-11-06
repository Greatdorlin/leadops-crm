# Security policy

Leads Desk is a private commercial deployment model. Apply the latest reviewed release and use a separate database and secrets for each client. See docs/SECURITY_AND_PERMISSIONS.md and docs/BUYER_READINESS.md for permissions and operational responsibilities.

Report suspected vulnerabilities to the repository owner through a confidential channel agreed with your agency/client, or GitHub private vulnerability reporting if the owner has enabled it. Do not publish tokens, session cookies, database URLs, customer payloads, or exploit details in public issues. Provide the affected commit, a minimal synthetic reproduction, impact, and relevant redacted logs.

Dependency updates are proposed weekly. CI audits all dependencies and rejects high/critical advisories. Moderate findings still require review. Security patches are released based on actual tested changes; the repository's short history is not evidence of a long-term support commitment. Support duration and response times belong in the client's commercial agreement.
