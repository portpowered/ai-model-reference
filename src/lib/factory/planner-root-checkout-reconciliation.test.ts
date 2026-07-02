import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  annotateManualInspectionFamilies,
  annotateRemotePresentDeletionFamilies,
  annotateTableRegistryDriftFamilies,
  buildPlannerRootCheckoutOperatorNextActions,
  buildPlannerRootCheckoutReconciliationReport,
  classifyRootCheckoutDirtyPaths,
  collectConflictDriftPrEvidence,
  determineConflictDriftMetadataRefreshGuidance,
  formatPlannerRootCheckoutOperatorNextActions,
  formatPlannerRootCheckoutReconciliationReport,
  isConflictDriftLane,
  isManualInspectionSharedEditPath,
  isTableRegistryAssociatedRuntimePath,
  isTableRegistryDriftPath,
  isTableRegistryGeneratedArtifactPath,
  isTokenizerMismatchRemotePresentDeletionPath,
  PLANNER_ROOT_CHECKOUT_CONFLICT_DRIFT_BRANCH_REFRESH_GUIDANCE,
  PLANNER_ROOT_CHECKOUT_CONFLICT_DRIFT_METADATA_REFRESH_GUIDANCE,
  PLANNER_ROOT_CHECKOUT_CONFLICT_DRIFT_PR_SECTION,
  PLANNER_ROOT_CHECKOUT_GENERATED_TABLE_REGISTRY_DRIFT_SECTION,
  PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_GUIDANCE,
  PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_OWNERSHIP_GUIDANCE,
  PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_SHARED_EDITS_FAMILY,
  PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_SHARED_EDITS_GUIDANCE,
  PLANNER_ROOT_CHECKOUT_PAGE_REFILL_HOLD,
  PLANNER_ROOT_CHECKOUT_RECONCILIATION_HEADER,
  PLANNER_ROOT_CHECKOUT_REMOTE_EVIDENCE_ABSENT,
  PLANNER_ROOT_CHECKOUT_REMOTE_EVIDENCE_PRESENT,
  PLANNER_ROOT_CHECKOUT_REMOTE_PRESENT_CLEANUP_GUIDANCE,
  PLANNER_ROOT_CHECKOUT_TABLE_REGISTRY_DRIFT_GUIDANCE,
  PLANNER_ROOT_CHECKOUT_TARGET_SESSION_ID,
  PLANNER_ROOT_CHECKOUT_TOKENIZER_MISMATCH_REMOTE_PRESENT_FAMILY,
  PLANNER_ROOT_CHECKOUT_TOKENIZER_MISMATCH_STALE_DRIFT_GUIDANCE,
  summarizeManualInspectionChangeKinds,
} from "@/lib/factory/planner-root-checkout-reconciliation";

const MIXED_DIRTY_STATUS_FIXTURE = readFileSync(
  join(
    import.meta.dir,
    "../../tests/fixtures/planner-root-checkout-reconciliation/mixed-dirty-status.txt",
  ),
  "utf8",
);

const TOKENIZER_MISMATCH_DIRTY_STATUS_FIXTURE = readFileSync(
  join(
    import.meta.dir,
    "../../tests/fixtures/planner-root-checkout-reconciliation/tokenizer-mismatch-dirty-status.txt",
  ),
  "utf8",
);

const MANUAL_INSPECTION_SHARED_EDITS_DIRTY_STATUS_FIXTURE = readFileSync(
  join(
    import.meta.dir,
    "../../tests/fixtures/planner-root-checkout-reconciliation/manual-inspection-shared-edits-dirty-status.txt",
  ),
  "utf8",
);

const TABLE_REGISTRY_DRIFT_DIRTY_STATUS_FIXTURE = readFileSync(
  join(
    import.meta.dir,
    "../../tests/fixtures/planner-root-checkout-reconciliation/table-registry-drift-dirty-status.txt",
  ),
  "utf8",
);

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

function createFixtureRunGit(remotePresentPaths: ReadonlySet<string>) {
  return (_repoRoot: string, args: readonly string[]) => {
    const objectSpec = args[2];
    if (args[0] === "cat-file" && typeof objectSpec === "string") {
      const [ref, path] = objectSpec.split(":");
      if (ref === "origin/main" && path && remotePresentPaths.has(path)) {
        return { status: 0, stdout: "", stderr: "" };
      }
      if (ref === "HEAD" && path && remotePresentPaths.has(path)) {
        return { status: 0, stdout: "", stderr: "" };
      }
      return { status: 1, stdout: "", stderr: "missing" };
    }
    return { status: 0, stdout: "", stderr: "" };
  };
}

describe("isManualInspectionSharedEditPath", () => {
  test("matches tokenizer-mismatch shared manual-inspection paths", () => {
    const matchingPaths = [
      "src/features/models/components/ModuleGraph.tsx",
      "src/lib/content/table-registry-runtime.ts",
      "src/lib/content/validate-registry.ts",
      "src/lib/content/baseline-records.test.ts",
      "src/lib/content/citations.test.ts",
      "src/lib/content/graph-registry-runtime.test.ts",
      "src/lib/content/table-registry-runtime.test.ts",
      "src/lib/source.test.ts",
    ];

    for (const path of matchingPaths) {
      expect(isManualInspectionSharedEditPath(path)).toBe(true);
    }
  });

  test("does not match unrelated manual-inspection paths", () => {
    expect(isManualInspectionSharedEditPath("src/lib/factory/root.ts")).toBe(
      false,
    );
    expect(
      isManualInspectionSharedEditPath(
        "src/content/docs/modules/tokenizer-mismatch/page.mdx",
      ),
    ).toBe(false);
  });
});

describe("isTableRegistryDriftPath", () => {
  test("matches generated artifact and associated runtime paths", () => {
    expect(
      isTableRegistryGeneratedArtifactPath(
        "src/lib/content/generated/table-registry.generated.ts",
      ),
    ).toBe(true);
    expect(
      isTableRegistryAssociatedRuntimePath(
        "src/lib/content/table-registry-runtime.ts",
      ),
    ).toBe(true);
    expect(
      isTableRegistryAssociatedRuntimePath(
        "src/lib/content/validate-registry.ts",
      ),
    ).toBe(true);

    for (const path of [
      "src/lib/content/generated/table-registry.generated.ts",
      "src/lib/content/table-registry-runtime.ts",
      "src/lib/content/validate-registry.ts",
    ]) {
      expect(isTableRegistryDriftPath(path)).toBe(true);
    }
  });

  test("does not match unrelated manual-inspection paths", () => {
    expect(
      isTableRegistryDriftPath(
        "src/lib/content/table-registry-runtime.test.ts",
      ),
    ).toBe(false);
    expect(isTableRegistryDriftPath("src/lib/factory/root.ts")).toBe(false);
  });
});

describe("annotateTableRegistryDriftFamilies", () => {
  test("labels generated artifact and associated runtime paths separately", () => {
    const annotated = annotateTableRegistryDriftFamilies([
      {
        changeKind: "modified",
        classification: "manual-inspection",
        comparisonTarget: "HEAD",
        evidence: "non-deletion-dirty-path",
        headPresent: true,
        path: "src/lib/content/generated/table-registry.generated.ts",
        remoteMainPresent: false,
        statusCode: " M",
      },
      {
        changeKind: "modified",
        classification: "manual-inspection",
        comparisonTarget: "HEAD",
        evidence: "non-deletion-dirty-path",
        headPresent: true,
        path: "src/lib/content/table-registry-runtime.ts",
        remoteMainPresent: false,
        statusCode: " M",
      },
      {
        changeKind: "modified",
        classification: "manual-inspection",
        comparisonTarget: "HEAD",
        evidence: "non-deletion-dirty-path",
        headPresent: true,
        path: "src/lib/factory/root.ts",
        remoteMainPresent: false,
        statusCode: " M",
      },
    ]);

    expect(annotated[0]?.tableRegistryDriftFamily).toBe("generated-artifact");
    expect(annotated[1]?.tableRegistryDriftFamily).toBe(
      "table-registry-associated-runtime",
    );
    expect(annotated[2]?.tableRegistryDriftFamily).toBeUndefined();
  });
});

describe("annotateManualInspectionFamilies", () => {
  test("labels shared manual-inspection edits separately from other manual paths", () => {
    const annotated = annotateManualInspectionFamilies([
      {
        changeKind: "modified",
        classification: "manual-inspection",
        comparisonTarget: "HEAD",
        evidence: "non-deletion-dirty-path",
        headPresent: true,
        path: "src/lib/content/table-registry-runtime.ts",
        remoteMainPresent: false,
        statusCode: " M",
      },
      {
        changeKind: "modified",
        classification: "manual-inspection",
        comparisonTarget: "HEAD",
        evidence: "non-deletion-dirty-path",
        headPresent: true,
        path: "src/lib/factory/root.ts",
        remoteMainPresent: false,
        statusCode: " M",
      },
    ]);

    expect(annotated[0]?.manualInspectionFamily).toBe(
      PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_SHARED_EDITS_FAMILY,
    );
    expect(annotated[1]?.manualInspectionFamily).toBe(
      "other-manual-inspection",
    );
  });
});

describe("isTokenizerMismatchRemotePresentDeletionPath", () => {
  test("matches tokenizer-mismatch docs, registry, graph, citation, and focused test paths", () => {
    const matchingPaths = [
      "src/content/docs/modules/tokenizer-mismatch/page.mdx",
      "src/content/docs/modules/tokenizer-mismatch/messages/en.json",
      "src/content/registry/modules/tokenizer-mismatch.json",
      "src/content/registry/tables/tokenizer-mismatch-comparison.json",
      "src/content/registry/graphs/tokenizer-mismatch-compute-flow.json",
      "src/content/registry/citations/zero-shot-tokenizer-transfer.json",
      "src/lib/content/tokenizer-mismatch-module-page.test.ts",
      "src/lib/content/tokenizer-mismatch-registry.test.ts",
    ];

    for (const path of matchingPaths) {
      expect(isTokenizerMismatchRemotePresentDeletionPath(path)).toBe(true);
    }
  });

  test("does not match unrelated remote-present deletion paths", () => {
    expect(
      isTokenizerMismatchRemotePresentDeletionPath(
        "src/content/docs/models/clip/page.mdx",
      ),
    ).toBe(false);
    expect(
      isTokenizerMismatchRemotePresentDeletionPath("src/lib/factory/root.ts"),
    ).toBe(false);
  });
});

describe("annotateRemotePresentDeletionFamilies", () => {
  test("labels tokenizer-mismatch remote-present deletions separately from other deletions", () => {
    const annotated = annotateRemotePresentDeletionFamilies([
      {
        changeKind: "deleted",
        classification: "ownerless-root-checkout-drift",
        comparisonTarget: "origin/main",
        evidence: PLANNER_ROOT_CHECKOUT_REMOTE_EVIDENCE_PRESENT,
        headPresent: true,
        path: "src/content/docs/modules/tokenizer-mismatch/page.mdx",
        remoteMainPresent: true,
        statusCode: " D",
      },
      {
        changeKind: "deleted",
        classification: "ownerless-root-checkout-drift",
        comparisonTarget: "origin/main",
        evidence: PLANNER_ROOT_CHECKOUT_REMOTE_EVIDENCE_PRESENT,
        headPresent: true,
        path: "src/content/docs/models/clip/page.mdx",
        remoteMainPresent: true,
        statusCode: " D",
      },
    ]);

    expect(annotated[0]?.remotePresentDeletionFamily).toBe(
      PLANNER_ROOT_CHECKOUT_TOKENIZER_MISMATCH_REMOTE_PRESENT_FAMILY,
    );
    expect(annotated[1]?.remotePresentDeletionFamily).toBe(
      "other-remote-present-deletions",
    );
  });
});

describe("classifyRootCheckoutDirtyPaths", () => {
  test("classifies local deletions present on origin/main as ownerless root checkout drift", () => {
    const remotePresentPaths = new Set([
      "src/content/docs/models/clip/page.mdx",
      "src/content/docs/training/diffusion-training-objective/page.mdx",
    ]);

    const classified = classifyRootCheckoutDirtyPaths(
      [
        {
          changeKind: "deleted",
          path: "src/content/docs/models/clip/page.mdx",
          statusCode: " D",
        },
        {
          changeKind: "deleted",
          path: "src/content/docs/training/diffusion-training-objective/page.mdx",
          statusCode: "D ",
        },
      ],
      {
        remoteBaseRef: "origin/main",
        repoRoot: "/repo",
        runGit: (_repoRoot, args) => {
          const objectSpec = args[2];
          if (args[0] === "cat-file" && typeof objectSpec === "string") {
            const [, path] = objectSpec.split(":");
            if (path && remotePresentPaths.has(path)) {
              return { status: 0, stdout: "", stderr: "" };
            }
            return { status: 1, stdout: "", stderr: "missing" };
          }
          return { status: 0, stdout: "", stderr: "" };
        },
      },
    );

    expect(classified.remotePresentDeletions).toEqual([
      {
        changeKind: "deleted",
        classification: "ownerless-root-checkout-drift",
        comparisonTarget: "origin/main",
        evidence: PLANNER_ROOT_CHECKOUT_REMOTE_EVIDENCE_PRESENT,
        headPresent: true,
        path: "src/content/docs/models/clip/page.mdx",
        remoteMainPresent: true,
        statusCode: " D",
      },
      {
        changeKind: "deleted",
        classification: "ownerless-root-checkout-drift",
        comparisonTarget: "origin/main",
        evidence: PLANNER_ROOT_CHECKOUT_REMOTE_EVIDENCE_PRESENT,
        headPresent: true,
        path: "src/content/docs/training/diffusion-training-objective/page.mdx",
        remoteMainPresent: true,
        statusCode: "D ",
      },
    ]);
    expect(classified.manualInspectionPaths).toEqual([]);
  });

  test("keeps local deletions absent on origin/main in manual inspection", () => {
    const classified = classifyRootCheckoutDirtyPaths(
      [
        {
          changeKind: "deleted",
          path: "src/content/docs/models/clip/page.mdx",
          statusCode: " D",
        },
      ],
      {
        remoteBaseRef: "origin/main",
        repoRoot: "/repo",
        runGit: (_repoRoot, args) => {
          if (args[0] === "cat-file") {
            return { status: 1, stdout: "", stderr: "missing" };
          }
          return { status: 0, stdout: "", stderr: "" };
        },
      },
    );

    expect(classified.remotePresentDeletions).toEqual([]);
    expect(classified.manualInspectionPaths).toEqual([
      {
        changeKind: "deleted",
        classification: "manual-inspection",
        comparisonTarget: "origin/main",
        evidence: PLANNER_ROOT_CHECKOUT_REMOTE_EVIDENCE_ABSENT,
        headPresent: false,
        path: "src/content/docs/models/clip/page.mdx",
        remoteMainPresent: false,
        statusCode: " D",
      },
    ]);
  });
});

describe("classifyRootCheckoutDirtyPaths non-deletion paths", () => {
  const nonDeletionCases = [
    { changeKind: "modified" as const, statusCode: " M" },
    { changeKind: "added" as const, statusCode: "A " },
    { changeKind: "untracked" as const, statusCode: "??" },
    { changeKind: "renamed" as const, statusCode: "R " },
    { changeKind: "copied" as const, statusCode: "C " },
    { changeKind: "type-changed" as const, statusCode: "T " },
    { changeKind: "unknown" as const, statusCode: " U" },
  ];

  for (const testCase of nonDeletionCases) {
    test(`keeps ${testCase.changeKind} paths in manual inspection instead of remote-present deletions`, () => {
      const classified = classifyRootCheckoutDirtyPaths(
        [
          {
            changeKind: testCase.changeKind,
            path: `src/example/${testCase.changeKind}.ts`,
            statusCode: testCase.statusCode,
          },
        ],
        {
          remoteBaseRef: "origin/main",
          repoRoot: "/repo",
          runGit: () => ({ status: 0, stdout: "", stderr: "" }),
        },
      );

      expect(classified.remotePresentDeletions).toEqual([]);
      expect(classified.manualInspectionPaths).toEqual([
        {
          changeKind: testCase.changeKind,
          classification: "manual-inspection",
          comparisonTarget: "HEAD",
          evidence: "non-deletion-dirty-path",
          headPresent: true,
          path: `src/example/${testCase.changeKind}.ts`,
          remoteMainPresent: false,
          statusCode: testCase.statusCode,
        },
      ]);
    });
  }
});

describe("summarizeManualInspectionChangeKinds", () => {
  test("returns per-change-kind counts for manual inspection paths", () => {
    expect(
      summarizeManualInspectionChangeKinds([
        {
          changeKind: "modified",
          classification: "manual-inspection",
          comparisonTarget: "HEAD",
          evidence: "non-deletion-dirty-path",
          headPresent: true,
          path: "src/a.ts",
          remoteMainPresent: false,
          statusCode: " M",
        },
        {
          changeKind: "added",
          classification: "manual-inspection",
          comparisonTarget: "HEAD",
          evidence: "non-deletion-dirty-path",
          headPresent: true,
          path: "src/b.ts",
          remoteMainPresent: false,
          statusCode: "A ",
        },
        {
          changeKind: "modified",
          classification: "manual-inspection",
          comparisonTarget: "HEAD",
          evidence: "non-deletion-dirty-path",
          headPresent: true,
          path: "src/c.ts",
          remoteMainPresent: false,
          statusCode: " M",
        },
      ]),
    ).toEqual([
      { changeKind: "added", count: 1 },
      { changeKind: "modified", count: 2 },
    ]);
  });
});

describe("buildPlannerRootCheckoutOperatorNextActions", () => {
  test("returns null when the root checkout has no dirty paths", () => {
    expect(
      buildPlannerRootCheckoutOperatorNextActions({
        manualInspectionPaths: [],
        remotePresentDeletions: [],
        totalDirtyPathCount: 0,
      }),
    ).toBeNull();
  });

  test("holds page refills and names the planner session when dirty paths remain", () => {
    const nextActions = buildPlannerRootCheckoutOperatorNextActions({
      manualInspectionPaths: [
        {
          changeKind: "modified",
          classification: "manual-inspection",
          comparisonTarget: "HEAD",
          evidence: "non-deletion-dirty-path",
          headPresent: true,
          path: "src/lib/factory/root.ts",
          remoteMainPresent: false,
          statusCode: " M",
        },
      ],
      remotePresentDeletions: [
        {
          changeKind: "deleted",
          classification: "ownerless-root-checkout-drift",
          comparisonTarget: "origin/main",
          evidence: PLANNER_ROOT_CHECKOUT_REMOTE_EVIDENCE_PRESENT,
          headPresent: true,
          path: "src/content/docs/models/clip/page.mdx",
          remoteMainPresent: true,
          statusCode: " D",
        },
      ],
      totalDirtyPathCount: 2,
    });

    expect(nextActions).toEqual({
      manualInspectionCount: 1,
      manualInspectionOwnershipGuidance:
        PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_OWNERSHIP_GUIDANCE,
      pageRefillHold: true,
      remotePresentDeletionCleanupGuidance:
        PLANNER_ROOT_CHECKOUT_REMOTE_PRESENT_CLEANUP_GUIDANCE,
      remotePresentDeletionCount: 1,
      targetSessionId: PLANNER_ROOT_CHECKOUT_TARGET_SESSION_ID,
    });
  });
});

describe("formatPlannerRootCheckoutOperatorNextActions", () => {
  test("prints non-destructive operator guidance for mixed dirty paths", () => {
    const formatted = formatPlannerRootCheckoutOperatorNextActions({
      manualInspectionCount: 1,
      manualInspectionOwnershipGuidance:
        PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_OWNERSHIP_GUIDANCE,
      pageRefillHold: true,
      remotePresentDeletionCleanupGuidance:
        PLANNER_ROOT_CHECKOUT_REMOTE_PRESENT_CLEANUP_GUIDANCE,
      remotePresentDeletionCount: 2,
      targetSessionId: PLANNER_ROOT_CHECKOUT_TARGET_SESSION_ID,
    });

    expect(formatted).toEqual([
      "- operator-next-actions",
      `  - page-refill-hold=${PLANNER_ROOT_CHECKOUT_PAGE_REFILL_HOLD} target-session=${PLANNER_ROOT_CHECKOUT_TARGET_SESSION_ID}`,
      `  - remote-present-deletions count=2 guidance=${PLANNER_ROOT_CHECKOUT_REMOTE_PRESENT_CLEANUP_GUIDANCE}`,
      `  - manual-inspection count=1 guidance=${PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_OWNERSHIP_GUIDANCE}`,
    ]);
  });
});

describe("conflict-drift PR evidence", () => {
  test("collects PR-backed lanes with conflict-drift risk", () => {
    const conflictDriftPrs = collectConflictDriftPrEvidence({
      issues: [],
      lanes: [
        {
          status: "pr-backed",
          workItemName: "alpha",
          queueState: "active",
          rawQueueState: "active",
          branchName: "alpha",
          prNumber: 42,
          mergeabilityClass: "conflicting",
          queueMismatchRisk: "conflict-drift",
          nextAction: "refresh-branch",
          reasons: [],
        },
        {
          status: "pr-backed",
          workItemName: "beta",
          queueState: "active",
          rawQueueState: "active",
          branchName: "beta",
          prNumber: 43,
          mergeabilityClass: "check-blocked",
          queueMismatchRisk: "checks-blocked",
          nextAction: "wait",
          reasons: [],
        },
        {
          status: "unclassified",
          workItemName: "gamma",
          queueState: "failed",
          rawQueueState: "failed",
          queueMismatchRisk: "conflict-drift",
          reasons: [],
        },
      ],
    });

    expect(conflictDriftPrs).toEqual([
      {
        branchName: "alpha",
        mergeabilityClass: "conflicting",
        nextAction: "refresh-branch",
        prNumber: 42,
        queueMismatchRisk: "conflict-drift",
        workItemName: "alpha",
      },
    ]);
  });

  test("isConflictDriftLane requires pr-backed status and PR number", () => {
    expect(
      isConflictDriftLane({
        status: "pr-backed",
        workItemName: "alpha",
        queueState: "active",
        rawQueueState: "active",
        prNumber: 42,
        queueMismatchRisk: "conflict-drift",
        reasons: [],
      }),
    ).toBe(true);
    expect(
      isConflictDriftLane({
        status: "unclassified",
        workItemName: "alpha",
        queueState: "active",
        rawQueueState: "active",
        queueMismatchRisk: "conflict-drift",
        reasons: [],
      }),
    ).toBe(false);
  });

  test("surfaces metadata refresh guidance when conflict drift may be hidden", () => {
    expect(
      determineConflictDriftMetadataRefreshGuidance(
        {
          issues: [],
          lanes: [
            {
              status: "pr-backed",
              workItemName: "alpha",
              queueState: "active",
              rawQueueState: "active",
              branchName: "alpha",
              prNumber: 42,
              mergeabilityClass: "unknown",
              queueMismatchRisk: "metadata-unavailable",
              metadataRefreshHints: [
                "stamped pull request linkage is stale: lookup API returned 502",
              ],
              reasons: [],
            },
          ],
        },
        [],
      ),
    ).toBe(PLANNER_ROOT_CHECKOUT_CONFLICT_DRIFT_METADATA_REFRESH_GUIDANCE);
    expect(
      determineConflictDriftMetadataRefreshGuidance(
        {
          issues: [],
          lanes: [
            {
              status: "pr-backed",
              workItemName: "alpha",
              queueState: "active",
              rawQueueState: "active",
              branchName: "alpha",
              prNumber: 42,
              mergeabilityClass: "conflicting",
              queueMismatchRisk: "conflict-drift",
              reasons: [],
            },
          ],
        },
        [
          {
            branchName: "alpha",
            mergeabilityClass: "conflicting",
            nextAction: "refresh-branch",
            prNumber: 42,
            queueMismatchRisk: "conflict-drift",
            workItemName: "alpha",
          },
        ],
      ),
    ).toBeUndefined();
  });

  test("formats conflict-drift PR section with branch-refresh guidance", () => {
    const report = buildPlannerRootCheckoutReconciliationReport({
      generatedAtUtc: "2026-07-01T12:00:00.000Z",
      remoteBaseRef: "origin/main",
      repoRoot: "/repo",
      statusOutput: "",
      laneDiscoveryReport: {
        issues: [],
        lanes: [
          {
            status: "pr-backed",
            workItemName: "tokenizer-mismatch",
            queueState: "active",
            rawQueueState: "active",
            branchName: "tokenizer-mismatch",
            prNumber: 260,
            mergeabilityClass: "conflicting",
            queueMismatchRisk: "conflict-drift",
            nextAction: "refresh-branch",
            reasons: [],
          },
        ],
      },
      runGit: () => ({ status: 0, stdout: "", stderr: "" }),
    });

    const formatted = formatPlannerRootCheckoutReconciliationReport(report);
    expect(formatted).toContain(
      `- ${PLANNER_ROOT_CHECKOUT_CONFLICT_DRIFT_PR_SECTION} count=1`,
    );
    expect(formatted).toContain(
      `guidance=${PLANNER_ROOT_CHECKOUT_CONFLICT_DRIFT_BRANCH_REFRESH_GUIDANCE}`,
    );
    expect(formatted).toContain(
      "work-item=tokenizer-mismatch pr=#260 branch=tokenizer-mismatch mergeability=conflicting risk=conflict-drift next-action=refresh-branch",
    );
    expect(formatted).not.toContain("queue-only-missing-linkage");
  });
});

describe("buildPlannerRootCheckoutReconciliationReport operator next actions", () => {
  test("includes operator next actions when dirty paths remain", () => {
    const report = buildPlannerRootCheckoutReconciliationReport({
      generatedAtUtc: "2026-07-01T12:00:00.000Z",
      remoteBaseRef: "origin/main",
      repoRoot: "/repo",
      statusOutput: [
        " D src/content/docs/models/clip/page.mdx",
        " M src/lib/factory/root.ts",
      ].join("\n"),
      runGit: (_repoRoot, args) => {
        const objectSpec = args[2];
        if (args[0] === "cat-file" && typeof objectSpec === "string") {
          const [ref, path] = objectSpec.split(":");
          if (
            ref === "origin/main" &&
            path === "src/content/docs/models/clip/page.mdx"
          ) {
            return { status: 0, stdout: "", stderr: "" };
          }
          if (
            ref === "HEAD" &&
            path === "src/content/docs/models/clip/page.mdx"
          ) {
            return { status: 0, stdout: "", stderr: "" };
          }
          return { status: 1, stdout: "", stderr: "missing" };
        }
        return { status: 0, stdout: "", stderr: "" };
      },
    });

    const formatted = formatPlannerRootCheckoutReconciliationReport(report);
    expect(formatted).toContain("- operator-next-actions");
    expect(formatted).toContain(
      `page-refill-hold=${PLANNER_ROOT_CHECKOUT_PAGE_REFILL_HOLD}`,
    );
    expect(formatted).toContain(
      `target-session=${PLANNER_ROOT_CHECKOUT_TARGET_SESSION_ID}`,
    );
    expect(formatted).toContain(
      `remote-present-deletions count=1 guidance=${PLANNER_ROOT_CHECKOUT_REMOTE_PRESENT_CLEANUP_GUIDANCE}`,
    );
    expect(formatted).toContain(
      `manual-inspection count=1 guidance=${PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_OWNERSHIP_GUIDANCE}`,
    );
  });

  test("omits operator next actions when the root checkout is clean", () => {
    const report = buildPlannerRootCheckoutReconciliationReport({
      generatedAtUtc: "2026-07-01T12:00:00.000Z",
      remoteBaseRef: "origin/main",
      repoRoot: "/repo",
      statusOutput: "",
      runGit: () => ({ status: 0, stdout: "", stderr: "" }),
    });

    expect(report.operatorNextActions).toBeNull();
    expect(formatPlannerRootCheckoutReconciliationReport(report)).not.toContain(
      "- operator-next-actions",
    );
  });
});

describe("buildPlannerRootCheckoutReconciliationReport", () => {
  test("formats remote-present deletions with reviewer-verifiable evidence", () => {
    const report = buildPlannerRootCheckoutReconciliationReport({
      generatedAtUtc: "2026-07-01T12:00:00.000Z",
      remoteBaseRef: "origin/main",
      repoRoot: "/repo",
      statusOutput: [
        " D src/content/docs/models/clip/page.mdx",
        " M src/lib/factory/root.ts",
      ].join("\n"),
      runGit: (_repoRoot, args) => {
        const objectSpec = args[2];
        if (args[0] === "cat-file" && typeof objectSpec === "string") {
          const [ref, path] = objectSpec.split(":");
          if (
            ref === "origin/main" &&
            path === "src/content/docs/models/clip/page.mdx"
          ) {
            return { status: 0, stdout: "", stderr: "" };
          }
          if (
            ref === "HEAD" &&
            path === "src/content/docs/models/clip/page.mdx"
          ) {
            return { status: 0, stdout: "", stderr: "" };
          }
          return { status: 1, stdout: "", stderr: "missing" };
        }
        return { status: 0, stdout: "", stderr: "" };
      },
    });

    const formatted = formatPlannerRootCheckoutReconciliationReport(report);
    expect(formatted).toContain(PLANNER_ROOT_CHECKOUT_RECONCILIATION_HEADER);
    expect(formatted).toContain(
      "remote-base-ref=origin/main root-dirty-paths=2 remote-present-deletions=1 manual-inspection=1",
    );
    expect(formatted).toContain(
      "path=src/content/docs/models/clip/page.mdx status= D change=deleted comparison-target=origin/main evidence=present-on-origin-main classification=ownerless-root-checkout-drift drift-family=other-remote-present-deletions",
    );
    expect(formatted).toContain(
      `  - ${PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_SHARED_EDITS_FAMILY} count=0`,
    );
    expect(formatted).toContain("  - other-manual-inspection count=1");
    expect(formatted).toContain(
      "path=src/lib/factory/root.ts status= M change=modified comparison-target=HEAD evidence=non-deletion-dirty-path classification=manual-inspection inspection-family=other-manual-inspection",
    );
    expect(formatted).toContain(
      `guidance=${PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_GUIDANCE}`,
    );
    expect(formatted).toContain("change-kind-counts=modified=1");
  });

  test("keeps mixed non-deletion dirty paths visible with per-group counts", () => {
    const report = buildPlannerRootCheckoutReconciliationReport({
      generatedAtUtc: "2026-07-01T12:00:00.000Z",
      remoteBaseRef: "origin/main",
      repoRoot: "/repo",
      statusOutput: [
        " D src/content/docs/models/clip/page.mdx",
        " M src/lib/factory/root.ts",
        "A  src/lib/factory/new.ts",
        "?? src/lib/factory/untracked.ts",
        "R  src/old.ts -> src/new.ts",
        "C  src/copy-from.ts -> src/copy-to.ts",
        "T  src/binary.dat",
        " U src/ambiguous.ts",
      ].join("\n"),
      runGit: (_repoRoot, args) => {
        const objectSpec = args[2];
        if (args[0] === "cat-file" && typeof objectSpec === "string") {
          const [ref, path] = objectSpec.split(":");
          if (
            ref === "origin/main" &&
            path === "src/content/docs/models/clip/page.mdx"
          ) {
            return { status: 0, stdout: "", stderr: "" };
          }
          if (
            ref === "HEAD" &&
            path === "src/content/docs/models/clip/page.mdx"
          ) {
            return { status: 0, stdout: "", stderr: "" };
          }
          return { status: 1, stdout: "", stderr: "missing" };
        }
        return { status: 0, stdout: "", stderr: "" };
      },
    });

    const formatted = formatPlannerRootCheckoutReconciliationReport(report);
    expect(formatted).toContain(
      "remote-base-ref=origin/main root-dirty-paths=8 remote-present-deletions=1 manual-inspection=7",
    );
    expect(formatted).toContain("path=src/content/docs/models/clip/page.mdx");
    expect(formatted).toContain("classification=ownerless-root-checkout-drift");
    expect(formatted).toContain("  - other-manual-inspection count=7");
    expect(formatted).toContain("path=src/lib/factory/root.ts");
    expect(formatted).toContain("path=src/lib/factory/new.ts");
    expect(formatted).toContain("path=src/lib/factory/untracked.ts");
    expect(formatted).toContain("path=src/new.ts");
    expect(formatted).toContain("path=src/copy-to.ts");
    expect(formatted).toContain("path=src/binary.dat");
    expect(formatted).toContain("path=src/ambiguous.ts");
    expect(formatted).toContain(
      "change-kind-counts=added=1 copied=1 modified=1 renamed=1 type-changed=1 unknown=1 untracked=1",
    );
    expect(formatted).toContain(
      `guidance=${PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_GUIDANCE}`,
    );
  });
});

describe("planner root checkout reconciliation fixture evidence", () => {
  test("fixture snapshot covers remote-present deletion classification and evidence", () => {
    const report = buildPlannerRootCheckoutReconciliationReport({
      generatedAtUtc: "2026-07-02T04:00:00.000Z",
      remoteBaseRef: "origin/main",
      repoRoot: "/repo",
      statusOutput: MIXED_DIRTY_STATUS_FIXTURE,
      runGit: createFixtureRunGit(
        new Set(["src/content/docs/models/clip/page.mdx"]),
      ),
    });

    expect(formatPlannerRootCheckoutReconciliationReport(report)).toBe(
      [
        PLANNER_ROOT_CHECKOUT_RECONCILIATION_HEADER,
        "remote-base-ref=origin/main root-dirty-paths=2 remote-present-deletions=1 manual-inspection=1",
        "- location=root repo=/repo",
        "- remote-present-ownerless-deletions count=1 comparison-target=origin/main",
        `  - ${PLANNER_ROOT_CHECKOUT_TOKENIZER_MISMATCH_REMOTE_PRESENT_FAMILY} count=0 comparison-target=origin/main`,
        `    - guidance=${PLANNER_ROOT_CHECKOUT_TOKENIZER_MISMATCH_STALE_DRIFT_GUIDANCE}`,
        "    - none",
        "  - other-remote-present-deletions count=1 comparison-target=origin/main",
        "    - path=src/content/docs/models/clip/page.mdx status= D change=deleted comparison-target=origin/main evidence=present-on-origin-main classification=ownerless-root-checkout-drift drift-family=other-remote-present-deletions",
        "- manual-inspection count=1",
        `  - guidance=${PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_GUIDANCE}`,
        "  - change-kind-counts=modified=1",
        `  - ${PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_SHARED_EDITS_FAMILY} count=0`,
        `    - guidance=${PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_SHARED_EDITS_GUIDANCE}`,
        "    - none",
        "  - other-manual-inspection count=1",
        "    - path=src/lib/factory/root.ts status= M change=modified comparison-target=HEAD evidence=non-deletion-dirty-path classification=manual-inspection inspection-family=other-manual-inspection",
        `- ${PLANNER_ROOT_CHECKOUT_GENERATED_TABLE_REGISTRY_DRIFT_SECTION} count=0`,
        "  - none",
        `- ${PLANNER_ROOT_CHECKOUT_CONFLICT_DRIFT_PR_SECTION} count=0`,
        "  - none",
        "- operator-next-actions",
        `  - page-refill-hold=${PLANNER_ROOT_CHECKOUT_PAGE_REFILL_HOLD} target-session=${PLANNER_ROOT_CHECKOUT_TARGET_SESSION_ID}`,
        `  - remote-present-deletions count=1 guidance=${PLANNER_ROOT_CHECKOUT_REMOTE_PRESENT_CLEANUP_GUIDANCE}`,
        `  - manual-inspection count=1 guidance=${PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_OWNERSHIP_GUIDANCE}`,
      ].join("\n"),
    );
  });

  test("groups tokenizer-mismatch remote-present deletions as stale root checkout drift", () => {
    const remotePresentPaths = new Set([
      "src/content/docs/modules/tokenizer-mismatch/page.mdx",
      "src/content/docs/modules/tokenizer-mismatch/assets.json",
      "src/content/registry/modules/tokenizer-mismatch.json",
      "src/content/registry/tables/tokenizer-mismatch-comparison.json",
      "src/content/registry/graphs/tokenizer-mismatch-compute-flow.json",
      "src/content/registry/citations/zero-shot-tokenizer-transfer.json",
      "src/lib/content/tokenizer-mismatch-module-page.test.ts",
      "src/lib/content/tokenizer-mismatch-registry.test.ts",
      "src/content/docs/models/clip/page.mdx",
    ]);

    const report = buildPlannerRootCheckoutReconciliationReport({
      generatedAtUtc: "2026-07-02T04:00:00.000Z",
      remoteBaseRef: "origin/main",
      repoRoot: "/repo",
      statusOutput: TOKENIZER_MISMATCH_DIRTY_STATUS_FIXTURE,
      runGit: createFixtureRunGit(remotePresentPaths),
    });

    expect(report.tokenizerMismatchRemotePresentDeletions).toHaveLength(8);
    expect(report.remotePresentDeletions).toHaveLength(9);

    const formatted = formatPlannerRootCheckoutReconciliationReport(report);
    expect(formatted).toContain(
      `  - ${PLANNER_ROOT_CHECKOUT_TOKENIZER_MISMATCH_REMOTE_PRESENT_FAMILY} count=8 comparison-target=origin/main`,
    );
    expect(formatted).toContain(
      `    - guidance=${PLANNER_ROOT_CHECKOUT_TOKENIZER_MISMATCH_STALE_DRIFT_GUIDANCE}`,
    );
    expect(formatted).toContain(
      "path=src/content/docs/modules/tokenizer-mismatch/page.mdx status= D change=deleted comparison-target=origin/main evidence=present-on-origin-main classification=ownerless-root-checkout-drift drift-family=tokenizer-mismatch-remote-present-deletions",
    );
    expect(formatted).toContain(
      "path=src/content/registry/modules/tokenizer-mismatch.json status= D change=deleted comparison-target=origin/main evidence=present-on-origin-main classification=ownerless-root-checkout-drift drift-family=tokenizer-mismatch-remote-present-deletions",
    );
    expect(formatted).toContain(
      "path=src/content/registry/tables/tokenizer-mismatch-comparison.json status= D change=deleted comparison-target=origin/main evidence=present-on-origin-main classification=ownerless-root-checkout-drift drift-family=tokenizer-mismatch-remote-present-deletions",
    );
    expect(formatted).toContain(
      "path=src/content/registry/graphs/tokenizer-mismatch-compute-flow.json status= D change=deleted comparison-target=origin/main evidence=present-on-origin-main classification=ownerless-root-checkout-drift drift-family=tokenizer-mismatch-remote-present-deletions",
    );
    expect(formatted).toContain(
      "path=src/lib/content/tokenizer-mismatch-module-page.test.ts status= D change=deleted comparison-target=origin/main evidence=present-on-origin-main classification=ownerless-root-checkout-drift drift-family=tokenizer-mismatch-remote-present-deletions",
    );
    expect(formatted).toContain(
      "  - other-remote-present-deletions count=1 comparison-target=origin/main",
    );
    expect(formatted).toContain(
      "path=src/content/docs/models/clip/page.mdx status= D change=deleted comparison-target=origin/main evidence=present-on-origin-main classification=ownerless-root-checkout-drift drift-family=other-remote-present-deletions",
    );
    expect(formatted).not.toContain("page-refill request");
    expect(formatted).toContain("do not treat as missing content");
  });

  test("fixture snapshot keeps real local modification in manual inspection", () => {
    const report = buildPlannerRootCheckoutReconciliationReport({
      generatedAtUtc: "2026-07-02T04:00:00.000Z",
      remoteBaseRef: "origin/main",
      repoRoot: "/repo",
      statusOutput: " M src/lib/factory/root.ts",
      runGit: createFixtureRunGit(new Set()),
    });

    const formatted = formatPlannerRootCheckoutReconciliationReport(report);
    expect(report.remotePresentDeletions).toEqual([]);
    expect(report.manualInspectionPaths).toHaveLength(1);
    expect(formatted).toContain("- manual-inspection count=1");
    expect(formatted).toContain("remote-present-deletions=0");
    expect(formatted).toContain("  - other-manual-inspection count=1");
    expect(formatted).toContain(
      "path=src/lib/factory/root.ts status= M change=modified comparison-target=HEAD evidence=non-deletion-dirty-path classification=manual-inspection inspection-family=other-manual-inspection",
    );
    expect(formatted).not.toContain(
      "classification=ownerless-root-checkout-drift",
    );
  });

  test("groups modified shared paths in manual-inspection-shared-edits separately from remote-present deletions", () => {
    const remotePresentPaths = new Set([
      "src/content/docs/modules/tokenizer-mismatch/page.mdx",
    ]);

    const report = buildPlannerRootCheckoutReconciliationReport({
      generatedAtUtc: "2026-07-02T04:00:00.000Z",
      remoteBaseRef: "origin/main",
      repoRoot: "/repo",
      statusOutput: MANUAL_INSPECTION_SHARED_EDITS_DIRTY_STATUS_FIXTURE,
      runGit: createFixtureRunGit(remotePresentPaths),
    });

    expect(report.manualInspectionSharedEdits).toHaveLength(8);
    expect(report.otherManualInspectionPaths).toHaveLength(1);
    expect(report.remotePresentDeletions).toHaveLength(1);

    const formatted = formatPlannerRootCheckoutReconciliationReport(report);
    expect(formatted).toContain(
      `  - ${PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_SHARED_EDITS_FAMILY} count=8`,
    );
    expect(formatted).toContain(
      `    - guidance=${PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_SHARED_EDITS_GUIDANCE}`,
    );
    expect(formatted).toContain(
      "path=src/features/models/components/ModuleGraph.tsx status= M change=modified comparison-target=HEAD evidence=non-deletion-dirty-path classification=manual-inspection inspection-family=manual-inspection-shared-edits",
    );
    expect(formatted).toContain(
      "path=src/lib/content/table-registry-runtime.ts status= M change=modified comparison-target=HEAD evidence=non-deletion-dirty-path classification=manual-inspection inspection-family=manual-inspection-shared-edits",
    );
    expect(formatted).toContain(
      "path=src/lib/content/validate-registry.ts status= M change=modified comparison-target=HEAD evidence=non-deletion-dirty-path classification=manual-inspection inspection-family=manual-inspection-shared-edits",
    );
    expect(formatted).toContain(
      "path=src/lib/source.test.ts status= M change=modified comparison-target=HEAD evidence=non-deletion-dirty-path classification=manual-inspection inspection-family=manual-inspection-shared-edits",
    );
    expect(formatted).toContain("  - other-manual-inspection count=1");
    expect(formatted).toContain(
      "path=src/lib/factory/root.ts status= M change=modified comparison-target=HEAD evidence=non-deletion-dirty-path classification=manual-inspection inspection-family=other-manual-inspection",
    );
    expect(formatted).toContain(
      "path=src/content/docs/modules/tokenizer-mismatch/page.mdx status= D change=deleted comparison-target=origin/main evidence=present-on-origin-main classification=ownerless-root-checkout-drift drift-family=tokenizer-mismatch-remote-present-deletions",
    );
    expect(formatted).toContain(
      `    - guidance=${PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_SHARED_EDITS_GUIDANCE}`,
    );
    expect(formatted).not.toContain(
      "manual-inspection-shared-edits count=8\n    - guidance=Operator-reviewed root cleanup",
    );
  });

  test("groups generated table-registry drift separately while preserving manual-inspection shared edits", () => {
    const report = buildPlannerRootCheckoutReconciliationReport({
      generatedAtUtc: "2026-07-02T04:00:00.000Z",
      remoteBaseRef: "origin/main",
      repoRoot: "/repo",
      statusOutput: TABLE_REGISTRY_DRIFT_DIRTY_STATUS_FIXTURE,
      runGit: createFixtureRunGit(new Set()),
    });

    expect(report.tableRegistryDriftPaths).toHaveLength(3);
    expect(report.tableRegistryGeneratedArtifacts).toHaveLength(1);
    expect(report.tableRegistryAssociatedRuntimePaths).toHaveLength(2);
    expect(report.manualInspectionSharedEdits).toHaveLength(2);
    expect(report.otherManualInspectionPaths).toHaveLength(2);

    const formatted = formatPlannerRootCheckoutReconciliationReport(report);
    expect(formatted).toContain(
      `- ${PLANNER_ROOT_CHECKOUT_GENERATED_TABLE_REGISTRY_DRIFT_SECTION} count=3`,
    );
    expect(formatted).toContain(
      `  - guidance=${PLANNER_ROOT_CHECKOUT_TABLE_REGISTRY_DRIFT_GUIDANCE}`,
    );
    expect(formatted).toContain("  - generated-artifact count=1");
    expect(formatted).toContain(
      "path=src/lib/content/generated/table-registry.generated.ts status= M change=modified comparison-target=HEAD evidence=non-deletion-dirty-path classification=manual-inspection inspection-family=other-manual-inspection registry-drift-family=generated-artifact",
    );
    expect(formatted).toContain(
      "  - table-registry-associated-runtime count=2",
    );
    expect(formatted).toContain(
      "path=src/lib/content/table-registry-runtime.ts status= M change=modified comparison-target=HEAD evidence=non-deletion-dirty-path classification=manual-inspection inspection-family=manual-inspection-shared-edits registry-drift-family=table-registry-associated-runtime",
    );
    expect(formatted).toContain(
      "path=src/lib/content/validate-registry.ts status= M change=modified comparison-target=HEAD evidence=non-deletion-dirty-path classification=manual-inspection inspection-family=manual-inspection-shared-edits registry-drift-family=table-registry-associated-runtime",
    );
    expect(formatted).toContain(
      `  - ${PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_SHARED_EDITS_FAMILY} count=2`,
    );
    expect(formatted).toContain("  - other-manual-inspection count=2");
    expect(formatted).toContain(
      "path=src/lib/factory/root.ts status= M change=modified comparison-target=HEAD evidence=non-deletion-dirty-path classification=manual-inspection inspection-family=other-manual-inspection",
    );
    expect(formatted).toContain("validation or regeneration proof");
    expect(formatted).toContain(
      "do not auto-revert, restore, or overwrite generated or runtime registry paths",
    );
  });
});

describe("planner root checkout reconciliation non-destructive git usage", () => {
  test("does not invoke mutating git commands when building report from fixture status", () => {
    const invokedGitCommands: string[][] = [];

    buildPlannerRootCheckoutReconciliationReport({
      generatedAtUtc: "2026-07-02T04:00:00.000Z",
      remoteBaseRef: "origin/main",
      repoRoot: "/repo",
      statusOutput: MIXED_DIRTY_STATUS_FIXTURE,
      runGit: (repoRoot, args) => {
        invokedGitCommands.push([...args]);
        return createFixtureRunGit(
          new Set(["src/content/docs/models/clip/page.mdx"]),
        )(repoRoot, args);
      },
      runGitStatus: () => MIXED_DIRTY_STATUS_FIXTURE,
    });

    expect(invokedGitCommands.length).toBeGreaterThan(0);
    for (const args of invokedGitCommands) {
      expect(MUTATING_GIT_COMMANDS.has(args[0] ?? "")).toBe(false);
    }
    expect(invokedGitCommands.some((args) => args[0] === "cat-file")).toBe(
      true,
    );
  });
});
