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

describe("mid-training training-regime boundary contracts", () => {
  test("compared-to-nearby-regimes prose distinguishes pretraining, post-training, SFT, domain adaptation, and distillation", async () => {
    const page = await loadTrainingRegimePage("mid-training");
    const nearby = page.messages.sections?.comparedToNearbyRegimes.body ?? "";

    expect(nearby).toContain("Broad pretraining");
    expect(nearby).toContain("large, general corpora");
    expect(nearby).toContain("pretrained checkpoint");
    expect(nearby).toContain("Post-training");
    expect(nearby).toContain("instruction following");
    expect(nearby).toContain("assistant-shaping");
    expect(nearby).toContain("Instruction tuning");
    expect(nearby).toContain("supervised fine-tuning");
    expect(nearby).toContain("prompt-and-answer demonstrations");
    expect(nearby).toContain("Domain adaptation");
    expect(nearby).toContain("Distillation");
    expect(nearby).toContain("teacher model");
    expect(nearby).toContain("does not require a teacher");
  });
});

describe("mid-training training-regime discovery contracts", () => {
  test("registry record publishes search aliases, outward relationships, and training classification", () => {
    const record = getTrainingRegimeById("training-regime.mid-training");
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("mid-training");
    expect(record?.kind).toBe("training-regime");
    expect(record?.primaryClassificationId).toBe("classification.training");
    expect(record?.aliases).toEqual([
      "Mid-Training",
      "mid-training",
      "continued training",
      "intermediate training",
    ]);
    expect(record?.tags).toEqual(["foundations"]);
    expect(record?.relatedIds).toEqual([
      "training-regime.pretraining",
      "training-regime.post-training",
      "training-regime.supervised-fine-tuning",
      "training-regime.distillation",
      "model.gpt-3",
      "model.llama-3",
    ]);
    expect(
      getPrimaryClassificationForRecord("training-regime.mid-training")?.id,
    ).toBe("classification.training");
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("training-regime.mid-training"),
    ).toBe(true);
  });

  test("curated related docs connect mid-training to adjacent regimes and pipeline model examples", () => {
    const source = getTrainingRegimeById("training-regime.mid-training");
    if (!source) {
      throw new Error("expected training-regime.mid-training in registry");
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
      items.find((item) => item.registryId === "training-regime.post-training")
        ?.href,
    ).toBe("/docs/training/post-training");
    expect(
      items.find(
        (item) => item.registryId === "training-regime.supervised-fine-tuning",
      )?.href,
    ).toBe("/docs/training/supervised-fine-tuning");
    expect(
      items.find((item) => item.registryId === "training-regime.distillation")
        ?.href,
    ).toBe("/docs/training/distillation");
    expect(items.find((item) => item.registryId === "model.gpt-3")?.href).toBe(
      "/docs/models/gpt-3",
    );
    expect(
      items.find((item) => item.registryId === "model.llama-3")?.href,
    ).toBe("/docs/models/llama-3");
  });

  test("related model records document pretraining and post-training stages where continued training fits", () => {
    const gpt3 = getModelById("model.gpt-3");
    const llama = getModelById("model.llama-3");

    expect(gpt3?.trainingRegimeIds).toContain("training-regime.pretraining");
    expect(llama?.trainingRegimeIds).toContain("training-regime.pretraining");
    expect(llama?.relatedIds).toContain("training-regime.pretraining");
    expect(llama?.relatedIds).toContain("concept.alignment");
  });

  test("page renders reader-visible onward paths without reader-shortcut copy", async () => {
    const page = await loadTrainingRegimePage("mid-training");

    const html = await renderHtml(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('href="/docs/training/pretraining"');
    expect(html).toContain('href="/docs/training/post-training"');
    expect(html).toContain('href="/docs/training/supervised-fine-tuning"');
    expect(html).toContain('href="/docs/training/distillation"');
    expect(html).toContain('href="/docs/models/gpt-3"');
    expect(html).toContain('href="/docs/models/llama-3"');
    expect(html).toContain(">Pretraining<");
    expect(html).toContain(">Post-Training<");
    expect(html).toContain('href="/docs/training/supervised-fine-tuning">SFT<');
    expect(html).toContain('href="/docs/training/distillation">distillation<');
    expect(html).toContain('href="/docs/models/gpt-3">GPT-3<');
    expect(html).toContain('href="/docs/models/llama-3">Llama 3<');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search documents and runtime search resolve mid-training aliases and continued-training discovery terms", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/training/mid-training",
    );
    expect(document?.kind).toBe("training-regime");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "mid-training",
        "continued training",
        "intermediate training",
      ]),
    );
    expect(document?.relatedIds).toEqual([
      "training-regime.pretraining",
      "training-regime.post-training",
      "training-regime.supervised-fine-tuning",
      "training-regime.distillation",
      "model.gpt-3",
      "model.llama-3",
    ]);

    for (const query of ["mid-training", "continued training"]) {
      const results = await docsSearchApi.search(query);
      expect(pageBaseUrl(results[0]?.url ?? "")).toBe(
        "/docs/training/mid-training",
      );
    }
  });
});
