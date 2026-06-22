import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { DECODE_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
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

const pageDir = DECODE_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("Phase 5 decode glossary page (US-003)", () => {
  test("registry record is published with decode aliases, serving tags, and related ids", () => {
    const record = getConceptById("concept.decode");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "Decode",
      "decoding",
      "token-by-token generation",
      "next-token step",
      "inter-token generation",
    ]);
    expect(record?.tags).toEqual(["foundations", "attention", "kv-cache"]);
    expect(record?.relatedIds).toEqual(
      expect.arrayContaining([
        "concept.prefill",
        "concept.kv-cache",
        "concept.prefill-decode-split",
        "system.batching",
        "concept.autoregressive-generation",
        "concept.sampling-overview",
        "module.attention",
        "module.multi-query-attention",
        "module.grouped-query-attention",
        "module.sliding-window-attention",
        "concept.transformer",
      ]),
    );
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.decode")).toBe(true);
  });

  test("curated related links point to serving-path and nearby attention-variant pages", () => {
    const source = getConceptById("concept.decode");
    if (!source) {
      throw new Error("expected concept.decode in registry");
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
          item.href === "/docs/concepts/prefill",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "concept.kv-cache" &&
          item.href === "/docs/concepts/kv-cache",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "concept.sampling-overview" &&
          item.href === "/docs/concepts/sampling-overview",
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
    expect(
      items.some(
        (item) =>
          item.registryId === "module.sliding-window-attention" &&
          item.href === "/docs/modules/sliding-window-attention",
      ),
    ).toBe(true);
  });

  test("messages teach next-token generation, inter-token latency, and serving tradeoffs", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Decode");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "kv cache",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "next-token",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "inter-token latency",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "memory bandwidth",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "serving cost",
    );
  });

  test("page renders serving-path links to kv cache, prefill, published split page, and nearby modules", async () => {
    const page = await loadGlossaryPage("decode");

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.decode");

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
    expectHtmlToContainProse(html, "Decode");
    expectHtmlToContainProse(html, "inter-token latency");
    expectHtmlToContainProse(html, "memory bandwidth");
    expect(html).toContain('href="/docs/concepts/kv-cache"');
    expect(html).toContain('href="/docs/concepts/prefill"');
    expect(html).toContain('href="/docs/concepts/sampling-overview"');
    expect(html).toContain('href="/docs/glossary/prefill-decode-split"');
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

  test("search index records decode as a glossary page with aliases and tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/glossary/decode",
    );
    expect(document?.kind).toBe("glossary");
    expect(document?.facets.kind).toBe("glossary");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "Decode",
        "decoding",
        "token-by-token generation",
        "next-token step",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["attention", "kv-cache"]),
    );
  });

  test("search finds decode by title, aliases, and body terms", async () => {
    for (const query of [
      "Decode",
      "decoding",
      "token-by-token generation",
      "inter-token latency",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(
        results.some((result) => result.url === "/docs/glossary/decode"),
      ).toBe(true);
    }
  });
});
