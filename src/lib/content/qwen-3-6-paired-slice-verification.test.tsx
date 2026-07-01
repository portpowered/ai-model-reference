import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { resolveCitations } from "@/lib/content/citations";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadModelPage } from "@/lib/content/model-page";
import { getPublishedDocsEntryByRegistryId } from "@/lib/content/published-docs-registry-ids";
import { getModelById } from "@/lib/content/registry-runtime";
import { docsSearchApi } from "@/lib/search/search-server";

const DENSE_SLUG = "qwen-3-6-27b";
const MOE_SLUG = "qwen-3-6-35b-a3b";
const DENSE_MODEL_ID = "model.qwen-3-6-27b";
const MOE_MODEL_ID = "model.qwen-3-6-35b-a3b";
const DENSE_GRAPH_ID = "graph.qwen-3-6-27b-architecture";
const MOE_GRAPH_ID = "graph.qwen-3-6-35b-a3b-architecture";
const SHARED_CITATION_ID = "citation.qwen36-github";

function pageBaseUrl(url: string): string {
  return url.split("#")[0] ?? url;
}

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

async function renderModelPageHtml(slug: string): Promise<string> {
  const page = await loadModelPage(slug);
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("Qwen 3.6 paired slice verification", () => {
  test("both canonical routes resolve to published model pages with matching registry records and English messages", async () => {
    const densePage = await loadModelPage(DENSE_SLUG);
    const moePage = await loadModelPage(MOE_SLUG);
    const denseEntry = getPublishedDocsEntryByRegistryId(DENSE_MODEL_ID);
    const moeEntry = getPublishedDocsEntryByRegistryId(MOE_MODEL_ID);
    const denseModel = getModelById(DENSE_MODEL_ID);
    const moeModel = getModelById(MOE_MODEL_ID);

    expect(denseEntry).toMatchObject({
      registryId: DENSE_MODEL_ID,
      url: "/docs/models/qwen-3-6-27b",
    });
    expect(moeEntry).toMatchObject({
      registryId: MOE_MODEL_ID,
      url: "/docs/models/qwen-3-6-35b-a3b",
    });
    expect(denseModel?.status).toBe("published");
    expect(moeModel?.status).toBe("published");
    expect(densePage.messages.title).toBe("Qwen3.6-27B");
    expect(moePage.messages.title).toBe("Qwen3.6-35B-A3B");
  });

  test("both page-local architecture graph assets resolve to graph records and render through the model architecture graph surface", async () => {
    const densePage = await loadModelPage(DENSE_SLUG);
    const moePage = await loadModelPage(MOE_SLUG);

    expect(densePage.assets.architectureGraph).toMatchObject({
      type: "graph",
      graphId: DENSE_GRAPH_ID,
      webRenderer: "react-flow",
    });
    expect(moePage.assets.architectureGraph).toMatchObject({
      type: "graph",
      graphId: MOE_GRAPH_ID,
      webRenderer: "react-flow",
    });
    expect(getGraphById(DENSE_GRAPH_ID)).toBeDefined();
    expect(getGraphById(MOE_GRAPH_ID)).toBeDefined();

    const denseHtml = await renderModelPageHtml(DENSE_SLUG);
    const moeHtml = await renderModelPageHtml(MOE_SLUG);

    expect(denseHtml).toContain('data-page-asset="architectureGraph"');
    expect(denseHtml).toContain(`data-graph-id="${DENSE_GRAPH_ID}"`);
    expect(denseHtml).toContain('data-react-flow-graph="true"');
    expect(denseHtml).toContain("Dense\nFeed\nForward");

    expect(moeHtml).toContain('data-page-asset="architectureGraph"');
    expect(moeHtml).toContain(`data-graph-id="${MOE_GRAPH_ID}"`);
    expect(moeHtml).toContain('data-react-flow-graph="true"');
    expect(moeHtml).toContain("Expert\nRouting");
  });

  test("shared Qwen citation records are reused by both model records instead of duplicated ids", () => {
    const dense = getModelById(DENSE_MODEL_ID);
    const moe = getModelById(MOE_MODEL_ID);

    if (!dense || !moe) {
      throw new Error("expected both Qwen 3.6 model records in registry");
    }

    expect(dense.citationIds).toContain(SHARED_CITATION_ID);
    expect(moe.citationIds).toContain(SHARED_CITATION_ID);

    const sharedCitations = resolveCitations([SHARED_CITATION_ID]);
    expect(sharedCitations).toHaveLength(1);
    expect(sharedCitations[0]?.id).toBe(SHARED_CITATION_ID);

    const denseResolved = resolveCitations(dense.citationIds);
    const moeResolved = resolveCitations(moe.citationIds);
    const sharedInstances = [...denseResolved, ...moeResolved].filter(
      (citation) => citation.id === SHARED_CITATION_ID,
    );

    expect(sharedInstances).toHaveLength(2);
    expect(new Set(sharedInstances.map((citation) => citation.url))).toEqual(
      new Set(["https://github.com/QwenLM/Qwen3.6"]),
    );
  });

  test("dense-vs-MoE discovery returns both operating points for a comparison query", async () => {
    const results = await docsSearchApi.search("Qwen 3.6 dense MoE");

    expect(resultsIncludeUrl(results, "/docs/models/qwen-3-6-27b")).toBe(true);
    expect(resultsIncludeUrl(results, "/docs/models/qwen-3-6-35b-a3b")).toBe(
      true,
    );
  });
});
