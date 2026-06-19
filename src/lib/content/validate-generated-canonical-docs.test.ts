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
  test("passes concept template without any rendered opening-summary requirement", () => {
    const errors = validateGeneratedFoldedSummary({
      pagePath: "/docs/concepts/example/page.mdx",
      kind: "concept",
      mdxSource: readTemplateMdx("concept"),
      messages: {
        ...readTemplateMessages("concept"),
        title: "Example",
        description: "Summary",
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

  test("passes multiple module teaching visuals in how-it-works", () => {
    const moduleMdx = readTemplateMdx("module").replace(
      '<ModuleGraph registryId="module.example-module" assetId="computeFlow" />',
      [
        '<ModuleGraph registryId="module.example-module" assetId="computeFlow" />',
        '<ModuleChart registryId="module.example-module" assetId="activationHeatmap" />',
      ].join("\n  "),
    );

    const assets = {
      ...readTemplateAssets("module"),
      activationHeatmap: {
        type: "chart" as const,
        chartId: "chart.activation-family.relu-hidden-state-heatmap",
        altKey: "assets.activationHeatmap.alt",
        captionKey: "assets.activationHeatmap.caption",
      },
    };

    const errors = validateGeneratedGraphPlacement({
      pagePath: "/docs/modules/example/page.mdx",
      kind: "module",
      mdxSource: moduleMdx,
      assets,
    });

    expect(errors).toEqual([]);
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
      },
      assets: readTemplateAssets("concept"),
    });

    expect(
      errors.some((error) => error.code === "mdx-hard-coded-heading"),
    ).toBe(true);
    expect(errors[0]?.message).toContain("/docs/concepts/example/page.mdx");
  });

  test("fails paper templates that keep duplicate relationship sections", () => {
    const errors = validateGeneratedCanonicalDocs({
      pagePath: "/docs/papers/example/page.mdx",
      kind: "paper",
      mdxSource: `${readTemplateMdx("paper")}\n<Section id="what-it-connects-to" titleKey="sections.related.title" />\n`,
      messages: {
        title: "Example",
        description: "Summary",
      },
      assets: readTemplateAssets("paper"),
    });

    expect(
      errors.some(
        (error) => error.code === "forbidden-duplicate-related-section",
      ),
    ).toBe(true);
  });

  test("fails model assets that define captions", () => {
    const errors = validateGeneratedCanonicalDocs({
      pagePath: "/docs/models/example/page.mdx",
      kind: "model",
      mdxSource: readTemplateMdx("model"),
      messages: {
        ...readTemplateMessages("model"),
        title: "Example",
        description: "Summary",
        assets: {
          architectureGraph: {
            alt: "Alt text",
            caption: "Caption should not exist",
          },
        },
      },
      assets: {
        ...readTemplateAssets("model"),
        architectureGraph: {
          ...readTemplateAssets("model").architectureGraph,
          captionKey: "assets.architectureGraph.caption",
        },
      },
    });

    expect(
      errors.some((error) => error.code === "forbidden-model-asset-caption"),
    ).toBe(true);
    expect(
      errors.some(
        (error) => error.code === "forbidden-model-asset-caption-message",
      ),
    ).toBe(true);
  });

  test("fails training pages without formulas", () => {
    const mdx = readTemplateMdx("training-regime").replace(
      /<BlockMath[\s\S]*?\/>\n?/,
      "",
    );
    const errors = validateGeneratedCanonicalDocs({
      pagePath: "/docs/training/example/page.mdx",
      kind: "training-regime",
      mdxSource: mdx,
      messages: {
        title: "Example",
        description: "Summary",
      },
      assets: readTemplateAssets("training-regime"),
    });

    expect(
      errors.some((error) => error.code === "missing-required-math"),
    ).toBe(true);
  });
});
