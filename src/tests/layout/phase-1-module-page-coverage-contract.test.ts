import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  PHASE_1_MODULE_PAGE_COVERAGE_COMPONENTS,
  REUSABLE_THIN_WRAPPERS,
} from "@/lib/docs/component-manifest";

const repoRoot = join(import.meta.dir, "../../..");

const PHASE_1_MODULE_PAGE_THIN_WRAPPER_FILES = [
  "src/features/models/components/ModuleGraph.tsx",
  "src/features/models/components/ModuleComparisonTable.tsx",
] as const;

describe("Phase 1 module page coverage contract", () => {
  test("manifest lists every GQA module renderer component with 90% line targets", () => {
    const manifestFiles = new Set(
      PHASE_1_MODULE_PAGE_COVERAGE_COMPONENTS.map((entry) => entry.file),
    );

    for (const file of PHASE_1_MODULE_PAGE_COVERAGE_COMPONENTS.map(
      (entry) => entry.file,
    )) {
      expect(manifestFiles.has(file)).toBe(true);
      expect(existsSync(join(repoRoot, file))).toBe(true);
    }

    for (const entry of PHASE_1_MODULE_PAGE_COVERAGE_COMPONENTS) {
      expect(entry.minReachableLinePercent).toBeGreaterThanOrEqual(90);
      for (const testPath of entry.unitTests) {
        expect(existsSync(join(repoRoot, testPath))).toBe(true);
      }
    }
  });

  test("thin wrappers ModuleGraph and ModuleComparisonTable document smoke tests", () => {
    const thinWrapperFiles = new Set(
      REUSABLE_THIN_WRAPPERS.map((entry) => entry.file),
    );

    for (const file of PHASE_1_MODULE_PAGE_THIN_WRAPPER_FILES) {
      expect(thinWrapperFiles.has(file)).toBe(true);
      expect(existsSync(join(repoRoot, file))).toBe(true);
    }

    for (const file of PHASE_1_MODULE_PAGE_THIN_WRAPPER_FILES) {
      const wrapper = REUSABLE_THIN_WRAPPERS.find(
        (entry) => entry.file === file,
      );
      expect(wrapper).toBeDefined();
      for (const testPath of wrapper?.smokeTests ?? []) {
        expect(existsSync(join(repoRoot, testPath))).toBe(true);
      }
    }
  });
});
