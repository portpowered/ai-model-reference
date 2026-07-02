import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  discoverTerminalLaneLandingCandidates,
  formatTerminalLaneLandingCandidateDiscovery,
  TerminalLaneLandingAuditDiscoveryError,
  UNAVAILABLE_EVIDENCE,
  UNKNOWN_EVIDENCE,
} from "@/lib/factory/terminal-lane-main-branch-landing-audit";

function createWorktreeFixture(input: {
  laneName: string;
  branchName?: string;
  worktreesDir: string;
}): string {
  const worktreePath = join(input.worktreesDir, input.laneName);
  mkdirSync(worktreePath, { recursive: true });
  writeFileSync(
    join(worktreePath, "prd.json"),
    JSON.stringify({ branchName: input.branchName ?? input.laneName }, null, 2),
  );
  if (input.branchName) {
    mkdirSync(join(worktreePath, ".claude"), { recursive: true });
    writeFileSync(
      join(worktreePath, ".claude", "lane-metadata.json"),
      JSON.stringify(
        {
          schemaVersion: 1,
          workItemName: input.laneName,
          branchName: input.branchName,
          branchMetadataSource: "prd",
          worktreePath,
          pullRequest: null,
          createdAtUtc: "2026-07-01T00:00:00.000Z",
          refreshedAtUtc: "2026-07-01T00:00:00.000Z",
          linkage: {
            branch: {
              status: "current",
              refreshedAtUtc: "2026-07-01T00:00:00.000Z",
            },
            pullRequest: {
              status: "missing",
              refreshedAtUtc: "2026-07-01T00:00:00.000Z",
            },
          },
        },
        null,
        2,
      ),
    );
  }
  return worktreePath;
}

describe("discoverTerminalLaneLandingCandidates", () => {
  test("discovers terminal-complete and near-terminal queue lanes with worktree identity", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "terminal-lane-audit-"));
    const worktreesDir = join(repoRoot, ".claude", "worktrees");
    const worktreePath = createWorktreeFixture({
      laneName: "activation-concept-current-main-page",
      branchName: "activation-concept-current-main-page",
      worktreesDir,
    });

    try {
      const discovery = discoverTerminalLaneLandingCandidates({
        repoRoot,
        worktreesDir,
        workListJsonText: JSON.stringify({
          results: [
            {
              name: "activation-concept-current-main-page",
              workTypeName: "task",
              state: { name: "complete", type: "TERMINAL" },
            },
            {
              name: "stale-loopback-follow-up",
              workTypeName: "thoughts",
              state: { name: "failed", type: "TERMINAL" },
            },
            {
              name: "active-review-lane",
              state: { name: "in-review", type: "PROCESSING" },
            },
          ],
        }),
      });

      expect(discovery.candidateCount).toBe(2);
      expect(discovery.candidates).toEqual([
        {
          laneName: "activation-concept-current-main-page",
          source: "queue-terminal-complete",
          terminalState: {
            status: "present",
            rawState: "complete",
            stateType: "TERMINAL",
            workTypeName: "task",
          },
          branchIdentity: {
            status: "present",
            branchName: "activation-concept-current-main-page",
            source: "metadata",
          },
          worktreeIdentity: {
            status: "present",
            worktreePath,
          },
        },
        {
          laneName: "stale-loopback-follow-up",
          source: "queue-near-terminal",
          terminalState: {
            status: "present",
            rawState: "failed",
            stateType: "TERMINAL",
            workTypeName: "thoughts",
          },
          branchIdentity: {
            status: UNAVAILABLE_EVIDENCE,
            reason:
              "branch identity not available from worktree metadata or git",
          },
          worktreeIdentity: {
            status: UNAVAILABLE_EVIDENCE,
            reason: "no matching worktree under configured worktrees directory",
          },
        },
      ]);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  test("accepts explicit lane input and reports unknown terminal state when queue evidence is missing", () => {
    const discovery = discoverTerminalLaneLandingCandidates({
      repoRoot: "/repo",
      explicitLaneNames: ["activation-concept-current-main-page"],
      worktreesDir: "/repo/.claude/worktrees/missing",
    });

    expect(discovery.candidates).toEqual([
      {
        laneName: "activation-concept-current-main-page",
        source: "explicit-lane",
        terminalState: {
          status: UNKNOWN_EVIDENCE,
          reason: "no queue terminal-state evidence for lane",
        },
        branchIdentity: {
          status: UNAVAILABLE_EVIDENCE,
          reason: "branch identity not available from worktree metadata or git",
        },
        worktreeIdentity: {
          status: UNAVAILABLE_EVIDENCE,
          reason: "no matching worktree under configured worktrees directory",
        },
      },
    ]);
  });

  test("returns explicit landing candidates for classifier fixtures", () => {
    const discovery = discoverTerminalLaneLandingCandidates({
      repoRoot: "/repo",
      landingCandidates: [
        {
          laneName: "activation-concept-current-main-page",
          source: "queue-terminal-complete",
          terminalState: {
            status: "present",
            rawState: "complete/terminal",
            stateType: "TERMINAL",
          },
          branchIdentity: {
            status: "present",
            branchName: "activation-concept-current-main-page",
            source: "metadata",
          },
          worktreeIdentity: {
            status: "present",
            worktreePath:
              "/repo/.claude/worktrees/activation-concept-current-main-page",
          },
        },
      ],
    });

    expect(discovery.candidateCount).toBe(1);
    expect(discovery.candidates[0]?.laneName).toBe(
      "activation-concept-current-main-page",
    );
  });

  test("fails clearly when work list JSON is invalid", () => {
    expect(() =>
      discoverTerminalLaneLandingCandidates({
        repoRoot: "/repo",
        workListJsonText: "{not-json",
      }),
    ).toThrow(TerminalLaneLandingAuditDiscoveryError);
  });
});

describe("formatTerminalLaneLandingCandidateDiscovery", () => {
  test("prints concise human-readable candidate summaries", () => {
    const output = formatTerminalLaneLandingCandidateDiscovery({
      generatedAtUtc: "2026-07-01T12:00:00.000Z",
      repoRoot: "/repo",
      candidateCount: 1,
      candidates: [
        {
          laneName: "activation-concept-current-main-page",
          source: "queue-terminal-complete",
          terminalState: {
            status: "present",
            rawState: "complete",
            stateType: "TERMINAL",
          },
          branchIdentity: {
            status: "present",
            branchName: "activation-concept-current-main-page",
          },
          worktreeIdentity: {
            status: UNAVAILABLE_EVIDENCE,
            reason: "no matching worktree under configured worktrees directory",
          },
        },
      ],
    });

    expect(output).toContain(
      "lane=activation-concept-current-main-page source=queue-terminal-complete terminal-state=complete branch=activation-concept-current-main-page worktree=unavailable",
    );
  });
});
