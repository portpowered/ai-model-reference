import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { BYTE_LEVEL_TOKENIZATION_PAGE_DIR } from "@/lib/content/content-paths";
import { expectGlossaryBodyOmitsTitleHeading } from "@/lib/content/glossary-test-helpers";
import { loadModulePage } from "@/lib/content/module-page";
import { pageMessagesSchema } from "@/lib/content/schemas";

const pageDir = BYTE_LEVEL_TOKENIZATION_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

describe("byte-level-tokenization page messages", () => {
  test("includes required localized fields for the module page", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Byte-Level Tokenization");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body?.length).toBeGreaterThan(0);
    expect(
      messages.math?.byteCoverageSchema?.variableDefinitions?.bi?.term,
    ).toBe("b_i");
    expect(
      messages.math?.bytePairMergeSchema?.variableDefinitions?.pk?.term,
    ).toBe("p_k");
  });
});

describe("loadModulePage byte-level-tokenization", () => {
  test("compiles MDX with local namespaces and renders byte-level explainer content", async () => {
    const page = await loadModulePage("byte-level-tokenization");

    expect(page.frontmatter.registryId).toBe("module.byte-level-tokenization");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Byte-Level Tokenization");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expect(html).toContain("treats text as byte data first");
    expect(html).toContain("UTF-8");
    expect(html).toContain("byte pair encoding");
    expect(html).toContain("cafe");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).toContain(
      'data-graph-id="graph.byte-level-tokenization-compute-flow"',
    );
    expect(html).toContain('data-graph-node-id="byte-pieces"');
    expect(html).toContain('data-math-schema="byteCoverage"');
    expect(html).toContain('data-math-schema="bytePairMerge"');
    expect(html).toContain(
      "Example model links will render from registry usage",
    );
  });
});

describe("byte-level-tokenization page assets", () => {
  test("resolves graph assets with message-backed alt and captions", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.computeFlow.type).toBe("graph");
    if (assets.computeFlow.type === "graph") {
      expect(assets.computeFlow.graphId).toBe(
        "graph.byte-level-tokenization-compute-flow",
      );
    }
    expect(assets.comparisonTable.type).toBe("table");
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});
