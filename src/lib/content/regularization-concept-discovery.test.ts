import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { loadTrainingRegimePage } from "@/lib/content/training-regime-page";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const REGULARIZATION_CONCEPT_URL = "/docs/concepts/regularization";
const DROPOUT_TRAINING_URL = "/docs/training/dropout";

const REGULARIZATION_DISCOVERY_HREFS = [
  "/docs/training/dropout",
  "/docs/glossary/overfitting",
  "/docs/glossary/generalization",
  "/docs/glossary/model-capacity",
] as const;

const DROPOUT_DISCOVERY_HREFS = [
  "/docs/concepts/regularization",
  "/docs/glossary/overfitting",
  "/docs/glossary/generalization",
] as const;

function pageBaseUrlFromResults(
  results: Array<{ url: string }>,
  pageUrl: string,
): boolean {
  return results.some(
    (result) =>
      pageBaseUrl(result.url) === pageUrl ||
      pageBaseUrl(result.url.split("#")[0] ?? result.url) === pageUrl,
  );
}

describe("regularization and dropout discovery (regularization-004)", () => {
  test("registry records expose aliases and curated related ids for bidirectional discovery", () => {
    const regularization = getConceptById("concept.regularization");
    expect(regularization?.status).toBe("published");
    expect(regularization?.aliases).toEqual(
      expect.arrayContaining(["regularization", "regularizer"]),
    );
    expect(regularization?.relatedIds).toEqual(
      expect.arrayContaining([
        "training-regime.dropout",
        "concept.overfitting",
        "concept.generalization",
        "concept.model-capacity",
      ]),
    );

    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.regularization")).toBe(
      true,
    );
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("training-regime.dropout")).toBe(
      true,
    );
  });

  test("curated related docs connect regularization to dropout and nearby concepts", () => {
    const source = getConceptById("concept.regularization");
    if (!source) {
      throw new Error("expected concept.regularization in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "training-regime.dropout")?.href,
    ).toBe(DROPOUT_TRAINING_URL);
    expect(
      items.find((item) => item.registryId === "concept.overfitting")?.href,
    ).toBe("/docs/glossary/overfitting");
    expect(
      items.find((item) => item.registryId === "concept.generalization")?.href,
    ).toBe("/docs/glossary/generalization");
    expect(
      items.find((item) => item.registryId === "concept.model-capacity")?.href,
    ).toBe("/docs/glossary/model-capacity");
  });

  test("search documents carry canonical aliases for regularization and dropout", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const regularization = documents.find(
      (entry) => entry.url === REGULARIZATION_CONCEPT_URL,
    );
    expect(regularization?.kind).toBe("concept");
    expect(regularization?.aliases).toEqual(
      expect.arrayContaining(["regularization", "regularizer"]),
    );

    const dropout = documents.find(
      (entry) => entry.url === DROPOUT_TRAINING_URL,
    );
    expect(dropout?.kind).toBe("training-regime");
    expect(dropout?.aliases).toEqual(
      expect.arrayContaining([
        "dropout",
        "dropout regularization",
        "neural network dropout",
      ]),
    );
  });

  test.each([
    "regularization",
    "regularizer",
  ] as const)("live search routes %s to the canonical regularization concept page", async (query) => {
    const results = await docsSearchApi.search(query);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(REGULARIZATION_CONCEPT_URL);
  });

  test("regularization search surfaces the broad concept together with dropout and generalization", async () => {
    const results = await docsSearchApi.search("regularization");

    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(REGULARIZATION_CONCEPT_URL);
    expect(pageBaseUrlFromResults(results, DROPOUT_TRAINING_URL)).toBe(true);
    expect(
      pageBaseUrlFromResults(results, "/docs/glossary/generalization"),
    ).toBe(true);
  });

  test.each([
    "dropout",
    "dropout regularization",
    "neural network dropout",
  ] as const)("live search routes %s to the Training dropout page", async (query) => {
    const results = await docsSearchApi.search(query);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(DROPOUT_TRAINING_URL);
  });

  test("regularization page renders reader-visible paths to dropout and nearby concepts", async () => {
    const page = await loadConceptPage("regularization");
    expect(page.frontmatter.registryId).toBe("concept.regularization");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    for (const href of REGULARIZATION_DISCOVERY_HREFS) {
      expect(html).toContain(`href="${href}"`);
    }

    expect(html).toContain('data-testid="curated-related-docs"');
  });

  test("dropout page renders reader-visible paths back to regularization and nearby concepts", async () => {
    const page = await loadTrainingRegimePage("dropout");
    expect(page.frontmatter.registryId).toBe("training-regime.dropout");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    for (const href of DROPOUT_DISCOVERY_HREFS) {
      expect(html).toContain(`href="${href}"`);
    }
  });
});
