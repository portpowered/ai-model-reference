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

describe("distillation training-regime page contracts", () => {
  test("registry record publishes distillation aliases, tags, related ids, and reused citation", () => {
    const record = getTrainingRegimeById("training-regime.distillation");
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("distillation");
    expect(record?.kind).toBe("training-regime");
    expect(record?.defaultTitleKey).toBe("title");
    expect(record?.defaultSummaryKey).toBe("description");
    expect(record?.aliases).toEqual([
      "distillation",
      "model distillation",
      "knowledge distillation",
    ]);
    expect(record?.tags).toEqual(["foundations"]);
    expect(record?.relatedIds).toEqual([
      "training-regime.on-policy-distillation",
    ]);
    expect(record?.citationIds).toEqual([
      "citation.on-policy-distillation-of-language-models",
    ]);
    expect(record?.sidebarGrouping).toEqual({ training: "distillation" });
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("training-regime.distillation"),
    ).toBe(true);
  });

  test("canonical distillation bundle resolves the route, registry record, English messages, asset graph, and citation together", async () => {
    const record = getTrainingRegimeById("training-regime.distillation");
    if (!record) {
      throw new Error("expected training-regime.distillation in registry");
    }

    const page = await loadTrainingRegimePage("distillation");
    const citation = getCitationById(
      "citation.on-policy-distillation-of-language-models",
    );

    expect(page.frontmatter.kind).toBe("training-regime");
    expect(page.frontmatter.registryId).toBe(record.id);
    expect(page.messages.title).toBe("Distillation");
    expect(page.messages.description).toContain(
      "teacher-student training regime",
    );
    expect(page.messages.openingSummary).toContain(
      "teacher-student training regime",
    );
    expect(page.messages.sections?.whatItIs.body).toContain("teacher model");
    expect(page.messages.sections?.whatItIs.body).toContain("student model");
    expect(page.messages.sections?.whyItExists.body).toContain("latency");
    expect(page.assets.trainingFlow).toMatchObject({
      type: "graph",
      graphId: "graph.distillation-training-flow",
    });
    expect(citation?.url).toContain("openreview.net");
    expect(citation?.title).toContain(
      "On-Policy Distillation of Language Models",
    );
  });

  test("curated related docs keep the distillation overview attached to on-policy distillation", () => {
    const source = getTrainingRegimeById("training-regime.distillation");
    if (!source) {
      throw new Error("expected training-regime.distillation in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const onPolicy = items.find(
      (item) => item.registryId === "training-regime.on-policy-distillation",
    );
    expect(onPolicy?.href).toBe("/docs/training/on-policy-distillation");
    expect(onPolicy?.isPlanned).toBe(false);
  });

  test("on-policy distillation links back to the distillation overview through curated related ids", () => {
    const source = getTrainingRegimeById(
      "training-regime.on-policy-distillation",
    );
    if (!source) {
      throw new Error(
        "expected training-regime.on-policy-distillation in registry",
      );
    }

    expect(source.relatedIds).toEqual([
      "training-regime.distillation",
      "paper.deepseek-v4",
      "training-regime.specialist-training",
    ]);

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const overview = items.find(
      (item) => item.registryId === "training-regime.distillation",
    );
    expect(overview?.href).toBe("/docs/training/distillation");
    expect(overview?.isPlanned).toBe(false);
  });

  test("page renders related docs, tags, and references without reader-shortcut copy", async () => {
    const page = await loadTrainingRegimePage("distillation");

    expect(page.frontmatter.kind).toBe("training-regime");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("training-regime.distillation");

    const html = await renderHtml(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/training/on-policy-distillation"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain("On-Policy Distillation of Language Models");
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search documents and runtime search resolve distillation title, aliases, and core terms", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/training/distillation",
    );
    expect(document?.kind).toBe("training-regime");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "distillation",
        "model distillation",
        "knowledge distillation",
      ]),
    );
    expect(document?.relatedIds).toEqual([
      "training-regime.on-policy-distillation",
    ]);
    expect(document?.tags).toEqual(expect.arrayContaining(["foundations"]));

    for (const query of [
      "distillation",
      "model distillation",
      "knowledge distillation",
    ]) {
      const results = await docsSearchApi.search(query);
      expect(pageBaseUrl(results[0]?.url ?? "")).toBe(
        "/docs/training/distillation",
      );
    }
  });
});
