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

const pageDir = join(MODULES_DOCS_ROOT, "causal-attention");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

describe("causal-attention page messages", () => {
  test("includes the localized fields required by the module template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Causal Attention");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(
      messages.sections?.mathOrComputeSchema?.body?.length,
    ).toBeGreaterThan(0);
    expect(messages.math?.mhaSchema?.label).toBe("Causal attention");
    expect(messages.math?.gqaSchema?.label).toBe("Bidirectional attention");
    expect(messages.math?.mhaSchema?.formula).toContain("M_{\\mathrm{causal}}");
  });
});

describe("loadModulePage causal-attention", () => {
  test("renders the canonical module structure with mask-pattern comparison and generation links", async () => {
    const page = await loadModulePage("causal-attention");

    expect(page.frontmatter.registryId).toBe("module.causal-attention");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Causal Attention");

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
    expect(html).toContain("Autoregressive Generation");
    expect(html).toContain('data-attention-variant-comparison="true"');
    expect(html).toContain('data-attention-variant-active="causal"');
    expect(html).toContain('data-attention-variant-option="causal"');
    expect(html).toContain('data-attention-variant-option="bidirectional"');
    expect(html).toContain(
      'data-graph-id="graph.multi-head-attention-time-pattern"',
    );
    expect(html).toContain('data-graph-node-id="mha-time-kv-t-1"');
    expect(html).toContain('data-table-id="table.causal-attention-comparison"');
    expect(html).toContain("Visible context per query");
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/modules/bidirectional-attention"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('href="/docs/glossary/decoder"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect((html.match(/data-testid="tag-pill-list"/g) ?? []).length).toBe(1);
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain('aria-label="Module metadata"');
  });
});

describe("causal-attention page assets", () => {
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
