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
  getTrainingRegimeById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "concept.alignment";
const SLUG = "alignment";
const PAGE_URL = "/docs/concepts/alignment";
const INSTRUCTIONS_CITATION_ID =
  "citation.training-language-models-to-follow-instructions-with-human-feedback";

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
 * These tests stay focused on search, discovery, nearby-regime boundaries, citation
 * resolution, and rendered surface contracts specific to the alignment concept slice.
 */
describe("alignment concept slice verification (alignment-concept-page-004)", () => {
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
    expect(page.messages.openingSummary?.toLowerCase()).toContain("pretrained");
    expect(page.messages.openingSummary?.toLowerCase()).toContain("preference");
  });

  test("registry citation references resolve for the alignment bundle", () => {
    const record = getConceptById(REGISTRY_ID);
    if (!record) {
      throw new Error("expected concept.alignment in registry");
    }

    const citations = resolveCitations(record.citationIds);
    expect(citations).toHaveLength(1);
    expect(citations[0]?.id).toBe(INSTRUCTIONS_CITATION_ID);
    expect(citations[0]?.url).toContain("arxiv.org");
  });

  test("discovery metadata and live search resolve the canonical page for alignment aliases", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === PAGE_URL);

    expect(document).toBeDefined();
    expect(document?.registryId).toBe(REGISTRY_ID);
    expect(document?.directAliases).toEqual(
      expect.arrayContaining([
        "Alignment",
        "model alignment",
        "preference alignment",
        "human feedback alignment",
        "safety alignment",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["foundations", "taxonomy"]),
    );

    const results = await docsSearchApi.search("model alignment");
    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(PAGE_URL);
  });

  test.each([
    "alignment",
    "model alignment",
    "preference alignment",
    "human feedback alignment",
  ] as const)("live search routes %s to the canonical alignment concept page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrlFromResults(results, PAGE_URL)).toBe(true);
  });

  test("nearby training regimes and curated related items keep separate reader paths", () => {
    const source = getConceptById(REGISTRY_ID);
    if (!source) {
      throw new Error("expected concept.alignment in registry");
    }

    const dpo = getTrainingRegimeById("training-regime.dpo");
    expect(dpo?.relatedIds).toContain(REGISTRY_ID);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("training-regime.dpo")).toBe(true);
    expect(source.aliases).not.toContain("RLHF");

    const relatedItems = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );
    expect(relatedItems.length).toBeGreaterThan(0);
  });

  test("foundations tag landing exposes the canonical alignment concept route", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups("foundations", messages, "en");
    const conceptGroup = groups.find((group) => group.kind === "concept");

    expect(
      conceptGroup?.resources.some((resource) => resource.url === PAGE_URL),
    ).toBe(true);
  });

  test("rendered concept page exposes nearby-regime links, tags, citations, and related docs", async () => {
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
    expect(html).toContain("Compared To Nearby Regimes");
    expect(html).toContain('href="/docs/training/pretraining"');
    expect(html).toContain('href="/docs/training/dpo"');
    expect(html).toContain('href="/search?q=RLHF"');
    expect(html).toContain('href="/search?q=PPO"');
    expect(html).toContain('href="/search?q=GRPO"');
    expect(html).toContain("not a benchmark leaderboard");
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("missing-content");
  });
});
