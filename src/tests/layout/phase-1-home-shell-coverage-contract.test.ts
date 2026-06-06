import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PHASE_1_SHELL_COVERAGE_COMPONENTS } from "@/lib/docs/component-manifest";

const repoRoot = join(import.meta.dir, "../../..");

const PHASE_1_SHELL_SOURCE_FILES = [
  "src/components/home/home-brush-header.tsx",
  "src/components/home/home-article.tsx",
  "src/components/home/home-browse-link.tsx",
  "src/components/layout/primary-nav.ts",
  "src/components/layout/model-atlas-docs-header.tsx",
  "src/components/layout/canonical-docs-layout.tsx",
  "src/features/docs/search/SearchTrigger.tsx",
  "src/features/docs/components/DocsIndexEntryList.tsx",
  "src/features/docs/components/TagResourceList.tsx",
  "src/features/docs/tags/TagsIndexList.tsx",
] as const;

describe("Phase 1 home shell coverage contract", () => {
  test("manifest lists every polished shell component with 90% line targets", () => {
    const manifestFiles = new Set(
      PHASE_1_SHELL_COVERAGE_COMPONENTS.map((entry) => entry.file),
    );

    for (const file of PHASE_1_SHELL_SOURCE_FILES) {
      expect(manifestFiles.has(file)).toBe(true);
      expect(existsSync(join(repoRoot, file))).toBe(true);
    }

    for (const entry of PHASE_1_SHELL_COVERAGE_COMPONENTS) {
      expect(entry.minReachableLinePercent).toBeGreaterThanOrEqual(90);
      for (const testPath of entry.unitTests) {
        expect(existsSync(join(repoRoot, testPath))).toBe(true);
      }
    }
  });
});
