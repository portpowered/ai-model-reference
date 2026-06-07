import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");
const readmePath = join(repoRoot, "README.md");

describe("README deployment documentation", () => {
  test("static export section documents make build-export as local verification and deploy entrypoint", () => {
    const readme = readFileSync(readmePath, "utf8");
    const staticExportSection = readme.slice(
      readme.indexOf("## Static export (GitHub Pages)"),
      readme.indexOf("## Phase 2 docs authoring"),
    );

    expect(staticExportSection).toMatch(/make build-export/);
    expect(staticExportSection).toMatch(/local verification/i);
    expect(staticExportSection).toMatch(
      /deploy[\s\S]*workflow build entrypoint/i,
    );
    expect(staticExportSection).toMatch(/\.github\/workflows\/deploy\.yml/);
    expect(staticExportSection).toMatch(/GITHUB_PAGES_BASE_PATH/);
    expect(staticExportSection).toMatch(/ai-model-reference/);
    expect(staticExportSection).toMatch(/docs\/operations\.md/);
    expect(staticExportSection).not.toMatch(/before wiring a deploy workflow/i);
    expect(staticExportSection).not.toMatch(/does not deploy `out\/`/i);
  });

  test("operations and release section documents active main deploy and links to operations guide", () => {
    const readme = readFileSync(readmePath, "utf8");
    const operationsSection = readme.slice(
      readme.indexOf("## Operations and release"),
      readme.indexOf("## Quality Gates"),
    );

    expect(operationsSection).toMatch(/Merges to `main`/i);
    expect(operationsSection).toMatch(/GitHub Pages deployment/i);
    expect(operationsSection).toMatch(/\.github\/workflows\/deploy\.yml/);
    expect(operationsSection).toMatch(/make build-export/);
    expect(operationsSection).toMatch(/docs\/operations\.md/);
    expect(operationsSection).toMatch(/deploy check visibility/i);
    expect(operationsSection).toMatch(/commit-SHA traceability/i);
    expect(operationsSection).not.toMatch(/defers production deployment/i);
    expect(operationsSection).not.toMatch(/no deploy workflow/i);
    expect(operationsSection).not.toMatch(
      /When a deploy workflow is added later/i,
    );
  });

  test("quality gates section still distinguishes CI make ci from deploy automation", () => {
    const readme = readFileSync(readmePath, "utf8");
    const qualityGates = readme.slice(readme.indexOf("## Quality Gates"));

    expect(qualityGates).toMatch(/make ci/);
    expect(qualityGates).toMatch(/\.github\/workflows\/ci\.yml/);
    expect(qualityGates).toMatch(/\.github\/workflows\/deploy\.yml/);
    expect(qualityGates).toMatch(
      /neither `\.github\/workflows\/ci\.yml` nor `make ci` invokes deploy/i,
    );
    expect(qualityGates).not.toMatch(/Deploy gates are out of scope/i);
    expect(qualityGates).not.toMatch(/defers production deployment/i);
  });
});
