import { describe, expect, test } from "bun:test";
import {
  buildPlannerRootCheckoutReconciliationReport,
  classifyRootCheckoutDirtyPaths,
  formatPlannerRootCheckoutReconciliationReport,
  PLANNER_ROOT_CHECKOUT_RECONCILIATION_HEADER,
  PLANNER_ROOT_CHECKOUT_REMOTE_EVIDENCE_ABSENT,
  PLANNER_ROOT_CHECKOUT_REMOTE_EVIDENCE_PRESENT,
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
  });
});
