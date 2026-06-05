import { describe, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");
const operationsPath = join(repoRoot, "docs/operations.md");

const requiredSections = [
  { heading: "## Deployment posture", topic: "deployment posture" },
  { heading: "## Branch protection", topic: "branch protection" },
  { heading: "## CI status expectations", topic: "CI status expectations" },
  { heading: "## Release process", topic: "release process" },
  { heading: "## Rollback process", topic: "rollback process" },
  { heading: "## Commit-SHA traceability", topic: "commit-SHA traceability" },
] as const;

describe("docs/operations.md maintainer guide", () => {
  test("exists and includes required operational sections", () => {
    if (!existsSync(operationsPath)) {
      throw new Error(
        "docs/operations.md is missing; maintainer operational closure docs must exist at docs/operations.md",
      );
    }

    const operations = readFileSync(operationsPath, "utf8");

    for (const { heading, topic } of requiredSections) {
      if (!operations.includes(heading)) {
        throw new Error(
          `docs/operations.md is missing required section for ${topic} (expected heading: ${heading})`,
        );
      }
    }
  });
});
