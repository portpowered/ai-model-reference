import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { resolveCitations } from "@/lib/content/citations";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  getPublishedDocsEntryByRegistryId,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getTrainingRegimeById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadTrainingRegimePage } from "@/lib/content/training-regime-page";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "training-regime.rlhf";
const SLUG = "rlhf";
const PAGE_URL = "/docs/training/rlhf";
const GRAPH_ID = "graph.rlhf-training-flow";
const INSTRUCTGPT_CITATION_ID =
  "citation.training-language-models-to-follow-instructions-with-human-feedback";

const pageDir = getDocsPageDir("training", SLUG);
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

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
 * These tests stay focused on search, discovery, nearby-regime navigation, citation/graph
 * resolution, and rendered surface contracts specific to the RLHF slice.
 */
describe("RLHF training-regime slice verification (rlhf-page-004)", () => {
  test("canonical route resolves to the published registry record and default English messages", async () => {
    const entry = getPublishedDocsEntryByRegistryId(REGISTRY_ID);
    const page = await loadTrainingRegimePage(SLUG);
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const record = getTrainingRegimeById(REGISTRY_ID);

    expect(entry).toMatchObject({
      registryId: REGISTRY_ID,
      url: PAGE_URL,
    });
    expect(record?.status).toBe("published");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("training-regime");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(page.messages.openingSummary).toContain(
      "post-training workflow that steers model behavior using human preference signals",
    );
  });

  test("page-local graph, caption, and citation references resolve for the bundle", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );
    const record = getTrainingRegimeById(REGISTRY_ID);

    if (!record) {
      throw new Error("expected training-regime.rlhf in registry");
    }

    expect(assets.trainingFlow).toMatchObject({
      type: "graph",
      graphId: GRAPH_ID,
      altKey: "assets.trainingFlow.alt",
      captionKey: "assets.trainingFlow.caption",
    });
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
    expect(getGraphById(GRAPH_ID)?.subjectId).toBe(REGISTRY_ID);
    expect(messages.assets?.trainingFlow?.alt).toContain(
      "human preference data",
    );
    expect(messages.graph?.nodes?.humanPreferences?.label).toContain(
      "Human preference",
    );
    expect(messages.graph?.nodes?.policyOptimization?.label).toContain(
      "Policy optimization",
    );

    const citations = resolveCitations(record.citationIds);
    expect(citations).toHaveLength(1);
    expect(citations[0]?.id).toBe(INSTRUCTGPT_CITATION_ID);
    expect(citations[0]?.url).toContain("arxiv.org");
    expect(citations[0]?.title).toContain(
      "Training language models to follow instructions",
    );
  });

  test("discovery metadata and live search resolve the canonical page for RLHF aliases", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === PAGE_URL);

    expect(document).toBeDefined();
    expect(document?.registryId).toBe(REGISTRY_ID);
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "RLHF",
        "reinforcement learning from human feedback",
      ]),
    );
    expect(document?.relatedIds).toEqual(
      expect.arrayContaining([
        "concept.alignment",
        "training-regime.instruction-tuning",
        "training-regime.dpo",
        "training-regime.post-training",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["alignment", "foundations"]),
    );

    const results = await docsSearchApi.search("RLHF");
    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrlFromResults(results, PAGE_URL)).toBe(true);
  });

  test.each([
    "RLHF",
    "reinforcement learning from human feedback",
    "human feedback reinforcement learning",
    "preference reinforcement learning",
  ] as const)("live search routes %s to the canonical RLHF page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrlFromResults(results, PAGE_URL)).toBe(true);
  });

  test("curated related items and tag landing expose nearby alignment and training discovery paths", async () => {
    const source = getTrainingRegimeById(REGISTRY_ID);
    if (!source) {
      throw new Error("expected training-regime.rlhf in registry");
    }

    const relatedItems = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      relatedItems.find((item) => item.registryId === "concept.alignment")
        ?.href,
    ).toBe("/docs/concepts/alignment");
    expect(
      relatedItems.find(
        (item) => item.registryId === "training-regime.instruction-tuning",
      )?.href,
    ).toBe("/docs/training/instruction-tuning");
    expect(
      relatedItems.find((item) => item.registryId === "training-regime.dpo")
        ?.href,
    ).toBe("/docs/training/dpo");
    expect(
      relatedItems.find(
        (item) => item.registryId === "training-regime.post-training",
      )?.href,
    ).toBe("/docs/training/post-training");

    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups("alignment", messages, "en");
    const trainingGroup = groups.find(
      (group) => group.kind === "training-regime",
    );

    expect(
      trainingGroup?.resources.some((resource) => resource.url === PAGE_URL),
    ).toBe(true);
  });

  test("rendered training-regime page exposes flow graph, nearby-regime links, tags, citations, and related docs", async () => {
    const page = await loadTrainingRegimePage(SLUG);

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
    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain("RLHF feedback-and-optimization loop");
    expect(html).toContain("Human preference");
    expect(html).toContain("Reward model");
    expect(html).toContain("Policy optimization");
    expect(html).toContain("Aligned model");
    expect(html).toContain('href="/docs/glossary/alignment"');
    expect(html).toContain('href="/docs/training/instruction-tuning"');
    expect(html).toContain('href="/docs/training/dpo"');
    expect(html).toContain('href="/docs/training/post-training"');
    expect(html).toContain('href="/search?q=PPO"');
    expect(html).toContain('href="/search?q=GRPO"');
    expect(html).toContain('href="/tags/alignment"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain("Training language models to follow instructions");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("missing-content");
  });
});
