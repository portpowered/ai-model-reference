import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validatePageTemplateConformance } from "./page-template-conformance";

const templateRoot = join(process.cwd(), "docs", "templates");
const docsRoot = "/repo/src/content/docs";

function readTemplate(kind: string): string {
  return readFileSync(join(templateRoot, `${kind}.mdx`), "utf8");
}

describe("validatePageTemplateConformance", () => {
  test("passes the module template itself", () => {
    const errors = validatePageTemplateConformance({
      pagePath: `${docsRoot}/modules/example-module/page.mdx`,
      docsRoot,
      kind: "module",
      mdxSource: readTemplate("module"),
    });

    expect(errors).toEqual([]);
  });

  test("reports missing module variants section", () => {
    const missingVariantsSection = readTemplate("module").replace(
      /\n<Section id="compared-to-nearby-modules"[\s\S]*?<\/Section>\n/,
      "\n",
    );

    const errors = validatePageTemplateConformance({
      pagePath: `${docsRoot}/modules/example-module/page.mdx`,
      docsRoot,
      kind: "module",
      mdxSource: missingVariantsSection,
    });

    expect(
      errors.some(
        (error) => error.code === "page-template-section-order-mismatch",
      ),
    ).toBe(true);
  });

  test("reports mismatched section components", () => {
    const oldAttentionSchema = readTemplate("module")
      .replace(
        "ModuleAttentionSchemaComparison",
        "ModuleAttentionSchemaComparison",
      )
      .replace(
        "<ModuleAttentionSchemaComparison />",
        '<ModuleAttentionSchema schemaId="mha" />',
      );

    const errors = validatePageTemplateConformance({
      pagePath: `${docsRoot}/modules/example-module/page.mdx`,
      docsRoot,
      kind: "module",
      mdxSource: oldAttentionSchema,
    });

    expect(
      errors.some(
        (error) =>
          error.code === "page-template-section-components-mismatch" &&
          error.message.includes('section "math-or-compute-schema"'),
      ),
    ).toBe(true);
  });

  test("allows activation module charts in the how-it-works section", () => {
    const activationChartPage = readTemplate("module")
      .replace("- example-tag", "- activation")
      .replace(
        '<ModuleGraph registryId="module.example-module" assetId="computeFlow" />',
        '<ModuleChart registryId="module.example-module" assetId="computeFlow" />',
      );

    const errors = validatePageTemplateConformance({
      pagePath: `${docsRoot}/modules/example-activation/page.mdx`,
      docsRoot,
      kind: "module",
      mdxSource: activationChartPage,
    });

    expect(errors).toEqual([]);
  });

  test("skips configured exception pages", () => {
    const legacyGroupedQueryPage = readTemplate("module").replace(
      /\n<Section id="compared-to-nearby-modules"[\s\S]*?<\/Section>\n/,
      "\n",
    );

    const errors = validatePageTemplateConformance({
      pagePath: `${docsRoot}/modules/grouped-query-attention/page.mdx`,
      docsRoot,
      kind: "module",
      mdxSource: legacyGroupedQueryPage,
    });

    expect(errors).toEqual([]);
  });

  test("passes the paper template itself", () => {
    const errors = validatePageTemplateConformance({
      pagePath: `${docsRoot}/papers/example-paper/page.mdx`,
      docsRoot,
      kind: "paper",
      mdxSource: readTemplate("paper"),
    });

    expect(errors).toEqual([]);
  });

  test("passes the training-regime template itself", () => {
    const errors = validatePageTemplateConformance({
      pagePath: `${docsRoot}/training/example-regime/page.mdx`,
      docsRoot,
      kind: "training-regime",
      mdxSource: readTemplate("training-regime"),
    });

    expect(errors).toEqual([]);
  });

  test("passes the system template itself", () => {
    const errors = validatePageTemplateConformance({
      pagePath: `${docsRoot}/systems/example-system/page.mdx`,
      docsRoot,
      kind: "system",
      mdxSource: readTemplate("system"),
    });

    expect(errors).toEqual([]);
  });
});
