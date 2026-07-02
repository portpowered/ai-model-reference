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
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const PAGE_URL = "/docs/training/grpo";

async function renderHtml(
  element: ReturnType<typeof createElement>,
): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}

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

describe("GRPO training-regime page contracts", () => {
  test("registry record publishes groupwise-optimization aliases and alignment curated related ids", () => {
    const record = getTrainingRegimeById("training-regime.grpo");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "GRPO",
      "Group Relative Preference Optimization",
      "group relative preference optimization",
      "group relative policy optimization",
    ]);
    expect(record?.tags).toEqual(["alignment", "foundations"]);
    expect(record?.relatedIds).toEqual([
      "concept.alignment",
      "training-regime.dpo",
      "training-regime.post-training",
    ]);
    expect(record?.primaryClassificationId).toBe(
      "classification.training.alignment",
    );
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("training-regime.grpo")).toBe(true);
  });

  test("canonical GRPO bundle resolves the route, registry record, English messages, asset graph, and citation together", async () => {
    const record = getTrainingRegimeById("training-regime.grpo");
    if (!record) {
      throw new Error("expected training-regime.grpo in registry");
    }

    const page = await loadTrainingRegimePage("grpo");
    const citation = getCitationById("citation.deepseekmath-grpo");

    expect(page.frontmatter.kind).toBe("training-regime");
    expect(page.frontmatter.registryId).toBe(record.id);
    expect(page.messages.title).toBe("Group Relative Preference Optimization");
    expect(page.messages.description).toContain("groupwise alignment");
    expect(page.messages.openingSummary).toContain("usually shortened to GRPO");
    expect(page.messages.sections?.howItWorks.body).toContain(
      "multiple candidate answers",
    );
    expect(page.assets.trainingFlow).toMatchObject({
      type: "graph",
      graphId: "graph.grpo-training-flow",
    });
    expect(record.defaultTitleKey).toBe("title");
    expect(record.defaultSummaryKey).toBe("description");
    expect(record.citationIds).toEqual(["citation.deepseekmath-grpo"]);
    expect(citation?.url).toBe("https://arxiv.org/abs/2402.03300");
    expect(citation?.title).toContain("DeepSeekMath");
  });

  test("curated related docs keep the GRPO page attached to the published alignment lane", () => {
    const source = getTrainingRegimeById("training-regime.grpo");
    if (!source) {
      throw new Error("expected training-regime.grpo in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const alignment = items.find(
      (item) => item.registryId === "concept.alignment",
    );
    const dpo = items.find((item) => item.registryId === "training-regime.dpo");
    const postTraining = items.find(
      (item) => item.registryId === "training-regime.post-training",
    );

    expect(alignment?.href).toBe("/docs/concepts/alignment");
    expect(alignment?.isPlanned).toBe(false);
    expect(dpo?.href).toBe("/docs/training/dpo");
    expect(dpo?.isPlanned).toBe(false);
    expect(postTraining?.href).toBe("/docs/training/post-training");
    expect(postTraining?.isPlanned).toBe(false);
  });

  test("page renders isolation-first GRPO summary and opening training-regime sections", async () => {
    const page = await loadTrainingRegimePage("grpo");

    expect(page.messages.openingSummary).toContain(
      "Group Relative Preference Optimization",
    );
    expect(page.messages.openingSummary).toContain("usually shortened to GRPO");
    expect(page.messages.sections?.whatItIs.body).toContain(
      "Group Relative Preference Optimization",
    );
    expect(page.messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "post-training",
    );
    expect(page.messages.sections?.whyItExists.body?.toLowerCase()).toContain(
      "post-training",
    );
    expect(page.messages.sections?.whyItExists.body).toContain(
      "relative to one another",
    );

    const html = await renderHtml(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("What It Is");
    expect(html).toContain("Why It Exists");
    expect(html).toContain("candidate answers");
    expect(html).toContain("grouped relative rankings");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("on this page");
  });

  test("page renders alignment and nearby-regime links without reader-shortcut copy", async () => {
    const page = await loadTrainingRegimePage("grpo");

    expect(page.frontmatter.kind).toBe("training-regime");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("training-regime.grpo");

    const html = await renderHtml(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('href="/docs/concepts/alignment"');
    expect(html).toContain('href="/docs/training/post-training"');
    expect(html).toContain('href="/docs/training/dpo"');
    expect(html).toContain('href="/search?q=PPO"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search documents carry the GRPO comparison alias and alignment related ids", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find((entry) => entry.url === PAGE_URL);
    expect(document?.kind).toBe("training-regime");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "GRPO",
        "Group Relative Preference Optimization",
        "group relative preference optimization",
      ]),
    );
    expect(document?.relatedIds).toEqual([
      "concept.alignment",
      "training-regime.dpo",
      "training-regime.post-training",
    ]);
    expect(document?.tags).toEqual(
      expect.arrayContaining(["alignment", "foundations"]),
    );
  });

  test.each([
    "grpo",
    "group relative preference optimization",
  ] as const)("live search routes %s to the canonical GRPO training page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(PAGE_URL);
    expect(pageBaseUrlFromResults(results, PAGE_URL)).toBe(true);
  });
});
