import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildRootMainLagCurrentTruthHandoff,
  captureRootMainLagGitTruth,
  classifyRootRemoteRelationship,
  formatRootMainLagCurrentTruthHandoff,
  mapBranchDriftToRootRemoteRelationship,
  ROOT_MAIN_LAG_CURRENT_TRUTH_RECONCILIATION_HEADER,
} from "@/lib/factory/planner-root-main-lag-current-truth-reconciliation";

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
    const handoff = buildRootMainLagCurrentTruthHandoff({
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
