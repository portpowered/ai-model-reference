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

  test("allows optional how-it-differs section on system pages", () => {
    const withHowItDiffers = readTemplate("system").replace(
      /<Section id="practical-impact"/,
      `<Section id="how-it-differs" titleKey="sections.howItDiffers.title">
  <T k="sections.howItDiffers.body" />
</Section>

<Section id="practical-impact"`,
    );

    const errors = validatePageTemplateConformance({
      pagePath: `${docsRoot}/systems/dynamic-batching/page.mdx`,
      docsRoot,
      kind: "system",
      mdxSource: withHowItDiffers,
    });

    expect(errors).toEqual([]);
  });
});
