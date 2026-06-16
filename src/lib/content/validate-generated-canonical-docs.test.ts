import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PageAssetConfig, PageMessages } from "./schemas";
import {
  validateGeneratedCanonicalDocs,
  validateGeneratedFoldedSummary,
  validateGeneratedGraphPlacement,
} from "./validate-generated-canonical-docs";

const templateRoot = join(process.cwd(), "docs/templates");

function readTemplateMdx(kind: string): string {
  return readFileSync(join(templateRoot, `${kind}.mdx`), "utf8");
}

function readTemplateMessages(kind: string): PageMessages {
  return JSON.parse(
    readFileSync(join(templateRoot, `${kind}.messages.en.json`), "utf8"),
  ) as PageMessages;
}

function readTemplateAssets(kind: string): PageAssetConfig {
  return JSON.parse(
    readFileSync(join(templateRoot, `${kind}.assets.json`), "utf8"),
  ) as PageAssetConfig;
}

describe("validateGeneratedFoldedSummary", () => {
  test("passes concept template when openingSummary stays out of MDX", () => {
    const errors = validateGeneratedFoldedSummary({
      pagePath: "/docs/concepts/example/page.mdx",
      kind: "concept",
      mdxSource: readTemplateMdx("concept"),
      messages: {
        ...readTemplateMessages("concept"),
        title: "Example",
        description: "Summary",
        openingSummary: "Folded summary for the page hero.",
      },
    });
    expect(errors).toEqual([]);
  });

  test("fails legacy split summary message keys", () => {
    const errors = validateGeneratedFoldedSummary({
      pagePath: "/docs/modules/example/page.mdx",
      kind: "module",
      mdxSource: readTemplateMdx("module"),
      messages: {
        title: "Example",
        description: "Summary",
        openingSummary: "Folded summary.",
        problemStatement: "Legacy problem line.",
      },
    });

    expect(
      errors.some((error) => error.code === "legacy-split-summary-message-key"),
    ).toBe(true);
    expect(errors[0]?.message).toContain("problemStatement");
  });

  test("does not require openingSummary to render inside module MDX", () => {
    const errors = validateGeneratedFoldedSummary({
      pagePath: "/docs/modules/example/page.mdx",
      kind: "module",
      mdxSource: readTemplateMdx("module"),
      messages: {
        title: "Example",
        description: "Summary",
      },
    });

    expect(
      errors.some((error) => error.code === "missing-opening-summary-message"),
    ).toBe(false);
  });

  test("fails glossary MDX that renders openingSummary", () => {
    const mdx = `${readTemplateMdx("glossary")}\n<T k="openingSummary" />\n`;
    const errors = validateGeneratedFoldedSummary({
      pagePath: "/docs/glossary/example/page.mdx",
      kind: "glossary",
      mdxSource: mdx,
      messages: readTemplateMessages("glossary"),
    });

    expect(
      errors.some((error) => error.code === "opening-summary-in-mdx"),
    ).toBe(true);
  });
});

describe("validateGeneratedGraphPlacement", () => {
  test("passes module template graph in how-it-works section", () => {
    const errors = validateGeneratedGraphPlacement({
      pagePath: "/docs/modules/example/page.mdx",
      kind: "module",
      mdxSource: readTemplateMdx("module"),
      assets: readTemplateAssets("module"),
    });
    expect(errors).toEqual([]);
  });

  test("fails module graph embedded in math section", () => {
    const moduleMdx = readTemplateMdx("module");
    const brokenMdx = moduleMdx
      .replace(
        '<Section id="how-it-works"',
        '<Section id="how-it-works-disabled"',
      )
      .replace(
        '<Section id="math-or-compute-schema"',
        `<Section id="math-or-compute-schema"`,
      )
      .replace(
        "<ModuleAttentionSchemaComparison />",
        '<ModuleGraph registryId="module.example-module" assetId="computeFlow" />\n  <ModuleAttentionSchemaComparison />',
      );

    const errors = validateGeneratedGraphPlacement({
      pagePath: "/docs/modules/example/page.mdx",
      kind: "module",
      mdxSource: brokenMdx,
      assets: readTemplateAssets("module"),
    });

    expect(
      errors.some((error) => error.code === "graph-forbidden-section"),
    ).toBe(true);
  });

  test("fails graph components without assetId", () => {
    const conceptMdx = readTemplateMdx("concept").replace(
      'assetId="conceptMap"',
      "",
    );

    const errors = validateGeneratedGraphPlacement({
      pagePath: "/docs/concepts/example/page.mdx",
      kind: "concept",
      mdxSource: conceptMdx,
      assets: readTemplateAssets("concept"),
    });

    expect(
      errors.some((error) => error.code === "graph-missing-asset-id"),
    ).toBe(true);
  });
});

describe("validateGeneratedCanonicalDocs", () => {
  test("passes generated concept template bundle shape", () => {
    const errors = validateGeneratedCanonicalDocs({
      pagePath: "/docs/concepts/example/page.mdx",
      kind: "concept",
      mdxSource: readTemplateMdx("concept"),
      messages: {
        ...readTemplateMessages("concept"),
        title: "Example",
        description: "Summary",
        openingSummary: "Folded summary for the page hero.",
      },
      assets: readTemplateAssets("concept"),
    });
    expect(errors).toEqual([]);
  });

  test("reports page path evidence for MDX prose violations", () => {
    const conceptMdx = readTemplateMdx("concept").replace(
      '<Section id="what-it-is" titleKey="sections.whatItIs.title">',
      '## Hard-coded heading\n\n<Section id="what-it-is" titleKey="sections.whatItIs.title">',
    );

    const errors = validateGeneratedCanonicalDocs({
      pagePath: "/docs/concepts/example/page.mdx",
      kind: "concept",
      mdxSource: conceptMdx,
      messages: {
        title: "Example",
        description: "Summary",
        openingSummary: "Folded summary.",
      },
      assets: readTemplateAssets("concept"),
    });

    expect(
      errors.some((error) => error.code === "mdx-hard-coded-heading"),
    ).toBe(true);
    expect(errors[0]?.message).toContain("/docs/concepts/example/page.mdx");
  });
});
