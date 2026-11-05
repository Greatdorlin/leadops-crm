import "dotenv/config";
import { closeDb } from "@/lib/db/client";
import { getInitialAdminEmail, getInitialAdminName } from "@/lib/admin-access";
import { issueUserInvitation } from "@/lib/auth-credentials";
import { leadStore } from "@/lib/storage";

async function main() {
  const email = getInitialAdminEmail();
  const fullName = getInitialAdminName();
  if (!email || !fullName) {
    throw new Error("INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_NAME are required.");
  }

  const user = await leadStore.upsertCrmUser({
    email,
    fullName,
    role: "admin",
    isActive: true,
    accessScope: "all",
    branchId: null,
    departmentId: null,
    teamId: null,
  });
  const invitation = await issueUserInvitation({ userId: user.id, createdBy: email });

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        activationUrl: invitation.activationUrl,
        expiresAt: invitation.expiresAt.toISOString(),
      },
      null,
      2,
    ),
  );
}

main().finally(closeDb).catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Initial admin invitation failed.",
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
