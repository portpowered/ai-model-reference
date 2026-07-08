import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type CanonicalPageSurfaceClassification,
  collectCanonicalPageSurfaceAudit,
  formatCanonicalPageSurfaceAudit,
} from "./canonical-page-surface-audit";
import type { ConflictHotspotSnapshot } from "./conflict-hotspot-report";

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

describe("canonical page surface audit", () => {
  test("classifies page-owned, generated, and shared hotspot paths from one page scope", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "canonical-page-surface-"));

    try {
      mkdirSync(
        join(repoRoot, "src/content/docs/modules/example-page/messages"),
        {
          recursive: true,
        },
      );
      mkdirSync(join(repoRoot, "src/content/registry/modules"), {
        recursive: true,
      });
      mkdirSync(join(repoRoot, "src/content/registry/graphs"), {
        recursive: true,
      });
      mkdirSync(join(repoRoot, "src/content/registry/tables"), {
        recursive: true,
      });

      writeFileSync(
        join(repoRoot, "src/content/docs/modules/example-page/page.mdx"),
        `---\nkind: "module"\nregistryId: "module.example-page"\nmessageNamespace: "local"\nassetNamespace: "local"\nstatus: "published"\ntags:\n  - "attention"\nupdatedAt: "2026-06-20"\n---\n`,
      );
      writeJson(
        join(repoRoot, "src/content/docs/modules/example-page/assets.json"),
        [
          {
            graphId: "graph.example-page-flow",
          },
          {
            graphId: "graph.shared-baseline",
          },
          {
            tableId: "table.example-page-comparison",
          },
        ],
      );
      writeJson(
        join(repoRoot, "src/content/registry/modules/example-page.json"),
        {
          id: "module.example-page",
        },
      );
      writeJson(
        join(repoRoot, "src/content/registry/graphs/example-page-flow.json"),
        {
          id: "graph.example-page-flow",
        },
      );
      writeJson(
        join(
          repoRoot,
          "src/content/registry/tables/example-page-comparison.json",
        ),
        {
          id: "table.example-page-comparison",
        },
      );

      const snapshot: ConflictHotspotSnapshot = {
        generatedAtUtc: "2026-06-20T12:00:00.000Z",
        rankedSurfaces: [
          {
            category: "generated-artifact",
            distinctPaths: 1,
            representativePaths: [
              "src/lib/content/generated/runtime.generated.ts",
            ],
            surface: "src/lib/content",
            touches: 4,
          },
          {
            category: "shared-test",
            distinctPaths: 1,
            representativePaths: ["src/tests/ci/example.test.ts"],
            surface: "src/tests/ci",
            touches: 3,
          },
        ],
        recentCommitLimit: 40,
        repoRoot,
        topPaths: [],
        worktrees: [],
      };

      const audit = collectCanonicalPageSurfaceAudit(repoRoot, {
        changedPaths: [
          "src/content/docs/modules/example-page/page.mdx",
          "src/content/registry/modules/example-page.json",
          "src/content/registry/graphs/example-page-flow.json",
          "src/lib/content/generated/runtime.generated.ts",
          "src/tests/ci/example.test.ts",
        ],
        pageDirectory: "src/content/docs/modules/example-page",
        snapshot,
      });

      expect(audit.pageScope.registryPath).toBe(
        "src/content/registry/modules/example-page.json",
      );
      expect(audit.pageScope.supportRecordPaths).toEqual([
        "src/content/registry/graphs/example-page-flow.json",
        "src/content/registry/tables/example-page-comparison.json",
      ]);
      expect(audit.budgetStatus).toBe("over-budget");

      const kinds = audit.classifications.map(
        (classification: CanonicalPageSurfaceClassification) =>
          `${classification.path}:${classification.kind}`,
      );
      expect(kinds).toEqual([
        "src/content/docs/modules/example-page/page.mdx:page-owned",
        "src/content/registry/graphs/example-page-flow.json:page-owned",
        "src/content/registry/modules/example-page.json:page-owned",
        "src/lib/content/generated/runtime.generated.ts:declared-generated-output",
        "src/tests/ci/example.test.ts:shared-hotspot-surface",
      ]);
      expect(audit.sharedHotspotCategories).toEqual([
        {
          category: "shared-test",
          categoryLabel: "shared test/verification",
          evidenceSurfaces: ["src/tests/ci (3 touches)"],
          paths: ["src/tests/ci/example.test.ts"],
        },
      ]);
      expect(audit.guidance.recommendedAction).toBe(
        "redirect-to-throughput-prd",
      );
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
  });

  test("classifies page-specific citation and paper records linked from the module registry as page-owned", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "canonical-page-surface-"));

    try {
      mkdirSync(
        join(repoRoot, "src/content/docs/modules/example-page/messages"),
        {
          recursive: true,
        },
      );
      mkdirSync(join(repoRoot, "src/content/registry/modules"), {
        recursive: true,
      });
      mkdirSync(join(repoRoot, "src/content/registry/citations"), {
        recursive: true,
      });
      mkdirSync(join(repoRoot, "src/content/registry/papers"), {
        recursive: true,
      });

      writeFileSync(
        join(repoRoot, "src/content/docs/modules/example-page/page.mdx"),
        `---\nkind: "module"\nregistryId: "module.example-page"\nmessageNamespace: "local"\nassetNamespace: "local"\nstatus: "published"\ntags:\n  - "attention"\nupdatedAt: "2026-06-20"\n---\n`,
      );
      writeJson(
        join(repoRoot, "src/content/registry/modules/example-page.json"),
        {
          id: "module.example-page",
          citationIds: ["citation.example-page-paper"],
          sourceId: "paper.example-page-study",
          introducedByPaperIds: ["paper.example-page-study"],
        },
      );
      writeJson(
        join(
          repoRoot,
          "src/content/registry/citations/example-page-paper.json",
        ),
        {
          id: "citation.example-page-paper",
        },
      );
      writeJson(
        join(repoRoot, "src/content/registry/papers/example-page-study.json"),
        {
          id: "paper.example-page-study",
        },
      );

      const snapshot: ConflictHotspotSnapshot = {
        generatedAtUtc: "2026-06-20T12:00:00.000Z",
        rankedSurfaces: [],
        recentCommitLimit: 40,
        repoRoot,
        topPaths: [],
        worktrees: [],
      };

      const audit = collectCanonicalPageSurfaceAudit(repoRoot, {
        changedPaths: [
          "src/content/docs/modules/example-page/page.mdx",
          "src/content/registry/modules/example-page.json",
          "src/content/registry/citations/example-page-paper.json",
          "src/content/registry/papers/example-page-study.json",
        ],
        pageDirectory: "src/content/docs/modules/example-page",
        snapshot,
      });

      expect(audit.pageScope.supportRecordPaths).toEqual([
        "src/content/registry/citations/example-page-paper.json",
        "src/content/registry/papers/example-page-study.json",
      ]);
      expect(audit.budgetStatus).toBe("within-budget");
      expect(audit.guidance.recommendedAction).toBe("keep-routine");
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
  });

  test("keeps a single shared helper touch in the visible exception lane", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "canonical-page-surface-"));

    try {
      mkdirSync(
        join(repoRoot, "src/content/docs/modules/example-page/messages"),
        {
          recursive: true,
        },
      );
      mkdirSync(join(repoRoot, "src/content/registry/modules"), {
        recursive: true,
      });
      mkdirSync(join(repoRoot, "src/lib/content"), {
        recursive: true,
      });

      writeFileSync(
        join(repoRoot, "src/content/docs/modules/example-page/page.mdx"),
        `---\nkind: "module"\nregistryId: "module.example-page"\nmessageNamespace: "local"\nassetNamespace: "local"\nstatus: "published"\ntags:\n  - "attention"\nupdatedAt: "2026-06-20"\n---\n`,
      );
      writeJson(
        join(repoRoot, "src/content/registry/modules/example-page.json"),
        {
          id: "module.example-page",
        },
      );

      const snapshot: ConflictHotspotSnapshot = {
        generatedAtUtc: "2026-06-20T12:00:00.000Z",
        rankedSurfaces: [
          {
            category: "shared-helper",
            distinctPaths: 1,
            representativePaths: ["src/lib/content/slug-utils.ts"],
            surface: "src/lib/content",
            touches: 5,
          },
        ],
        recentCommitLimit: 40,
        repoRoot,
        topPaths: [],
        worktrees: [],
      };

      const audit = collectCanonicalPageSurfaceAudit(repoRoot, {
        changedPaths: [
          "src/content/docs/modules/example-page/page.mdx",
          "src/lib/content/slug-utils.ts",
        ],
        exception: {
          reason:
            "Page publish requires one narrow shared helper update for slug normalization.",
        },
        pageDirectory: "src/content/docs/modules/example-page",
        snapshot,
      });

      expect(audit.budgetStatus).toBe("over-budget");
      expect(audit.guidance.recommendedAction).toBe("declare-exception");
      expect(audit.exception?.reason).toContain("slug normalization");
      expect(audit.guidance.details.join("\n")).toContain(
        "Visible exception declared",
      );
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
  });

  test("redirects a second authored page bundle out of the exception lane", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "canonical-page-surface-"));

    try {
      mkdirSync(
        join(repoRoot, "src/content/docs/modules/example-page/messages"),
        {
          recursive: true,
        },
      );
      mkdirSync(
        join(repoRoot, "src/content/docs/modules/second-example/messages"),
        {
          recursive: true,
        },
      );
      mkdirSync(join(repoRoot, "src/content/registry/modules"), {
        recursive: true,
      });

      writeFileSync(
        join(repoRoot, "src/content/docs/modules/example-page/page.mdx"),
        `---\nkind: "module"\nregistryId: "module.example-page"\nmessageNamespace: "local"\nassetNamespace: "local"\nstatus: "published"\ntags:\n  - "attention"\nupdatedAt: "2026-06-20"\n---\n`,
      );
      writeFileSync(
        join(repoRoot, "src/content/docs/modules/second-example/page.mdx"),
        `---\nkind: "module"\nregistryId: "module.second-example"\nmessageNamespace: "local"\nassetNamespace: "local"\nstatus: "published"\ntags:\n  - "attention"\nupdatedAt: "2026-06-20"\n---\n`,
      );
      writeJson(
        join(repoRoot, "src/content/registry/modules/example-page.json"),
        {
          id: "module.example-page",
        },
      );
      writeJson(
        join(repoRoot, "src/content/registry/modules/second-example.json"),
        {
          id: "module.second-example",
        },
      );

      const snapshot: ConflictHotspotSnapshot = {
        generatedAtUtc: "2026-06-20T12:00:00.000Z",
        rankedSurfaces: [
          {
            category: "authored-content",
            distinctPaths: 2,
            representativePaths: [
              "src/content/docs/modules/example-page/page.mdx",
              "src/content/docs/modules/second-example/page.mdx",
            ],
            surface: "src/content/docs",
            touches: 6,
          },
        ],
        recentCommitLimit: 40,
        repoRoot,
        topPaths: [],
        worktrees: [],
      };

      const audit = collectCanonicalPageSurfaceAudit(repoRoot, {
        changedPaths: [
          "src/content/docs/modules/example-page/page.mdx",
          "src/content/docs/modules/second-example/page.mdx",
        ],
        exception: {
          reason: "Trying to carry a second page bundle in one branch.",
        },
        pageDirectory: "src/content/docs/modules/example-page",
        snapshot,
      });

      expect(audit.budgetStatus).toBe("over-budget");
      expect(audit.guidance.recommendedAction).toBe(
        "redirect-to-throughput-prd",
      );
      expect(audit.guidance.headline).toContain(
        "redirected out of the routine canonical-page lane",
      );
      expect(audit.guidance.details.join("\n")).toContain("authored content");
      expect(audit.guidance.details.join("\n")).toContain(
        "still exceeds the narrow one-page exception lane",
      );
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
  });

  test("includes maintained hotspot evidence surfaces in grouped shared hotspot output", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "canonical-page-surface-"));

    try {
      mkdirSync(
        join(repoRoot, "src/content/docs/modules/example-page/messages"),
        {
          recursive: true,
        },
      );
      mkdirSync(join(repoRoot, "src/content/registry/modules"), {
        recursive: true,
      });
      mkdirSync(join(repoRoot, "src/lib/content"), {
        recursive: true,
      });
      mkdirSync(join(repoRoot, "src/tests/ci"), {
        recursive: true,
      });

      writeFileSync(
        join(repoRoot, "src/content/docs/modules/example-page/page.mdx"),
        `---\nkind: "module"\nregistryId: "module.example-page"\nmessageNamespace: "local"\nassetNamespace: "local"\nstatus: "published"\ntags:\n  - "attention"\nupdatedAt: "2026-06-20"\n---\n`,
      );
      writeJson(
        join(repoRoot, "src/content/registry/modules/example-page.json"),
        {
          id: "module.example-page",
        },
      );

      const snapshot: ConflictHotspotSnapshot = {
        generatedAtUtc: "2026-06-20T12:00:00.000Z",
        rankedSurfaces: [
          {
            category: "shared-helper",
            distinctPaths: 2,
            representativePaths: [
              "src/lib/content/slug-utils.ts",
              "src/lib/content/content-paths.ts",
            ],
            surface: "src/lib/content",
            touches: 12,
          },
          {
            category: "shared-test",
            distinctPaths: 1,
            representativePaths: ["src/tests/ci/example.test.ts"],
            surface: "src/tests/ci",
            touches: 8,
          },
        ],
        recentCommitLimit: 40,
        repoRoot,
        topPaths: [],
        worktrees: [],
      };

      const audit = collectCanonicalPageSurfaceAudit(repoRoot, {
        changedPaths: [
          "src/content/docs/modules/example-page/page.mdx",
          "src/lib/content/slug-utils.ts",
          "src/tests/ci/example.test.ts",
        ],
        pageDirectory: "src/content/docs/modules/example-page",
        snapshot,
      });

      expect(audit.hotspotEvidence.kind).toBe("maintained-snapshot");
      expect(audit.sharedHotspotCategories).toEqual([
        {
          category: "shared-helper",
          categoryLabel: "shared helper",
          evidenceSurfaces: ["src/lib/content (12 touches)"],
          paths: ["src/lib/content/slug-utils.ts"],
        },
        {
          category: "shared-test",
          categoryLabel: "shared test/verification",
          evidenceSurfaces: ["src/tests/ci (8 touches)"],
          paths: ["src/tests/ci/example.test.ts"],
        },
      ]);

      const formatted = formatCanonicalPageSurfaceAudit(audit);
      expect(formatted).toContain("Maintained snapshot:");
      expect(formatted).toContain("report:planner-conflict-hotspots");
      expect(formatted).toContain("Content runtime and helper surfaces");
      expect(formatted).toContain("Shared test and verification surfaces");
      expect(formatted).toContain("Evidence: src/lib/content (12 touches)");
      expect(formatted).toContain("Evidence: src/tests/ci (8 touches)");
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
  });

  test("reports static path fallback when maintained hotspot evidence is unavailable", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "canonical-page-surface-"));

    try {
      mkdirSync(
        join(repoRoot, "src/content/docs/modules/example-page/messages"),
        {
          recursive: true,
        },
      );
      mkdirSync(join(repoRoot, "src/content/registry/modules"), {
        recursive: true,
      });
      mkdirSync(join(repoRoot, "src/tests/ci"), {
        recursive: true,
      });

      writeFileSync(
        join(repoRoot, "src/content/docs/modules/example-page/page.mdx"),
        `---\nkind: "module"\nregistryId: "module.example-page"\nmessageNamespace: "local"\nassetNamespace: "local"\nstatus: "published"\ntags:\n  - "attention"\nupdatedAt: "2026-06-20"\n---\n`,
      );
      writeJson(
        join(repoRoot, "src/content/registry/modules/example-page.json"),
        {
          id: "module.example-page",
        },
      );
      writeFileSync(
        join(repoRoot, "src/tests/ci/example.test.ts"),
        "export {};\n",
      );

      const audit = collectCanonicalPageSurfaceAudit(repoRoot, {
        changedPaths: [
          "src/content/docs/modules/example-page/page.mdx",
          "src/tests/ci/example.test.ts",
        ],
        pageDirectory: "src/content/docs/modules/example-page",
      });

      expect(audit.hotspotEvidence.kind).toBe("static-path-fallback");
      if (audit.hotspotEvidence.kind !== "static-path-fallback") {
        throw new Error("Expected static-path-fallback hotspot evidence.");
      }
      expect(audit.hotspotEvidence.snapshot).toBeNull();
      expect(audit.hotspotEvidence.fallbackReason).toContain(
        "git rev-parse --show-toplevel",
      );
      expect(audit.sharedHotspotCategories).toEqual([
        {
          category: "shared-test",
          categoryLabel: "shared test/verification",
          evidenceSurfaces: [],
          paths: ["src/tests/ci/example.test.ts"],
        },
      ]);

      const formatted = formatCanonicalPageSurfaceAudit(audit);
      expect(formatted).toContain(
        "Fallback mode: static path classification only",
      );
      expect(formatted).toContain("Fallback reason:");
      expect(formatted).toContain("Shared test and verification surfaces");
      expect(formatted).not.toContain("Evidence:");
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
  });

  test("keeps in-budget, exception-lane, and redirect-lane formatted output distinguishable", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "canonical-page-surface-"));

    try {
      mkdirSync(
        join(repoRoot, "src/content/docs/modules/example-page/messages"),
        {
          recursive: true,
        },
      );
      mkdirSync(join(repoRoot, "src/content/registry/modules"), {
        recursive: true,
      });
      mkdirSync(join(repoRoot, "src/lib/content"), {
        recursive: true,
      });
      mkdirSync(join(repoRoot, "src/tests/ci"), {
        recursive: true,
      });

      writeFileSync(
        join(repoRoot, "src/content/docs/modules/example-page/page.mdx"),
        `---\nkind: "module"\nregistryId: "module.example-page"\nmessageNamespace: "local"\nassetNamespace: "local"\nstatus: "published"\ntags:\n  - "attention"\nupdatedAt: "2026-06-20"\n---\n`,
      );
      writeJson(
        join(repoRoot, "src/content/registry/modules/example-page.json"),
        {
          id: "module.example-page",
        },
      );

      const snapshot: ConflictHotspotSnapshot = {
        generatedAtUtc: "2026-06-20T12:00:00.000Z",
        rankedSurfaces: [
          {
            category: "shared-helper",
            distinctPaths: 1,
            representativePaths: ["src/lib/content/slug-utils.ts"],
            surface: "src/lib/content",
            touches: 5,
          },
          {
            category: "shared-test",
            distinctPaths: 1,
            representativePaths: ["src/tests/ci/example.test.ts"],
            surface: "src/tests/ci",
            touches: 3,
          },
        ],
        recentCommitLimit: 40,
        repoRoot,
        topPaths: [],
        worktrees: [],
      };

      const inBudget = collectCanonicalPageSurfaceAudit(repoRoot, {
        changedPaths: ["src/content/docs/modules/example-page/page.mdx"],
        pageDirectory: "src/content/docs/modules/example-page",
        snapshot,
      });
      const exceptionLane = collectCanonicalPageSurfaceAudit(repoRoot, {
        changedPaths: [
          "src/content/docs/modules/example-page/page.mdx",
          "src/lib/content/slug-utils.ts",
        ],
        exception: {
          reason: "One shared helper update is required to publish the page.",
        },
        pageDirectory: "src/content/docs/modules/example-page",
        snapshot,
      });
      const redirectLane = collectCanonicalPageSurfaceAudit(repoRoot, {
        changedPaths: [
          "src/content/docs/modules/example-page/page.mdx",
          "src/tests/ci/example.test.ts",
        ],
        pageDirectory: "src/content/docs/modules/example-page",
        snapshot,
      });

      const inBudgetOutput = formatCanonicalPageSurfaceAudit(inBudget);
      const exceptionOutput = formatCanonicalPageSurfaceAudit(exceptionLane);
      const redirectOutput = formatCanonicalPageSurfaceAudit(redirectLane);

      expect(inBudgetOutput).toContain("Budget status: within-budget");
      expect(inBudgetOutput).toContain("Recommended action: keep-routine");
      expect(inBudgetOutput).not.toContain("Visible exception:");
      expect(inBudgetOutput).not.toContain("shared hotspot surface");

      expect(exceptionOutput).toContain("Budget status: over-budget");
      expect(exceptionOutput).toContain(
        "Recommended action: declare-exception",
      );
      expect(exceptionOutput).toContain(
        "Visible exception: One shared helper update is required to publish the page.",
      );
      expect(exceptionOutput).toContain(
        "src/lib/content/slug-utils.ts -> shared hotspot surface [shared helper]",
      );
      expect(exceptionOutput).toContain("Visible exception declared:");
      expect(exceptionOutput).not.toContain("Recommended action: keep-routine");

      expect(redirectOutput).toContain("Budget status: over-budget");
      expect(redirectOutput).toContain(
        "Recommended action: redirect-to-throughput-prd",
      );
      expect(redirectOutput).toContain(
        "src/tests/ci/example.test.ts -> shared hotspot surface [shared test/verification]",
      );
      expect(redirectOutput).toContain(
        "Split the broader work into a dedicated throughput PRD lane",
      );
      expect(redirectOutput).not.toContain("Visible exception:");
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
  });

  test("allows glossary-bridge dual-route discovery and convergence fixture updates in declare-exception lane", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "canonical-page-surface-"));

    try {
      mkdirSync(
        join(repoRoot, "src/content/docs/concepts/temperature/messages"),
        { recursive: true },
      );
      mkdirSync(
        join(repoRoot, "src/content/docs/glossary/temperature/messages"),
        { recursive: true },
      );
      mkdirSync(join(repoRoot, "src/content/registry/concepts"), {
        recursive: true,
      });
      mkdirSync(join(repoRoot, "src/lib/content"), { recursive: true });

      writeFileSync(
        join(repoRoot, "src/content/docs/concepts/temperature/page.mdx"),
        `---\nkind: "concept"\nregistryId: "concept.temperature"\nmessageNamespace: "local"\nassetNamespace: "local"\nstatus: "published"\ntags:\n  - "foundations"\nupdatedAt: "2026-07-03"\n---\n`,
      );
      writeFileSync(
        join(repoRoot, "src/content/docs/glossary/temperature/page.mdx"),
        `---\nkind: "glossary"\nregistryId: "concept.temperature"\nmessageNamespace: "local"\nassetNamespace: "local"\nstatus: "published"\ntags:\n  - "foundations"\nupdatedAt: "2026-06-04"\n---\n`,
      );
      writeJson(
        join(repoRoot, "src/content/registry/concepts/temperature.json"),
        { id: "concept.temperature" },
      );
      writeFileSync(
        join(repoRoot, "src/lib/content/greedy-decoding-glossary.test.ts"),
        `const href = "/docs/glossary/temperature";\n`,
      );
      writeFileSync(
        join(repoRoot, "src/lib/content/temperature-concept-discovery.test.ts"),
        `const href = "/docs/concepts/temperature";\n`,
      );

      const audit = collectCanonicalPageSurfaceAudit(repoRoot, {
        changedPaths: [
          "src/content/docs/concepts/temperature/page.mdx",
          "src/content/registry/concepts/temperature.json",
          "src/lib/content/greedy-decoding-glossary.test.ts",
          "src/lib/content/temperature-concept-discovery.test.ts",
        ],
        pageDirectory: "src/content/docs/concepts/temperature",
      });

      expect(audit.guidance.recommendedAction).toBe("declare-exception");
      expect(formatCanonicalPageSurfaceAudit(audit)).toContain(
        "glossary-bridge dual-route",
      );
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
  });

  test("treats generated outputs without shared hotspot paths as split-back work", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "canonical-page-surface-"));

    try {
      mkdirSync(
        join(repoRoot, "src/content/docs/modules/example-page/messages"),
        {
          recursive: true,
        },
      );
      mkdirSync(join(repoRoot, "src/content/registry/modules"), {
        recursive: true,
      });
      mkdirSync(join(repoRoot, "src/lib/content/generated"), {
        recursive: true,
      });

      writeFileSync(
        join(repoRoot, "src/content/docs/modules/example-page/page.mdx"),
        `---\nkind: "module"\nregistryId: "module.example-page"\nmessageNamespace: "local"\nassetNamespace: "local"\nstatus: "published"\ntags:\n  - "attention"\nupdatedAt: "2026-06-20"\n---\n`,
      );
      writeJson(
        join(repoRoot, "src/content/registry/modules/example-page.json"),
        {
          id: "module.example-page",
        },
      );

      const snapshot: ConflictHotspotSnapshot = {
        generatedAtUtc: "2026-06-20T12:00:00.000Z",
        rankedSurfaces: [
          {
            category: "generated-artifact",
            distinctPaths: 1,
            representativePaths: [
              "src/lib/content/generated/runtime.generated.ts",
            ],
            surface: "src/lib/content",
            touches: 4,
          },
        ],
        recentCommitLimit: 40,
        repoRoot,
        topPaths: [],
        worktrees: [],
      };

      const audit = collectCanonicalPageSurfaceAudit(repoRoot, {
        changedPaths: [
          "src/content/docs/modules/example-page/page.mdx",
          "src/lib/content/generated/runtime.generated.ts",
        ],
        pageDirectory: "src/content/docs/modules/example-page",
        snapshot,
      });

      expect(audit.budgetStatus).toBe("over-budget");
      expect(audit.guidance.recommendedAction).toBe("split-to-page-owned-work");
      expect(audit.guidance.headline).toContain("Split this branch back");
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
  });
});
