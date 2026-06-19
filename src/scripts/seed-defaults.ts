import "dotenv/config";
import { seedLeadsDeskDefaults } from "@/lib/db/seed-defaults";

async function main() {
  const includeRecommendedCustomFields =
    process.argv.includes("--with-custom-fields") || process.argv.includes("--full");
  const result = await seedLeadsDeskDefaults({
    includeStages: true,
    includeSources: true,
    includeRecommendedCustomFields,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        includeRecommendedCustomFields,
        result,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Default seeding failed.",
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
