import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CommandResult } from "@/lib/factory/active-pr-mergeability-watchdog";
import {
  buildGeneratedTableRegistryPr320ConflictRefreshOutput,
  buildPr320ConflictRefreshOutcomeReport,
  buildPr320ConflictRefreshScopeProof,
  captureGeneratedTableRegistryPr320ConflictRefreshEvidence,
  classifyPr320ConflictRefreshOutcome,
  extractMergeTreeConflictPaths,
  findQueueTokensForWorkItemName,
  formatGeneratedTableRegistryPr320ConflictRefreshEvidenceReport,
  formatGeneratedTableRegistryPr320ConflictRefreshOutput,
  formatPr320ConflictRefreshScopeProof,
  isPr320CleanupProofAllowedPath,
  isPr320CleanupProofProhibitedPath,
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

  test("extractMergeTreeConflictPaths parses CONFLICT lines from merge-tree output", () => {
    const output = [
      "CONFLICT (content): Merge conflict in scripts/run-website-verifier-tests.ts",
      "CONFLICT (content): Merge conflict in src/lib/content/generated/table-registry.generated.ts",
    ].join("\n");

    expect(extractMergeTreeConflictPaths(output)).toEqual([
      "scripts/run-website-verifier-tests.ts",
      "src/lib/content/generated/table-registry.generated.ts",
    ]);
  });

  test("classifyPr320ConflictRefreshOutcome selects consumed-on-main when proof markers exist on main", () => {
    const evidence = captureGeneratedTableRegistryPr320ConflictRefreshEvidence({
      pr320PullRequestJson: readFixture("pr320-pull-request.json"),
      remoteBaseRef: "origin/main",
      repoRoot: "/tmp/main-repo",
      runCommand: buildRunCommand({}),
      workListJsonText: readFixture("work-list.json"),
      worktreesDir: "/tmp/worktrees",
    });

    const classification = classifyPr320ConflictRefreshOutcome(evidence, {
      proofOnMain: {
        consumed: true,
        markerPaths: [
          "src/lib/factory/generated-table-registry-root-drift-cleanup-proof.ts",
          "scripts/report-generated-table-registry-root-drift-cleanup-proof.ts",
        ],
        missingMarkerPaths: [],
        presentMarkerPaths: [
          "src/lib/factory/generated-table-registry-root-drift-cleanup-proof.ts",
          "scripts/report-generated-table-registry-root-drift-cleanup-proof.ts",
        ],
      },
    });

    expect(classification.outcome).toBe("consumed-on-main");
    expect(classification.refreshRecommended).toBe(false);
    expect(classification.nextSafeAction).toContain("close or consume PR #320");
  });

  test("classifyPr320ConflictRefreshOutcome selects merge-ready for clean mergeable PR evidence", () => {
    const evidence = captureGeneratedTableRegistryPr320ConflictRefreshEvidence({
      pr320PullRequestJson: readFixture("pr320-pull-request.json"),
      remoteBaseRef: "origin/main",
      repoRoot: "/tmp/main-repo",
      runCommand: buildRunCommand({}),
      workListJsonText: readFixture("work-list.json"),
      worktreesDir: "/tmp/worktrees",
    });

    const classification = classifyPr320ConflictRefreshOutcome(evidence, {
      mergeTreeConflictPaths: [],
      proofOnMain: {
        consumed: false,
        markerPaths: [
          "src/lib/factory/generated-table-registry-root-drift-cleanup-proof.ts",
        ],
        missingMarkerPaths: [
          "src/lib/factory/generated-table-registry-root-drift-cleanup-proof.ts",
        ],
        presentMarkerPaths: [],
      },
    });

    expect(classification.outcome).toBe("merge-ready");
    expect(classification.refreshRecommended).toBe(true);
    expect(classification.nextSafeAction).toContain(
      "mergeable with passing checks",
    );
    expect(classification.nextSafeAction).toContain("48 commits behind");
  });

  test("classifyPr320ConflictRefreshOutcome selects operator-handoff when merge-tree reports conflicts", () => {
    const evidence = captureGeneratedTableRegistryPr320ConflictRefreshEvidence({
      pr320PullRequestJson: readFixture("pr320-pull-request-conflicting.json"),
      remoteBaseRef: "origin/main",
      repoRoot: "/tmp/main-repo",
      runCommand: buildRunCommand({}),
      workListJsonText: readFixture("work-list.json"),
      worktreesDir: "/tmp/worktrees",
    });

    const classification = classifyPr320ConflictRefreshOutcome(evidence, {
      mergeTreeConflictPaths: [
        "src/lib/content/generated/table-registry.generated.ts",
      ],
      proofOnMain: {
        consumed: false,
        markerPaths: [
          "src/lib/factory/generated-table-registry-root-drift-cleanup-proof.ts",
        ],
        missingMarkerPaths: [
          "src/lib/factory/generated-table-registry-root-drift-cleanup-proof.ts",
        ],
        presentMarkerPaths: [],
      },
    });

    expect(classification.outcome).toBe("operator-handoff");
    expect(classification.unsafeReason).toBe("merge-conflicts-detected");
    expect(classification.classificationEvidence).toContain(
      "merge-tree-conflict-paths=src/lib/content/generated/table-registry.generated.ts",
    );
  });

  test("buildPr320ConflictRefreshOutcomeReport emits operator handoff with conflicting files", () => {
    const evidence = captureGeneratedTableRegistryPr320ConflictRefreshEvidence({
      pr320PullRequestJson: readFixture("pr320-pull-request-conflicting.json"),
      remoteBaseRef: "origin/main",
      repoRoot: "/tmp/main-repo",
      runCommand: buildRunCommand({}),
      workListJsonText: readFixture("work-list.json"),
      worktreesDir: "/tmp/worktrees",
    });

    const outcomeReport = buildPr320ConflictRefreshOutcomeReport(evidence, {
      mergeTreeConflictPaths: [
        "docs/internal/processes/generated-table-registry-root-drift-cleanup-proof-relevant-files.md",
      ],
    });

    expect(outcomeReport.classification.outcome).toBe("operator-handoff");
    expect(outcomeReport.operatorHandoff?.conflictingFiles).toEqual([
      "docs/internal/processes/generated-table-registry-root-drift-cleanup-proof-relevant-files.md",
    ]);
    expect(outcomeReport.operatorHandoff?.nextOperatorAction).toContain(
      "generated-table-registry-root-drift-cleanup-proof",
    );
  });

  test("formatGeneratedTableRegistryPr320ConflictRefreshOutput includes outcome section", () => {
    const output = buildGeneratedTableRegistryPr320ConflictRefreshOutput({
      classifyOutcome: true,
      mergeTreeConflictPaths: [],
      pr320PullRequestJson: readFixture("pr320-pull-request.json"),
      remoteBaseRef: "origin/main",
      repoRoot: "/tmp/main-repo",
      runCommand: buildRunCommand({}),
      proofOnMain: {
        consumed: false,
        markerPaths: [
          "src/lib/factory/generated-table-registry-root-drift-cleanup-proof.ts",
        ],
        missingMarkerPaths: [
          "src/lib/factory/generated-table-registry-root-drift-cleanup-proof.ts",
        ],
        presentMarkerPaths: [],
      },
      workListJsonText: readFixture("work-list.json"),
      worktreesDir: "/tmp/worktrees",
    });

    const formatted =
      formatGeneratedTableRegistryPr320ConflictRefreshOutput(output);
    expect(formatted).toContain("[outcome]");
    expect(formatted).toContain("selectedOutcome=merge-ready");
    expect(formatted).toContain("mergeTreeConflictCount=0");
  });

  test("buildPr320ConflictRefreshScopeProof preserves cleanup-proof-only diff", () => {
    const scopeProof = buildPr320ConflictRefreshScopeProof({
      changedPaths: [
        "docs/internal/processes/generated-table-registry-root-drift-cleanup-proof-relevant-files.md",
        "docs/internal/processes/factory-linkage-relevant-files.md",
        "package.json",
        "scripts/report-generated-table-registry-root-drift-cleanup-proof.ts",
        "src/lib/factory/generated-table-registry-root-drift-cleanup-proof.ts",
        "src/lib/factory/generated-table-registry-root-drift-cleanup-proof.test.ts",
        "src/tests/fixtures/generated-table-registry-root-drift-cleanup-proof/dirty-table-registry-status.txt",
        "src/tests/fixtures/generated-table-registry-root-drift-cleanup-proof/looped-transformers-table-registry.diff",
      ],
    });

    expect(scopeProof.preserved).toBe(true);
    expect(scopeProof.prohibitedPaths).toEqual([]);
    expect(scopeProof.outOfScopePaths).toEqual([]);
    expect(scopeProof.allowedPaths).toHaveLength(8);
  });

  test("buildPr320ConflictRefreshScopeProof flags prohibited page content paths", () => {
    const scopeProof = buildPr320ConflictRefreshScopeProof({
      changedPaths: [
        "src/lib/factory/generated-table-registry-root-drift-cleanup-proof.ts",
        "src/content/docs/concepts/flow-matching/page.mdx",
        "src/lib/content/generated/table-registry.generated.ts",
      ],
    });

    expect(scopeProof.preserved).toBe(false);
    expect(scopeProof.prohibitedPaths).toEqual([
      "src/content/docs/concepts/flow-matching/page.mdx",
      "src/lib/content/generated/table-registry.generated.ts",
    ]);
    expect(scopeProof.outOfScopePaths).toEqual([
      "src/content/docs/concepts/flow-matching/page.mdx",
      "src/lib/content/generated/table-registry.generated.ts",
    ]);
  });

  test("isPr320CleanupProofAllowedPath and isPr320CleanupProofProhibitedPath classify paths", () => {
    expect(
      isPr320CleanupProofAllowedPath(
        "src/lib/factory/generated-table-registry-root-drift-cleanup-proof.test.ts",
      ),
    ).toBe(true);
    expect(
      isPr320CleanupProofProhibitedPath(
        "src/content/docs/concepts/flow-matching/page.mdx",
      ),
    ).toBe(true);
    expect(
      isPr320CleanupProofProhibitedPath(
        "src/lib/factory/generated-table-registry-root-drift-cleanup-proof.ts",
      ),
    ).toBe(false);
  });

  test("formatPr320ConflictRefreshScopeProof emits preserved scope evidence", () => {
    const formatted = formatPr320ConflictRefreshScopeProof(
      buildPr320ConflictRefreshScopeProof({
        changedPaths: [
          "src/lib/factory/generated-table-registry-root-drift-cleanup-proof.ts",
        ],
      }),
    );

    expect(formatted).toContain("[scope]");
    expect(formatted).toContain("preserved=true");
    expect(formatted).toContain(
      "changedPath=src/lib/factory/generated-table-registry-root-drift-cleanup-proof.ts",
    );
  });

  test("formatGeneratedTableRegistryPr320ConflictRefreshOutput includes scope section", () => {
    const output = buildGeneratedTableRegistryPr320ConflictRefreshOutput({
      classifyOutcome: true,
      mergeTreeConflictPaths: [],
      pr320PullRequestJson: readFixture("pr320-pull-request.json"),
      remoteBaseRef: "origin/main",
      repoRoot: "/tmp/main-repo",
      runCommand: buildRunCommand({}),
      proofOnMain: {
        consumed: false,
        markerPaths: [
          "src/lib/factory/generated-table-registry-root-drift-cleanup-proof.ts",
        ],
        missingMarkerPaths: [
          "src/lib/factory/generated-table-registry-root-drift-cleanup-proof.ts",
        ],
        presentMarkerPaths: [],
      },
      scopeProof: buildPr320ConflictRefreshScopeProof({
        changedPaths: [
          "src/lib/factory/generated-table-registry-root-drift-cleanup-proof.ts",
        ],
      }),
      workListJsonText: readFixture("work-list.json"),
      worktreesDir: "/tmp/worktrees",
    });

    const formatted =
      formatGeneratedTableRegistryPr320ConflictRefreshOutput(output);
    expect(formatted).toContain("[scope]");
    expect(formatted).toContain("preserved=true");
  });
});
