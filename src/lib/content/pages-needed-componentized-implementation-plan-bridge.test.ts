import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dir, "../../..");
const BRIDGE_JSON_PATH = join(
  REPO_ROOT,
  "docs/pages-needed-componentized-implementation-plan.json",
);
const BRIDGE_MARKDOWN_PATH = join(
  REPO_ROOT,
  "docs/pages-needed-componentized-implementation-plan.md",
);

type BridgePlan = {
  prerequisite: { id: string; status: string; storyId: string };
  smallestSafePostGeneratorSlice: {
    id: string;
    status: string;
    storyId: string;
  };
  phases: {
    phase1: { status: string; queuePosture: string };
    phase2: { status: string; queuePosture: string };
    phase3: {
      status: string;
      publishedCounts: {
        glossaryPages: number;
        conceptSectionPages: number;
        modulePages: number;
      };
    };
    phase4Plus: { status: string; queuePosture: string };
  };
  contentFamilies: Array<{
    id: string;
    status: string;
    storyId: string;
    slugs: string[];
    verification: string;
  }>;
  remainingAuthorizedPhase3Gaps: Array<{ family: string; slugs: string[] }>;
  excludedFromImmediateQueue: string[];
  dependencyOrder: string[];
};

function loadBridgePlan(): BridgePlan {
  return JSON.parse(readFileSync(BRIDGE_JSON_PATH, "utf8")) as BridgePlan;
}

function loadBridgeMarkdown(): string {
  return readFileSync(BRIDGE_MARKDOWN_PATH, "utf8");
}

describe("pages-needed componentized implementation bridge", () => {
  test("JSON names prerequisite, post-generator slice, phase posture, and exclusions", () => {
    const plan = loadBridgePlan();

    expect(plan.prerequisite.id).toBe("generator-parity");
    expect(plan.prerequisite.status).toBe("landed");
    expect(plan.prerequisite.storyId).toBe(
      "pages-needed-componentized-implementation-plan-001",
    );

    expect(plan.smallestSafePostGeneratorSlice.id).toBe(
      "phase-2-3-discovery-reconciliation",
    );
    expect(plan.smallestSafePostGeneratorSlice.status).toBe("landed");
    expect(plan.smallestSafePostGeneratorSlice.storyId).toBe(
      "pages-needed-componentized-implementation-plan-002",
    );

    expect(plan.phases.phase1.queuePosture).toBe("do-not-reopen");
    expect(plan.phases.phase2.status).toBe("present");
    expect(plan.phases.phase3.status).toBe("partial");
    expect(plan.phases.phase4Plus.status).toBe("deferred");
    expect(plan.phases.phase4Plus.queuePosture).toBe("explicitly-excluded");
    expect(plan.excludedFromImmediateQueue).toContain("phase-4-localization");
  });

  test("JSON decomposes authorized Phase 3 families and matches published inventory counts", () => {
    const plan = loadBridgePlan();

    expect(plan.contentFamilies).toHaveLength(5);
    expect(
      plan.contentFamilies.every((family) => family.status === "landed"),
    ).toBe(true);
    expect(plan.contentFamilies.map((family) => family.id)).toEqual([
      "architecture-sequence-family",
      "attention-interaction",
      "normalization-activation-variants",
      "positional-context-extension",
      "tokenizer-foundations",
    ]);

    expect(plan.phases.phase3.publishedCounts.glossaryPages).toBe(87);
    expect(plan.phases.phase3.publishedCounts.conceptSectionPages).toBe(14);
    expect(plan.phases.phase3.publishedCounts.modulePages).toBe(8);

    const landedSlugCount = plan.contentFamilies.reduce(
      (total, family) => total + family.slugs.length,
      0,
    );
    expect(landedSlugCount).toBe(42);

    expect(plan.remainingAuthorizedPhase3Gaps).toHaveLength(2);
    expect(plan.dependencyOrder[0]).toBe("generator-parity");
    expect(plan.dependencyOrder[1]).toBe("phase-2-3-discovery-reconciliation");
  });

  test("markdown bridge artifact mirrors JSON planning sections", () => {
    const plan = loadBridgePlan();
    const markdown = loadBridgeMarkdown();

    expect(markdown).toContain(
      "# Pages Needed Componentized Implementation Plan",
    );
    expect(markdown).toContain(
      "pages-needed-componentized-implementation-plan.json",
    );
    expect(markdown).toContain("## Prerequisite: generator parity");
    expect(markdown).toContain("## Smallest safe post-generator slice");
    expect(markdown).toContain("## Phase posture (present, missing, deferred)");
    expect(markdown).toContain("### Phase 4 and later — explicitly deferred");
    expect(markdown).toContain(
      "## Authorized content-family queue (decomposition)",
    );

    for (const family of plan.contentFamilies) {
      const verificationBasename =
        family.verification.split("/").at(-1) ?? family.verification;
      expect(markdown).toContain(verificationBasename);
    }

    expect(markdown).toContain("extended attention-module family");
    expect(markdown).toContain("skip-connection");
  });
});
