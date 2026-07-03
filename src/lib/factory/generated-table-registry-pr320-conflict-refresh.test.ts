import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CommandResult } from "@/lib/factory/active-pr-mergeability-watchdog";
import {
  captureGeneratedTableRegistryPr320ConflictRefreshEvidence,
  findQueueTokensForWorkItemName,
  formatGeneratedTableRegistryPr320ConflictRefreshEvidenceReport,
  PR320_CONFLICT_REFRESH_CAPTURE_POLICY,
  PR320_CONFLICT_REFRESH_TARGET_SESSION_ID,
  PR320_CONFLICT_REFRESH_WORK_ITEM_NAME,
  PR320_ORIGINAL_WORK_ITEM_NAME,
  PR320_TARGET_BRANCH_NAME,
  PR320_TARGET_PULL_REQUEST_NUMBER,
  serializeGeneratedTableRegistryPr320ConflictRefreshEvidenceReport,
} from "@/lib/factory/generated-table-registry-pr320-conflict-refresh";

const FIXTURE_DIR = join(
  import.meta.dir,
  "../../tests/fixtures/generated-table-registry-pr320-conflict-refresh",
);

function readFixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf8");
}

function buildRunCommand(options: {
  originMainSha?: string;
  mergeBaseSha?: string;
  ahead?: number;
  behind?: number;
  originalWorktreeHead?: string;
  conflictRefreshWorktreeHead?: string;
}): (binary: string, args: string[], cwd?: string) => CommandResult {
  return (binary, args, cwd) => {
    if (
      binary === "git" &&
      args[0] === "rev-parse" &&
      args[1] === "origin/main"
    ) {
      return {
        ok: true,
        stdout: `${options.originMainSha ?? "89a395a99e4408415680397b377db41d1731dc6b"}\n`,
        stderr: "",
        exitCode: 0,
      };
    }

    if (binary === "git" && args[0] === "merge-base") {
      return {
        ok: true,
        stdout: `${options.mergeBaseSha ?? "3d4311b1ddc8c1b5b099a7ef375d31230af3f394"}\n`,
        stderr: "",
        exitCode: 0,
      };
    }

    if (
      binary === "git" &&
      args[0] === "rev-list" &&
      args.includes("--left-right")
    ) {
      return {
        ok: true,
        stdout: `${options.behind ?? 48}\t${options.ahead ?? 10}\n`,
        stderr: "",
        exitCode: 0,
      };
    }

    if (
      binary === "git" &&
      args[0] === "-C" &&
      args[2] === "rev-parse" &&
      args[3] === "HEAD"
    ) {
      const worktreePath = args[1] ?? "";
      const head = worktreePath.includes(PR320_ORIGINAL_WORK_ITEM_NAME)
        ? (options.originalWorktreeHead ??
          "87538e3756c09199e3691f67175a505eefe92981")
        : (options.conflictRefreshWorktreeHead ??
          "1a134d792549e22ad35347bb98a977cf7db4a8c1");
      return {
        ok: true,
        stdout: `${head}\n`,
        stderr: "",
        exitCode: 0,
      };
    }

    return {
      ok: false,
      stdout: "",
      stderr: `unexpected command: ${binary} ${args.join(" ")} cwd=${cwd ?? "default"}`,
      exitCode: 1,
    };
  };
}

describe("generated-table-registry-pr320-conflict-refresh", () => {
  test("findQueueTokensForWorkItemName returns all tokens for a lane", () => {
    const workListJson = readFixture("work-list.json");
    const originalTokens = findQueueTokensForWorkItemName(
      workListJson,
      PR320_ORIGINAL_WORK_ITEM_NAME,
    );
    const refreshTokens = findQueueTokensForWorkItemName(
      workListJson,
      PR320_CONFLICT_REFRESH_WORK_ITEM_NAME,
    );

    expect(originalTokens).toHaveLength(3);
    expect(originalTokens.map((token) => token.workTypeName).sort()).toEqual([
      "idea",
      "plan",
      "task",
    ]);
    expect(
      originalTokens.find((token) => token.workTypeName === "idea")?.stateName,
    ).toBe("to-complete");
    expect(
      originalTokens.find((token) => token.workTypeName === "task")?.stateName,
    ).toBe("failed");

    expect(refreshTokens).toHaveLength(3);
    expect(
      refreshTokens.find((token) => token.workTypeName === "idea")?.stateName,
    ).toBe("to-complete");
    expect(
      refreshTokens.find((token) => token.workTypeName === "task")?.stateName,
    ).toBe("init");
  });

  test("captureGeneratedTableRegistryPr320ConflictRefreshEvidence assembles PR, git, queue, and worktree evidence from fixtures", () => {
    const report = captureGeneratedTableRegistryPr320ConflictRefreshEvidence({
      generatedAtUtc: "2026-07-03T12:00:00.000Z",
      pr320PullRequestJson: readFixture("pr320-pull-request.json"),
      remoteBaseRef: "origin/main",
      repoRoot: "/tmp/main-repo",
      runCommand: buildRunCommand({}),
      sourceSession: PR320_CONFLICT_REFRESH_TARGET_SESSION_ID,
      workListJsonText: readFixture("work-list.json"),
      worktreesDir: "/tmp/worktrees",
    });

    expect(report.capturePolicy).toBe(PR320_CONFLICT_REFRESH_CAPTURE_POLICY);
    expect(report.sourceSession).toBe(PR320_CONFLICT_REFRESH_TARGET_SESSION_ID);
    expect(report.pullRequest.availability).toBe("present");
    expect(report.pullRequest.pullRequestNumber).toBe(
      PR320_TARGET_PULL_REQUEST_NUMBER,
    );
    expect(report.pullRequest.headRefName).toBe(PR320_TARGET_BRANCH_NAME);
    expect(report.pullRequest.mergeStateStatus).toBe("CLEAN");
    expect(report.pullRequest.mergeabilityClass).toBe("mergeable");
    expect(report.pullRequest.checkHealth).toBe("passing");
    expect(report.originMain.originMainSha).toBe(
      "89a395a99e4408415680397b377db41d1731dc6b",
    );
    expect(report.branchDrift.status).toBe("diverged");
    expect(report.branchDrift.commitsAheadOfMain).toBe(10);
    expect(report.branchDrift.commitsBehindMain).toBe(48);
    expect(report.originalLane.queueTokens).toHaveLength(3);
    expect(report.conflictRefreshLane.queueTokens).toHaveLength(3);
    expect(report.originalWorktree.worktreeMetadata.availability).toBe(
      "unavailable",
    );
    expect(report.conflictRefreshWorktree.worktreeMetadata.availability).toBe(
      "unavailable",
    );
  });

  test("format and serialize include reviewer-verifiable PR and queue fields", () => {
    const report = captureGeneratedTableRegistryPr320ConflictRefreshEvidence({
      generatedAtUtc: "2026-07-03T12:00:00.000Z",
      pr320PullRequestJson: readFixture("pr320-pull-request.json"),
      remoteBaseRef: "origin/main",
      repoRoot: "/tmp/main-repo",
      runCommand: buildRunCommand({}),
      workListJsonText: readFixture("work-list.json"),
      worktreesDir: "/tmp/worktrees",
    });

    const formatted =
      formatGeneratedTableRegistryPr320ConflictRefreshEvidenceReport(report);
    expect(formatted).toContain("pullRequestNumber=320");
    expect(formatted).toContain("mergeabilityClass=mergeable");
    expect(formatted).toContain("checkHealth=passing");
    expect(formatted).toContain("commitsAheadOfMain=10");
    expect(formatted).toContain("commitsBehindMain=48");
    expect(formatted).toContain(
      `[queue-lane:${PR320_ORIGINAL_WORK_ITEM_NAME}]`,
    );
    expect(formatted).toContain(
      `[queue-lane:${PR320_CONFLICT_REFRESH_WORK_ITEM_NAME}]`,
    );

    const serialized = JSON.parse(
      serializeGeneratedTableRegistryPr320ConflictRefreshEvidenceReport(report),
    ) as {
      pullRequest: { mergeabilityClass: string };
      branchDrift: { status: string };
    };
    expect(serialized.pullRequest.mergeabilityClass).toBe("mergeable");
    expect(serialized.branchDrift.status).toBe("diverged");
  });
});
