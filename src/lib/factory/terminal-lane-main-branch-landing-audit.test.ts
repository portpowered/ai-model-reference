import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RunCommand } from "@/lib/factory/active-pr-mergeability-watchdog";
import {
  classifyTerminalLaneLandingStatus,
  classifyTerminalLaneLandingStatuses,
  classifyTerminalLaneLandingSurfaceKind,
  compareTerminalLaneLandingSurfaces,
  discoverTerminalLaneLandingCandidates,
  formatTerminalLaneLandingCandidateDiscovery,
  formatTerminalLaneLandingClassificationReport,
  formatTerminalLaneLandingSurfaceComparisonReport,
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

const activationLandingSurfaces = [
  {
    kind: "page-bundle" as const,
    path: "src/content/docs/glossary/activation/page.mdx",
  },
  {
    kind: "registry-record" as const,
    path: "src/content/registry/concepts/activation.json",
  },
  {
    kind: "focused-test" as const,
    path: "src/lib/content/activation-concept-discovery.test.ts",
  },
];

function createGitRunCommandStub(input: {
  branchDiffPaths?: Record<string, string[]>;
  mainPaths?: Set<string>;
  mainRef?: string;
}): RunCommand {
  const mainRef = input.mainRef ?? "origin/main";
  const mainPaths = input.mainPaths ?? new Set<string>();

  return (binary, args) => {
    if (binary !== "git") {
      return {
        ok: false,
        stdout: "",
        stderr: "unexpected binary",
        exitCode: 1,
      };
    }

    if (args[0] === "rev-parse" && args[1] === "--verify") {
      const ref = args[2] ?? "";
      if (ref === mainRef || ref === "activation-concept-current-main-page") {
        return { ok: true, stdout: "", stderr: "", exitCode: 0 };
      }
      return { ok: false, stdout: "", stderr: "bad ref", exitCode: 1 };
    }

    if (args[0] === "symbolic-ref") {
      return {
        ok: true,
        stdout: "refs/remotes/origin/main",
        stderr: "",
        exitCode: 0,
      };
    }

    if (args[0] === "merge-base") {
      return { ok: true, stdout: "merge-base-sha", stderr: "", exitCode: 0 };
    }

    if (args[0] === "diff" && args[1] === "--name-only") {
      const range = args[2] ?? "";
      const branchName = range.split("..")[1] ?? "";
      const paths = input.branchDiffPaths?.[branchName] ?? [];
      return {
        ok: true,
        stdout: paths.join("\n"),
        stderr: "",
        exitCode: 0,
      };
    }

    if (args[0] === "cat-file" && args[1] === "-e") {
      const spec = args[2] ?? "";
      const path = spec.includes(":") ? spec.split(":").slice(1).join(":") : "";
      const present = mainPaths.has(path);
      return {
        ok: present,
        stdout: "",
        stderr: present ? "" : "missing",
        exitCode: present ? 0 : 1,
      };
    }

    if (args[0] === "status") {
      return { ok: true, stdout: "", stderr: "", exitCode: 0 };
    }

    return {
      ok: false,
      stdout: "",
      stderr: "unhandled git command",
      exitCode: 1,
    };
  };
}

describe("classifyTerminalLaneLandingSurfaceKind", () => {
  test("classifies page bundle, registry record, and focused test paths", () => {
    expect(
      classifyTerminalLaneLandingSurfaceKind(
        "src/content/docs/glossary/activation/page.mdx",
      ),
    ).toBe("page-bundle");
    expect(
      classifyTerminalLaneLandingSurfaceKind(
        "src/content/registry/concepts/activation.json",
      ),
    ).toBe("registry-record");
    expect(
      classifyTerminalLaneLandingSurfaceKind(
        "src/lib/content/activation-concept-discovery.test.ts",
      ),
    ).toBe("focused-test");
    expect(
      classifyTerminalLaneLandingSurfaceKind("src/lib/factory/foo.ts"),
    ).toBe(undefined);
  });
});

describe("compareTerminalLaneLandingSurfaces", () => {
  test("reports main present while planner root paths are dirty or deleted separately", () => {
    const report = compareTerminalLaneLandingSurfaces({
      repoRoot: "/repo",
      mainRef: "origin/main",
      plannerRootGitStatusText: [
        " M src/content/docs/glossary/activation/page.mdx",
        " D src/content/registry/concepts/activation.json",
        " M src/lib/content/activation-concept-discovery.test.ts",
      ].join("\n"),
      runCommand: createGitRunCommandStub({
        mainPaths: new Set(
          activationLandingSurfaces.map((surface) => surface.path),
        ),
      }),
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
            source: "metadata",
          },
          worktreeIdentity: {
            status: "present",
            worktreePath:
              "/repo/.claude/worktrees/activation-concept-current-main-page",
          },
        },
      ],
      expectedLandingSurfacesByLane: {
        "activation-concept-current-main-page": activationLandingSurfaces,
      },
    });

    expect(report.comparisonCount).toBe(1);
    const comparison = report.comparisons[0];
    expect(comparison?.surfaceSource).toBe("explicit");
    expect(comparison?.surfaces).toEqual([
      {
        surface: activationLandingSurfaces[0],
        main: {
          status: "present",
          mainRef: "origin/main",
          reason: "path present on origin/main",
        },
        plannerRoot: {
          status: "dirty",
          changeKind: "modified",
          reason: "planner root reports modified ( M)",
        },
      },
      {
        surface: activationLandingSurfaces[1],
        main: {
          status: "present",
          mainRef: "origin/main",
          reason: "path present on origin/main",
        },
        plannerRoot: {
          status: "deleted",
          changeKind: "deleted",
          reason: "planner root reports deleted ( D)",
        },
      },
      {
        surface: activationLandingSurfaces[2],
        main: {
          status: "present",
          mainRef: "origin/main",
          reason: "path present on origin/main",
        },
        plannerRoot: {
          status: "dirty",
          changeKind: "modified",
          reason: "planner root reports modified ( M)",
        },
      },
    ]);
  });

  test("reports absent main evidence without conflating planner root drift", () => {
    const report = compareTerminalLaneLandingSurfaces({
      repoRoot: "/repo",
      mainRef: "origin/main",
      plannerRootGitStatusText:
        " D src/content/docs/glossary/activation/page.mdx",
      runCommand: createGitRunCommandStub({
        mainPaths: new Set([
          "src/content/registry/concepts/activation.json",
          "src/lib/content/activation-concept-discovery.test.ts",
        ]),
      }),
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
      expectedLandingSurfacesByLane: {
        "activation-concept-current-main-page": activationLandingSurfaces,
      },
    });

    const surfaces = report.comparisons[0]?.surfaces ?? [];
    expect(surfaces[0]?.main.status).toBe("absent");
    expect(surfaces[0]?.plannerRoot.status).toBe("deleted");
    expect(surfaces[1]?.main.status).toBe("present");
    expect(surfaces[1]?.plannerRoot.status).toBe("clean");
  });

  test("derives landing surfaces from branch diff when explicit surfaces are not provided", () => {
    const report = compareTerminalLaneLandingSurfaces({
      repoRoot: "/repo",
      mainRef: "origin/main",
      plannerRootGitStatusText: "",
      runCommand: createGitRunCommandStub({
        branchDiffPaths: {
          "activation-concept-current-main-page": activationLandingSurfaces.map(
            (surface) => surface.path,
          ),
        },
        mainPaths: new Set(
          activationLandingSurfaces.map((surface) => surface.path),
        ),
      }),
      candidates: [
        {
          laneName: "activation-concept-current-main-page",
          source: "queue-terminal-complete",
          terminalState: {
            status: "present",
            rawState: "complete",
          },
          branchIdentity: {
            status: "present",
            branchName: "activation-concept-current-main-page",
          },
          worktreeIdentity: {
            status: UNAVAILABLE_EVIDENCE,
          },
        },
      ],
    });

    expect(report.comparisons[0]?.surfaceSource).toBe("branch-diff");
    expect(report.comparisons[0]?.surfaces).toHaveLength(3);
  });

  test("returns unavailable surface source when branch identity is missing", () => {
    const report = compareTerminalLaneLandingSurfaces({
      repoRoot: "/repo",
      mainRef: "origin/main",
      runCommand: createGitRunCommandStub({}),
      candidates: [
        {
          laneName: "activation-concept-current-main-page",
          source: "explicit-lane",
          terminalState: {
            status: UNKNOWN_EVIDENCE,
            reason: "no queue terminal-state evidence for lane",
          },
          branchIdentity: {
            status: UNAVAILABLE_EVIDENCE,
            reason:
              "branch identity not available from worktree metadata or git",
          },
          worktreeIdentity: {
            status: UNAVAILABLE_EVIDENCE,
          },
        },
      ],
    });

    expect(report.comparisons[0]?.surfaceSource).toBe(UNAVAILABLE_EVIDENCE);
    expect(report.comparisons[0]?.surfaces).toEqual([]);
    expect(report.comparisons[0]?.issues[0]).toContain("branch identity");
  });
});

const activationTerminalCompleteCandidate = {
  laneName: "activation-concept-current-main-page",
  source: "queue-terminal-complete" as const,
  terminalState: {
    status: "present" as const,
    rawState: "complete",
    stateType: "TERMINAL",
  },
  branchIdentity: {
    status: "present" as const,
    branchName: "activation-concept-current-main-page",
    source: "metadata" as const,
  },
  worktreeIdentity: {
    status: "present" as const,
    worktreePath:
      "/repo/.claude/worktrees/activation-concept-current-main-page",
  },
};

function buildActivationSurfaceComparison(input: {
  mainStatuses: Array<"present" | "absent" | typeof UNAVAILABLE_EVIDENCE>;
  plannerRootStatuses: Array<
    "clean" | "dirty" | "deleted" | typeof UNAVAILABLE_EVIDENCE
  >;
  surfaceSource?: "explicit" | "branch-diff" | typeof UNAVAILABLE_EVIDENCE;
  issues?: string[];
}): ReturnType<typeof compareTerminalLaneLandingSurfaces> {
  const surfaces = activationLandingSurfaces.map((surface, index) => ({
    surface,
    main: {
      status: input.mainStatuses[index] ?? "absent",
      mainRef: "origin/main",
      reason: `main status ${input.mainStatuses[index] ?? "absent"}`,
    },
    plannerRoot: {
      status: input.plannerRootStatuses[index] ?? UNAVAILABLE_EVIDENCE,
      reason: `planner-root status ${input.plannerRootStatuses[index] ?? UNAVAILABLE_EVIDENCE}`,
    },
  }));

  return {
    generatedAtUtc: "2026-07-01T12:00:00.000Z",
    repoRoot: "/repo",
    mainRef: "origin/main",
    comparisonCount: 1,
    comparisons: [
      {
        laneName: "activation-concept-current-main-page",
        mainRef: "origin/main",
        surfaceSource: input.surfaceSource ?? "explicit",
        issues: input.issues ?? [],
        surfaces,
      },
    ],
  };
}

function activationSurfaceComparisonFixture(
  input: Parameters<typeof buildActivationSurfaceComparison>[0],
): NonNullable<
  ReturnType<typeof buildActivationSurfaceComparison>["comparisons"][number]
> {
  const comparison = buildActivationSurfaceComparison(input).comparisons[0];
  if (!comparison) {
    throw new Error("expected activation surface comparison fixture");
  }
  return comparison;
}

describe("classifyTerminalLaneLandingStatus", () => {
  test("classifies terminal-complete lanes with all main surfaces and clean planner root as landed", () => {
    const classification = classifyTerminalLaneLandingStatus({
      candidate: activationTerminalCompleteCandidate,
      comparison: activationSurfaceComparisonFixture({
        mainStatuses: ["present", "present", "present"],
        plannerRootStatuses: ["clean", "clean", "clean"],
      }),
    });

    expect(classification.status).toBe("landed");
    expect(classification.reasons[0]).toContain("terminal-complete");
    expect(classification.reasons[0]).toContain("origin/main");
    expect(classification.surfaceEvidence).toEqual({
      totalSurfaces: 3,
      mainPresent: 3,
      mainAbsent: 0,
      mainUnavailable: 0,
      plannerRootClean: 3,
      plannerRootDrift: 0,
      plannerRootUnavailable: 0,
    });
  });

  test("classifies main-present planner-root drift as remote-only with cited surfaces", () => {
    const classification = classifyTerminalLaneLandingStatus({
      candidate: activationTerminalCompleteCandidate,
      comparison: activationSurfaceComparisonFixture({
        mainStatuses: ["present", "present", "present"],
        plannerRootStatuses: ["dirty", "deleted", "dirty"],
      }),
    });

    expect(classification.status).toBe("remote-only");
    expect(classification.reasons.join(" ")).toContain("planner-root checkout");
    expect(classification.citedSurfaces).toHaveLength(3);
    expect(
      classification.citedSurfaces.map((surface) => surface.surface.kind),
    ).toEqual(["page-bundle", "registry-record", "focused-test"]);
  });

  test("classifies partial main evidence as partial for near-terminal lanes", () => {
    const classification = classifyTerminalLaneLandingStatus({
      candidate: {
        ...activationTerminalCompleteCandidate,
        source: "queue-near-terminal",
        terminalState: {
          status: "present",
          rawState: "failed",
          stateType: "TERMINAL",
        },
      },
      comparison: activationSurfaceComparisonFixture({
        mainStatuses: ["present", "absent", "present"],
        plannerRootStatuses: ["clean", "clean", "clean"],
      }),
    });

    expect(classification.status).toBe("partial");
    expect(classification.reasons[0]).toContain("2/3");
    expect(classification.citedSurfaces).toHaveLength(1);
    expect(classification.citedSurfaces[0]?.surface.path).toBe(
      "src/content/registry/concepts/activation.json",
    );
  });

  test("classifies terminal-complete lanes with missing main surfaces as reconciliation-required", () => {
    const classification = classifyTerminalLaneLandingStatus({
      candidate: activationTerminalCompleteCandidate,
      comparison: activationSurfaceComparisonFixture({
        mainStatuses: ["absent", "present", "present"],
        plannerRootStatuses: ["deleted", "clean", "dirty"],
      }),
    });

    expect(classification.status).toBe("reconciliation-required");
    expect(classification.reasons[0]).toContain("terminal-complete");
    expect(classification.reasons[0]).toContain("missing main-branch");
    expect(classification.citedSurfaces[0]?.surface.kind).toBe("page-bundle");
  });

  test("classifies unavailable expected surfaces for terminal-complete lanes as reconciliation-required", () => {
    const classification = classifyTerminalLaneLandingStatus({
      candidate: activationTerminalCompleteCandidate,
      comparison: activationSurfaceComparisonFixture({
        mainStatuses: [],
        plannerRootStatuses: [],
        surfaceSource: UNAVAILABLE_EVIDENCE,
        issues: [
          "expected landing surfaces unavailable because branch identity is missing",
        ],
      }),
    });

    expect(classification.status).toBe("reconciliation-required");
    expect(classification.reasons[0]).toContain(
      "lacks verifiable landing surfaces",
    );
  });
});

describe("classifyTerminalLaneLandingStatuses", () => {
  test("classifies each comparison with candidate context and formats grouped output", () => {
    const comparisonReport = compareTerminalLaneLandingSurfaces({
      repoRoot: "/repo",
      mainRef: "origin/main",
      plannerRootGitStatusText: [
        " M src/content/docs/glossary/activation/page.mdx",
        " D src/content/registry/concepts/activation.json",
      ].join("\n"),
      runCommand: createGitRunCommandStub({
        mainPaths: new Set(
          activationLandingSurfaces.map((surface) => surface.path),
        ),
      }),
      candidates: [activationTerminalCompleteCandidate],
      expectedLandingSurfacesByLane: {
        "activation-concept-current-main-page": activationLandingSurfaces,
      },
    });

    const report = classifyTerminalLaneLandingStatuses({
      comparisonReport,
      candidates: [activationTerminalCompleteCandidate],
    });

    expect(report.classificationCount).toBe(1);
    expect(report.classifications[0]?.status).toBe("remote-only");

    const output = formatTerminalLaneLandingClassificationReport(report);
    expect(output).toContain("landing status classification");
    expect(output).toContain("status=remote-only");
    expect(output).toContain("page-bundle");
    expect(output).toContain("registry-record");
  });
});

describe("formatTerminalLaneLandingSurfaceComparisonReport", () => {
  test("prints concise human-readable surface evidence lines", () => {
    const pageBundleSurface = activationLandingSurfaces[0];
    if (!pageBundleSurface) {
      throw new Error("expected activation page bundle surface fixture");
    }

    const output = formatTerminalLaneLandingSurfaceComparisonReport({
      generatedAtUtc: "2026-07-01T12:00:00.000Z",
      repoRoot: "/repo",
      mainRef: "origin/main",
      comparisonCount: 1,
      comparisons: [
        {
          laneName: "activation-concept-current-main-page",
          mainRef: "origin/main",
          surfaceSource: "explicit",
          issues: [],
          surfaces: [
            {
              surface: pageBundleSurface,
              main: {
                status: "present",
                mainRef: "origin/main",
              },
              plannerRoot: {
                status: "dirty",
                changeKind: "modified",
              },
            },
          ],
        },
      ],
    });

    expect(output).toContain("surface comparison");
    expect(output).toContain(
      "page-bundle path=src/content/docs/glossary/activation/page.mdx main=present planner-root=dirty",
    );
  });
});
