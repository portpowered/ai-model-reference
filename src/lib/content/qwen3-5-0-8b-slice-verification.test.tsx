import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";
import { resolveCitations } from "@/lib/content/citations";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadModelPage } from "@/lib/content/model-page";
import { getPublishedDocsEntryByRegistryId } from "@/lib/content/published-docs-registry-ids";
import { getModelById } from "@/lib/content/registry-runtime";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const MODEL_SLUG = "qwen3-5-0-8b";
const MODEL_ID = "model.qwen3-5-0-8b";
const MODEL_URL = "/docs/models/qwen3-5-0-8b";
const GRAPH_ID = "graph.qwen3-5-0-8b-architecture";

const QWEN_CONTROLLED_CITATION_IDS = [
  "citation.qwen35-announcement",
  "citation.qwen35-0-8b-huggingface",
  "citation.qwen35-0-8b-base-huggingface",
] as const;

const QWEN_CONTROLLED_CITATION_URLS = [
  "https://qwen.ai/blog?id=qwen3.5",
  "https://huggingface.co/Qwen/Qwen3.5-0.8B",
  "https://huggingface.co/Qwen/Qwen3.5-0.8B-Base",
] as const;

function resultsIncludeUrl(
  results: Array<{ url: string }>,
  pageUrl: string,
): boolean {
  return results.some(
    (result) =>
      pageBaseUrl(result.url) === pageUrl ||
      result.url.startsWith(`${pageUrl}#`),
  );
}

async function renderModelPageHtml(): Promise<string> {
  const page = await loadModelPage(MODEL_SLUG);
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

/**
 * Review-facing proof for the Qwen3.5-0.8B model slice. Routine bundle invariants
 * (frontmatter, messages, tags, local asset keys) stay on `validateDerivedPublishedPageBundles`
 * via `make validate-data`; these tests focus on citation/graph resolution, rendered
 * surfaces, and reader-visible discovery paths for this checkpoint only.
 */
describe("Qwen3.5-0.8B slice verification (qwen3-5-small-model-page-005)", () => {
  test("canonical route resolves to a published model page with registry record, English messages, local assets, and graph wiring", async () => {
    const page = await loadModelPage(MODEL_SLUG);
    const entry = getPublishedDocsEntryByRegistryId(MODEL_ID);
    const model = getModelById(MODEL_ID);

    expect(entry).toMatchObject({
      registryId: MODEL_ID,
      url: MODEL_URL,
    });
    expect(model?.status).toBe("published");
    expect(page.messages.title).toBe("Qwen3.5-0.8B");
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);
    expect(page.assets.architectureGraph).toMatchObject({
      type: "graph",
      graphId: GRAPH_ID,
      webRenderer: "react-flow",
      altKey: "assets.architectureGraph.alt",
    });
    expect(page.messages.assets?.architectureGraph?.alt).toContain(
      "Gated DeltaNet",
    );
  });

  test("Qwen-controlled citation records resolve, are referenced by the model record, and render in the references section", async () => {
    const model = getModelById(MODEL_ID);
    if (!model) {
      throw new Error("expected Qwen3.5-0.8B model record in registry");
    }

    expect(model.citationIds).toEqual([...QWEN_CONTROLLED_CITATION_IDS]);

    const citations = resolveCitations(model.citationIds);
    expect(citations.map((citation) => citation.id)).toEqual([
      ...QWEN_CONTROLLED_CITATION_IDS,
    ]);
    expect(citations.map((citation) => citation.url)).toEqual([
      ...QWEN_CONTROLLED_CITATION_URLS,
    ]);

    const html = await renderModelPageHtml();
    expect(html).toContain('data-testid="citation-list"');
    for (const url of QWEN_CONTROLLED_CITATION_URLS) {
      expect(html).toContain(`href="${url}"`);
    }
  });

  test("architecture graph asset resolves to a graph record and renders through the model architecture graph surface", async () => {
    const page = await loadModelPage(MODEL_SLUG);
    const graph = getGraphById(GRAPH_ID);

    expect(graph).toBeDefined();
    expect(graph?.subjectId).toBe(MODEL_ID);
    expect(page.assets.architectureGraph).toMatchObject({
      type: "graph",
      graphId: GRAPH_ID,
    });

    const html = await renderModelPageHtml();
    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain(page.messages.assets?.architectureGraph?.alt ?? "");
    expect(html).not.toContain("data-missing-graph-id");
    expect(html).not.toContain("missing asset");
  });

  test("reader-visible discovery paths resolve through related docs and multimodal search queries", async () => {
    const relatedHtml = renderToStaticMarkup(
      <RelatedDocs registryId={MODEL_ID} />,
    );
    expect(relatedHtml).toContain('data-testid="curated-related-docs"');
    expect(relatedHtml).toContain('href="/docs/models/qwen-3-6-27b"');
    expect(relatedHtml).toContain('href="/docs/glossary/multimodal-model"');

    const searchResults = await docsSearchApi.search("Qwen3.5-0.8B");
    expect(searchResults.length).toBeGreaterThan(0);
    expect(resultsIncludeUrl(searchResults, MODEL_URL)).toBe(true);

    const multimodalResults = await docsSearchApi.search(
      "Qwen3.5 multimodal model",
    );
    expect(resultsIncludeUrl(multimodalResults, MODEL_URL)).toBe(true);
  });
});
