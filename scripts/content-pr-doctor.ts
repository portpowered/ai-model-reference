import { join } from "node:path";
import { runContentPrDoctor } from "../src/lib/content/content-pr-doctor";

const repoRoot = join(import.meta.dir, "..");
const result = runContentPrDoctor({
  cwd: repoRoot,
});

if (!result.ok) {
  console.error(`[content-pr-doctor] ${result.message}`);
  if (result.details && result.details.length > 0) {
    console.error("[content-pr-doctor] Relevant tracked changes:");
    for (const detail of result.details) {
      console.error(`  ${detail}`);
    }
  }
  console.error(
    `[content-pr-doctor] Repair guidance: ${result.repairGuidance}`,
  );
  process.exit(result.commandResult?.status ?? 1);
}
