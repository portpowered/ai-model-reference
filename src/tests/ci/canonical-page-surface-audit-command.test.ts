import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function runGit(repoRoot: string, args: readonly string[]): void {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
}

function initAuditFixtureRepo(): string {
  const repoRoot = mkdtempSync(join(tmpdir(), "canonical-surface-command-"));
  runGit(repoRoot, ["init"]);
  runGit(repoRoot, ["checkout", "-b", "main"]);
  runGit(repoRoot, ["config", "user.name", "Surface Audit Tests"]);
  runGit(repoRoot, ["config", "user.email", "surface-audit@example.com"]);

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
    join(repoRoot, "src/content/docs/modules/example-page/assets.json"),
    `${JSON.stringify([{ graphId: "graph.example-page-flow" }], null, 2)}\n`,
  );
  writeFileSync(
    join(repoRoot, "src/content/registry/modules/example-page.json"),
    `${JSON.stringify({ id: "module.example-page" }, null, 2)}\n`,
  );

  runGit(repoRoot, ["add", "."]);
  runGit(repoRoot, ["commit", "-m", "seed example page"]);

  runGit(repoRoot, ["checkout", "-b", "feature/page-surface"]);
  mkdirSync(join(repoRoot, "src/lib/content/generated"), { recursive: true });
  mkdirSync(join(repoRoot, "src/tests/ci"), { recursive: true });

  writeFileSync(
    join(repoRoot, "src/content/docs/modules/example-page/page.mdx"),
    `---\nkind: "module"\nregistryId: "module.example-page"\nmessageNamespace: "local"\nassetNamespace: "local"\nstatus: "published"\ntags:\n  - "attention"\nupdatedAt: "2026-06-21"\n---\n`,
  );
  writeFileSync(
    join(repoRoot, "src/lib/content/generated/runtime.generated.ts"),
    "export const runtime = true;\n",
  );
  writeFileSync(
    join(repoRoot, "src/tests/ci/example-surface.test.ts"),
    "export {};\n",
  );

  runGit(repoRoot, ["add", "."]);
  runGit(repoRoot, ["commit", "-m", "touch page and shared surfaces"]);

  return repoRoot;
}

describe("audit-canonical-page-surface script", () => {
  test("audits the current branch against the inferred canonical page scope", () => {
    const repoRoot = initAuditFixtureRepo();

    try {
      const result = spawnSync(
        "bun",
        ["./scripts/audit-canonical-page-surface.ts", "--repo-root", repoRoot],
        {
          cwd: process.cwd(),
          encoding: "utf8",
        },
      );

      expect(result.status).toBe(0);
      expect(result.stdout ?? "").toContain("Canonical page PR-surface audit");
      expect(result.stdout ?? "").toContain(
        "Page scope: src/content/docs/modules/example-page (module.example-page)",
      );
      expect(result.stdout ?? "").toContain("Budget status: over-budget");
      expect(result.stdout ?? "").toContain(
        "src/content/docs/modules/example-page/page.mdx -> page-owned (matching page bundle)",
      );
      expect(result.stdout ?? "").toContain(
        "src/lib/content/generated/runtime.generated.ts -> declared generated output (generated artifact/runtime churn)",
      );
      expect(result.stdout ?? "").toContain(
        "src/tests/ci/example-surface.test.ts -> shared hotspot surface [shared test/verification]",
      );
      expect(result.stdout ?? "").toContain(
        "Recommended action: redirect-to-throughput-prd",
      );
      expect(result.stdout ?? "").toContain(
        "This branch crosses known shared conflict surfaces and should be redirected out of the routine canonical-page lane.",
      );
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
  });

  test("fails clearly when the changed-file set does not identify one page scope", () => {
    const result = spawnSync(
      "bun",
      [
        "./scripts/audit-canonical-page-surface.ts",
        "--files",
        "src/tests/ci/example-surface.test.ts",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr ?? "").toContain(
      "Canonical page PR-surface audit failed.",
    );
    expect(result.stderr ?? "").toContain(
      "Unable to infer a canonical page scope from the changed files.",
    );
  });

  test("accepts --page-dir after --files without treating flags as changed paths", () => {
    const result = spawnSync(
      "bun",
      [
        "./scripts/audit-canonical-page-surface.ts",
        "--repo-root",
        process.cwd(),
        "--files",
        "src/content/docs/modules/grouped-query-attention/page.mdx",
        "src/content/registry/modules/grouped-query-attention.json",
        "--page-dir",
        "src/content/docs/modules/grouped-query-attention",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout ?? "").not.toContain("--page-dir");
    expect(result.stdout ?? "").toContain(
      "Changed paths: explicit changed-file set",
    );
  });

  test("prints a visible exception reason for a narrow shared-surface exception", () => {
    const result = spawnSync(
      "bun",
      [
        "./scripts/audit-canonical-page-surface.ts",
        "--repo-root",
        process.cwd(),
        "--page-dir",
        "src/content/docs/modules/grouped-query-attention",
        "--files",
        "src/content/docs/modules/grouped-query-attention/page.mdx",
        "src/lib/content/slug-utils.ts",
        "--exception-reason",
        "One shared helper update is required to publish the page.",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout ?? "").toContain(
      "Recommended action: declare-exception",
    );
    expect(result.stdout ?? "").toContain(
      "Visible exception: One shared helper update is required to publish the page.",
    );
    expect(result.stdout ?? "").toContain("Visible exception declared:");
  });
});
