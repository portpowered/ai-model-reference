import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function runAudit(
  repoRoot: string,
  args: readonly string[],
): ReturnType<typeof spawnSync> {
  return spawnSync(
    "bun",
    [
      "./scripts/audit-canonical-page-surface.ts",
      "--repo-root",
      repoRoot,
      ...args,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );
}

function seedExamplePageFixture(): string {
  const repoRoot = mkdtempSync(join(tmpdir(), "canonical-surface-behavioral-"));

  mkdirSync(join(repoRoot, "src/content/docs/modules/example-page/messages"), {
    recursive: true,
  });
  mkdirSync(join(repoRoot, "src/content/registry/modules"), {
    recursive: true,
  });

  writeFileSync(
    join(repoRoot, "src/content/docs/modules/example-page/page.mdx"),
    `---\nkind: "module"\nregistryId: "module.example-page"\nmessageNamespace: "local"\nassetNamespace: "local"\nstatus: "published"\ntags:\n  - "attention"\nupdatedAt: "2026-06-20"\n---\n`,
  );
  writeFileSync(
    join(repoRoot, "src/content/docs/modules/example-page/messages/en.json"),
    `${JSON.stringify({ title: "Example page" }, null, 2)}\n`,
  );
  writeFileSync(
    join(repoRoot, "src/content/docs/modules/example-page/assets.json"),
    `${JSON.stringify([], null, 2)}\n`,
  );
  writeFileSync(
    join(repoRoot, "src/content/registry/modules/example-page.json"),
    `${JSON.stringify({ id: "module.example-page" }, null, 2)}\n`,
  );

  return repoRoot;
}

describe("canonical page surface audit behavioral verification (pr-surface-budget-and-owned-file-guard-current-005)", () => {
  test("representative page-only path set passes as in budget via explicit path list", () => {
    const repoRoot = seedExamplePageFixture();

    try {
      const result = runAudit(repoRoot, [
        "--page-dir",
        "src/content/docs/modules/example-page",
        "--files",
        "src/content/docs/modules/example-page/page.mdx",
        "src/content/docs/modules/example-page/messages/en.json",
        "src/content/registry/modules/example-page.json",
      ]);

      expect(result.status).toBe(0);
      expect(result.stdout ?? "").toContain(
        "Changed paths: explicit changed-file set",
      );
      expect(result.stdout ?? "").toContain("Budget status: within-budget");
      expect(result.stdout ?? "").toContain("Recommended action: keep-routine");
      expect(result.stdout ?? "").toContain(
        "src/content/docs/modules/example-page/page.mdx -> page-owned (matching page bundle)",
      );
      expect(result.stdout ?? "").toContain(
        "src/content/registry/modules/example-page.json -> page-owned (matching primary structured record)",
      );
      expect(result.stdout ?? "").not.toContain("shared hotspot surface");
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
  });

  test("representative shared-surface path set is over budget with actionable guidance via explicit path list", () => {
    const repoRoot = seedExamplePageFixture();
    mkdirSync(join(repoRoot, "src/lib/content"), { recursive: true });
    mkdirSync(join(repoRoot, "src/tests/ci"), { recursive: true });
    writeFileSync(
      join(repoRoot, "src/lib/content/slug-utils.ts"),
      "export {};\n",
    );
    writeFileSync(
      join(repoRoot, "src/tests/ci/example-surface.test.ts"),
      "export {};\n",
    );

    try {
      const result = runAudit(repoRoot, [
        "--page-dir",
        "src/content/docs/modules/example-page",
        "--files",
        "src/content/docs/modules/example-page/page.mdx",
        "src/lib/content/slug-utils.ts",
        "src/tests/ci/example-surface.test.ts",
      ]);

      expect(result.status).toBe(0);
      expect(result.stdout ?? "").toContain(
        "Changed paths: explicit changed-file set",
      );
      expect(result.stdout ?? "").toContain("Budget status: over-budget");
      expect(result.stdout ?? "").toContain(
        "Recommended action: redirect-to-throughput-prd",
      );
      expect(result.stdout ?? "").toContain(
        "src/lib/content/slug-utils.ts -> shared hotspot surface [shared helper]",
      );
      expect(result.stdout ?? "").toContain(
        "src/tests/ci/example-surface.test.ts -> shared hotspot surface [shared test/verification]",
      );
      expect(result.stdout ?? "").toContain(
        "Split the broader work into a dedicated throughput PRD lane",
      );
      expect(result.stdout ?? "").toContain(
        "Content runtime and helper surfaces",
      );
      expect(result.stdout ?? "").toContain(
        "Shared test and verification surfaces",
      );
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
  });

  test("explicit path-list input classifies independently from git branch diff", () => {
    const repoRoot = seedExamplePageFixture();

    try {
      const pathListResult = runAudit(repoRoot, [
        "--page-dir",
        "src/content/docs/modules/example-page",
        "--files",
        "src/content/docs/modules/example-page/page.mdx",
        "src/content/registry/modules/example-page.json",
      ]);

      expect(pathListResult.status).toBe(0);
      expect(pathListResult.stdout ?? "").toContain(
        "Changed paths: explicit changed-file set",
      );
      expect(pathListResult.stdout ?? "").not.toContain("current branch vs");
      expect(pathListResult.stdout ?? "").not.toContain("merge-base");
      expect(pathListResult.stdout ?? "").toContain(
        "Budget status: within-budget",
      );
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
  });
});
