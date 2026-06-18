import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { KV_CACHE_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
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
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const pageDir = KV_CACHE_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("Phase 5 KV cache glossary page (US-001)", () => {
  test("registry record is published with aliases, serving tags, and related ids", () => {
    const record = getConceptById("concept.kv-cache");
    expect(record?.status).toBe("published");
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
      "concept.autoregressive-generation",
      "module.attention",
      "module.multi-query-attention",
      "module.grouped-query-attention",
      "module.sliding-window-attention",
      "concept.transformer",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.kv-cache")).toBe(true);
  });

  test("curated related links point to nearby serving and attention pages", () => {
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
      items.some(
        (item) =>
          item.registryId === "concept.prefill" &&
          item.href === "/docs/glossary/prefill",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "concept.autoregressive-generation" &&
          item.href === "/docs/glossary/autoregressive-generation",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "module.multi-query-attention" &&
          item.href === "/docs/modules/multi-query-attention",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "module.grouped-query-attention" &&
          item.href === "/docs/modules/grouped-query-attention",
      ),
    ).toBe(true);
  });

  test("messages teach cache reuse, prompt processing, and serving tradeoffs", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("KV cache");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "prefill stage",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain("decode");
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "latency",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "memory",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "cost",
    );
    expect(messages.sections?.servingPath.body?.toLowerCase()).toContain(
      "token-by-token generation",
    );
  });

  test("page renders serving tradeoff copy, links to published prefill and decode handoff, and related attention pages", async () => {
    const page = await loadGlossaryPage("kv-cache");

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.kv-cache");

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
    expectHtmlToContainProse(html, "KV cache");
    expectHtmlToContainProse(
      html,
      "latency because later steps avoid repeating prompt processing",
    );
    expectHtmlToContainProse(html, "cost real money to serve");
    expect(html).toContain('href="/docs/glossary/prefill"');
    expect(html).toContain('href="/docs/glossary/decode"');
    expect(html).toContain('href="/docs/glossary/prefill"');
    expect(html).toContain('href="/docs/glossary/decode"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/modules/multi-query-attention"');
    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain('href="/docs/modules/sliding-window-attention"');
    expect(html).toContain('href="/docs/glossary/transformer"');
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('href="/tags/kv-cache"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search index records kv-cache as a glossary page with aliases and tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/glossary/kv-cache",
    );
    expect(document?.kind).toBe("glossary");
    expect(document?.facets.kind).toBe("glossary");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "KV cache",
        "key-value cache",
        "key value cache",
        "kv-cache",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["attention", "kv-cache"]),
    );
  });

  test("search finds KV cache by title, aliases, and body terms", async () => {
    for (const query of [
      "KV cache",
      "key-value cache",
      "kv-cache",
      "cached keys and values",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(
        results.some((result) => result.url === "/docs/glossary/kv-cache"),
      ).toBe(true);
    }
  });
});
