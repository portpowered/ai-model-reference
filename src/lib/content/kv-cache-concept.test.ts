import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

describe("KV-cache concept page (kv-cache-concept-page-001)", () => {
  test("registry record remains published with the expected aliases, tags, and curated related ids", () => {
    const record = getConceptById("concept.kv-cache");
    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.aliases).toEqual([
      "KV cache",
      "key-value cache",
      "key value cache",
      "kv-cache",
      "attention cache",
    ]);
    expect(record?.tags).toEqual(["foundations", "attention", "kv-cache"]);
    expect(record?.relatedIds).toEqual([
      "concept.prefill",
      "concept.decode",
      "concept.prefill-decode-split",
      "concept.autoregressive-generation",
      "module.attention",
      "module.multi-query-attention",
      "module.grouped-query-attention",
      "module.sliding-window-attention",
      "concept.transformer",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.kv-cache")).toBe(true);
  });

  test("curated related links stay navigable for serving stages and attention pages", () => {
    const source = getConceptById("concept.kv-cache");
    if (!source) {
      throw new Error("expected concept.kv-cache in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.prefill")?.href,
    ).toBe("/docs/glossary/prefill");
    expect(
      items.find((item) => item.registryId === "concept.decode")?.href,
    ).toBe("/docs/glossary/decode");
    expect(
      items.find((item) => item.registryId === "concept.prefill-decode-split")
        ?.href,
    ).toBe("/docs/glossary/prefill-decode-split");
    expect(
      items.find(
        (item) => item.registryId === "concept.autoregressive-generation",
      )?.href,
    ).toBe("/docs/glossary/autoregressive-generation");
    expect(
      items.find((item) => item.registryId === "module.attention")?.href,
    ).toBe("/docs/modules/attention");
    expect(
      items.find((item) => item.registryId === "module.multi-query-attention")
        ?.href,
    ).toBe("/docs/modules/multi-query-attention");
    expect(
      items.find((item) => item.registryId === "module.grouped-query-attention")
        ?.href,
    ).toBe("/docs/modules/grouped-query-attention");
    expect(
      items.find(
        (item) => item.registryId === "module.sliding-window-attention",
      )?.href,
    ).toBe("/docs/modules/sliding-window-attention");
  });

  test("page renders the canonical concept route with summary, tradeoff copy, and related navigation", async () => {
    const page = await loadConceptPage("kv-cache");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.kv-cache");
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "lowers latency during generation",
    );

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("What It Is");
    expect(html).toContain("Why It Matters");
    expect(html).toContain("repeated work");
    expect(html).toContain("live memory");
    expect(html).toContain('href="/docs/glossary/prefill"');
    expect(html).toContain('href="/docs/glossary/decode"');
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain('href="/tags/kv-cache"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });
});
