import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getModelById,
  getPrimaryClassificationForRecord,
  getTrainingRegimeById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { loadTrainingRegimePage } from "@/lib/content/training-regime-page";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

function loadPostTrainingPageBundle() {
  const pageDir = getDocsPageDir("training", "post-training");
  return {
    messages: pageMessagesSchema.parse(
      JSON.parse(readFileSync(join(pageDir, "messages", "en.json"), "utf8")),
    ),
    assets: JSON.parse(readFileSync(join(pageDir, "assets.json"), "utf8")) as {
      trainingFlow: { type: string; graphId: string };
    },
  };
}

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

describe("post-training training-regime graph contracts", () => {
  test("local asset config resolves the post-training graph with message-backed references", () => {
    const page = loadPostTrainingPageBundle();
    const assets = parsePageAssetConfig(page.assets);

    expect(assets.trainingFlow.type).toBe("graph");
    if (assets.trainingFlow.type === "graph") {
      expect(assets.trainingFlow.graphId).toBe(
        "graph.post-training-training-flow",
      );
    }
    expect(validatePageAssetReferences(assets, page.messages)).toEqual([]);
    expect(page.messages.assets?.trainingFlow.title).toBe("Post-training flow");
    expect(page.messages.assets?.trainingFlow.alt).toContain(
      "pretrained base model",
    );
    expect(page.messages.assets?.trainingFlow.caption).toContain(
      "Post-training reshapes a pretrained base model",
    );
    expect(page.messages.graph?.nodes?.baseModel?.label).toBe(
      "Pretrained\nbase model",
    );
    expect(page.messages.graph?.nodes?.objectives?.label).toBe(
      "Post-training\ndata and objectives",
    );
    expect(page.messages.graph?.nodes?.shapedModel?.label).toBe(
      "Behavior-shaped\nmodel",
    );
  });

  test("graph registry record teaches the focused post-training flow", () => {
    const graph = getGraphById("graph.post-training-training-flow");
    expect(graph?.subjectId).toBe("training-regime.post-training");
    expect(graph?.nodes.map((node) => node.id)).toEqual([
      "baseModel",
      "objectives",
      "shapedModel",
    ]);
    expect(graph?.edges.map((edge) => edge.id)).toEqual([
      "base-model-objectives",
      "objectives-shaped-model",
    ]);
    expect(graph?.rootNodeId).toBe("baseModel");
    expect(graph?.layout).toBe("vertical-expandable");
    expect(graph?.nodes.map((node) => node.position?.x)).toEqual([79, 79, 79]);
    expect(graph?.nodes.map((node) => node.size?.width)).toEqual([
      200, 200, 200,
    ]);
  });
});

describe("post-training training-regime discovery contracts", () => {
  test("registry record publishes search aliases, outward relationships, and training classification", () => {
    const record = getTrainingRegimeById("training-regime.post-training");
    expect(record?.status).toBe("published");
    expect(record?.primaryClassificationId).toBe("classification.training");
    expect(record?.aliases).toEqual([
      "Post-Training",
      "post-training",
      "post training",
      "alignment training",
      "behavior shaping",
    ]);
    expect(record?.tags).toEqual(["foundations", "alignment"]);
    expect(record?.relatedIds).toEqual([
      "training-regime.pretraining",
      "concept.alignment",
      "training-regime.rlhf",
      "training-regime.dpo",
      "training-regime.grpo",
      "training-regime.instruction-tuning",
      "training-regime.specialist-training",
      "model.gpt-3",
      "model.llama-3",
      "model.deepseek-v4-pro",
      "model.deepseek-v4-flash",
    ]);
    expect(
      getPrimaryClassificationForRecord("training-regime.post-training")?.id,
    ).toBe("classification.training");
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("training-regime.post-training"),
    ).toBe(true);
  });

  test("curated related docs keep post-training attached to pretraining, alignment, DPO, specialist training, and model paths", () => {
    const source = getTrainingRegimeById("training-regime.post-training");
    if (!source) {
      throw new Error("expected training-regime.post-training in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "training-regime.pretraining")
        ?.href,
    ).toBe("/docs/training/pretraining");
    expect(
      items.find((item) => item.registryId === "concept.alignment")?.href,
    ).toBe("/docs/concepts/alignment");
    expect(
      items.find((item) => item.registryId === "training-regime.dpo")?.href,
    ).toBe("/docs/training/dpo");
    expect(
      items.find(
        (item) => item.registryId === "training-regime.specialist-training",
      )?.href,
    ).toBe("/docs/training/specialist-training");
    expect(items.find((item) => item.registryId === "model.gpt-3")?.href).toBe(
      "/docs/models/gpt-3",
    );
    expect(
      items.find((item) => item.registryId === "model.llama-3")?.href,
    ).toBe("/docs/models/llama-3");
    expect(
      items.find((item) => item.registryId === "model.deepseek-v4-pro")?.href,
    ).toBe("/docs/models/deepseek-v4-pro");
  });

  test("related model records already reference alignment or post-training specialist regimes", () => {
    const llama = getModelById("model.llama-3");
    const deepseek = getModelById("model.deepseek-v4-pro");

    expect(llama?.relatedIds).toContain("concept.alignment");
    expect(deepseek?.trainingRegimeIds).toContain(
      "training-regime.specialist-training",
    );
  });

  test("page renders reader-visible onward paths without reader-shortcut copy", async () => {
    const page = await loadTrainingRegimePage("post-training");

    const html = await renderHtml(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('href="/docs/training/pretraining"');
    expect(html).toContain('href="/docs/training/dpo"');
    expect(html).toContain('href="/docs/concepts/alignment"');
    expect(html).toContain('href="/docs/training/instruction-tuning"');
    expect(html).toContain('href="/docs/training/rlhf"');
    expect(html).toContain('href="/docs/models/gpt-3"');
    expect(html).toContain('href="/docs/models/llama-3"');
    expect(html).toContain('href="/docs/models/deepseek-v4-pro"');
    expect(html).toContain('href="/docs/training/specialist-training"');
    expect(html).toContain(">Pretraining<");
    expect(html).toContain(">Direct Preference Optimization<");
    expect(html).toContain(">Alignment<");
    expect(html).toContain(">Instruction tuning<");
    expect(html).toContain(">RLHF<");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain(
      'data-graph-title="graph.post-training-training-flow"',
    );
    expect(html).toContain(
      'data-graph-legend="graph.post-training-training-flow"',
    );
    expect(html).toContain("Pretrained");
    expect(html).toContain("base model");
    expect(html).toContain("Post-training");
    expect(html).toContain("data and objectives");
    expect(html).toContain("Behavior-shaped");
    expect(html).toContain("model");
    expect(html).toContain(
      "Post-training reshapes a pretrained base model by applying narrower data and sharper objectives.",
    );
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search documents and runtime search resolve post-training aliases and core discovery terms", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/training/post-training",
    );
    expect(document?.kind).toBe("training-regime");
    expect(document?.aliases).toEqual(
      expect.arrayContaining(["alignment training", "behavior shaping"]),
    );
    expect(document?.relatedIds).toEqual([
      "training-regime.pretraining",
      "concept.alignment",
      "training-regime.rlhf",
      "training-regime.dpo",
      "training-regime.grpo",
      "training-regime.instruction-tuning",
      "training-regime.specialist-training",
      "model.gpt-3",
      "model.llama-3",
      "model.deepseek-v4-pro",
      "model.deepseek-v4-flash",
    ]);

    for (const query of [
      "post-training",
      "behavior shaping",
      "alignment training",
    ]) {
      const results = await docsSearchApi.search(query);
      expect(pageBaseUrl(results[0]?.url ?? "")).toBe(
        "/docs/training/post-training",
      );
    }
  });
});
