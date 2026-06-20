import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type CanonicalPageSurfaceClassification,
  collectCanonicalPageSurfaceAudit,
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
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
  });
});
