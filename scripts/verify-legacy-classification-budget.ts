import { resolve } from "node:path";
import {
  collectLegacyClassificationBudgetGuard,
  formatLegacyClassificationBudgetGuard,
} from "../src/lib/governance/legacy-taxonomy-compatibility-budget";

type ParsedArgs = {
  repoRoot: string;
};

function parseArgs(argv: readonly string[]): ParsedArgs {
  let repoRoot = resolve(import.meta.dir, "..");

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--repo-root") {
      repoRoot = resolve(argv[index + 1]);
      index += 1;
    }
  }

  return { repoRoot };
}

const args = parseArgs(process.argv.slice(2));
const result = collectLegacyClassificationBudgetGuard({
  repoRoot: args.repoRoot,
});

process.stdout.write(`${formatLegacyClassificationBudgetGuard(result)}\n`);

if (result.status === "drifted") {
  process.exit(1);
}
