import { resolve } from "node:path";
import {
  CanonicalPageSurfaceAuditError,
  collectCanonicalPageSurfaceAudit,
  formatCanonicalPageSurfaceAudit,
} from "../src/lib/factory/canonical-page-surface-audit";

type ParsedArgs = {
  baseRef?: string;
  changedPaths: string[];
  pageDirectory?: string;
  repoRoot: string;
};

function parseArgs(argv: readonly string[]): ParsedArgs {
  const changedPaths: string[] = [];
  let baseRef: string | undefined;
  let pageDirectory: string | undefined;
  let repoRoot = resolve(import.meta.dir, "..");

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--base") {
      baseRef = argv[index + 1];
      index += 1;
      continue;
    }

    if (value === "--page-dir") {
      pageDirectory = argv[index + 1];
      index += 1;
      continue;
    }

    if (value === "--repo-root") {
      repoRoot = resolve(argv[index + 1]);
      index += 1;
      continue;
    }

    if (value === "--files") {
      for (
        let fileIndex = index + 1;
        fileIndex < argv.length && !argv[fileIndex].startsWith("--");
        fileIndex += 1
      ) {
        changedPaths.push(argv[fileIndex]);
        index = fileIndex;
      }
    }
  }

  return {
    baseRef,
    changedPaths,
    pageDirectory,
    repoRoot,
  };
}

const args = parseArgs(process.argv.slice(2));

try {
  const audit = collectCanonicalPageSurfaceAudit(args.repoRoot, {
    baseRef: args.baseRef,
    changedPaths: args.changedPaths.length > 0 ? args.changedPaths : undefined,
    pageDirectory: args.pageDirectory,
  });
  console.log(formatCanonicalPageSurfaceAudit(audit));
} catch (error) {
  console.error("Canonical page PR-surface audit failed.");
  if (error instanceof CanonicalPageSurfaceAuditError) {
    console.error(error.message);
  } else if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exit(1);
}
