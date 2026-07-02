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
import { loadConceptPage } from "@/lib/content/concept-page";
import {
  getDocsPageDir,
  TRAINING_DOCS_ROOT,
} from "@/lib/content/content-paths";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
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
import { loadTrainingRegimePage } from "@/lib/content/training-regime-page";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const REGULARIZATION_REGISTRY_ID = "concept.regularization";
const REGULARIZATION_SLUG = "regularization";
const REGULARIZATION_PAGE_URL = "/docs/concepts/regularization";
const REGULARIZATION_GRAPH_ID = "graph.regularization-fit-balance";
const GOODFELLOW_CITATION_ID = "citation.goodfellow-deep-learning";

const DROPOUT_REGISTRY_ID = "training-regime.dropout";
const DROPOUT_SLUG = "dropout";
const DROPOUT_PAGE_URL = "/docs/training/dropout";
const DROPOUT_GRAPH_ID = "graph.dropout-training-flow";
const DROPOUT_CITATION_ID = "citation.dropout-prevent-overfitting";

const regularizationPageDir = getDocsPageDir("concepts", REGULARIZATION_SLUG);
const regularizationMessagesPath = join(
  regularizationPageDir,
  "messages/en.json",
);
const regularizationAssetsPath = join(regularizationPageDir, "assets.json");

const dropoutPageDir = join(TRAINING_DOCS_ROOT, DROPOUT_SLUG);
const dropoutMessagesPath = join(dropoutPageDir, "messages/en.json");
const dropoutAssetsPath = join(dropoutPageDir, "assets.json");

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
 * Discovery wiring for aliases, related docs, and rendered href contracts lives in
 * `regularization-concept-discovery.test.ts`. These tests stay focused on the
 * review-facing slice proof for both routes: canonical resolution, citation and
 * graph wiring, one discovery path per page, and rendered surface contracts.
 */
describe("regularization and dropout slice verification (regularization-005)", () => {
  test("regularization route resolves to the published registry record and default English messages", async () => {
    const entry = getPublishedDocsEntryByRegistryId(REGULARIZATION_REGISTRY_ID);
    const page = await loadConceptPage(REGULARIZATION_SLUG);
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(regularizationMessagesPath, "utf8")),
    );
    const record = getConceptById(REGULARIZATION_REGISTRY_ID);

    expect(entry).toMatchObject({
      registryId: REGULARIZATION_REGISTRY_ID,
      url: REGULARIZATION_PAGE_URL,
      section: "concepts",
    });
    expect(record?.status).toBe("published");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGULARIZATION_REGISTRY_ID)).toBe(
      true,
    );
    expect(page.frontmatter.registryId).toBe(REGULARIZATION_REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("concept");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "brittle memorization",
    );
  });

  test("regularization fit-balance graph, caption, and citation references resolve for the bundle", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(regularizationMessagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(regularizationAssetsPath, "utf8")),
    );
    const record = getConceptById(REGULARIZATION_REGISTRY_ID);

    if (!record) {
      throw new Error("expected concept.regularization in registry");
    }

    expect(assets.fitBalanceMap).toMatchObject({
      type: "graph",
      graphId: REGULARIZATION_GRAPH_ID,
      altKey: "assets.fitBalanceMap.alt",
      captionKey: "assets.fitBalanceMap.caption",
    });
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
    expect(getGraphById(REGULARIZATION_GRAPH_ID)?.subjectId).toBe(
      REGULARIZATION_REGISTRY_ID,
    );
    expect(messages.assets?.fitBalanceMap?.alt).toContain(
      "weak, balanced, and strong regularization",
    );

    const citations = resolveCitations(record.citationIds);
    expect(citations).toHaveLength(1);
    expect(citations[0]?.id).toBe(GOODFELLOW_CITATION_ID);
    expect(citations[0]?.url).toContain("deeplearningbook.org");
  });

  test("dropout route resolves to the published registry record and default English messages", async () => {
    const entry = getPublishedDocsEntryByRegistryId(DROPOUT_REGISTRY_ID);
    const page = await loadTrainingRegimePage(DROPOUT_SLUG);
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(dropoutMessagesPath, "utf8")),
    );
    const record = getTrainingRegimeById(DROPOUT_REGISTRY_ID);

    expect(entry).toMatchObject({
      registryId: DROPOUT_REGISTRY_ID,
      url: DROPOUT_PAGE_URL,
    });
    expect(record?.status).toBe("published");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(DROPOUT_REGISTRY_ID)).toBe(true);
    expect(page.frontmatter.registryId).toBe(DROPOUT_REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("training-regime");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(page.messages.openingSummary).toContain("co-adapted pathways");
  });

  test("dropout training-flow graph, caption, and citation references resolve for the bundle", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(dropoutMessagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(dropoutAssetsPath, "utf8")),
    );
    const record = getTrainingRegimeById(DROPOUT_REGISTRY_ID);

    if (!record) {
      throw new Error("expected training-regime.dropout in registry");
    }

    expect(assets.trainingFlow).toMatchObject({
      type: "graph",
      graphId: DROPOUT_GRAPH_ID,
      altKey: "assets.trainingFlow.alt",
      captionKey: "assets.trainingFlow.caption",
    });
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
    expect(getGraphById(DROPOUT_GRAPH_ID)?.subjectId).toBe(DROPOUT_REGISTRY_ID);
    expect(messages.assets?.trainingFlow?.alt).toContain("dropout mask");
    expect(messages.graph?.nodes?.trainingNetwork?.label).toContain(
      "Network in training mode",
    );

    const citations = resolveCitations(record.citationIds);
    expect(citations).toHaveLength(1);
    expect(citations[0]?.id).toBe(DROPOUT_CITATION_ID);
    expect(citations[0]?.url).toContain("jmlr.org");
    expect(citations[0]?.title).toContain(
      "Dropout: A Simple Way to Prevent Neural Networks from Overfitting",
    );
  });

  test("search discovery resolves the canonical regularization concept page", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find(
      (entry) => entry.url === REGULARIZATION_PAGE_URL,
    );

    expect(document?.registryId).toBe(REGULARIZATION_REGISTRY_ID);
    expect(document?.aliases).toEqual(
      expect.arrayContaining(["regularization", "regularizer"]),
    );

    const results = await docsSearchApi.search("regularization");
    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(REGULARIZATION_PAGE_URL);
  });

  test("search discovery resolves the canonical dropout training page", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === DROPOUT_PAGE_URL);

    expect(document?.registryId).toBe(DROPOUT_REGISTRY_ID);
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "dropout",
        "dropout regularization",
        "neural network dropout",
      ]),
    );

    const results = await docsSearchApi.search("dropout");
    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrlFromResults(results, DROPOUT_PAGE_URL)).toBe(true);
  });

  test("curated related docs connect regularization and dropout bidirectionally", () => {
    const regularization = getConceptById(REGULARIZATION_REGISTRY_ID);
    const dropout = getTrainingRegimeById(DROPOUT_REGISTRY_ID);
    if (!regularization || !dropout) {
      throw new Error("expected regularization and dropout registry records");
    }

    const fromRegularization = deriveCuratedRelatedItems(
      regularization,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );
    expect(
      fromRegularization.find((item) => item.registryId === DROPOUT_REGISTRY_ID)
        ?.href,
    ).toBe(DROPOUT_PAGE_URL);

    const fromDropout = deriveCuratedRelatedItems(
      dropout,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );
    expect(
      fromDropout.find((item) => item.registryId === REGULARIZATION_REGISTRY_ID)
        ?.href,
    ).toBe(REGULARIZATION_PAGE_URL);
  });

  test("rendered regularization page exposes fit-balance graph, discovery links, tags, citations, and related docs", async () => {
    const page = await loadConceptPage(REGULARIZATION_SLUG);

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("What It Is");
    expect(html).toContain("Compared To Nearby Concepts");
    expect(html).toContain(`data-graph-id="${REGULARIZATION_GRAPH_ID}"`);
    expect(html).toContain("Regularization strength");
    expect(html).toContain('href="/docs/training/dropout"');
    expect(html).toContain('href="/docs/glossary/overfitting"');
    expect(html).toContain('href="/docs/glossary/generalization"');
    expect(html).toContain('href="/docs/glossary/model-capacity"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain("Deep Learning");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("missing-content");
  });

  test("rendered dropout page exposes training-flow graph, discovery links, tags, citations, and related docs", async () => {
    const page = await loadTrainingRegimePage(DROPOUT_SLUG);

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
    expect(html).toContain(`data-graph-id="${DROPOUT_GRAPH_ID}"`);
    expect(html).toContain("Dropout training flow");
    expect(html).toContain("Network in training mode");
    expect(html).toContain('href="/docs/concepts/regularization"');
    expect(html).toContain('href="/docs/glossary/overfitting"');
    expect(html).toContain('href="/docs/glossary/generalization"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain(
      "Dropout: A Simple Way to Prevent Neural Networks from Overfitting",
    );
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("missing-content");
  });
});
