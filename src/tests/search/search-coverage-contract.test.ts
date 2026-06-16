import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PHASE_1_SEARCH_COVERAGE_COMPONENTS } from "@/lib/docs/component-manifest";

const repoRoot = join(import.meta.dir, "../../..");

const PHASE_1_SEARCH_SOURCE_FILES = [
  "src/features/docs/search/SearchPagePanel.tsx",
  "src/features/docs/search/SearchDialog.tsx",
  "src/features/docs/search/SearchResults.tsx",
  "src/features/docs/search/SearchResultRow.tsx",
  "src/features/docs/search/SearchResultTitle.tsx",
  "src/features/docs/search/SearchResultMetaDetails.tsx",
] as const;

describe("Phase 1 search presentation coverage contract", () => {
  test("manifest lists every touched search presentation component with 90% line targets", () => {
    const manifestFiles = new Set(
      PHASE_1_SEARCH_COVERAGE_COMPONENTS.map((entry) => entry.file),
    );

    for (const file of PHASE_1_SEARCH_SOURCE_FILES) {
      expect(manifestFiles.has(file)).toBe(true);
      expect(existsSync(join(repoRoot, file))).toBe(true);
    }

    for (const entry of PHASE_1_SEARCH_COVERAGE_COMPONENTS) {
      expect(entry.minReachableLinePercent).toBeGreaterThanOrEqual(90);
      for (const testPath of entry.unitTests) {
        expect(existsSync(join(repoRoot, testPath))).toBe(true);
      }
    }
  });
});
