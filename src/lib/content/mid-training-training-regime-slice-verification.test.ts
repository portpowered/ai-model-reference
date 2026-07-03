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
import { TRAINING_DOCS_ROOT } from "@/lib/content/content-paths";
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

const REGISTRY_ID = "training-regime.mid-training";
const SLUG = "mid-training";
const PAGE_URL = "/docs/training/mid-training";
const GRAPH_ID = "graph.mid-training-training-flow";
const KAPLAN_CITATION_ID = "citation.kaplan-scaling-laws";

const pageDir = join(TRAINING_DOCS_ROOT, SLUG);
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
 * resolution, and rendered surface contracts specific to the mid-training slice.
 */
describe("mid-training training-regime slice verification (mid-training-regime-page-004)", () => {
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
      "continued training that starts from a broadly pretrained base checkpoint",
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
      throw new Error("expected training-regime.mid-training in registry");
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
      "pretrained base checkpoint",
    );
    expect(messages.graph?.nodes?.baseCheckpoint?.label).toContain(
      "Pretrained base checkpoint",
    );
    expect(messages.graph?.nodes?.continuedTraining?.label).toContain(
      "Continued training on targeted data",
    );
    expect(messages.graph?.nodes?.intermediateCheckpoint?.label).toContain(
      "Intermediate checkpoint",
    );

    const citations = resolveCitations(record.citationIds);
    expect(citations).toHaveLength(1);
    expect(citations[0]?.id).toBe(KAPLAN_CITATION_ID);
    expect(citations[0]?.url).toContain("arxiv.org");
    expect(citations[0]?.title).toContain(
      "Scaling Laws for Neural Language Models",
    );
  });

  test("discovery metadata and live search resolve the canonical page for mid-training aliases", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === PAGE_URL);

    expect(document).toBeDefined();
    expect(document?.registryId).toBe(REGISTRY_ID);
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "mid-training",
        "continued training",
        "intermediate training",
      ]),
    );
    expect(document?.relatedIds).toEqual(
      expect.arrayContaining([
        "training-regime.pretraining",
        "training-regime.post-training",
        "training-regime.supervised-fine-tuning",
        "training-regime.distillation",
        "model.gpt-3",
        "model.llama-3",
      ]),
    );
    expect(document?.tags).toEqual(expect.arrayContaining(["foundations"]));

    const results = await docsSearchApi.search("continued training");
    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrlFromResults(results, PAGE_URL)).toBe(true);
  });

  test.each([
    "mid-training",
    "continued training",
    "intermediate training",
  ] as const)("live search routes %s to the canonical mid-training page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrlFromResults(results, PAGE_URL)).toBe(true);
  });

  test("curated related items and tag landing expose adjacent training regimes and pipeline model examples", async () => {
    const source = getTrainingRegimeById(REGISTRY_ID);
    if (!source) {
      throw new Error("expected training-regime.mid-training in registry");
    }

    const relatedItems = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      relatedItems.find(
        (item) => item.registryId === "training-regime.pretraining",
      )?.href,
    ).toBe("/docs/training/pretraining");
    expect(
      relatedItems.find(
        (item) => item.registryId === "training-regime.post-training",
      )?.href,
    ).toBe("/docs/training/post-training");
    expect(
      relatedItems.find(
        (item) => item.registryId === "training-regime.supervised-fine-tuning",
      )?.href,
    ).toBe("/docs/training/supervised-fine-tuning");
    expect(
      relatedItems.find(
        (item) => item.registryId === "training-regime.distillation",
      )?.href,
    ).toBe("/docs/training/distillation");
    expect(
      relatedItems.find((item) => item.registryId === "model.gpt-3")?.href,
    ).toBe("/docs/models/gpt-3");
    expect(
      relatedItems.find((item) => item.registryId === "model.llama-3")?.href,
    ).toBe("/docs/models/llama-3");

    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups("foundations", messages, "en");
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
    expect(html).toContain("How It Works");
    expect(html).toContain("Compared To Nearby Regimes");
    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain("Pretrained base checkpoint");
    expect(html).toContain("Continued training on targeted data");
    expect(html).toContain("Intermediate checkpoint");
    expect(html).toContain('role="math"');
    expect(html).toContain(
      'data-page-math-variable-definitions="continuedTrainingObjective"',
    );
    expect(html).toContain('href="/docs/training/pretraining"');
    expect(html).toContain('href="/docs/training/post-training"');
    expect(html).toContain('href="/docs/training/supervised-fine-tuning"');
    expect(html).toContain('href="/docs/training/distillation"');
    expect(html).toContain('href="/docs/models/gpt-3"');
    expect(html).toContain('href="/docs/models/llama-3"');
    expect(html).toContain('href="/docs/training/supervised-fine-tuning">SFT<');
    expect(html).toContain('href="/docs/training/distillation">distillation<');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain("Scaling Laws for Neural Language Models");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("missing-content");
  });
});
