import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { LegacyClassificationBridge } from "../src/lib/content/registry-runtime";
import {
  collectLegacyClassificationBudgetGuard,
  formatLegacyClassificationBudgetGuard,
} from "../src/lib/governance/legacy-taxonomy-compatibility-budget";

type ParsedArgs = {
  legacyBridgeInventoryFile?: string;
  repoRoot: string;
};

function parseArgs(argv: readonly string[]): ParsedArgs {
  let repoRoot = resolve(import.meta.dir, "..");
  let legacyBridgeInventoryFile: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--repo-root") {
      repoRoot = resolve(argv[index + 1]);
      index += 1;
      continue;
    }

    if (argv[index] === "--legacy-bridge-inventory-file") {
      legacyBridgeInventoryFile = resolve(argv[index + 1]);
      index += 1;
    }
  }

  return { legacyBridgeInventoryFile, repoRoot };
}

const args = parseArgs(process.argv.slice(2));

const legacyClassificationBridges = args.legacyBridgeInventoryFile
  ? (JSON.parse(
      readFileSync(args.legacyBridgeInventoryFile, "utf8"),
    ) as LegacyClassificationBridge[])
  : undefined;

const result = collectLegacyClassificationBudgetGuard({
  legacyClassificationBridges,
  repoRoot: args.repoRoot,
});

process.stdout.write(`${formatLegacyClassificationBudgetGuard(result)}\n`);

if (result.status === "drifted") {
  process.exit(1);
}
