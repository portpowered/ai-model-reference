import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { PREFILL_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
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

const pageDir = PREFILL_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("Phase 5 prefill glossary page (US-002)", () => {
  test("registry record is published with prompt-processing aliases, serving tags, and related ids", () => {
    const record = getConceptById("concept.prefill");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "Prefill",
      "prompt processing",
      "prompt pass",
      "initial prompt pass",
      "time to first token stage",
    ]);
    expect(record?.tags).toEqual(["foundations", "attention", "kv-cache"]);
    expect(record?.relatedIds).toEqual([
      "concept.kv-cache",
      "concept.decode",
      "concept.prefill-decode-split",
      "concept.autoregressive-generation",
      "module.attention",
      "module.multi-query-attention",
      "module.grouped-query-attention",
      "concept.transformer",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.prefill")).toBe(true);
  });

  test("curated related links point to kv cache, autoregressive generation, and nearby attention pages", () => {
    const source = getConceptById("concept.prefill");
    if (!source) {
      throw new Error("expected concept.prefill in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.some(
        (item) =>
          item.registryId === "concept.kv-cache" &&
          item.href === "/docs/glossary/kv-cache",
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
          item.registryId === "module.attention" &&
          item.href === "/docs/modules/attention",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "concept.prefill-decode-split" &&
          item.href === "/docs/concepts/prefill-decode-split",
      ),
    ).toBe(true);
  });

  test("messages teach prompt processing, time to first token, and serving tradeoffs", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Prefill");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "time to first token",
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
      "decode",
    );
  });

  test("page renders serving-path links to kv cache, decode, and published prefill/decode split", async () => {
    const page = await loadGlossaryPage("prefill");

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.prefill");

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
    expectHtmlToContainProse(html, "Prefill");
    expectHtmlToContainProse(html, "time to first token");
    expectHtmlToContainProse(html, "serving cost");
    expect(html).toContain('href="/docs/glossary/kv-cache"');
    expect(html).toContain('href="/docs/glossary/decode"');
    expect(html).toContain('href="/docs/concepts/prefill-decode-split"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/modules/multi-query-attention"');
    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain('href="/docs/glossary/transformer"');
    expect(html).toContain('href="/tags/kv-cache"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search index records prefill as a glossary page with aliases and tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/glossary/prefill",
    );
    expect(document?.kind).toBe("glossary");
    expect(document?.facets.kind).toBe("glossary");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "Prefill",
        "prompt processing",
        "prompt pass",
        "initial prompt pass",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["attention", "kv-cache"]),
    );
  });

  test("search finds prefill by title, aliases, and body terms", async () => {
    for (const query of [
      "Prefill",
      "prompt processing",
      "prompt pass",
      "time to first token",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(
        results.some((result) => result.url === "/docs/glossary/prefill"),
      ).toBe(true);
    }
  });
});
