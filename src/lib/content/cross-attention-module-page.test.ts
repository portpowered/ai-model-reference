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

const pageDir = join(MODULES_DOCS_ROOT, "cross-attention");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

describe("cross-attention page messages", () => {
  test("includes the localized fields required by the module template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Cross-Attention");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(
      messages.sections?.mathOrComputeSchema?.body?.length,
    ).toBeGreaterThan(0);
    expect(messages.math?.selfAttentionSchema?.label).toBe("Self-attention");
    expect(messages.math?.crossAttentionSchema?.label).toBe("Cross-attention");
    expect(messages.math?.crossAttentionSchema?.formula).toContain("Q(Y)");
    expect(messages.math?.crossAttentionSchema?.formula).toContain("K(X)");
  });
});

describe("loadModulePage cross-attention", () => {
  test("renders the canonical module structure with separate-memory teaching aids", async () => {
    const page = await loadModulePage("cross-attention");

    expect(page.frontmatter.registryId).toBe("module.cross-attention");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Cross-Attention");

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
    expect(html).toContain("external memory slots");
    expect(html).toContain(
      "usually still reads the same growing sequence, while",
    );
    expect(html).toContain(
      "again changes the memory source rather than simply opening left and right context",
    );
    expect(html).toContain('data-attention-variant-comparison="true"');
    expect(html).toContain('data-attention-variant-active="cross"');
    expect(html).toContain('data-attention-variant-option="self"');
    expect(html).toContain('data-attention-variant-option="cross"');
    expect(html).toContain(
      'data-graph-id="graph.cross-attention-memory-pattern"',
    );
    expect(html).toContain('data-graph-node-id="cross-time-kv-s-2"');
    expect(html).toContain('data-table-id="table.cross-attention-comparison"');
    expect(html).toContain("Where keys and values come from");
    expect(html).toContain('href="/docs/glossary/encoder-decoder"');
    expect(html).toContain('href="/docs/glossary/multimodal-model"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect((html.match(/data-testid="tag-pill-list"/g) ?? []).length).toBe(1);
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain("Vaswani, Ashish");
    expect(html).toContain('href="https://arxiv.org/abs/1706.03762"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain('aria-label="Module metadata"');
  });
});

describe("cross-attention page assets", () => {
  test("resolve graph and table assets with message-backed copy", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.computeFlow.type).toBe("attention-variant-graph");
    if (assets.computeFlow.type === "attention-variant-graph") {
      expect(assets.computeFlow.defaultVariantId).toBe("cross");
      expect(
        assets.computeFlow.variants.map((variant) => variant.graphId),
      ).toEqual([
        "graph.multi-head-attention-time-pattern",
        "graph.cross-attention-memory-pattern",
      ]);
    }
    expect(assets.comparisonTable.type).toBe("table");
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});
