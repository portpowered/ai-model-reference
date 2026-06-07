import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");
const checklistPath = join(repoRoot, "docs/internal/checklist.md");
const deployWorkflowPath = join(repoRoot, ".github/workflows/deploy.yml");

function readChecklist(): string {
  if (!existsSync(checklistPath)) {
    throw new Error(
      "docs/internal/checklist.md is missing; planner deployment control state must exist",
    );
  }
  return readFileSync(checklistPath, "utf8");
}

function sectionSlice(
  content: string,
  heading: string,
  nextHeading?: string,
): string {
  const start = content.indexOf(heading);
  expect(start).toBeGreaterThanOrEqual(0);
  if (!nextHeading) {
    return content.slice(start);
  }
  const end = content.indexOf(nextHeading, start + heading.length);
  return end === -1 ? content.slice(start) : content.slice(start, end);
}

describe("docs/internal/checklist.md planner deployment posture", () => {
  test("exists with control-state sections when deploy workflow is present", () => {
    if (!existsSync(deployWorkflowPath)) {
      return;
    }

    const checklist = readChecklist();
    expect(checklist).toContain("## Current Control State");
    expect(checklist).toContain("## Current Direction");
    expect(checklist).toContain("## Open repair inventory");
  });

  test("control state documents active deploy.yml instead of missing or deferred deployment", () => {
    if (!existsSync(deployWorkflowPath)) {
      return;
    }

    const checklist = readChecklist();
    const controlState = sectionSlice(
      checklist,
      "## Current Control State",
      "## Current Direction",
    );

    expect(controlState).toMatch(/\.github\/workflows\/deploy\.yml/);
    expect(controlState).toMatch(/make build-export/);
    expect(controlState).toMatch(/GITHUB_PAGES_BASE_PATH/);
    expect(controlState).toMatch(/docs\/operations\.md/);
    expect(controlState).not.toMatch(/defers production deployment/i);
    expect(controlState).not.toMatch(/no deploy workflow/i);
    expect(controlState).not.toMatch(/deploy\.yml is missing/i);
    expect(controlState).not.toMatch(/workflow is missing/i);
    expect(controlState).not.toMatch(
      /README and operations still document deployment as deferred/i,
    );
  });

  test("current direction does not reopen deferral or missing-workflow evidence", () => {
    if (!existsSync(deployWorkflowPath)) {
      return;
    }

    const checklist = readChecklist();
    const direction = sectionSlice(
      checklist,
      "## Current Direction",
      "## Recurring control function",
    );

    expect(direction).not.toMatch(/defers production deployment/i);
    expect(direction).not.toMatch(/no deploy workflow/i);
    expect(direction).not.toMatch(/deploy\.yml is missing/i);
    expect(direction).not.toMatch(
      /deploy workflow activation is (missing|deferred)/i,
    );
  });

  test("phase 1 operational rows mark deploy and deployment-status as implemented", () => {
    if (!existsSync(deployWorkflowPath)) {
      return;
    }

    const checklist = readChecklist();
    const architectureRows = sectionSlice(
      checklist,
      "## Phase 1 operational architecture rows",
      "## Phase 1 GitHub Pages convergence rows",
    );

    expect(architectureRows).toMatch(
      /Website deploys automatically[\s\S]*\*\*Implemented\*\*/i,
    );
    expect(architectureRows).toMatch(
      /Deployment status is visible[\s\S]*\*\*Implemented\*\*/i,
    );
    expect(architectureRows).toMatch(/docs\/operations\.md/);
    expect(architectureRows).not.toMatch(/defers production deployment/i);
  });

  test("open repair inventory describes remaining acceptance bar without stale deferral evidence", () => {
    if (!existsSync(deployWorkflowPath)) {
      return;
    }

    const checklist = readChecklist();
    const repairInventory = sectionSlice(checklist, "## Open repair inventory");

    expect(repairInventory).toMatch(
      /phase-1-github-pages-deploy-workflow-activation/,
    );
    expect(repairInventory).toMatch(
      /phase-1-github-pages-docs-and-planner-alignment/,
    );
    expect(repairInventory).toMatch(/Complete|In progress|Pending/);
    expect(repairInventory).not.toMatch(/lacks deploy automation/i);
    expect(repairInventory).not.toMatch(/no deploy workflow/i);
    expect(repairInventory).not.toMatch(/defers production deployment/i);
  });
});
