import "dotenv/config";
import { closeDb } from "@/lib/db/client";
import { seedLeadsDeskDemoData } from "@/lib/db/seed-demo";

async function main() {
  const result = await seedLeadsDeskDemoData();

  console.log(
    JSON.stringify(
      {
        ok: true,
        result,
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
        message: error instanceof Error ? error.message : "Demo seeding failed.",
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
