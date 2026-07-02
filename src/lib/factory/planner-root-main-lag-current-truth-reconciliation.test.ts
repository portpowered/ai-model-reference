import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  captureRootMainLagGitTruth,
  classifyRootMainLagNoteAlignment,
  classifyRootRemoteRelationship,
  compareQueueStateAndPlannerReportsAgainstGitTruth,
  decideRootMainLagReconciliationOutcome,
  formatRootMainLagCurrentTruthHandoff,
  mapBranchDriftToRootRemoteRelationship,
  performRootMainLagReconciliation,
  ROOT_MAIN_LAG_CURRENT_TRUTH_RECONCILIATION_HEADER,
  ROOT_MAIN_LAG_CURRENT_TRUTH_RESOLUTION_END_MARKER,
  ROOT_MAIN_LAG_CURRENT_TRUTH_RESOLUTION_START_MARKER,
  textClaimsCurrentRootMainLag,
  textContainsRootMainLagStaleMarker,
  upsertRootMainLagCurrentTruthResolutionSection,
} from "@/lib/factory/planner-root-main-lag-current-truth-reconciliation";

const FIXTURE_DIR = join(
  import.meta.dir,
  "../../tests/fixtures/planner-root-main-lag-current-truth-reconciliation",
);

function readFixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf8");
}

function alignedGitTruth(): ReturnType<typeof captureRootMainLagGitTruth> {
  return captureRootMainLagGitTruth({
    repoRoot: "/repo/root",
    remoteBaseRef: "origin/main",
    statusOutput: "",
    runGit: (_repoRoot, args) => {
      if (args[0] === "rev-parse" && args[1] === "HEAD") {
        return {
          status: 0,
          stdout: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n",
          stderr: "",
        };
      }
      if (args[0] === "rev-parse" && args[1] === "origin/main") {
        return {
          status: 0,
          stdout: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n",
          stderr: "",
        };
      }
      if (args[0] === "symbolic-ref") {
        return { status: 0, stdout: "main\n", stderr: "" };
      }
      if (args[0] === "rev-list") {
        return { status: 0, stdout: "0\t0\n", stderr: "" };
      }
      return { status: 0, stdout: "", stderr: "" };
    },
  });
}

const MUTATING_GIT_COMMANDS = new Set([
  "add",
  "checkout",
  "clean",
  "commit",
  "merge",
  "pull",
  "push",
  "rebase",
  "reset",
  "restore",
  "revert",
  "rm",
  "stash",
  "update-index",
  "update-ref",
  "write-tree",
]);

function runGit(repoRoot: string, args: string[]): void {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  expect(result.status).toBe(0);
}

function createFixtureRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "root-main-lag-git-truth-"));
  const repoRoot = join(dir, "repo");

  mkdirSync(repoRoot, { recursive: true });
  runGit(repoRoot, ["init", "-b", "main"]);
  runGit(repoRoot, ["config", "user.email", "planner-tests@example.com"]);
  runGit(repoRoot, ["config", "user.name", "Planner Tests"]);
  writeFileSync(join(repoRoot, "README.md"), "# fixture\n");
  runGit(repoRoot, ["add", "README.md"]);
  runGit(repoRoot, ["commit", "-m", "initial"]);

  return repoRoot;
}

describe("mapBranchDriftToRootRemoteRelationship", () => {
  test("maps up-to-date drift to aligned", () => {
    expect(mapBranchDriftToRootRemoteRelationship("up-to-date")).toBe(
      "aligned",
    );
    expect(mapBranchDriftToRootRemoteRelationship("behind")).toBe("behind");
    expect(mapBranchDriftToRootRemoteRelationship("ahead")).toBe("ahead");
    expect(mapBranchDriftToRootRemoteRelationship("diverged")).toBe("diverged");
    expect(mapBranchDriftToRootRemoteRelationship("unknown")).toBe("unknown");
  });
});

describe("captureRootMainLagGitTruth", () => {
  test("records clean aligned root checkout with reviewer-verifiable commit identities", () => {
    const repoRoot = createFixtureRepo();
    try {
      runGit(repoRoot, ["update-ref", "refs/remotes/origin/main", "HEAD"]);

      const evidence = captureRootMainLagGitTruth({
        repoRoot,
        remoteBaseRef: "origin/main",
        statusOutput: "",
      });

      expect(evidence.worktreeCleanliness).toBe("clean");
      expect(evidence.dirtyPathCount).toBe(0);
      expect(evidence.remoteRelationship).toBe("aligned");
      expect(evidence.commitsAheadOfRemote).toBe(0);
      expect(evidence.commitsBehindRemote).toBe(0);
      expect(evidence.currentBranch).toBe("main");
      expect(evidence.headCommit.sha).toHaveLength(40);
      expect(evidence.remoteMainCommit.sha).toBe(evidence.headCommit.sha);
      expect(evidence.headCommit.shortSha).toBe(
        evidence.headCommit.sha.slice(0, 7),
      );
      expect(evidence.remoteMainCommit.shortSha).toBe(
        evidence.remoteMainCommit.sha.slice(0, 7),
      );
    } finally {
      rmSync(join(repoRoot, ".."), { recursive: true, force: true });
    }
  });

  test("records clean behind relationship when origin/main is ahead of HEAD", () => {
    const repoRoot = createFixtureRepo();
    try {
      const behindHead = spawnSync("git", ["rev-parse", "HEAD"], {
        cwd: repoRoot,
        encoding: "utf8",
      }).stdout.trim();
      writeFileSync(join(repoRoot, "ahead-on-remote.md"), "remote\n");
      runGit(repoRoot, ["add", "ahead-on-remote.md"]);
      runGit(repoRoot, ["commit", "-m", "ahead on remote"]);
      const originMainSha = spawnSync("git", ["rev-parse", "HEAD"], {
        cwd: repoRoot,
        encoding: "utf8",
      }).stdout.trim();
      runGit(repoRoot, ["reset", "--hard", behindHead]);
      runGit(repoRoot, [
        "update-ref",
        "refs/remotes/origin/main",
        originMainSha,
      ]);

      const evidence = captureRootMainLagGitTruth({
        repoRoot,
        remoteBaseRef: "origin/main",
        statusOutput: "",
      });

      expect(evidence.worktreeCleanliness).toBe("clean");
      expect(evidence.remoteRelationship).toBe("behind");
      expect(evidence.commitsBehindRemote).toBe(1);
      expect(evidence.commitsAheadOfRemote).toBe(0);
      expect(evidence.headCommit.sha).toBe(behindHead);
      expect(evidence.remoteMainCommit.sha).toBe(originMainSha);
    } finally {
      rmSync(join(repoRoot, ".."), { recursive: true, force: true });
    }
  });

  test("records dirty checkout separately from remote relationship", () => {
    const repoRoot = createFixtureRepo();
    try {
      runGit(repoRoot, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
      writeFileSync(join(repoRoot, "local-edit.md"), "dirty\n");

      const evidence = captureRootMainLagGitTruth({
        repoRoot,
        remoteBaseRef: "origin/main",
        statusOutput: "?? local-edit.md",
      });

      expect(evidence.worktreeCleanliness).toBe("dirty");
      expect(evidence.dirtyPathCount).toBe(1);
      expect(evidence.remoteRelationship).toBe("aligned");
    } finally {
      rmSync(join(repoRoot, ".."), { recursive: true, force: true });
    }
  });

  test("records diverged relationship when both sides have unique commits", () => {
    const repoRoot = createFixtureRepo();
    try {
      runGit(repoRoot, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
      writeFileSync(join(repoRoot, "local.md"), "local\n");
      runGit(repoRoot, ["add", "local.md"]);
      runGit(repoRoot, ["commit", "-m", "local commit"]);
      const localHead = spawnSync("git", ["rev-parse", "HEAD"], {
        cwd: repoRoot,
        encoding: "utf8",
      }).stdout.trim();
      runGit(repoRoot, ["checkout", "main"]);
      runGit(repoRoot, ["reset", "--hard", "HEAD~1"]);
      writeFileSync(join(repoRoot, "remote.md"), "remote\n");
      runGit(repoRoot, ["add", "remote.md"]);
      runGit(repoRoot, ["commit", "-m", "remote commit"]);
      const originMainSha = spawnSync("git", ["rev-parse", "HEAD"], {
        cwd: repoRoot,
        encoding: "utf8",
      }).stdout.trim();
      runGit(repoRoot, ["checkout", localHead]);
      runGit(repoRoot, [
        "update-ref",
        "refs/remotes/origin/main",
        originMainSha,
      ]);

      const evidence = captureRootMainLagGitTruth({
        repoRoot,
        remoteBaseRef: "origin/main",
        statusOutput: "",
      });

      expect(evidence.remoteRelationship).toBe("diverged");
      expect(evidence.commitsAheadOfRemote).toBe(1);
      expect(evidence.commitsBehindRemote).toBe(1);
    } finally {
      rmSync(join(repoRoot, ".."), { recursive: true, force: true });
    }
  });

  test("does not invoke mutating git commands while collecting truth", () => {
    const repoRoot = createFixtureRepo();
    try {
      runGit(repoRoot, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
      const invokedGitCommands: string[][] = [];

      captureRootMainLagGitTruth({
        repoRoot,
        remoteBaseRef: "origin/main",
        statusOutput: "",
        runGit: (_repoRoot, args) => {
          invokedGitCommands.push([...args]);
          return spawnSync("git", [...args], {
            cwd: repoRoot,
            encoding: "utf8",
          });
        },
        runGitStatus: () => "",
      });

      expect(invokedGitCommands.length).toBeGreaterThan(0);
      for (const args of invokedGitCommands) {
        expect(MUTATING_GIT_COMMANDS.has(args[0] ?? "")).toBe(false);
      }
    } finally {
      rmSync(join(repoRoot, ".."), { recursive: true, force: true });
    }
  });
});

describe("formatRootMainLagCurrentTruthHandoff", () => {
  test("formats reviewer-verifiable git truth for planners", () => {
    const handoff = performRootMainLagReconciliation({
      generatedAtUtc: "2026-07-02T20:15:00.000Z",
      repoRoot: "/repo/root",
      remoteBaseRef: "origin/main",
      statusOutput: "",
      runGit: (_repoRoot, args) => {
        if (args[0] === "rev-parse" && args[1] === "HEAD") {
          return {
            status: 0,
            stdout: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n",
            stderr: "",
          };
        }
        if (args[0] === "rev-parse" && args[1] === "origin/main") {
          return {
            status: 0,
            stdout: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n",
            stderr: "",
          };
        }
        if (args[0] === "symbolic-ref") {
          return { status: 0, stdout: "main\n", stderr: "" };
        }
        if (args[0] === "rev-list") {
          return { status: 0, stdout: "2\t0\n", stderr: "" };
        }
        return { status: 0, stdout: "", stderr: "" };
      },
    });

    const formatted = formatRootMainLagCurrentTruthHandoff(handoff);
    expect(formatted).toContain(
      ROOT_MAIN_LAG_CURRENT_TRUTH_RECONCILIATION_HEADER,
    );
    expect(formatted).toContain("generated-at-utc=2026-07-02T20:15:00.000Z");
    expect(formatted).toContain("- root-git-truth");
    expect(formatted).toContain("worktree=clean dirty-paths=0");
    expect(formatted).toContain(
      "head=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa short=aaaaaaa",
    );
    expect(formatted).toContain(
      "remote-base-ref=origin/main sha=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb short=bbbbbbb",
    );
    expect(formatted).toContain("relationship=behind(ahead=0,behind=2)");
    expect(formatted).toContain("- queue-planner-comparison");
    expect(formatted).toContain("queue-state=unavailable");
    expect(formatted).toContain("- reconciliation-outcome");
    expect(formatted).toContain("kind=root-sync-handoff");
  });
});

describe("compareQueueStateAndPlannerReportsAgainstGitTruth", () => {
  test("flags queue records that still treat stale lag as current when git is aligned", () => {
    const comparison = compareQueueStateAndPlannerReportsAgainstGitTruth(
      alignedGitTruth(),
      {
        workListJsonText: readFixture("stale-current-lag-work-list.json"),
      },
    );

    expect(comparison.queueStateAvailability).toBe("available");
    expect(comparison.noteRecords).toHaveLength(1);
    expect(comparison.noteRecords[0]?.alignment).toBe(
      "stale-root-lag-reference",
    );
    expect(comparison.operationalSummary).toContain("still treat");
  });

  test("treats historical queue notes as already resolved against aligned git", () => {
    const comparison = compareQueueStateAndPlannerReportsAgainstGitTruth(
      alignedGitTruth(),
      {
        workListJsonText: readFixture("historical-lag-work-list.json"),
      },
    );

    expect(comparison.noteRecords[0]?.alignment).toBe(
      "already-resolved-condition",
    );
    expect(comparison.operationalSummary).not.toContain("still treat");
  });

  test("flags planner reports that claim current stale lag against aligned git", () => {
    const comparison = compareQueueStateAndPlannerReportsAgainstGitTruth(
      alignedGitTruth(),
      {
        plannerReports: [
          {
            path: "fixture/stale-current-lag-planner-report.md",
            text: readFixture("stale-current-lag-planner-report.md"),
          },
        ],
      },
    );

    expect(comparison.noteRecords[0]?.alignment).toBe(
      "stale-root-lag-reference",
    );
    expect(comparison.operationalSummary).toContain(
      "fixture/stale-current-lag-planner-report.md",
    );
  });

  test("marks unavailable queue state without running the factory runtime", () => {
    const comparison = compareQueueStateAndPlannerReportsAgainstGitTruth(
      alignedGitTruth(),
      {
        plannerReports: [
          {
            path: "fixture/historical-lag-planner-report.md",
            text: readFixture("historical-lag-planner-report.md"),
          },
        ],
      },
    );

    expect(comparison.queueStateAvailability).toBe("unavailable");
    expect(comparison.noteRecords[0]?.alignment).toBe(
      "already-resolved-condition",
    );
  });

  test("detects conflicting behind counts between notes and live git", () => {
    const gitTruth = captureRootMainLagGitTruth({
      repoRoot: "/repo/root",
      remoteBaseRef: "origin/main",
      statusOutput: "",
      runGit: (_repoRoot, args) => {
        if (args[0] === "rev-parse") {
          return {
            status: 0,
            stdout: "cccccccccccccccccccccccccccccccccccccccc\n",
            stderr: "",
          };
        }
        if (args[0] === "symbolic-ref") {
          return { status: 0, stdout: "main\n", stderr: "" };
        }
        if (args[0] === "rev-list") {
          return { status: 0, stdout: "0\t5\n", stderr: "" };
        }
        return { status: 0, stdout: "", stderr: "" };
      },
    });

    const comparison = compareQueueStateAndPlannerReportsAgainstGitTruth(
      gitTruth,
      {
        workListJsonText: readFixture("stale-current-lag-work-list.json"),
      },
    );

    expect(comparison.noteRecords[0]?.alignment).toBe(
      "conflicting-current-condition",
    );
  });
});

describe("root main lag stale marker helpers", () => {
  test("detects stale lag markers and current-state claims", () => {
    expect(
      textContainsRootMainLagStaleMarker(
        "Root checkout is currently 17 commits behind origin/main.",
      ),
    ).toBe(true);
    expect(
      textClaimsCurrentRootMainLag(
        "Root checkout is currently 17 commits behind origin/main.",
      ),
    ).toBe(true);
    expect(
      textClaimsCurrentRootMainLag(
        "Root checkout was 17 commits behind origin/main at 2026-07-02T19:01Z.",
      ),
    ).toBe(false);
  });

  test("classifies note alignment against aligned git truth", () => {
    const gitTruth = alignedGitTruth();
    expect(
      classifyRootMainLagNoteAlignment(
        gitTruth,
        "Root checkout is currently 17 commits behind origin/main.",
      ),
    ).toBe("stale-root-lag-reference");
    expect(
      classifyRootMainLagNoteAlignment(
        gitTruth,
        readFixture("historical-lag-planner-report.md"),
      ),
    ).toBe("already-resolved-condition");
  });
});

describe("classifyRootRemoteRelationship", () => {
  test("returns unknown when rev-list fails", () => {
    const relationship = classifyRootRemoteRelationship(
      "/repo",
      "origin/main",
      () => ({
        status: 1,
        stdout: "",
        stderr: "missing ref",
      }),
    );

    expect(relationship).toEqual({
      commitsAheadOfRemote: 0,
      commitsBehindRemote: 0,
      remoteRelationship: "unknown",
    });
  });
});

describe("decideRootMainLagReconciliationOutcome", () => {
  test("chooses root-sync-handoff for a clean root that is behind origin/main", () => {
    const gitTruth = captureRootMainLagGitTruth({
      repoRoot: "/repo/root",
      remoteBaseRef: "origin/main",
      statusOutput: "",
      runGit: (_repoRoot, args) => {
        if (args[0] === "rev-parse" && args[1] === "HEAD") {
          return {
            status: 0,
            stdout: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n",
            stderr: "",
          };
        }
        if (args[0] === "rev-parse" && args[1] === "origin/main") {
          return {
            status: 0,
            stdout: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n",
            stderr: "",
          };
        }
        if (args[0] === "symbolic-ref") {
          return { status: 0, stdout: "main\n", stderr: "" };
        }
        if (args[0] === "rev-list") {
          return { status: 0, stdout: "2\t0\n", stderr: "" };
        }
        return { status: 0, stdout: "", stderr: "" };
      },
    });
    const comparison = compareQueueStateAndPlannerReportsAgainstGitTruth(
      gitTruth,
      {},
    );

    const outcome = decideRootMainLagReconciliationOutcome(
      gitTruth,
      comparison,
    );

    expect(outcome.kind).toBe("root-sync-handoff");
    expect(outcome.rootSyncBeforeHead?.sha).toBe(
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
  });

  test("chooses stale-state-note-update when aligned root still has current stale lag notes", () => {
    const gitTruth = alignedGitTruth();
    const comparison = compareQueueStateAndPlannerReportsAgainstGitTruth(
      gitTruth,
      {
        plannerReports: [
          {
            path: "fixture/stale-current-lag-planner-report.md",
            text: readFixture("stale-current-lag-planner-report.md"),
          },
        ],
      },
    );

    const outcome = decideRootMainLagReconciliationOutcome(
      gitTruth,
      comparison,
    );

    expect(outcome.kind).toBe("stale-state-note-update");
    expect(outcome.staleNotesCorrected).toContain(
      "fixture/stale-current-lag-planner-report.md",
    );
  });

  test("chooses explicit-no-update when planner notes conflict with live git", () => {
    const gitTruth = captureRootMainLagGitTruth({
      repoRoot: "/repo/root",
      remoteBaseRef: "origin/main",
      statusOutput: "",
      runGit: (_repoRoot, args) => {
        if (args[0] === "rev-parse") {
          return {
            status: 0,
            stdout: "cccccccccccccccccccccccccccccccccccccccc\n",
            stderr: "",
          };
        }
        if (args[0] === "symbolic-ref") {
          return { status: 0, stdout: "main\n", stderr: "" };
        }
        if (args[0] === "rev-list") {
          return { status: 0, stdout: "0\t5\n", stderr: "" };
        }
        return { status: 0, stdout: "", stderr: "" };
      },
    });
    const comparison = compareQueueStateAndPlannerReportsAgainstGitTruth(
      gitTruth,
      {
        workListJsonText: readFixture("stale-current-lag-work-list.json"),
      },
    );

    const outcome = decideRootMainLagReconciliationOutcome(
      gitTruth,
      comparison,
    );

    expect(outcome.kind).toBe("explicit-no-update");
    expect(outcome.noUpdateReason).toContain("conflict");
  });

  test("chooses explicit-no-update for dirty root worktrees", () => {
    const gitTruth = captureRootMainLagGitTruth({
      repoRoot: "/repo/root",
      remoteBaseRef: "origin/main",
      statusOutput: "?? local-edit.md",
      runGit: (_repoRoot, args) => {
        if (args[0] === "rev-parse") {
          return {
            status: 0,
            stdout: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n",
            stderr: "",
          };
        }
        if (args[0] === "symbolic-ref") {
          return { status: 0, stdout: "main\n", stderr: "" };
        }
        if (args[0] === "rev-list") {
          return { status: 0, stdout: "0\t2\n", stderr: "" };
        }
        return { status: 0, stdout: "", stderr: "" };
      },
    });
    const comparison = compareQueueStateAndPlannerReportsAgainstGitTruth(
      gitTruth,
      {},
    );

    const outcome = decideRootMainLagReconciliationOutcome(
      gitTruth,
      comparison,
    );

    expect(outcome.kind).toBe("explicit-no-update");
    expect(outcome.noUpdateReason).toContain("dirty");
  });

  test("chooses explicit-no-update when root already reflects current truth", () => {
    const gitTruth = alignedGitTruth();
    const comparison = compareQueueStateAndPlannerReportsAgainstGitTruth(
      gitTruth,
      {
        plannerReports: [
          {
            path: "fixture/historical-lag-planner-report.md",
            text: readFixture("historical-lag-planner-report.md"),
          },
        ],
      },
    );

    const outcome = decideRootMainLagReconciliationOutcome(
      gitTruth,
      comparison,
    );

    expect(outcome.kind).toBe("explicit-no-update");
    expect(outcome.noUpdateReason).toBe("root already reflects current truth");
    expect(outcome.staleNotesRetired.length).toBeGreaterThan(0);
  });
});

describe("performRootMainLagReconciliation", () => {
  test("fast-forwards a clean behind root and records before and after commit identities", () => {
    const repoRoot = createFixtureRepo();
    try {
      const behindHead = spawnSync("git", ["rev-parse", "HEAD"], {
        cwd: repoRoot,
        encoding: "utf8",
      }).stdout.trim();
      writeFileSync(join(repoRoot, "ahead-on-remote.md"), "remote\n");
      runGit(repoRoot, ["add", "ahead-on-remote.md"]);
      runGit(repoRoot, ["commit", "-m", "ahead on remote"]);
      const originMainSha = spawnSync("git", ["rev-parse", "HEAD"], {
        cwd: repoRoot,
        encoding: "utf8",
      }).stdout.trim();
      runGit(repoRoot, ["reset", "--hard", behindHead]);
      runGit(repoRoot, [
        "update-ref",
        "refs/remotes/origin/main",
        originMainSha,
      ]);

      const handoff = performRootMainLagReconciliation({
        apply: true,
        generatedAtUtc: "2026-07-02T21:00:00.000Z",
        repoRoot,
        remoteBaseRef: "origin/main",
        statusOutput: "",
      });

      expect(handoff.outcome?.kind).toBe("root-sync-handoff");
      expect(handoff.outcome?.applyStatus).toBe("applied");
      expect(handoff.outcome?.rootSyncBeforeHead?.sha).toBe(behindHead);
      expect(handoff.outcome?.rootSyncAfterHead?.sha).toBe(originMainSha);
      expect(handoff.gitTruth.headCommit.sha).toBe(originMainSha);
      expect(handoff.gitTruth.remoteRelationship).toBe("aligned");
    } finally {
      rmSync(join(repoRoot, ".."), { recursive: true, force: true });
    }
  });

  test("records explicit no-update for aligned root without mutating git", () => {
    const repoRoot = createFixtureRepo();
    const plannerReportPath = join(
      repoRoot,
      "docs/internal/processes/root-main-lag-current-truth-reconciliation-relevant-files.md",
    );
    try {
      runGit(repoRoot, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
      mkdirSync(join(repoRoot, "docs/internal/processes"), { recursive: true });
      writeFileSync(
        plannerReportPath,
        "# Root lag\n\n## Boundaries\n\n- Do not run you.\n",
        "utf8",
      );

      const invokedGitCommands: string[][] = [];
      const handoff = performRootMainLagReconciliation({
        apply: true,
        generatedAtUtc: "2026-07-02T21:05:00.000Z",
        plannerReportPath:
          "docs/internal/processes/root-main-lag-current-truth-reconciliation-relevant-files.md",
        repoRoot,
        remoteBaseRef: "origin/main",
        statusOutput: "",
        runGit: (_root, args) => {
          invokedGitCommands.push([...args]);
          return spawnSync("git", [...args], {
            cwd: repoRoot,
            encoding: "utf8",
          });
        },
      });

      expect(handoff.outcome?.kind).toBe("explicit-no-update");
      expect(handoff.outcome?.applyStatus).toBe("applied");
      expect(invokedGitCommands.some((args) => args[0] === "merge")).toBe(
        false,
      );

      const updatedReport = readFileSync(plannerReportPath, "utf8");
      expect(updatedReport).toContain(
        ROOT_MAIN_LAG_CURRENT_TRUTH_RESOLUTION_START_MARKER,
      );
      expect(updatedReport).toContain("root already reflects current truth");
    } finally {
      rmSync(join(repoRoot, ".."), { recursive: true, force: true });
    }
  });
});

describe("upsertRootMainLagCurrentTruthResolutionSection", () => {
  test("replaces an existing resolution section idempotently", () => {
    const original = [
      "# Root lag",
      "",
      "## Current truth resolution",
      "",
      ROOT_MAIN_LAG_CURRENT_TRUTH_RESOLUTION_START_MARKER,
      "old",
      ROOT_MAIN_LAG_CURRENT_TRUTH_RESOLUTION_END_MARKER,
      "",
      "## Boundaries",
      "",
      "- Do not run you.",
      "",
    ].join("\n");
    const replacement = [
      "## Current truth resolution",
      "",
      ROOT_MAIN_LAG_CURRENT_TRUTH_RESOLUTION_START_MARKER,
      "new",
      ROOT_MAIN_LAG_CURRENT_TRUTH_RESOLUTION_END_MARKER,
      "",
    ].join("\n");

    const updated = upsertRootMainLagCurrentTruthResolutionSection(
      original,
      replacement,
    );

    expect(updated).toContain("new");
    expect(updated).not.toContain("old");
    expect(updated).toContain("## Boundaries");
  });
});
