import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { PREFILL_DECODE_SPLIT_CONCEPT_PAGE_DIR } from "@/lib/content/content-paths";
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

const pageDir = PREFILL_DECODE_SPLIT_CONCEPT_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");
const CONCEPT_URL = "/docs/concepts/prefill-decode-split";

describe("prefill-decode-split concept discovery", () => {
  test("registry record stays published with split-serving aliases, serving tags, and focused related ids", () => {
    const record = getConceptById("concept.prefill-decode-split");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "Prefill/decode split",
      "prefill decode split",
      "split serving",
      "disaggregated serving",
      "disaggregated prefill decode",
    ]);
    expect(record?.tags).toEqual(["foundations", "attention", "kv-cache"]);
    expect(record?.prerequisiteIds).toEqual([
      "concept.prefill",
      "concept.decode",
      "concept.kv-cache",
    ]);
    expect(record?.relatedIds).toEqual([
      "concept.prefill",
      "concept.decode",
      "concept.kv-cache",
      "concept.autoregressive-generation",
    ]);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.prefill-decode-split"),
    ).toBe(true);
  });

  test("curated related links point to the serving path foundations", () => {
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
      items.find((item) => item.registryId === "concept.prefill")?.href,
    ).toBe("/docs/glossary/prefill");
    expect(
      items.find((item) => item.registryId === "concept.decode")?.href,
    ).toBe("/docs/glossary/decode");
    expect(
      items.find((item) => item.registryId === "concept.kv-cache")?.href,
    ).toBe("/docs/glossary/kv-cache");
    expect(
      items.find(
        (item) => item.registryId === "concept.autoregressive-generation",
      )?.href,
    ).toBe("/docs/glossary/autoregressive-generation");
    expect(items.some((item) => item.registryId === "module.attention")).toBe(
      false,
    );
    expect(
      items.some((item) => item.registryId === "concept.transformer"),
    ).toBe(false);
  });

  test("search index records prefill-decode-split with aliases and serving tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find((entry) => entry.url === CONCEPT_URL);
    expect(document?.kind).toBe("concept");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "Prefill/decode split",
        "prefill decode split",
        "split serving",
        "disaggregated serving",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["foundations", "attention", "kv-cache"]),
    );
  });

  test("search finds prefill/decode split by title, aliases, and body terms", async () => {
    for (const query of [
      "Prefill/decode split",
      "split serving",
      "disaggregated serving",
      "cache transfer",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === CONCEPT_URL)).toBe(true);
    }
  });
});

describe("prefill-decode-split concept page", () => {
  test("messages teach split resource profiles and tradeoffs in latency, memory, and cost", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Prefill/decode split");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "reads the full prompt once",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "repeatedly produces the next token",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "serving layout",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "inter-token latency",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "time to first token",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "worker scheduling",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "memory",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "paged attention",
    );
  });

  test("page renders title, sections, opening summary, and serving-path related links", async () => {
    const page = await loadConceptPage("prefill-decode-split");

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.prefill-decode-split");
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
    expect(html).toContain("serving layout");
    expect(html).toContain("cache transfer");
    expect(html).toContain('href="/docs/glossary/kv-cache"');
    expect(html).toContain('href="/docs/glossary/prefill"');
    expect(html).toContain('href="/docs/glossary/decode"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('href="/tags/kv-cache"');
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
  });
});
