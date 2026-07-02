import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getCitationById,
  getTrainingRegimeById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { loadTrainingRegimePage } from "@/lib/content/training-regime-page";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

function pageBaseUrl(url: string): string {
  return url.split("#")[0] ?? url;
}

async function renderHtml(
  element: ReturnType<typeof createElement>,
): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}

describe("dropout training-regime page contracts", () => {
  test("registry record publishes dropout aliases, tags, related ids, and original citation", () => {
    const record = getTrainingRegimeById("training-regime.dropout");
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("dropout");
    expect(record?.kind).toBe("training-regime");
    expect(record?.defaultTitleKey).toBe("title");
    expect(record?.defaultSummaryKey).toBe("description");
    expect(record?.aliases).toEqual([
      "dropout",
      "dropout regularization",
      "neural network dropout",
    ]);
    expect(record?.tags).toEqual(["foundations"]);
    expect(record?.relatedIds).toEqual([
      "concept.regularization",
      "concept.overfitting",
      "concept.generalization",
    ]);
    expect(record?.citationIds).toEqual([
      "citation.dropout-prevent-overfitting",
    ]);
    expect(record?.sidebarGrouping).toEqual({ training: "optimization" });
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("training-regime.dropout")).toBe(
      true,
    );
  });

  test("canonical dropout bundle resolves the route, registry record, English messages, asset graph, and citation together", async () => {
    const record = getTrainingRegimeById("training-regime.dropout");
    if (!record) {
      throw new Error("expected training-regime.dropout in registry");
    }

    const page = await loadTrainingRegimePage("dropout");
    const citation = getCitationById("citation.dropout-prevent-overfitting");

    expect(page.frontmatter.kind).toBe("training-regime");
    expect(page.frontmatter.registryId).toBe(record.id);
    expect(page.messages.title).toBe("Dropout");
    expect(page.messages.description).toContain("randomly disables");
    expect(page.messages.openingSummary).toContain("co-adapted pathways");
    expect(page.messages.sections?.whatItIs.body).toContain("randomly zeros");
    expect(page.messages.sections?.whatItIs.body).toContain("inference");
    expect(page.messages.sections?.whyItExists.body).toContain("co-adapt");
    expect(page.messages.sections?.howItWorks.body).toContain("dropout mask");
    expect(page.messages.sections?.limitationsAndFailureModes.body).toContain(
      "not free regularization",
    );
    expect(page.assets.trainingFlow).toMatchObject({
      type: "graph",
      graphId: "graph.dropout-training-flow",
    });
    expect(citation?.url).toContain("jmlr.org");
    expect(citation?.title).toContain(
      "Dropout: A Simple Way to Prevent Neural Networks from Overfitting",
    );
  });

  test("curated related docs connect dropout to regularization and nearby concepts", () => {
    const source = getTrainingRegimeById("training-regime.dropout");
    if (!source) {
      throw new Error("expected training-regime.dropout in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const regularization = items.find(
      (item) => item.registryId === "concept.regularization",
    );
    expect(regularization?.href).toBe("/docs/concepts/regularization");
    expect(regularization?.isPlanned).toBe(false);

    const overfitting = items.find(
      (item) => item.registryId === "concept.overfitting",
    );
    expect(overfitting?.href).toBe("/docs/glossary/overfitting");
    expect(overfitting?.isPlanned).toBe(false);
  });

  test("page renders related docs, tags, references, and training flow without reader-shortcut copy", async () => {
    const page = await loadTrainingRegimePage("dropout");

    expect(page.frontmatter.kind).toBe("training-regime");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("training-regime.dropout");

    const html = await renderHtml(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/concepts/regularization"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain(
      "Dropout: A Simple Way to Prevent Neural Networks from Overfitting",
    );
    expect(html).toContain("Dropout training flow");
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search documents and runtime search resolve dropout title, aliases, and core terms", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/training/dropout",
    );
    expect(document?.kind).toBe("training-regime");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "dropout",
        "dropout regularization",
        "neural network dropout",
      ]),
    );
    expect(document?.relatedIds).toEqual([
      "concept.regularization",
      "concept.overfitting",
      "concept.generalization",
    ]);
    expect(document?.tags).toEqual(expect.arrayContaining(["foundations"]));

    for (const query of ["dropout", "dropout regularization"]) {
      const results = await docsSearchApi.search(query);
      expect(pageBaseUrl(results[0]?.url ?? "")).toBe("/docs/training/dropout");
    }
  });
});
