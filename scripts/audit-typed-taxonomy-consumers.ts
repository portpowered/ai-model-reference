import { resolve } from "node:path";
import {
  collectTypedTaxonomyConsumerAudit,
  formatTypedTaxonomyConsumerAudit,
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
  const audit = collectTypedTaxonomyConsumerAudit(args.repoRoot);
  console.log(formatTypedTaxonomyConsumerAudit(audit));
} catch (error) {
  console.error("Typed taxonomy consumer audit failed.");
  if (error instanceof TypedTaxonomyConsumerAuditError) {
    console.error(error.message);
  } else if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exit(1);
}
