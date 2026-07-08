import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { resolveCitations } from "@/lib/content/citations";
import { loadConceptPage } from "@/lib/content/concept-page";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  getPublishedDocsEntryByRegistryId,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import {
  applyRelatedDocMessageOverrides,
  deriveCuratedRelatedItems,
} from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "concept.softmax";
const SLUG = "softmax";
const PAGE_URL = "/docs/concepts/softmax";
const GLOSSARY_SOFTMAX_URL = "/docs/glossary/softmax";
const GOODFELLOW_CITATION_ID = "citation.goodfellow-deep-learning";

const SAMPLING_NEIGHBOR_HREFS = {
  temperature: "/docs/glossary/temperature",
  entropy: "/docs/glossary/entropy",
  greedyDecoding: "/docs/glossary/greedy-decoding",
  topK: "/docs/glossary/top-k-sampling",
  topP: "/docs/glossary/top-p-sampling",
} as const;

const pageDir = getDocsPageDir("concepts", SLUG);
const messagesPath = join(pageDir, "messages/en.json");

function pageBaseUrlFromResults(
  results: Array<{ url: string }>,
  pageUrl: string,
): boolean {
  return results.some(
    (result) =>
      pageBaseUrl(result.url) === pageUrl ||
      result.url.startsWith(`${pageUrl}#`),
  );
}

/**
 * Routine page-bundle checks (frontmatter, messages, registryId, tags, assets)
 * are covered by `validateDerivedPublishedPageBundles` via `validateRegistryContent`.
 * These tests stay focused on search, discovery, sampling-neighbor handoffs, citation
 * resolution, and rendered surface contracts specific to the softmax concept slice.
 */
describe("softmax concept slice verification (softmax-concept-page-current-main-004)", () => {
  test("canonical route resolves to the published registry record and default English messages", async () => {
    const entry = getPublishedDocsEntryByRegistryId(REGISTRY_ID);
    const page = await loadConceptPage(SLUG);
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const record = getConceptById(REGISTRY_ID);

    expect(entry).toMatchObject({
      registryId: REGISTRY_ID,
      url: PAGE_URL,
      section: "concepts",
    });
    expect(record?.status).toBe("published");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("concept");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(page.messages.openingSummary?.toLowerCase()).toContain("logits");
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "probabilities",
    );
    expect(Object.keys(page.assets)).toEqual([]);
  });

  test("registry citation references resolve for the softmax bundle", () => {
    const record = getConceptById(REGISTRY_ID);
    if (!record) {
      throw new Error("expected concept.softmax in registry");
    }

    const citations = resolveCitations(record.citationIds);
    expect(citations).toHaveLength(1);
    expect(citations[0]?.id).toBe(GOODFELLOW_CITATION_ID);
    expect(citations[0]?.url).toContain("deeplearningbook.org");
  });

  test("discovery metadata and live search resolve the canonical page for softmax aliases", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === PAGE_URL);

    expect(document).toBeDefined();
    expect(document?.registryId).toBe(REGISTRY_ID);
    expect(document?.kind).toBe("concept");
    expect(document?.directAliases).toEqual(
      expect.arrayContaining(["softmax function", "softmax layer"]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["token-to-probability-chain", "foundations"]),
    );

    const results = await docsSearchApi.search("softmax");
    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(PAGE_URL);
    expect(pageBaseUrlFromResults(results, GLOSSARY_SOFTMAX_URL)).toBe(true);
  });

  test("logit prerequisite related docs resolve the canonical softmax concept route", () => {
    const logit = getConceptById("concept.logit");
    if (!logit) {
      throw new Error("expected concept.logit in registry");
    }

    const items = deriveCuratedRelatedItems(
      logit,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const softmax = items.find((item) => item.registryId === REGISTRY_ID);
    expect(softmax?.href).toBe(PAGE_URL);
    expect(softmax?.isPlanned).toBe(false);
  });

  test("curated sampling-neighbor related docs resolve published glossary routes with custom reasons", async () => {
    const source = getConceptById(REGISTRY_ID);
    if (!source) {
      throw new Error("expected concept.softmax in registry");
    }

    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const items = applyRelatedDocMessageOverrides(
      deriveCuratedRelatedItems(
        source,
        listRelatedRegistryRecords(),
        PUBLISHED_DOCS_REGISTRY_IDS,
      ),
      bundledMessages,
    );

    const temperature = items.find(
      (item) => item.registryId === "concept.temperature",
    );
    const entropy = items.find((item) => item.registryId === "concept.entropy");
    const greedy = items.find(
      (item) => item.registryId === "concept.greedy-decoding",
    );
    const topK = items.find(
      (item) => item.registryId === "concept.top-k-sampling",
    );
    const topP = items.find(
      (item) => item.registryId === "concept.top-p-sampling",
    );

    expect(temperature?.href).toBe(SAMPLING_NEIGHBOR_HREFS.temperature);
    expect(entropy?.href).toBe(SAMPLING_NEIGHBOR_HREFS.entropy);
    expect(greedy?.href).toBe(SAMPLING_NEIGHBOR_HREFS.greedyDecoding);
    expect(topK?.href).toBe(SAMPLING_NEIGHBOR_HREFS.topK);
    expect(topP?.href).toBe(SAMPLING_NEIGHBOR_HREFS.topP);
    expect(temperature?.reasonLabel).toBe(
      bundledMessages.relatedDocs?.["concept.temperature"]?.reason,
    );
    expect(entropy?.reasonLabel).toBe(
      bundledMessages.relatedDocs?.["concept.entropy"]?.reason,
    );
    expect(greedy?.reasonLabel).toBe(
      bundledMessages.relatedDocs?.["concept.greedy-decoding"]?.reason,
    );
    expect(topK?.reasonLabel).toBe(
      bundledMessages.relatedDocs?.["concept.top-k-sampling"]?.reason,
    );
    expect(topP?.reasonLabel).toBe(
      bundledMessages.relatedDocs?.["concept.top-p-sampling"]?.reason,
    );
  });

  test("token-to-probability-chain tag landing exposes the canonical softmax concept route", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups(
      "token-to-probability-chain",
      messages,
      "en",
    );
    const conceptGroup = groups.find((group) => group.kind === "concept");

    expect(
      conceptGroup?.resources.some((resource) => resource.url === PAGE_URL),
    ).toBe(true);
  });

  test("rendered concept page exposes decoding neighbors, math, tags, and related docs without placeholder copy", async () => {
    const page = await loadConceptPage(SLUG);

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("What It Is");
    expect(html).toContain("From Probabilities To Decoding");
    expect(html).toContain('class="katex"');
    expect(html).toContain("katex-display");
    expect(html).toContain('href="/docs/glossary/temperature"');
    expect(html).toContain('href="/docs/glossary/entropy"');
    expect(html).toContain('href="/docs/glossary/greedy-decoding"');
    expect(html).toContain('href="/docs/glossary/top-k-sampling"');
    expect(html).toContain('href="/docs/glossary/top-p-sampling"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Draft placeholder");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("missing-content");
  });
});
