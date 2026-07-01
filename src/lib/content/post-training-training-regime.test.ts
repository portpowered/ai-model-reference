import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
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

describe("post-training training-regime discovery contracts", () => {
  test("registry record publishes search aliases, outward relationships, and training classification", () => {
    const record = getTrainingRegimeById("training-regime.post-training");
    expect(record?.status).toBe("published");
    expect(record?.primaryClassificationId).toBe("classification.training");
    expect(record?.aliases).toEqual([
      "Post-Training",
      "post-training",
      "post training",
      "instruction tuning",
      "instruction-tuning",
      "supervised fine-tuning",
      "SFT",
      "RLHF",
      "reinforcement learning from human feedback",
      "alignment training",
      "behavior shaping",
    ]);
    expect(record?.tags).toEqual(["foundations", "alignment"]);
    expect(record?.relatedIds).toEqual([
      "training-regime.pretraining",
      "concept.alignment",
      "training-regime.dpo",
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
    expect(html).toContain('href="/search?q=instruction%20tuning"');
    expect(html).toContain('href="/search?q=SFT"');
    expect(html).toContain('href="/search?q=RLHF"');
    expect(html).toContain('href="/docs/models/gpt-3"');
    expect(html).toContain('href="/docs/models/llama-3"');
    expect(html).toContain('href="/docs/models/deepseek-v4-pro"');
    expect(html).toContain('href="/docs/training/specialist-training"');
    expect(html).toContain(">Pretraining<");
    expect(html).toContain(">Direct Preference Optimization<");
    expect(html).toContain(">Alignment<");
    expect(html).toContain(">Instruction tuning search<");
    expect(html).toContain(">SFT search<");
    expect(html).toContain(">RLHF search<");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
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
      expect.arrayContaining([
        "instruction tuning",
        "SFT",
        "RLHF",
        "alignment training",
      ]),
    );
    expect(document?.relatedIds).toEqual([
      "training-regime.pretraining",
      "concept.alignment",
      "training-regime.dpo",
      "training-regime.specialist-training",
      "model.gpt-3",
      "model.llama-3",
      "model.deepseek-v4-pro",
      "model.deepseek-v4-flash",
    ]);

    for (const query of [
      "post-training",
      "instruction tuning",
      "SFT",
      "RLHF",
      "alignment training",
    ]) {
      const results = await docsSearchApi.search(query);
      expect(pageBaseUrl(results[0]?.url ?? "")).toBe(
        "/docs/training/post-training",
      );
    }
  });
});
