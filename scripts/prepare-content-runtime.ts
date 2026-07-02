import { join } from "node:path";
import { runContentRuntimePreparation } from "../src/lib/content/content-runtime-preparation";

const repoRoot = join(import.meta.dir, "..");
const result = runContentRuntimePreparation({
  cwd: repoRoot,
});

if (!result.ok) {
  process.exit(result.commandResult.status ?? 1);
}
