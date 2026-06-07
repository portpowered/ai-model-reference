import { describe, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");
const operationsPath = join(repoRoot, "docs/operations.md");

const requiredSections = [
  { heading: "## Deployment posture", topic: "deployment posture" },
  { heading: "## Branch protection", topic: "branch protection" },
  { heading: "## CI status expectations", topic: "CI status expectations" },
  { heading: "## Release process", topic: "release process" },
  { heading: "## Rollback process", topic: "rollback process" },
  { heading: "## Commit-SHA traceability", topic: "commit-SHA traceability" },
] as const;

describe("docs/operations.md maintainer guide", () => {
  test("exists and includes required operational sections", () => {
    if (!existsSync(operationsPath)) {
      throw new Error(
        "docs/operations.md is missing; maintainer operational closure docs must exist at docs/operations.md",
      );
    }

    const operations = readFileSync(operationsPath, "utf8");

    for (const { heading, topic } of requiredSections) {
      if (!operations.includes(heading)) {
        throw new Error(
          `docs/operations.md is missing required section for ${topic} (expected heading: ${heading})`,
        );
      }
    }
  });

  test("documents active GitHub Pages deployment via GitHub Actions", () => {
    const operations = readFileSync(operationsPath, "utf8");

    if (!/GitHub Actions/i.test(operations)) {
      throw new Error(
        "docs/operations.md must describe GitHub Pages deployment via GitHub Actions",
      );
    }

    if (/defers production deployment/i.test(operations)) {
      throw new Error(
        "docs/operations.md must not claim Phase 1 defers production deployment",
      );
    }

    if (/no deploy workflow/i.test(operations)) {
      throw new Error(
        "docs/operations.md must not claim no deploy workflow exists",
      );
    }
  });

  test("names deploy workflow, trigger, build entrypoint, artifact, and public URL", () => {
    const operations = readFileSync(operationsPath, "utf8");

    const requiredStrings = [
      ".github/workflows/deploy.yml",
      "push",
      "main",
      "make build-export",
      "out/",
      "GITHUB_PAGES_BASE_PATH",
      "ai-model-reference",
      "https://portpowered.github.io/ai-model-reference/",
    ] as const;

    for (const value of requiredStrings) {
      if (!operations.includes(value)) {
        throw new Error(
          `docs/operations.md must document active deploy path including: ${value}`,
        );
      }
    }
  });

  test("documents required GitHub Pages settings and workflow permissions", () => {
    const operations = readFileSync(operationsPath, "utf8");

    const requiredStrings = [
      "GitHub Actions",
      "pages: write",
      "id-token: write",
      "contents: read",
      "github-pages",
    ] as const;

    for (const value of requiredStrings) {
      if (!operations.includes(value)) {
        throw new Error(
          `docs/operations.md must document GitHub Pages settings including: ${value}`,
        );
      }
    }
  });

  test("marks automatic deploy and deployment-status visibility as implemented", () => {
    const operations = readFileSync(operationsPath, "utf8");

    if (
      !/Website deploys automatically[\s\S]*\*\*Implemented\*\*/i.test(
        operations,
      )
    ) {
      throw new Error(
        "docs/operations.md checklist must mark automatic deploy as Implemented",
      );
    }

    if (
      !/Deployment status is visible[\s\S]*\*\*Implemented\*\*/i.test(
        operations,
      )
    ) {
      throw new Error(
        "docs/operations.md checklist must mark deployment-status visibility as Implemented",
      );
    }
  });

  test("describes release, rollback, and SHA traceability using live deploy checks", () => {
    const operations = readFileSync(operationsPath, "utf8");

    const releaseSection = operations.slice(
      operations.indexOf("## Release process"),
      operations.indexOf("## Rollback process"),
    );
    const rollbackSection = operations.slice(
      operations.indexOf("## Rollback process"),
      operations.indexOf("## Commit-SHA traceability"),
    );
    const traceabilitySection = operations.slice(
      operations.indexOf("## Commit-SHA traceability"),
    );

    for (const [name, section] of [
      ["Release process", releaseSection],
      ["Rollback process", rollbackSection],
      ["Commit-SHA traceability", traceabilitySection],
    ] as const) {
      if (!/\*\*deploy\*\*/i.test(section)) {
        throw new Error(
          `docs/operations.md ${name} must reference the deploy check`,
        );
      }
      if (/interim release \(pre-deploy\)/i.test(section)) {
        throw new Error(
          `docs/operations.md ${name} must not use interim pre-deploy-only language`,
        );
      }
    }

    if (
      !/portpowered\.github\.io\/ai-model-reference/.test(traceabilitySection)
    ) {
      throw new Error(
        "docs/operations.md commit-SHA traceability must reference the published site URL",
      );
    }
  });
});
