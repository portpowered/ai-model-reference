import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { PREFILL_DECODE_SPLIT_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import {
  expectGlossaryBodyOmitsTitleHeading,
  expectGlossaryOmitsOpeningSummary,
  expectGlossarySingleTagPillList,
  expectHtmlToContainProse,
} from "@/lib/content/glossary-test-helpers";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  getModuleById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const pageDir = PREFILL_DECODE_SPLIT_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

async function renderGlossaryHtml(slug: string): Promise<string> {
  const page = await loadGlossaryPage(slug);

  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("Phase 5 prefill/decode split glossary page (US-004)", () => {
  test("registry record is published with split-serving aliases, tags, and related ids", () => {
    const record = getConceptById("concept.prefill-decode-split");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "Prefill/decode split",
      "prefill decode split",
      "split serving",
      "disaggregated serving",
      "disaggregated prefill decode",
    ]);
    expect(record?.tags).toEqual(["foundations", "kv-cache"]);
    expect(record?.relatedIds).toEqual([
      "concept.prefill",
      "concept.decode",
      "concept.kv-cache",
      "system.batching",
      "concept.autoregressive-generation",
      "module.attention",
      "module.multi-query-attention",
      "module.grouped-query-attention",
      "module.sliding-window-attention",
      "concept.transformer",
    ]);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.prefill-decode-split"),
    ).toBe(true);
  });

  test("curated related links point to the serving path and nearby attention-variant pages", () => {
    const source = getConceptById("concept.prefill-decode-split");
    if (!source) {
      throw new Error("expected concept.prefill-decode-split in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.some(
        (item) =>
          item.registryId === "concept.prefill" &&
          item.href === "/docs/glossary/prefill",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "concept.decode" &&
          item.href === "/docs/glossary/decode",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "module.grouped-query-attention" &&
          item.href === "/docs/modules/grouped-query-attention",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "module.sliding-window-attention" &&
          item.href === "/docs/modules/sliding-window-attention",
      ),
    ).toBe(true);
  });

  test("messages teach split resource profiles and tradeoffs in latency, memory, and cost", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Prefill/decode split");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "workers",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "latency",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "memory",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "cost",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "paged attention",
    );
  });

  test("page renders the full four-page journey and safe search handoffs for later serving topics", async () => {
    const page = await loadGlossaryPage("prefill-decode-split");

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.prefill-decode-split");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expectGlossaryOmitsOpeningSummary(html);
    expectGlossarySingleTagPillList(html);
    expectHtmlToContainProse(html, "serving design");
    expectHtmlToContainProse(html, "cache transfer");
    expectHtmlToContainProse(html, "queueing overhead");
    expect(html).toContain('href="/docs/concepts/kv-cache"');
    expect(html).toContain('href="/docs/glossary/prefill"');
    expect(html).toContain('href="/docs/glossary/decode"');
    expect(html).toContain('href="/search?q=paged%20attention"');
    expect(html).toContain('href="/search?q=chunked%20prefill"');
    expect(html).toContain('href="/search?q=speculative%20decoding"');
    expect(html).toContain('href="/search?q=quantization"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/modules/multi-query-attention"');
    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain('href="/docs/modules/sliding-window-attention"');
    expect(html).toContain('href="/docs/glossary/transformer"');
    expect(html).toContain('href="/tags/kv-cache"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search index records prefill-decode-split as a glossary page with aliases and tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/glossary/prefill-decode-split",
    );
    expect(document?.kind).toBe("glossary");
    expect(document?.facets.kind).toBe("glossary");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "Prefill/decode split",
        "prefill decode split",
        "split serving",
        "disaggregated serving",
      ]),
    );
    expect(document?.tags).toEqual(expect.arrayContaining(["kv-cache"]));
  });

  test("search finds prefill/decode split by title, aliases, and body terms", async () => {
    for (const query of [
      "Prefill/decode split",
      "split serving",
      "disaggregated serving",
      "cache transfer",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(
        results.some(
          (result) => result.url === "/docs/glossary/prefill-decode-split",
        ),
      ).toBe(true);
    }
  });

  test("the four-page serving path is traversable through published links", async () => {
    const kvCache = await renderGlossaryHtml("kv-cache");
    const prefill = await renderGlossaryHtml("prefill");
    const decode = await renderGlossaryHtml("decode");
    const split = await renderGlossaryHtml("prefill-decode-split");

    expect(kvCache).toContain('href="/docs/glossary/prefill"');
    expect(prefill).toContain('href="/docs/glossary/decode"');
    expect(decode).toContain('href="/docs/glossary/prefill-decode-split"');
    expect(split).toContain('href="/docs/glossary/decode"');
  });

  test("transformer, attention, autoregressive generation, MQA, GQA, and sliding-window attention expose entry points into the serving path", () => {
    const servingPathRegistryIds = new Set([
      "concept.kv-cache",
      "concept.prefill",
      "concept.decode",
      "concept.prefill-decode-split",
    ]);

    const sourceRecords = [
      getConceptById("concept.transformer"),
      getConceptById("concept.autoregressive-generation"),
      getModuleById("module.attention"),
      getModuleById("module.multi-query-attention"),
      getModuleById("module.grouped-query-attention"),
      getModuleById("module.sliding-window-attention"),
    ];

    for (const record of sourceRecords) {
      expect(record).toBeDefined();
      expect(
        record?.relatedIds.some((id) => servingPathRegistryIds.has(id)),
      ).toBe(true);
    }
  });
});
