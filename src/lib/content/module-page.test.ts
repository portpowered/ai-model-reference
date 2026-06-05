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
import { GROUPED_QUERY_ATTENTION_PAGE_DIR } from "@/lib/content/content-paths";
import { loadModulePage } from "@/lib/content/module-page";
import { pageMessagesSchema } from "@/lib/content/schemas";

const pageDir = GROUPED_QUERY_ATTENTION_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

describe("grouped-query-attention page messages", () => {
  test("includes required localized fields for the module template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Grouped-Query Attention");
    expect(messages.problemStatement?.length).toBeGreaterThan(0);
    expect(messages.coreIdea?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItOptimizes.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body?.length).toBeGreaterThan(0);
  });
});

describe("loadModulePage grouped-query-attention", () => {
  test("compiles MDX with local namespaces and message-driven opening copy", async () => {
    const page = await loadModulePage("grouped-query-attention");

    expect(page.frontmatter.registryId).toBe("module.grouped-query-attention");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Grouped-Query Attention");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("Grouped-Query Attention");
    expect(html).toContain("KV caches grow with context length and head count");
    expect(html).toContain(
      "lets several query heads share fewer key-value heads",
    );
    expect(html).toContain('data-registry-id="module.grouped-query-attention"');
    expect(html).toContain("Module metadata");
    expect(html).toContain("At a glance");
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('href="/tags/kv-cache"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain("Ainslie, Joshua, et al.");
    expect(html).toContain('href="https://arxiv.org/abs/2305.13245"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain("Variants And Nearby Modules");
    expect(html).not.toContain('data-testid="derived-related-docs"');
    expect(html).toContain("Compared To Nearby Modules");
    expect(html).toContain("Related");
    expect(html).toContain('data-graph-node-id="hidden-states"');
    expect(html).toContain('data-graph-node-id="query-groups"');
    expect(html).toContain('data-graph-node-id="query-heads"');
    expect(html).toContain('data-graph-node-id="kv-cache"');
    expect(html).toContain('data-graph-node-count="6"');
    expect(html).toContain('data-graph-node-count="5"');
    expect(html).toContain('href="/docs/modules/multi-head-attention"');
    expect(html).toContain('data-prose-auto-link="true"');
    expect(html).toContain('data-registry-comparison-table="true"');
    expect(html).toContain(
      'data-table-id="table.grouped-query-attention-comparison"',
    );
    expect(html).not.toContain(">table.grouped-query-attention-comparison<");
    expect(html).toContain("KV head count");
    expect(html).toContain('href="/docs/modules/multi-query-attention"');
    expect(html).toContain("single shared");
    expect(html).toContain('data-comparison-dimension="cacheFootprint"');
  });
});

describe("grouped-query-attention page assets", () => {
  test("resolves graph and table assets with message-backed alt and captions", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.computeFlow.type).toBe("graph");
    expect(assets.comparisonTable.type).toBe("table");
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});
