import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertCustomerSuppliedPathsInScope,
  buildSharedFactoryLinkageStagedDriftEvidenceSnapshot,
  formatSharedFactoryLinkageStagedDriftEvidenceSnapshot,
  parseSharedFactoryLinkageSuppliedStagedStatus,
  SHARED_FACTORY_LINKAGE_CUSTOMER_SUPPLIED_DIRTY_PATHS,
  SHARED_FACTORY_LINKAGE_EVIDENCE_TIMESTAMP,
  SHARED_FACTORY_LINKAGE_FACTORY_SESSION_ID,
  SHARED_FACTORY_LINKAGE_READ_ONLY_POLICY,
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
});
