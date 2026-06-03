import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");
const readmePath = join(repoRoot, "README.md");

const phase1CiSteps = [
  "make lint",
  "make typecheck",
  "make test",
  "make build",
  "make validate-data",
] as const;

describe("README Quality Gates CI documentation", () => {
  test("documents GitHub Actions triggers, frozen install, make ci, and workflow path", () => {
    const readme = readFileSync(readmePath, "utf8");
    const qualityGatesIndex = readme.indexOf("## Quality Gates");

    expect(qualityGatesIndex).toBeGreaterThan(-1);
    const qualityGates = readme.slice(qualityGatesIndex);

    expect(qualityGates).toMatch(/pull requests/i);
    expect(qualityGates).toMatch(/pushes to[\s\S]*`main`/i);
    expect(qualityGates).toMatch(/bun install --frozen-lockfile/);
    expect(qualityGates).toMatch(/make ci/);
    expect(qualityGates).toMatch(/\.github\/workflows\/ci\.yml/);
    expect(qualityGates).toMatch(/no repository secrets/i);
  });

  test("lists make ci step order and Fumadocs codegen before typecheck and test", () => {
    const readme = readFileSync(readmePath, "utf8");
    const qualityGates = readme.slice(readme.indexOf("## Quality Gates"));

    for (const step of phase1CiSteps) {
      expect(qualityGates).toContain(step);
    }

    const stepOrder = phase1CiSteps.map((step) => qualityGates.indexOf(step));
    expect(stepOrder.every((index) => index > -1)).toBe(true);
    for (let i = 1; i < stepOrder.length; i += 1) {
      expect(stepOrder[i]).toBeGreaterThan(stepOrder[i - 1] ?? -1);
    }

    expect(qualityGates).toMatch(/pretypecheck/i);
    expect(qualityGates).toMatch(/pretest/i);
    expect(qualityGates).toMatch(/fumadocs-mdx/i);
    expect(qualityGates).toMatch(/\.source\//);
  });

  test("states Phase 1 baseline excludes deploy, linkcheck, PDF validation, and coverage", () => {
    const readme = readFileSync(readmePath, "utf8");
    const qualityGates = readme.slice(readme.indexOf("## Quality Gates"));

    expect(qualityGates).toMatch(/deploy/i);
    expect(qualityGates).toMatch(/linkcheck/i);
    expect(qualityGates).toMatch(/PDF validation|validate-pdf/i);
    expect(qualityGates).toMatch(/coverage/i);
    expect(qualityGates).toMatch(/not part of `make ci`/i);
  });
});
