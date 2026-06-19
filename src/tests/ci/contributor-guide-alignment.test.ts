import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");
const contributorGuidePath = join(
  repoRoot,
  "docs/contributors/CONTRIBUTING.md",
);
const readmePath = join(repoRoot, "README.md");

function runBun(args: string[]) {
  return spawnSync("bun", args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });
}

function runMake(target: string) {
  return spawnSync("make", [target], {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe("contributor documented workflow commands", () => {
  test("generate:page-bundle dry-run previews observable paths from committed sample spec", () => {
    const result = runBun([
      "run",
      "generate:page-bundle",
      "--",
      "--spec",
      "page-specs/page-spec-workflow-sample.json",
      "--dry-run",
    ]);

    expect(result.status).toBe(0);
    const output = `${result.stdout}${result.stderr}`;
    expect(output).toContain("Registry id: concept.page-spec-workflow-sample");
    expect(output).toContain("/docs/concepts/page-spec-workflow-sample");
    expect(output).toContain("Planned files:");
    expect(output).toContain("page-spec-workflow-sample/page.mdx");
    expect(output).toContain("Dry run complete");
  });

  test("scaffold:doc-page --help steers contributors toward generate-page-bundle", () => {
    const result = runBun(["run", "scaffold:doc-page", "--", "--help"]);

    expect(result.status).toBe(0);
    const output = `${result.stdout}${result.stderr}`;
    expect(output).toContain("generate-page-bundle");
    expect(output).toMatch(/prefer/i);
  });

  test("contributor guide presents generate:page-bundle as the common canonical path", () => {
    const guide = readFileSync(contributorGuidePath, "utf8");

    expect(guide).toContain(
      "For module, model, paper, and training-regime\npages, this page-spec flow is the supported common path; template-copy work is\nfor exceptional cases only.",
    );
    expect(guide).toContain(
      "use generate:page-bundle with a page spec and keep the emitted page bundle, registry record, messages, assets, and graph record aligned.",
    );
    expect(guide).toContain("See `page-specs/` for checked-in sample inputs");
    expect(guide).not.toContain("because scaffold does not support module yet");
    expect(guide).not.toContain(
      "docs/temp/processes/content-page-generation-workflow-relevant-files.md",
    );
  });

  test("README points maintainers to checked-in page-spec samples for supported canonical kinds", () => {
    const readme = readFileSync(readmePath, "utf8");

    expect(readme).toContain(
      "path for `concept`, `glossary`, `module`, `model`, `paper`, and\n`training-regime` pages:",
    );
    expect(readme).toContain(
      "Checked-in example specs for each supported canonical kind live in",
    );
    expect(readme).toContain("`page-specs/`.");
  });

  test("committed expanded-kind sample specs dry-run through generate:page-bundle", () => {
    const cases = [
      {
        specPath: "page-specs/module-page-spec-workflow-sample.json",
        registryId: "module.module-page-spec-workflow-sample",
        route: "/docs/modules/module-page-spec-workflow-sample",
      },
      {
        specPath: "page-specs/model-page-spec-workflow-sample.json",
        registryId: "model.model-page-spec-workflow-sample",
        route: "/docs/models/model-page-spec-workflow-sample",
      },
      {
        specPath: "page-specs/paper-page-spec-workflow-sample.json",
        registryId: "paper.paper-page-spec-workflow-sample",
        route: "/docs/papers/paper-page-spec-workflow-sample",
      },
      {
        specPath: "page-specs/training-regime-page-spec-workflow-sample.json",
        registryId: "training-regime.training-regime-page-spec-workflow-sample",
        route: "/docs/training/training-regime-page-spec-workflow-sample",
      },
    ] as const;

    for (const testCase of cases) {
      const result = runBun([
        "run",
        "generate:page-bundle",
        "--",
        "--spec",
        testCase.specPath,
        "--dry-run",
      ]);

      expect(result.status).toBe(0);
      const output = `${result.stdout}${result.stderr}`;
      expect(output).toContain(`Registry id: ${testCase.registryId}`);
      expect(output).toContain(testCase.route);
      expect(output).toContain("Planned files:");
      expect(output).toContain("Dry run complete");
    }
  });

  test("scaffold:doc-page dry-run prints planned paths without writing files", () => {
    const slug = `contrib-dry-run-${crypto.randomUUID()}`;
    const result = runBun([
      "run",
      "scaffold:doc-page",
      "--",
      "--kind",
      "concept",
      "--slug",
      slug,
      "--title",
      "Contributor Dry Run",
      "--concept-type",
      "general",
      "--dry-run",
    ]);

    expect(result.status).toBe(0);
    const output = `${result.stdout}${result.stderr}`;
    expect(output).toContain(`concept.${slug}`);
    expect(output).toContain(`/docs/concepts/${slug}`);
    expect(output).toContain("Dry run complete");
    expect(output).not.toContain("Scaffold complete.");
  });

  test("generate:page-bundle writes a valid concept bundle that passes validate-data", async () => {
    const slug = `contrib-write-${crypto.randomUUID()}`;
    const tempRoot = join(repoRoot, "tmp", "contributor-guide-workflow", slug);
    const specPath = join(tempRoot, "page-spec.json");

    try {
      await mkdir(tempRoot, { recursive: true });
      await writeFile(
        specPath,
        JSON.stringify({
          kind: "concept",
          slug,
          title: "Contributor Workflow Write Test",
          summary: "Generated during contributor guide workflow verification.",
          conceptType: "general",
          status: "draft",
        }),
      );

      const generateResult = runBun([
        "run",
        "generate:page-bundle",
        "--",
        "--spec",
        specPath,
      ]);
      expect(generateResult.status).toBe(0);
      expect(`${generateResult.stdout}${generateResult.stderr}`).toContain(
        "Page bundle generation complete.",
      );

      const pagePath = join(
        repoRoot,
        "src/content/docs/concepts",
        slug,
        "page.mdx",
      );
      const registryPath = join(
        repoRoot,
        "src/content/registry/concepts",
        `${slug}.json`,
      );

      expect(await pathExists(pagePath)).toBe(true);
      expect(await pathExists(registryPath)).toBe(true);

      const validateResult = runMake("validate-data");
      expect(validateResult.status).toBe(0);
      expect(`${validateResult.stdout}${validateResult.stderr}`).toMatch(
        /validate-registry|validate data|validation/i,
      );
    } finally {
      const pageDir = join(repoRoot, "src/content/docs/concepts", slug);
      const registryPath = join(
        repoRoot,
        "src/content/registry/concepts",
        `${slug}.json`,
      );
      const graphPath = join(
        repoRoot,
        "src/content/registry/graphs",
        `${slug}-concept-map.json`,
      );

      await rm(pageDir, { recursive: true, force: true });
      await rm(registryPath, { force: true });
      await rm(graphPath, { force: true });
      await rm(tempRoot, { recursive: true, force: true });
    }
  }, 15_000);

  test("make validate-data passes on committed registry content", () => {
    const result = runMake("validate-data");

    expect(result.status).toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(
      /validate-registry|validate data|validation/i,
    );
  });
});
