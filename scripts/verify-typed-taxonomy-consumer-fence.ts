import { resolve } from "node:path";
import {
  collectTypedTaxonomyConsumerFence,
  formatTypedTaxonomyConsumerFence,
  TypedTaxonomyConsumerAuditError,
} from "../src/lib/governance/typed-taxonomy-consumer-audit";

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

try {
  const result = collectTypedTaxonomyConsumerFence(args.repoRoot);
  process.stdout.write(formatTypedTaxonomyConsumerFence(result));

  if (
    result.audit.contractStatus === "drifted" ||
    result.violationStatus === "violations-found"
  ) {
    process.exit(1);
  }
} catch (error) {
  console.error("Typed taxonomy consumer deprecation fence failed.");
  if (error instanceof TypedTaxonomyConsumerAuditError) {
    console.error(error.message);
  } else if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exit(1);
}
