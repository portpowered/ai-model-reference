import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TARGET_SESSION_ID = "0fdc5077-95ed-4396-a183-06e5b16555ca";

interface DriftRepairFixture {
  cleanup: () => void;
  repoRoot: string;
  workListPath: string;
  sessionListPath: string;
  worktreesRoot: string;
}

interface PrMetadataRefreshFixture {
  cleanup: () => void;
  workListPath: string;
  sessionListPath: string;
  prMapPath: string;
  worktreesRoot: string;
}

function runGit(repoRoot: string, args: string[]): void {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
}

function writeLaneMetadata(
  worktreesRoot: string,
  worktreeName: string,
  metadata: Record<string, unknown>,
): void {
  const metadataDir = join(worktreesRoot, worktreeName, ".claude");
  mkdirSync(metadataDir, { recursive: true });
  writeFileSync(
    join(metadataDir, "lane-metadata.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
  );
}

function createWorktree(
  worktreesRoot: string,
  worktreeName: string,
  branchName: string,
): void {
  const worktreePath = join(worktreesRoot, worktreeName);
  mkdirSync(worktreePath, { recursive: true });
  writeFileSync(
    join(worktreePath, "prd.json"),
    JSON.stringify({ branchName }, null, 2),
  );
}

function runScript(args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync("bun", args, { cwd: process.cwd(), encoding: "utf8" });
}

function readStdoutText(result: ReturnType<typeof spawnSync>): string {
  return typeof result.stdout === "string"
    ? result.stdout
    : result.stdout.toString("utf8");
}

function createDriftRepairFixture(): DriftRepairFixture {
  const dir = mkdtempSync(join(tmpdir(), "planner-root-drift-repair-"));
  const repoRoot = join(dir, "repo");
  const worktreesRoot = join(repoRoot, ".claude", "worktrees");
  const workListPath = join(dir, "work-list.json");
  const sessionListPath = join(dir, "session-list.json");

  mkdirSync(repoRoot, { recursive: true });
  runGit(repoRoot, ["init", "-b", "main"]);
  runGit(repoRoot, ["config", "user.email", "planner-tests@example.com"]);
  runGit(repoRoot, ["config", "user.name", "Planner Tests"]);

  mkdirSync(join(repoRoot, "src/content/modules"), { recursive: true });
  mkdirSync(join(repoRoot, "src/lib/content"), { recursive: true });
  writeFileSync(join(repoRoot, "package.json"), '{\n  "name": "fixture"\n}\n');
  writeFileSync(
    join(repoRoot, "src/content/modules/cross-attention.mdx"),
    "# cross-attention\n",
  );
  writeFileSync(
    join(repoRoot, "src/lib/content/cross-attention.test.ts"),
    "export {}\n",
  );
  runGit(repoRoot, ["add", "."]);
  runGit(repoRoot, ["commit", "-m", "initial"]);

  runGit(repoRoot, ["checkout", "-b", "cross-attention-module-page"]);
  writeFileSync(
    join(repoRoot, "src/lib/content/cross-attention.test.ts"),
    "export const lane = true;\n",
  );
  runGit(repoRoot, ["add", "src/lib/content/cross-attention.test.ts"]);
  runGit(repoRoot, ["commit", "-m", "cross-attention lane work"]);

  runGit(repoRoot, ["checkout", "main"]);
  runGit(repoRoot, [
    "merge",
    "--no-ff",
    "cross-attention-module-page",
    "-m",
    "Merge pull request #182 from cross-attention-module-page",
  ]);

  mkdirSync(worktreesRoot, { recursive: true });
  runGit(repoRoot, [
    "worktree",
    "add",
    join(worktreesRoot, "cross-attention-module-page"),
    "cross-attention-module-page",
  ]);
  runGit(repoRoot, [
    "worktree",
    "add",
    "-b",
    "tokens-per-second-serving-metric-page",
    join(worktreesRoot, "tokens-per-second-serving-metric-page"),
    "HEAD",
  ]);

  writeFileSync(
    join(worktreesRoot, "cross-attention-module-page", "prd.json"),
    JSON.stringify({ branchName: "cross-attention-module-page" }, null, 2),
  );
  writeFileSync(
    join(worktreesRoot, "tokens-per-second-serving-metric-page", "prd.json"),
    JSON.stringify(
      { branchName: "tokens-per-second-serving-metric-page" },
      null,
      2,
    ),
  );

  writeLaneMetadata(worktreesRoot, "cross-attention-module-page", {
    schemaVersion: 1,
    workItemName: "cross-attention-module-page",
    branchName: "cross-attention-module-page",
    branchMetadataSource: "setup",
    worktreePath: join(worktreesRoot, "cross-attention-module-page"),
    sessionId: TARGET_SESSION_ID,
    pullRequest: {
      number: 182,
      url: "https://example.com/pull/182",
    },
    createdAtUtc: "2026-06-20T21:08:34.000Z",
    refreshedAtUtc: "2026-06-20T21:08:34.000Z",
  });
  writeLaneMetadata(worktreesRoot, "tokens-per-second-serving-metric-page", {
    schemaVersion: 1,
    workItemName: "tokens-per-second-serving-metric-page",
    branchName: "tokens-per-second-serving-metric-page",
    branchMetadataSource: "setup",
    worktreePath: join(worktreesRoot, "tokens-per-second-serving-metric-page"),
    sessionId: "sess-active",
    pullRequest: {
      number: 201,
      url: "https://example.com/pull/201",
    },
    createdAtUtc: "2026-06-20T21:08:34.000Z",
    refreshedAtUtc: "2026-06-20T21:08:34.000Z",
  });

  rmSync(join(repoRoot, "src/content/modules/cross-attention.mdx"));
  writeFileSync(
    join(repoRoot, "src/lib/content/cross-attention.test.ts"),
    "export const staleRoot = true;\n",
  );
  writeFileSync(
    join(repoRoot, "package.json"),
    '{\n  "name": "fixture-dirty"\n}\n',
  );

  rmSync(
    join(
      worktreesRoot,
      "cross-attention-module-page",
      "src/content/modules/cross-attention.mdx",
    ),
  );
  writeFileSync(
    join(
      worktreesRoot,
      "cross-attention-module-page",
      "src/lib/content/cross-attention.test.ts",
    ),
    "export const staleWorktree = true;\n",
  );

  mkdirSync(
    join(
      worktreesRoot,
      "tokens-per-second-serving-metric-page",
      "docs/planner",
    ),
    { recursive: true },
  );
  writeFileSync(
    join(
      worktreesRoot,
      "tokens-per-second-serving-metric-page",
      "docs/planner/active-lane.md",
    ),
    "# active lane drift\n",
  );

  writeFileSync(
    workListPath,
    JSON.stringify({
      results: [
        {
          name: "cross-attention-module-page",
          sessionId: TARGET_SESSION_ID,
          workTypeName: "task",
          state: { name: "complete", type: "TERMINAL" },
        },
        {
          name: "tokens-per-second-serving-metric-page",
          sessionId: "sess-active",
          state: { name: "in-review", type: "PROCESSING" },
        },
      ],
    }),
  );
  writeFileSync(
    sessionListPath,
    JSON.stringify({
      sessions: [
        {
          id: "sess-active",
          workItemName: "tokens-per-second-serving-metric-page",
          status: "running",
        },
      ],
    }),
  );

  return {
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
    repoRoot,
    workListPath,
    sessionListPath,
    worktreesRoot,
  };
}

function createPrMetadataRefreshFixture(): PrMetadataRefreshFixture {
  const dir = mkdtempSync(join(tmpdir(), "planner-pr-metadata-refresh-"));
  const workListPath = join(dir, "work-list.json");
  const sessionListPath = join(dir, "session-list.json");
  const prMapPath = join(dir, "pr-map.json");
  const worktreesRoot = join(dir, ".claude", "worktrees");
  mkdirSync(worktreesRoot, { recursive: true });

  createWorktree(
    worktreesRoot,
    "tokens-per-second-serving-metric-page",
    "tokens-per-second-serving-metric-page",
  );
  writeLaneMetadata(worktreesRoot, "tokens-per-second-serving-metric-page", {
    schemaVersion: 1,
    workItemName: "tokens-per-second-serving-metric-page",
    branchName: "tokens-per-second-serving-metric-page",
    branchMetadataSource: "setup",
    worktreePath: join(worktreesRoot, "tokens-per-second-serving-metric-page"),
    sessionId: TARGET_SESSION_ID,
    pullRequest: {
      number: 201,
      url: "https://example.com/pull/201",
    },
    createdAtUtc: "2026-06-20T21:08:34.000Z",
    refreshedAtUtc: "2026-06-20T21:08:34.000Z",
    linkage: {
      branch: {
        status: "stale",
        issue: "git branch inspection failed during the last refresh",
        refreshedAtUtc: "2026-06-21T00:05:00.000Z",
      },
      pullRequest: {
        status: "stale",
        issue: "pull request lookup API returned 502",
        refreshedAtUtc: "2026-06-21T00:05:00.000Z",
      },
    },
  });

  writeFileSync(
    workListPath,
    JSON.stringify({
      items: [
        {
          name: "tokens-per-second-serving-metric-page",
          state: "active",
          sessionId: TARGET_SESSION_ID,
        },
      ],
    }),
  );
  writeFileSync(
    sessionListPath,
    JSON.stringify({
      sessions: [
        {
          id: TARGET_SESSION_ID,
          workItemName: "tokens-per-second-serving-metric-page",
          status: "running",
        },
      ],
    }),
  );
  writeFileSync(
    prMapPath,
    JSON.stringify({
      "tokens-per-second-serving-metric-page": {
        number: 201,
        headRefName: "tokens-per-second-serving-metric-page",
        mergeStateStatus: "BLOCKED",
        statusCheckRollup: [{ conclusion: "SUCCESS" }],
      },
    }),
  );

  return {
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
    workListPath,
    sessionListPath,
    prMapPath,
    worktreesRoot,
  };
}

function driftFixtureArgs(fixture: DriftRepairFixture): string[] {
  return [
    "--repo-root",
    fixture.repoRoot,
    "--work-list-json",
    fixture.workListPath,
    "--session-list-json",
    fixture.sessionListPath,
    "--worktrees-dir",
    fixture.worktreesRoot,
  ];
}

function prFixtureArgs(fixture: PrMetadataRefreshFixture): string[] {
  return [
    "--work-list-json",
    fixture.workListPath,
    "--session-list-json",
    fixture.sessionListPath,
    "--worktrees-dir",
    fixture.worktreesRoot,
    "--pr-map-json",
    fixture.prMapPath,
  ];
}

function assertRepresentativeDriftRepairOutput(stdout: string): void {
  expect(stdout).toContain("Planner Worktree Drift Watchdog");
  expect(stdout).toContain("merged-lanes=1");
  expect(stdout).toContain("- merged-lanes");
  expect(stdout).toContain("lane=cross-attention-module-page");
  expect(stdout).toContain("PR #182");
  expect(stdout).toContain(`session ${TARGET_SESSION_ID}`);
  expect(stdout).toContain(
    "risk=already-merged-root-drift path=src/content/modules/cross-attention.mdx",
  );
  expect(stdout).toContain(
    "risk=already-merged-root-drift path=src/lib/content/cross-attention.test.ts",
  );
  expect(stdout).toContain(
    "owner=already-merged-owned:cross-attention-module-page",
  );
  expect(stdout).not.toContain(
    "risk=ownerless-root-dirty-paths path=src/content/modules/cross-attention.mdx",
  );
  expect(stdout).toContain("risk=ownerless-root-dirty-paths path=package.json");
  expect(stdout).toContain("- recovery-guidance");
  expect(stdout).toContain(
    `condition=ownerless-root-dirty-paths count=1 target-session=${TARGET_SESSION_ID}`,
  );
  expect(stdout).toContain(
    "preserve-policy=Do not revert or overwrite root dirty paths as part of drift repair.",
  );
  expect(stdout).toContain(
    "next-safe-action=Investigate and preserve the root dirty paths until ownership is resolved.",
  );
  expect(stdout).toContain("ownerless-paths=package.json");
  expect(stdout).toContain(
    "- location=worktree lane=tokens-per-second-serving-metric-page",
  );
}

function assertRepresentativePrMetadataRefreshOutput(stdout: string): void {
  expect(stdout).toContain("Active PR Mergeability Watchdog");
  expect(stdout).toContain(
    "- status=pr-backed queue=active work-item=tokens-per-second-serving-metric-page",
  );
  expect(stdout).toContain("pr=#201");
  expect(stdout).toContain("mergeability=mergeable");
  expect(stdout).toContain("checks=passing");
  expect(stdout).toContain("metadata-refresh=");
  expect(stdout).not.toContain("risk=metadata-unavailable");
  expect(stdout).not.toContain("next-action=repair-token");
}

describe("planner root drift and PR metadata repair compatibility", () => {
  test("drift watchdog script reports already-merged, ownerless, and active-lane drift from fixture evidence", () => {
    const fixture = createDriftRepairFixture();

    try {
      const result = runScript([
        "./scripts/report-planner-worktree-drift-watchdog.ts",
        ...driftFixtureArgs(fixture),
      ]);

      expect(result.status).toBe(0);
      assertRepresentativeDriftRepairOutput(readStdoutText(result));
    } finally {
      fixture.cleanup();
    }
  });

  test("active PR watchdog script reports passing PR-backed metadata refresh without metadata-unavailable risk", () => {
    const fixture = createPrMetadataRefreshFixture();

    try {
      const result = runScript([
        "./scripts/active-pr-mergeability-watchdog.ts",
        ...prFixtureArgs(fixture),
      ]);

      expect(result.status).toBe(0);
      assertRepresentativePrMetadataRefreshOutput(readStdoutText(result));
    } finally {
      fixture.cleanup();
    }
  });

  test("package commands keep representative drift and PR metadata refresh output", () => {
    const driftFixture = createDriftRepairFixture();
    const prFixture = createPrMetadataRefreshFixture();

    try {
      const driftResult = runScript([
        "run",
        "report:planner-worktree-drift-watchdog",
        ...driftFixtureArgs(driftFixture),
      ]);
      const prResult = runScript([
        "run",
        "watch:active-pr-mergeability",
        ...prFixtureArgs(prFixture),
      ]);

      expect(driftResult.status).toBe(0);
      expect(prResult.status).toBe(0);
      assertRepresentativeDriftRepairOutput(readStdoutText(driftResult));
      assertRepresentativePrMetadataRefreshOutput(readStdoutText(prResult));
    } finally {
      driftFixture.cleanup();
      prFixture.cleanup();
    }
  });
});
