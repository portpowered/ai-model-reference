import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");
const batch014Path = join(
  repoRoot,
  "factory/docs/phase-1-github-pages-repair-batch-014.json",
);
type Batch014Work = {
  name: string;
  payload: Record<string, unknown>;
};

type Batch014Document = {
  works: Batch014Work[];
};

function readBatch014(): Batch014Document {
  return JSON.parse(readFileSync(batch014Path, "utf8")) as Batch014Document;
}

function plannerGuidanceText(work: Batch014Work): string {
  const { summary, implementationStatus } = work.payload;
  return [summary, implementationStatus].filter(Boolean).join("\n");
}

describe("batch-014 planner deployment guidance", () => {
  test("workflow/ops work item documents wired deploy.yml instead of missing automation", () => {
    const batch = readBatch014();
    const opsWork = batch.works.find(
      (work) => work.name === "phase-1-github-pages-workflow-and-ops-alignment",
    );
    expect(opsWork).toBeDefined();

    const guidanceText = plannerGuidanceText(opsWork as Batch014Work);
    expect(guidanceText).toMatch(/\.github\/workflows\/deploy\.yml/);
    expect(guidanceText).toMatch(/make internal-build-export/);
    expect(guidanceText).toMatch(/GITHUB_PAGES_BASE_PATH/);
    expect(guidanceText).not.toMatch(/lacks deploy automation/i);
    expect(guidanceText).not.toMatch(/no deploy workflow/i);
    expect(guidanceText).not.toMatch(/defers production deployment/i);
  });

  test("loopback planner note references wired deploy automation and remaining validator closure", () => {
    const batch = readBatch014();
    const loopback = batch.works.find(
      (work) =>
        work.name === "ideafy-loopback-phase-1-github-pages-repair-batch-014",
    );
    expect(loopback).toBeDefined();

    const guidanceText = plannerGuidanceText(loopback as Batch014Work);
    expect(guidanceText).toMatch(/\.github\/workflows\/deploy\.yml/);
    expect(guidanceText).toMatch(/convergence/i);
    expect(guidanceText).not.toMatch(/lacks deploy automation/i);
    expect(guidanceText).not.toMatch(/no deploy workflow/i);
  });
});
