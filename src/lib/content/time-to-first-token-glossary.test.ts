import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { TIME_TO_FIRST_TOKEN_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
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

const pageDir = TIME_TO_FIRST_TOKEN_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("Phase 5 time-to-first-token glossary page (US-001)", () => {
  test("registry record is published with TTFT aliases, tags, and serving-related ids", () => {
    const record = getConceptById("concept.time-to-first-token");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "Time to first token",
      "TTFT",
      "first token delay",
      "startup latency",
      "prompt startup latency",
    ]);
    expect(record?.tags).toEqual(["foundations", "attention", "kv-cache"]);
    expect(record?.relatedIds).toEqual([
      "concept.prefill",
      "concept.decode",
      "concept.kv-cache",
      "concept.prefill-decode-split",
      "concept.autoregressive-generation",
      "module.attention",
      "module.multi-query-attention",
      "module.grouped-query-attention",
      "concept.transformer",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.time-to-first-token")).toBe(
      true,
    );
  });

  test("curated related links expose prefill, decode, KV cache, and nearby serving foundations", () => {
    const source = getConceptById("concept.time-to-first-token");
    if (!source) {
      throw new Error("expected concept.time-to-first-token in registry");
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
          item.registryId === "concept.kv-cache" &&
          item.href === "/docs/glossary/kv-cache",
      ),
    ).toBe(true);
  });

  test("messages teach startup delay, prompt-length cost, and the difference from later token pace", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Time to first token");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain("ttft");
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "prefill",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "startup delay",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "inter-token latency",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "tokens per second",
    );
  });

  test("page renders TTFT teaching copy and exposes downstream serving-metrics handoffs", async () => {
    const page = await loadGlossaryPage("time-to-first-token");

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.time-to-first-token");

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
    expectHtmlToContainProse(html, "startup delay");
    expectHtmlToContainProse(html, "first generated token");
    expectHtmlToContainProse(html, "prefill");
    expect(html).toContain('href="/docs/glossary/kv-cache"');
    expect(html).toContain('href="/docs/glossary/prefill"');
    expect(html).toContain('href="/docs/glossary/decode"');
    expect(html).toContain('href="/search?q=inter-token%20latency"');
    expect(html).toContain('href="/search?q=tokens%20per%20second"');
    expect(html).toContain('href="/search?q=throughput%20vs%20latency"');
    expect(html).toContain('href="/docs/glossary/prefill-decode-split"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search index records time-to-first-token as a glossary page with aliases and tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/glossary/time-to-first-token",
    );
    expect(document?.kind).toBe("glossary");
    expect(document?.facets.kind).toBe("glossary");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "Time to first token",
        "TTFT",
        "first token delay",
        "startup latency",
      ]),
    );
    expect(document?.tags).toEqual(expect.arrayContaining(["kv-cache"]));
  });

  test("search finds time to first token by title, aliases, and startup-latency body terms", async () => {
    for (const query of [
      "Time to first token",
      "TTFT",
      "first token delay",
      "startup latency",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(
        results.some(
          (result) => result.url === "/docs/glossary/time-to-first-token",
        ),
      ).toBe(true);
    }
  });

  test("kv cache, prefill, decode, and prefill/decode split expose entry points into TTFT", () => {
    for (const registryId of [
      "concept.kv-cache",
      "concept.prefill",
      "concept.decode",
      "concept.prefill-decode-split",
    ] as const) {
      const record = getConceptById(registryId);
      expect(record).toBeDefined();
      expect(record?.relatedIds).toContain("concept.time-to-first-token");
    }
  });
});
