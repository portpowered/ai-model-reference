import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function runGit(repoRoot: string, args: string[]): void {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  expect(result.status).toBe(0);
}

describe("planner-root-checkout-reconciliation script", () => {
  test("classifies remote-present local deletions from live git fixture without mutating state", () => {
    const dir = mkdtempSync(
      join(tmpdir(), "planner-root-checkout-reconciliation-"),
    );
    const repoRoot = join(dir, "repo");

    mkdirSync(repoRoot, { recursive: true });
    runGit(repoRoot, ["init", "-b", "main"]);
    runGit(repoRoot, ["config", "user.email", "planner-tests@example.com"]);
    runGit(repoRoot, ["config", "user.name", "Planner Tests"]);

    mkdirSync(join(repoRoot, "src", "content", "docs", "models", "clip"), {
      recursive: true,
    });
    mkdirSync(
      join(
        repoRoot,
        "src",
        "content",
        "docs",
        "training",
        "diffusion-training-objective",
      ),
      { recursive: true },
    );
    mkdirSync(join(repoRoot, "src", "lib", "factory"), { recursive: true });
    mkdirSync(join(repoRoot, "src", "content", "registry", "models"), {
      recursive: true,
    });

    writeFileSync(
      join(repoRoot, "src", "content", "docs", "models", "clip", "page.mdx"),
      "# clip\n",
    );
    writeFileSync(
      join(
        repoRoot,
        "src",
        "content",
        "docs",
        "training",
        "diffusion-training-objective",
        "page.mdx",
      ),
      "# diffusion\n",
    );
    writeFileSync(
      join(repoRoot, "src", "content", "registry", "models", "clip.json"),
      "{}\n",
    );
    writeFileSync(
      join(repoRoot, "src", "lib", "factory", "root.ts"),
      "export const rootValue = 1;\n",
    );
    runGit(repoRoot, ["add", "."]);
    runGit(repoRoot, ["commit", "-m", "initial"]);

    runGit(repoRoot, ["branch", "origin-main"]);
    runGit(repoRoot, ["update-ref", "refs/remotes/origin/main", "origin-main"]);

    runGit(repoRoot, [
      "rm",
      "src/content/docs/models/clip/page.mdx",
      "src/content/docs/training/diffusion-training-objective/page.mdx",
      "src/content/registry/models/clip.json",
    ]);
    writeFileSync(
      join(repoRoot, "src", "lib", "factory", "root.ts"),
      "export const rootValue = 2;\n",
    );

    const statusBefore = spawnSync("git", ["status", "--porcelain"], {
      cwd: repoRoot,
      encoding: "utf8",
    }).stdout;

    const result = spawnSync(
      "bun",
      [
        "./scripts/report-planner-root-checkout-reconciliation.ts",
        "--repo-root",
        repoRoot,
        "--remote-base-ref",
        "origin/main",
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Planner Root Checkout Reconciliation");
    expect(result.stdout).toContain(
      "remote-base-ref=origin/main root-dirty-paths=4 remote-present-deletions=3 manual-inspection=1",
    );
    expect(result.stdout).toContain(
      "path=src/content/docs/models/clip/page.mdx",
    );
    expect(result.stdout).toContain("change=deleted");
    expect(result.stdout).toContain("evidence=present-on-origin-main");
    expect(result.stdout).toContain(
      "classification=ownerless-root-checkout-drift",
    );
    expect(result.stdout).toContain(
      "path=src/content/docs/training/diffusion-training-objective/page.mdx",
    );
    expect(result.stdout).toContain(
      "path=src/content/registry/models/clip.json",
    );
    expect(result.stdout).toContain("path=src/lib/factory/root.ts");
    expect(result.stdout).toContain("change=modified");
    expect(result.stdout).toContain("classification=manual-inspection");
    expect(result.stdout).toContain(
      "guidance=Review each manual-inspection path for ownership; do not revert, stage, or auto-clean these paths.",
    );
    expect(result.stdout).toContain("change-kind-counts=modified=1");

    const statusAfter = spawnSync("git", ["status", "--porcelain"], {
      cwd: repoRoot,
      encoding: "utf8",
    }).stdout;
    expect(statusAfter).toBe(statusBefore);

    rmSync(dir, { recursive: true, force: true });
  });

  test("keeps local deletions absent on origin/main in manual inspection", () => {
    const dir = mkdtempSync(
      join(tmpdir(), "planner-root-checkout-reconciliation-"),
    );
    const repoRoot = join(dir, "repo");

    mkdirSync(repoRoot, { recursive: true });
    runGit(repoRoot, ["init", "-b", "main"]);
    runGit(repoRoot, ["config", "user.email", "planner-tests@example.com"]);
    runGit(repoRoot, ["config", "user.name", "Planner Tests"]);

    mkdirSync(join(repoRoot, "src", "content", "docs", "models", "clip"), {
      recursive: true,
    });
    writeFileSync(
      join(repoRoot, "src", "content", "docs", "models", "clip", "page.mdx"),
      "# clip\n",
    );
    runGit(repoRoot, ["add", "."]);
    runGit(repoRoot, ["commit", "-m", "initial"]);

    runGit(repoRoot, ["branch", "origin-main"]);
    runGit(repoRoot, ["update-ref", "refs/remotes/origin/main", "origin-main"]);

    writeFileSync(
      join(repoRoot, "src", "content", "docs", "models", "clip", "extra.mdx"),
      "# extra\n",
    );
    runGit(repoRoot, ["add", "src/content/docs/models/clip/extra.mdx"]);
    runGit(repoRoot, ["commit", "-m", "add extra"]);
    runGit(repoRoot, ["rm", "src/content/docs/models/clip/extra.mdx"]);

    const result = spawnSync(
      "bun",
      [
        "./scripts/report-planner-root-checkout-reconciliation.ts",
        "--repo-root",
        repoRoot,
        "--remote-base-ref",
        "origin/main",
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "remote-present-deletions=0 manual-inspection=1",
    );
    expect(result.stdout).toContain(
      "path=src/content/docs/models/clip/extra.mdx",
    );
    expect(result.stdout).toContain("change=deleted");
    expect(result.stdout).toContain("comparison-target=origin/main");
    expect(result.stdout).toContain("evidence=absent-on-origin-main");
    expect(result.stdout).toContain("classification=manual-inspection");

    rmSync(dir, { recursive: true, force: true });
  });
});
