import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PHASE_1_STATIC_EXPORT_REPAIR_OWNED_PATH_PREFIXES,
  PHASE_2_3_RECONCILIATION_DEPENDS_ON_PHASE_1_STATIC_EXPORT_REPAIR,
  PHASE_2_3_RECONCILIATION_IMPLEMENTATION_NOTES_PATH,
  PHASE_2_3_RECONCILIATION_RECOMMENDED_FOLLOW_UP,
  PHASE_2_3_RECONCILIATION_RESIDUAL_PHASE_1_BLOCKERS,
} from "./phase-2-3-reconciliation-phase-1-dependency";

const repoRoot = join(import.meta.dir, "../../..");

describe("Phase 2/3 reconciliation Phase 1 static-export dependency (US-013)", () => {
  test("records no dependency on open Phase 1 static-export search repair", () => {
    expect(
      PHASE_2_3_RECONCILIATION_DEPENDS_ON_PHASE_1_STATIC_EXPORT_REPAIR,
    ).toBe(false);
  });

  test("implementation notes document assessment, owned paths, and follow-up", () => {
    const notes = readFileSync(
      join(repoRoot, PHASE_2_3_RECONCILIATION_IMPLEMENTATION_NOTES_PATH),
      "utf8",
    );

    expect(notes).toContain(
      "does not depend on any open Phase 1 static-export",
    );
    expect(notes).toContain("make verify-phase-1-github-pages-convergence");
    expect(notes).toContain("make verify-phase-2-3-reconciliation-convergence");
    expect(notes).toContain("Files intentionally not modified");

    for (const prefix of PHASE_1_STATIC_EXPORT_REPAIR_OWNED_PATH_PREFIXES) {
      expect(notes).toContain(prefix);
    }

    expect(notes).toContain(
      PHASE_2_3_RECONCILIATION_RECOMMENDED_FOLLOW_UP.workItemKind,
    );
  });

  test("residual blockers name built-app convergence, not static-export repair", () => {
    expect(
      PHASE_2_3_RECONCILIATION_RESIDUAL_PHASE_1_BLOCKERS.length,
    ).toBeGreaterThan(0);

    for (const blocker of PHASE_2_3_RECONCILIATION_RESIDUAL_PHASE_1_BLOCKERS) {
      expect(blocker.track).toBe("phase-1-built-app-convergence");
      expect(blocker.verificationCommands.length).toBeGreaterThan(0);
    }

    expect(PHASE_2_3_RECONCILIATION_RECOMMENDED_FOLLOW_UP.workItemKind).toBe(
      "phase-1-built-app-convergence-repair",
    );
    expect(
      PHASE_2_3_RECONCILIATION_RECOMMENDED_FOLLOW_UP.referenceDocs,
    ).toContain("factory/docs/phase-1-built-app-convergence-validator.md");
  });
});
