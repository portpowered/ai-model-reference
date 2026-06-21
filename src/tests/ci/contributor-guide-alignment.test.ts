import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");

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
