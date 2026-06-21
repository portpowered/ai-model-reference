import { join } from "node:path";
import { runContentRuntimeCompletenessGate } from "../src/lib/content/content-runtime-preparation";

const repoRoot = join(import.meta.dir, "..");
const result = runContentRuntimeCompletenessGate({
  cwd: repoRoot,
});

if (!result.ok) {
  console.error(`[content-runtime] ${result.message}`);
  console.error(`[content-runtime] Repair guidance: ${result.repairGuidance}`);
  process.exit(1);
}
