import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { PREFILL_CONCEPT_PAGE_DIR } from "@/lib/content/content-paths";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const pageDir = PREFILL_CONCEPT_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("prefill concept page (prefill-concept-page-001)", () => {
  test("registry record is published with concept routing, serving aliases, and related ids", () => {
    const record = getConceptById("concept.prefill");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "Prefill",
      "prompt processing",
      "prompt pass",
      "initial prompt pass",
      "time to first token",
      "first token latency",
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
    expect(record?.citationIds).toEqual([
      "citation.attention-is-all-you-need",
      "citation.brown-gpt-3",
      "citation.orca-serving-system",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.prefill")).toBe(true);
    expect(PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS.has("concept.prefill")).toBe(
      true,
    );
  });

  test("curated related links point to serving-path and nearby attention pages through published routes", () => {
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
          item.href === "/docs/concepts/kv-cache",
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
          item.registryId === "concept.autoregressive-generation" &&
          item.href === "/docs/concepts/autoregressive-generation",
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
          item.registryId === "module.grouped-query-attention" &&
          item.href === "/docs/modules/grouped-query-attention",
      ),
    ).toBe(true);
  });

  test("messages teach prompt processing, decode contrast, and time-to-first-token payoff", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Prefill");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "autoregressive generation",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "time-to-first-token",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "serving cost",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "decode",
    );
  });

  test("page renders the canonical concept route with serving-path and attention links", async () => {
    const page = await loadConceptPage("prefill");

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.prefill");
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);

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
    expect(html).toContain("Serving Path");
    expect(html).toContain('href="/docs/concepts/kv-cache"');
    expect(html).toContain('href="/docs/glossary/decode"');
    expect(html).toContain('href="/docs/glossary/prefill-decode-split"');
    expect(html).toContain('href="/docs/concepts/autoregressive-generation"');
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain('href="/search?q=time%20to%20first%20token"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).not.toContain("Reader Shortcut");
  });

  test("published pages and search documents expose the concept route as canonical prefill discovery", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    expect(pages.some((page) => page.docsSlug === "concepts/prefill")).toBe(
      true,
    );
    expect(pages.some((page) => page.docsSlug === "glossary/prefill")).toBe(
      false,
    );

    const document = documents.find(
      (entry) => entry.url === "/docs/concepts/prefill",
    );
    expect(document?.kind).toBe("concept");
    expect(document?.facets.kind).toBe("concept");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "Prefill",
        "prompt processing",
        "time to first token",
        "first token latency",
      ]),
    );
  });

  test("published English docs loader resolves the canonical route, messages, and nearby related links together", async () => {
    const pages = await loadPublishedDocsPages("en");
    const page = pages.find((entry) => entry.docsSlug === "concepts/prefill");

    expect(page).toBeDefined();
    expect(page?.url).toBe("/docs/concepts/prefill");
    expect(page?.frontmatter.registryId).toBe("concept.prefill");
    expect(page?.frontmatter.kind).toBe("concept");
    expect(page?.messages.title).toBe("Prefill");
    expect(page?.messages.openingSummary?.toLowerCase()).toContain(
      "time-to-first-token",
    );
    expect(page?.frontmatter.registryId).toBe("concept.prefill");

    const source = getConceptById(page?.frontmatter.registryId ?? "");
    if (!source) {
      throw new Error("expected concept.prefill in registry");
    }

    expect(source.citationIds).toEqual([
      "citation.attention-is-all-you-need",
      "citation.brown-gpt-3",
      "citation.orca-serving-system",
    ]);

    const curated = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      curated.some(
        (item) =>
          item.registryId === "concept.kv-cache" &&
          item.href === "/docs/concepts/kv-cache",
      ),
    ).toBe(true);
    expect(
      curated.some(
        (item) =>
          item.registryId === "module.grouped-query-attention" &&
          item.href === "/docs/modules/grouped-query-attention",
      ),
    ).toBe(true);
  });

  test("search ranks the concept route first for prefill and prompt-latency queries", async () => {
    for (const query of [
      "Prefill",
      "prompt processing",
      "time to first token",
      "first token latency",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.url).toBe("/docs/concepts/prefill");
    }
  });
});
