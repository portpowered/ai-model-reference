import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildPlannerRootDriftHandoffEvidenceReport,
  formatPlannerRootDriftHandoffEvidenceMarkdown,
  formatPlannerRootDriftHandoffEvidenceReport,
  PLANNER_ROOT_DRIFT_ACTIVE_DEPENDENCY,
  PLANNER_ROOT_DRIFT_NO_MUTATION_STATEMENT,
  PLANNER_ROOT_DRIFT_PAGE_REFILL_HOLD,
  PLANNER_ROOT_DRIFT_SUPPLIED_BATCH_054_OWNED_PATHS,
  PLANNER_ROOT_DRIFT_SUPPLIED_STILL_OWNERLESS_PATHS,
  serializePlannerRootDriftHandoffEvidenceReport,
} from "@/lib/factory/planner-root-drift-operator-handoff";

const NINE_DIRTY_PATHS_STATUS_FIXTURE = readFileSync(
  join(
    import.meta.dir,
    "../../tests/fixtures/planner-root-drift-operator-handoff/nine-dirty-paths-status.txt",
  ),
  "utf8",
);

const FIXTURE_HEAD_RELATIONSHIP = {
  aheadCount: 0,
  aligned: true,
  behindCount: 0,
  branchStatusLine: "## main...origin/main",
  headShort: "01b24587",
  originMainShort: "01b24587",
} as const;

function buildNinePathFixtureReport(options?: {
  generatedAtUtc?: string;
  watchdogOwnerlessPaths?: readonly string[];
}) {
  return buildPlannerRootDriftHandoffEvidenceReport({
    generatedAtUtc: options?.generatedAtUtc ?? "2026-07-02T04:00:00.000Z",
    headRelationship: FIXTURE_HEAD_RELATIONSHIP,
    repoRoot: "/repo",
    runGit: () => {
      throw new Error("fixture-backed report should not invoke git");
    },
    runGitStatusShortBranch: () => {
      throw new Error("fixture-backed report should not invoke git status");
    },
    statusOutput: `## main...origin/main\n${NINE_DIRTY_PATHS_STATUS_FIXTURE.trimEnd()}\n`,
    watchdogOwnerlessPaths: options?.watchdogOwnerlessPaths,
  });
}

describe("buildPlannerRootDriftHandoffEvidenceReport nine-path fixture", () => {
  test("lists all nine dirty paths from the supplied porcelain snapshot", () => {
    const report = buildNinePathFixtureReport();

    expect(report.dirtyPaths).toHaveLength(9);
    expect(
      report.dirtyPaths.map((dirtyPath) => dirtyPath.path).toSorted(),
    ).toEqual(
      [
        ...PLANNER_ROOT_DRIFT_SUPPLIED_STILL_OWNERLESS_PATHS,
        ...PLANNER_ROOT_DRIFT_SUPPLIED_BATCH_054_OWNED_PATHS,
      ].toSorted(),
    );
  });

  test("defaults missing watchdog evidence to ownerless for all dirty paths", () => {
    const report = buildNinePathFixtureReport();

    expect(report.ownershipClassification.watchdogOwnerlessPaths).toEqual(
      report.dirtyPaths.map((dirtyPath) => dirtyPath.path),
    );
    expect(report.ownershipClassification.evidenceDiscrepancyPresent).toBe(
      true,
    );

    const stillOwnerless = report.ownershipClassification.pathClassifications
      .filter(
        (classification) =>
          classification.effectiveClass === "supplied-still-ownerless",
      )
      .map((classification) => classification.path);
    expect(stillOwnerless).toEqual([
      ...PLANNER_ROOT_DRIFT_SUPPLIED_STILL_OWNERLESS_PATHS,
    ]);

    const requiresVerification =
      report.ownershipClassification.pathClassifications
        .filter(
          (classification) =>
            classification.effectiveClass === "requires-operator-verification",
        )
        .map((classification) => classification.path);
    expect(requiresVerification).toEqual([
      ...PLANNER_ROOT_DRIFT_SUPPLIED_BATCH_054_OWNED_PATHS,
    ]);
  });

  test("classifies batch-054-owned paths as safe when watchdog agrees on ownership", () => {
    const report = buildNinePathFixtureReport({
      watchdogOwnerlessPaths: [
        ...PLANNER_ROOT_DRIFT_SUPPLIED_STILL_OWNERLESS_PATHS,
      ],
    });

    expect(report.ownershipClassification.evidenceDiscrepancyPresent).toBe(
      false,
    );

    const batchOwned = report.ownershipClassification.pathClassifications
      .filter(
        (classification) =>
          classification.effectiveClass === "supplied-batch-054-owned",
      )
      .map((classification) => classification.path);
    expect(batchOwned).toEqual([
      ...PLANNER_ROOT_DRIFT_SUPPLIED_BATCH_054_OWNED_PATHS,
    ]);

    for (const classification of report.ownershipClassification
      .pathClassifications) {
      if (
        (
          PLANNER_ROOT_DRIFT_SUPPLIED_STILL_OWNERLESS_PATHS as readonly string[]
        ).includes(classification.path)
      ) {
        expect(classification.operatorNextAction).toBe(
          "inspect-and-preserve-ownerless",
        );
        continue;
      }

      expect(classification.operatorNextAction).toBe(
        "recheck-batch-054-terminal-evidence",
      );
      expect(classification.discrepancyNote).toBeUndefined();
    }
  });
});

describe("planner-root-drift-operator-handoff emitted operator guidance", () => {
  test("human output includes preservation, active dependency, and page-refill hold guidance", () => {
    const report = buildNinePathFixtureReport();
    const formatted = formatPlannerRootDriftHandoffEvidenceReport(report);

    expect(formatted).toContain(
      `preservation-statement=${PLANNER_ROOT_DRIFT_NO_MUTATION_STATEMENT}`,
    );
    expect(formatted).toContain(
      `active-dependency=${PLANNER_ROOT_DRIFT_ACTIVE_DEPENDENCY}`,
    );
    expect(formatted).toContain(
      `page-refill-hold=${PLANNER_ROOT_DRIFT_PAGE_REFILL_HOLD}`,
    );
    expect(formatted).toContain("- supplied-still-ownerless-paths");
    expect(formatted).toContain("- supplied-batch-054-owned-paths");
    expect(formatted).toContain("- path-classifications");
    expect(formatted).toContain("- class-operator-next-actions");
  });

  test("markdown output includes preservation, dependency, and page-refill hold guidance", () => {
    const report = buildNinePathFixtureReport();
    const formatted = formatPlannerRootDriftHandoffEvidenceMarkdown(report);

    expect(formatted).toContain("## Preservation Statement");
    expect(formatted).toContain(PLANNER_ROOT_DRIFT_NO_MUTATION_STATEMENT);
    expect(formatted).toContain("## Meta-Planner Page Refill Hold");
    expect(formatted).toContain(PLANNER_ROOT_DRIFT_PAGE_REFILL_HOLD);
    expect(formatted).toContain(
      `Active dependency: \`${PLANNER_ROOT_DRIFT_ACTIVE_DEPENDENCY}\``,
    );
    expect(formatted).toContain("### Per-Path Classification");
    expect(formatted).toContain("### Operator Verification Required");
  });

  test("json output preserves operator-facing classification and guidance fields", () => {
    const report = buildNinePathFixtureReport();
    const parsed = JSON.parse(
      serializePlannerRootDriftHandoffEvidenceReport(report),
    ) as ReturnType<typeof buildNinePathFixtureReport>;

    expect(parsed.ownershipClassification.activeDependency).toBe(
      PLANNER_ROOT_DRIFT_ACTIVE_DEPENDENCY,
    );
    expect(parsed.preservationStatement).toBe(
      PLANNER_ROOT_DRIFT_NO_MUTATION_STATEMENT,
    );
    expect(parsed.pageRefillHoldGuidance).toBe(
      PLANNER_ROOT_DRIFT_PAGE_REFILL_HOLD,
    );
    expect(parsed.ownershipClassification.pathClassifications).toHaveLength(9);
    expect(parsed.ownershipClassification.classGuidance.length).toBeGreaterThan(
      0,
    );
  });
});
