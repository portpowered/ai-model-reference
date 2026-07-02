import { describe, expect, test } from "bun:test";
import {
  buildPlannerRootCheckoutReconciliationReport,
  classifyRootCheckoutDirtyPaths,
  formatPlannerRootCheckoutReconciliationReport,
  PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_GUIDANCE,
  PLANNER_ROOT_CHECKOUT_RECONCILIATION_HEADER,
  PLANNER_ROOT_CHECKOUT_REMOTE_EVIDENCE_ABSENT,
  PLANNER_ROOT_CHECKOUT_REMOTE_EVIDENCE_PRESENT,
  summarizeManualInspectionChangeKinds,
} from "@/lib/factory/planner-root-checkout-reconciliation";

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
      "path=src/content/docs/models/clip/page.mdx status= D change=deleted comparison-target=origin/main evidence=present-on-origin-main classification=ownerless-root-checkout-drift",
    );
    expect(formatted).toContain(
      "path=src/lib/factory/root.ts status= M change=modified comparison-target=HEAD evidence=non-deletion-dirty-path classification=manual-inspection",
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
