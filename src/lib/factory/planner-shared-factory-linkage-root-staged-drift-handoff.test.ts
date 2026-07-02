import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertCustomerSuppliedPathsInScope,
  buildSharedFactoryLinkageOwnershipClassificationReport,
  buildSharedFactoryLinkageStagedDriftEvidenceSnapshot,
  classifySharedFactoryLinkageStagedPaths,
  formatSharedFactoryLinkageOwnershipClassificationReport,
  formatSharedFactoryLinkageStagedDriftEvidenceSnapshot,
  parseSharedFactoryLinkageSuppliedStagedStatus,
  SHARED_FACTORY_LINKAGE_CUSTOMER_SUPPLIED_DIRTY_PATHS,
  SHARED_FACTORY_LINKAGE_EVIDENCE_MANUAL_INSPECTION_REQUIRED,
  SHARED_FACTORY_LINKAGE_EVIDENCE_NO_ACTIVE_OR_MERGED_LANE_CLAIM,
  SHARED_FACTORY_LINKAGE_EVIDENCE_NON_DELETION_DIRTY_PATH,
  SHARED_FACTORY_LINKAGE_EVIDENCE_OWNERLESS_ROOT_CHECKOUT_DRIFT,
  SHARED_FACTORY_LINKAGE_EVIDENCE_OWNERLESS_ROOT_DIRTY_PATH,
  SHARED_FACTORY_LINKAGE_EVIDENCE_PRESENT_ON_ORIGIN_MAIN,
  SHARED_FACTORY_LINKAGE_EVIDENCE_ROOT_UNMATCHED,
  SHARED_FACTORY_LINKAGE_EVIDENCE_TIMESTAMP,
  SHARED_FACTORY_LINKAGE_FACTORY_SESSION_ID,
  SHARED_FACTORY_LINKAGE_READ_ONLY_POLICY,
  SHARED_FACTORY_LINKAGE_REMOTE_PRESENT_DELETION_PATHS,
  SHARED_FACTORY_LINKAGE_ROOT_HEAD_SHA,
  SHARED_FACTORY_LINKAGE_ROOT_STAGED_DRIFT_HANDOFF_HEADER,
} from "@/lib/factory/planner-shared-factory-linkage-root-staged-drift-handoff";

const STAGED_DRIFT_STATUS_FIXTURE = join(
  import.meta.dir,
  "../../tests/fixtures/planner-shared-factory-linkage-root-staged-drift-handoff/staged-drift-evidence-status.txt",
);

describe("planner-shared-factory-linkage-root-staged-drift-handoff", () => {
  test("lists every customer-supplied dirty path exactly once", () => {
    expect(SHARED_FACTORY_LINKAGE_CUSTOMER_SUPPLIED_DIRTY_PATHS).toEqual([
      "docs/internal/processes/factory-linkage-relevant-files.md",
      "docs/internal/processes/tokens-per-second-stale-pr-follow-up-relevant-files.md",
      "src/lib/factory/active-pr-mergeability-watchdog.test.ts",
      "src/lib/factory/active-pr-mergeability-watchdog.ts",
      "src/lib/factory/planner-batch-collision-preflight.test.ts",
      "src/lib/factory/planner-worktree-drift-watchdog.test.ts",
      "src/lib/factory/queue-worktree-pr-linkage-ledger.test.ts",
      "src/lib/factory/queue-worktree-pr-linkage-ledger.ts",
      "src/tests/discovery/linkage-classifier-report-compatibility.test.ts",
      "src/tests/discovery/planner-live-queue-snapshot-alignment.test.ts",
      "src/tests/discovery/queue-worktree-pr-linkage-ledger.test.ts",
      "src/tests/discovery/tokens-per-second-stale-pr-follow-up-compatibility.test.ts",
    ]);
    assertCustomerSuppliedPathsInScope(
      SHARED_FACTORY_LINKAGE_CUSTOMER_SUPPLIED_DIRTY_PATHS,
    );
  });

  test("parseSharedFactoryLinkageSuppliedStagedStatus keeps staged-only evidence without unstaged diff", () => {
    const parsed = parseSharedFactoryLinkageSuppliedStagedStatus(
      readFileSync(STAGED_DRIFT_STATUS_FIXTURE, "utf8"),
    );

    expect(parsed.hasUnstagedDiff).toBe(false);
    expect(parsed.stagedPathEvidence).toHaveLength(12);
    expect(parsed.stagedPathEvidence.map((entry) => entry.path)).toEqual(
      [...SHARED_FACTORY_LINKAGE_CUSTOMER_SUPPLIED_DIRTY_PATHS].sort(
        (left, right) => left.localeCompare(right),
      ),
    );
    expect(
      parsed.stagedPathEvidence.filter(
        (entry) => entry.changeKind === "deleted",
      ),
    ).toHaveLength(2);
  });

  test("buildSharedFactoryLinkageStagedDriftEvidenceSnapshot restates supplied evidence", () => {
    const snapshot = buildSharedFactoryLinkageStagedDriftEvidenceSnapshot({
      generatedAtUtc: "2026-07-02T05:00:00.000Z",
      statusOutput: readFileSync(STAGED_DRIFT_STATUS_FIXTURE, "utf8"),
    });

    expect(snapshot.evidenceTimestamp).toBe(
      SHARED_FACTORY_LINKAGE_EVIDENCE_TIMESTAMP,
    );
    expect(snapshot.sessionId).toBe(SHARED_FACTORY_LINKAGE_FACTORY_SESSION_ID);
    expect(snapshot.rootHeadSha).toBe(SHARED_FACTORY_LINKAGE_ROOT_HEAD_SHA);
    expect(snapshot.stagedDirtyPathCount).toBe(12);
    expect(snapshot.hasUnstagedDiff).toBe(false);
    expect(snapshot.customerSuppliedPaths).toEqual(
      SHARED_FACTORY_LINKAGE_CUSTOMER_SUPPLIED_DIRTY_PATHS,
    );
    expect(snapshot.readOnlyPolicy).toBe(
      SHARED_FACTORY_LINKAGE_READ_ONLY_POLICY,
    );
  });

  test("formatSharedFactoryLinkageStagedDriftEvidenceSnapshot includes snapshot contract lines", () => {
    const snapshot = buildSharedFactoryLinkageStagedDriftEvidenceSnapshot({
      generatedAtUtc: "2026-07-02T05:00:00.000Z",
    });
    const formatted =
      formatSharedFactoryLinkageStagedDriftEvidenceSnapshot(snapshot);

    expect(formatted).toContain(
      SHARED_FACTORY_LINKAGE_ROOT_STAGED_DRIFT_HANDOFF_HEADER,
    );
    expect(formatted).toContain(
      `evidence-timestamp=${SHARED_FACTORY_LINKAGE_EVIDENCE_TIMESTAMP}`,
    );
    expect(formatted).toContain(
      `session=${SHARED_FACTORY_LINKAGE_FACTORY_SESSION_ID}`,
    );
    expect(formatted).toContain(
      `root-head=${SHARED_FACTORY_LINKAGE_ROOT_HEAD_SHA}`,
    );
    expect(formatted).toContain("staged-dirty-paths=12 unstaged-diff=false");
    expect(formatted).toContain(
      "read-only-policy This lane is read-only and must not mutate",
    );
    expect(formatted).toContain("customer-supplied-paths count=12");
    for (const path of SHARED_FACTORY_LINKAGE_CUSTOMER_SUPPLIED_DIRTY_PATHS) {
      expect(formatted).toContain(`path=${path}`);
    }
    expect(formatted).toContain(
      "scope: customer-supplied paths exclude content-page paths and active batch 061 page-lane paths.",
    );
  });

  test("classifySharedFactoryLinkageStagedPaths assigns safe-operator-handoff to remote-present deletions", () => {
    const snapshot = buildSharedFactoryLinkageStagedDriftEvidenceSnapshot({
      generatedAtUtc: "2026-07-02T05:00:00.000Z",
      statusOutput: readFileSync(STAGED_DRIFT_STATUS_FIXTURE, "utf8"),
    });
    const classifications = classifySharedFactoryLinkageStagedPaths({
      stagedPathEvidence: snapshot.stagedPathEvidence,
    });

    expect(classifications).toHaveLength(12);
    for (const path of SHARED_FACTORY_LINKAGE_REMOTE_PRESENT_DELETION_PATHS) {
      const classification = classifications.find(
        (entry) => entry.path === path,
      );
      expect(classification?.disposition).toBe("safe-operator-handoff");
      expect(classification?.changeKind).toBe("deleted");
      expect(classification?.evidence).toContain(
        SHARED_FACTORY_LINKAGE_EVIDENCE_OWNERLESS_ROOT_CHECKOUT_DRIFT,
      );
      expect(classification?.evidence).toContain(
        SHARED_FACTORY_LINKAGE_EVIDENCE_PRESENT_ON_ORIGIN_MAIN,
      );
      expect(classification?.evidence).toContain(
        SHARED_FACTORY_LINKAGE_EVIDENCE_NO_ACTIVE_OR_MERGED_LANE_CLAIM,
      );
    }
  });

  test("classifySharedFactoryLinkageStagedPaths keeps modified paths as unresolved holds", () => {
    const snapshot = buildSharedFactoryLinkageStagedDriftEvidenceSnapshot({
      generatedAtUtc: "2026-07-02T05:00:00.000Z",
      statusOutput: readFileSync(STAGED_DRIFT_STATUS_FIXTURE, "utf8"),
    });
    const classifications = classifySharedFactoryLinkageStagedPaths({
      stagedPathEvidence: snapshot.stagedPathEvidence,
    });
    const modifiedClassifications = classifications.filter(
      (entry) => entry.changeKind === "modified",
    );

    expect(modifiedClassifications).toHaveLength(10);
    for (const classification of modifiedClassifications) {
      expect(classification.disposition).toBe("unresolved-hold");
      expect(classification.evidence).toContain(
        SHARED_FACTORY_LINKAGE_EVIDENCE_OWNERLESS_ROOT_DIRTY_PATH,
      );
      expect(classification.evidence).toContain(
        SHARED_FACTORY_LINKAGE_EVIDENCE_ROOT_UNMATCHED,
      );
      expect(classification.evidence).toContain(
        SHARED_FACTORY_LINKAGE_EVIDENCE_NON_DELETION_DIRTY_PATH,
      );
      expect(classification.evidence).toContain(
        SHARED_FACTORY_LINKAGE_EVIDENCE_NO_ACTIVE_OR_MERGED_LANE_CLAIM,
      );
      expect(classification.evidence).toContain(
        SHARED_FACTORY_LINKAGE_EVIDENCE_MANUAL_INSPECTION_REQUIRED,
      );
    }
  });

  test("classifySharedFactoryLinkageStagedPaths can verify remote-present deletions with injectable runGit", () => {
    const snapshot = buildSharedFactoryLinkageStagedDriftEvidenceSnapshot({
      generatedAtUtc: "2026-07-02T05:00:00.000Z",
      statusOutput: readFileSync(STAGED_DRIFT_STATUS_FIXTURE, "utf8"),
    });
    const deletedPath =
      SHARED_FACTORY_LINKAGE_REMOTE_PRESENT_DELETION_PATHS[0] ?? "";
    const classifications = classifySharedFactoryLinkageStagedPaths({
      repoRoot: "/repo",
      runGit: (_repoRoot, args) => ({
        status:
          args[0] === "cat-file" &&
          args[1] === "-e" &&
          args[2] === `origin/main:${deletedPath}`
            ? 0
            : 1,
        stdout: "",
        stderr: "",
      }),
      stagedPathEvidence: snapshot.stagedPathEvidence,
      verifyRemotePresentDeletions: true,
    });
    const classification = classifications.find(
      (entry) => entry.path === deletedPath,
    );

    expect(classification?.evidence).toContain(
      "verified-present-on-origin/main=true",
    );
  });

  test("buildSharedFactoryLinkageOwnershipClassificationReport classifies every customer path once", () => {
    const report = buildSharedFactoryLinkageOwnershipClassificationReport({
      generatedAtUtc: "2026-07-02T05:00:00.000Z",
      statusOutput: readFileSync(STAGED_DRIFT_STATUS_FIXTURE, "utf8"),
    });

    expect(report.pathClassifications).toHaveLength(12);
    expect(
      report.pathClassifications.map((entry) => entry.path).sort(),
    ).toEqual(
      [...SHARED_FACTORY_LINKAGE_CUSTOMER_SUPPLIED_DIRTY_PATHS].sort(
        (left, right) => left.localeCompare(right),
      ),
    );
    expect(
      report.pathClassifications.filter(
        (entry) => entry.disposition === "safe-operator-handoff",
      ),
    ).toHaveLength(2);
    expect(
      report.pathClassifications.filter(
        (entry) => entry.disposition === "unresolved-hold",
      ),
    ).toHaveLength(10);
    expect(
      report.pathClassifications.filter(
        (entry) =>
          entry.disposition === "active-lane-owned" ||
          entry.disposition === "represented-by-PR",
      ),
    ).toHaveLength(0);
  });

  test("formatSharedFactoryLinkageOwnershipClassificationReport includes path-classifications section", () => {
    const report = buildSharedFactoryLinkageOwnershipClassificationReport({
      generatedAtUtc: "2026-07-02T05:00:00.000Z",
    });
    const formatted =
      formatSharedFactoryLinkageOwnershipClassificationReport(report);

    expect(formatted).toContain("- path-classifications count=12");
    expect(formatted).toContain("disposition=safe-operator-handoff");
    expect(formatted).toContain("disposition=unresolved-hold");
    expect(formatted).toContain(
      "ownerless root checkout drift; modified paths without lane ownership remain unresolved holds",
    );
    for (const path of SHARED_FACTORY_LINKAGE_CUSTOMER_SUPPLIED_DIRTY_PATHS) {
      expect(formatted).toContain(`path=${path}`);
    }
  });
});
