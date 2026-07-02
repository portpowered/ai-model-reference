import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { resolveCitations } from "@/lib/content/citations";
import { getModelsDocsRoot } from "@/lib/content/content-paths";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadModelPage } from "@/lib/content/model-page";
import { getPublishedDocsEntryByRegistryId } from "@/lib/content/published-docs-registry-ids";
import { getModelById } from "@/lib/content/registry-runtime";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const MODEL_SLUG = "qwen3-0-6b";
const MODEL_ID = "model.qwen3-0-6b";
const MODEL_URL = "/docs/models/qwen3-0-6b";
const GRAPH_ID = "graph.qwen3-0-6b-architecture";
const DENSE_QWEN36_URL = "/docs/models/qwen-3-6-27b";

const EXPECTED_CITATION_URLS = [
  "https://qwenlm.github.io/blog/qwen3/",
  "https://huggingface.co/Qwen/Qwen3-0.6B",
  "https://huggingface.co/Qwen/Qwen3-0.6B-Base",
] as const;

const pageDir = join(getModelsDocsRoot(), MODEL_SLUG);
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

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
 * Routine bundle validation (`validateGeneratedPageBundle`, identity, reader-page,
 * architecture-graph, and discovery tests) covers the broader Qwen3-0.6B slice.
 * These tests stay focused on end-to-end slice proof: routable page, local assets,
 * citation resolution, graph rendering, and at least one discovery handoff.
 */
describe("Qwen3-0.6B slice verification (qwen3-0-6b-model-page-005)", () => {
  test("canonical route resolves to a published model page with matching registry record and English messages", async () => {
    const entry = getPublishedDocsEntryByRegistryId(MODEL_ID);
    const page = await loadModelPage(MODEL_SLUG);
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const model = getModelById(MODEL_ID);

    expect(entry).toMatchObject({
      registryId: MODEL_ID,
      slug: MODEL_SLUG,
      url: MODEL_URL,
    });
    expect(model?.status).toBe("published");
    expect(page.frontmatter.registryId).toBe(MODEL_ID);
    expect(page.frontmatter.kind).toBe("model");
    expect(page.frontmatter.status).toBe("published");
    expect(page.messages.title).toBe("Qwen3-0.6B");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);
  });

  test("page-local assets and citations resolve for the bundle", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );
    const model = getModelById(MODEL_ID);

    if (!model) {
      throw new Error("expected Qwen3-0.6B model record in registry");
    }

    expect(assets.architectureGraph).toMatchObject({
      type: "graph",
      graphId: GRAPH_ID,
      webRenderer: "react-flow",
      altKey: "assets.architectureGraph.alt",
    });
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
    expect(messages.assets?.architectureGraph?.alt).toContain(
      "Qwen3-0.6B architecture diagram",
    );

    const citations = resolveCitations(model.citationIds);
    expect(citations.map((citation) => citation.url)).toEqual([
      ...EXPECTED_CITATION_URLS,
    ]);
    expect(new Set(citations.map((citation) => citation.url)).size).toBe(
      EXPECTED_CITATION_URLS.length,
    );
  });

  test("architecture graph asset resolves to a graph record and renders through the model architecture graph surface", async () => {
    const page = await loadModelPage(MODEL_SLUG);

    expect(page.assets.architectureGraph).toMatchObject({
      type: "graph",
      graphId: GRAPH_ID,
      webRenderer: "react-flow",
    });
    expect(getGraphById(GRAPH_ID)?.subjectId).toBe(MODEL_ID);

    const html = await renderModelPageHtml();

    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain("Grouped-Query");
    expect(html).toContain("Dense");
    expect(html).not.toContain("Expert\nRouting");
  });

  test("rendered references include the three Qwen-controlled sources without duplicate URLs", async () => {
    const html = await renderModelPageHtml();

    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain("https://qwenlm.github.io/blog/qwen3/");
    expect(html).toContain("https://huggingface.co/Qwen/Qwen3-0.6B");
    expect(html).toContain("https://huggingface.co/Qwen/Qwen3-0.6B-Base");

    const citationUrls = EXPECTED_CITATION_URLS.filter((url) =>
      html.includes(url),
    );
    expect(citationUrls).toHaveLength(EXPECTED_CITATION_URLS.length);
  });

  test("search by Qwen3-0.6B and related-doc traversal expose Qwen-family discovery paths", async () => {
    const results = await docsSearchApi.search("Qwen3-0.6B");

    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeUrl(results, MODEL_URL)).toBe(true);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(MODEL_URL);

    const relatedHtml = renderToStaticMarkup(
      createElement(DerivedRelatedDocs, {
        registryId: MODEL_ID,
        groups: ["same-model-family", "curated-related"],
      }),
    );

    expect(relatedHtml).toContain(`href="${DENSE_QWEN36_URL}"`);
    expect(relatedHtml).toContain('data-related-group="curated-related"');
  });
});
