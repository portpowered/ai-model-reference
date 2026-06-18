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
import { MODULES_DOCS_ROOT } from "@/lib/content/content-paths";
import { expectGlossaryBodyOmitsTitleHeading } from "@/lib/content/glossary-test-helpers";
import { loadModulePage } from "@/lib/content/module-page";
import { pageMessagesSchema } from "@/lib/content/schemas";

const pageDir = join(MODULES_DOCS_ROOT, "bidirectional-attention");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

describe("bidirectional-attention page messages", () => {
  test("includes the localized fields required by the module template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Bidirectional Attention");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(
      messages.sections?.mathOrComputeSchema?.body?.length,
    ).toBeGreaterThan(0);
    expect(messages.math?.mhaSchema?.label).toBe("Causal attention");
    expect(messages.math?.gqaSchema?.label).toBe("Bidirectional attention");
    expect(messages.math?.gqaSchema?.variableDefinitions?.gi?.term).toBe(
      "M_{\\mathrm{bi}}",
    );
  });
});

describe("loadModulePage bidirectional-attention", () => {
  test("renders the canonical module structure with causal comparison and nearby links", async () => {
    const page = await loadModulePage("bidirectional-attention");

    expect(page.frontmatter.registryId).toBe("module.bidirectional-attention");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Bidirectional Attention");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expect(html).toContain("At a glance");
    expect(html).toContain("Math Or Compute Schema");
    expect(html).toContain("Compared To Nearby Modules");
    expect(html).toContain("masked language model");
    expect(html).toContain('data-attention-variant-comparison="true"');
    expect(html).toContain('data-attention-variant-active="bidirectional"');
    expect(html).toContain('data-attention-variant-option="causal"');
    expect(html).toContain('data-attention-variant-option="bidirectional"');
    expect(html).toContain(
      'data-graph-id="graph.bidirectional-attention-time-pattern"',
    );
    expect(html).toContain(
      'data-graph-node-id="bidirectional-time-kv-t-plus-1"',
    );
    expect(html).toContain(
      'data-table-id="table.bidirectional-attention-comparison"',
    );
    expect(html).toContain("Visible context per query");
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/glossary/encoder"');
    expect(html).toContain('href="/docs/glossary/encoder-decoder"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect((html.match(/data-testid="tag-pill-list"/g) ?? []).length).toBe(1);
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain('aria-label="Module metadata"');
  });
});

describe("bidirectional-attention page assets", () => {
  test("resolve graph and table assets with message-backed copy", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.computeFlow.type).toBe("attention-variant-graph");
    if (assets.computeFlow.type === "attention-variant-graph") {
      expect(
        assets.computeFlow.variants.map((variant) => variant.graphId),
      ).toEqual([
        "graph.multi-head-attention-time-pattern",
        "graph.bidirectional-attention-time-pattern",
      ]);
    }
    expect(assets.comparisonTable.type).toBe("table");
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});
