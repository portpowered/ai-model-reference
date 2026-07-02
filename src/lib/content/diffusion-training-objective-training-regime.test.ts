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
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getCitationById,
  getPrimaryClassificationForRecord,
  getTrainingRegimeById,
  listClassificationMembers,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
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

function loadDiffusionTrainingObjectivePageBundle() {
  const pageDir = getDocsPageDir("training", "diffusion-training-objective");
  const source = readFileSync(join(pageDir, "page.mdx"), "utf8");
  const frontmatterBlock = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterBlock?.[1]) {
    throw new Error(
      "expected frontmatter block in diffusion-training-objective page",
    );
  }

  return {
    assets: JSON.parse(readFileSync(join(pageDir, "assets.json"), "utf8")) as {
      trainingFlow: { type: string; graphId: string };
    },
    messages: pageMessagesSchema.parse(
      JSON.parse(readFileSync(join(pageDir, "messages/en.json"), "utf8")),
    ),
  };
}

describe("diffusion training objective training-regime identity contracts", () => {
  test("published docs inventory resolves the canonical route, registry id, and English messages together", async () => {
    const pages = await loadPublishedDocsPages("en");
    const page = pages.find(
      (entry) => entry.url === "/docs/training/diffusion-training-objective",
    );

    expect(page).toBeDefined();
    expect(page?.docsSlug).toBe("training/diffusion-training-objective");
    expect(page?.frontmatter.kind).toBe("training-regime");
    expect(page?.frontmatter.registryId).toBe(
      "training-regime.diffusion-training-objective",
    );
    expect(page?.messages.title).toBe("Diffusion Training Objective");
    expect(page?.messages.openingSummary).toContain("controlled corruption");
  });

  test("registry record publishes canonical aliases, relationships, and ontology-backed training discovery", () => {
    const record = getTrainingRegimeById(
      "training-regime.diffusion-training-objective",
    );
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("diffusion-training-objective");
    expect(record?.kind).toBe("training-regime");
    expect(record?.primaryClassificationId).toBe(
      "classification.training.pretraining",
    );
    expect(record?.aliases).toEqual([
      "Diffusion Training Objective",
      "diffusion training objective",
      "diffusion objective",
      "denoising objective",
      "diffusion loss",
      "noise prediction objective",
    ]);
    expect(record?.tags).toEqual(["foundations", "model-family"]);
    expect(record?.relatedIds).toEqual([
      "concept.diffusion-model",
      "concept.denoising-generation",
      "concept.latent-space",
      "concept.autoregressive-generation",
      "training-regime.pretraining",
    ]);
    expect(record?.citationIds).toEqual([
      "citation.denoising-diffusion-probabilistic-models",
    ]);
    expect(
      getPrimaryClassificationForRecord(
        "training-regime.diffusion-training-objective",
      )?.id,
    ).toBe("classification.training.pretraining");
    expect(
      listClassificationMembers("classification.training.pretraining").map(
        (member) => member.record.id,
      ),
    ).toEqual(
      expect.arrayContaining([
        "training-regime.pretraining",
        "training-regime.diffusion-training-objective",
      ]),
    );
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has(
        "training-regime.diffusion-training-objective",
      ),
    ).toBe(true);
  });

  test("canonical bundle resolves the route, registry record, English messages, and DDPM citation together", async () => {
    const record = getTrainingRegimeById(
      "training-regime.diffusion-training-objective",
    );
    if (!record) {
      throw new Error(
        "expected training-regime.diffusion-training-objective in registry",
      );
    }

    const page = await loadTrainingRegimePage("diffusion-training-objective");
    const citation = getCitationById(
      "citation.denoising-diffusion-probabilistic-models",
    );

    expect(page.frontmatter.kind).toBe("training-regime");
    expect(page.frontmatter.registryId).toBe(record.id);
    expect(page.messages.title).toBe("Diffusion Training Objective");
    expect(page.messages.description).toContain("pretraining-style regime");
    expect(page.messages.openingSummary).toContain("schedule level");
    expect(record.defaultTitleKey).toBe("title");
    expect(record.defaultSummaryKey).toBe("description");
    expect(record.sourceId).toBe(
      "citation.denoising-diffusion-probabilistic-models",
    );
    expect(citation?.url).toBe("https://arxiv.org/abs/2006.11239");
    expect(citation?.title).toContain(
      "Denoising Diffusion Probabilistic Models",
    );
    expect(page.assets.trainingFlow).toMatchObject({
      type: "graph",
      graphId: "graph.diffusion-training-objective-training-flow",
    });
  });

  test("local asset config resolves the diffusion training flow graph with message-backed references", () => {
    const page = loadDiffusionTrainingObjectivePageBundle();
    const assets = parsePageAssetConfig(page.assets);

    expect(assets.trainingFlow.type).toBe("graph");
    if (assets.trainingFlow.type === "graph") {
      expect(assets.trainingFlow.graphId).toBe(
        "graph.diffusion-training-objective-training-flow",
      );
    }
    expect(validatePageAssetReferences(assets, page.messages)).toEqual([]);
  });

  test("curated related docs keep diffusion training objective attached to diffusion, denoising, latent, autoregressive, and pretraining paths", () => {
    const source = getTrainingRegimeById(
      "training-regime.diffusion-training-objective",
    );
    if (!source) {
      throw new Error(
        "expected training-regime.diffusion-training-objective in registry",
      );
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.diffusion-model")?.href,
    ).toBe("/docs/glossary/diffusion-model");
    expect(
      items.find((item) => item.registryId === "concept.denoising-generation")
        ?.href,
    ).toBe("/docs/glossary/denoising-generation");
    expect(
      items.find((item) => item.registryId === "concept.latent-space")?.href,
    ).toBe("/docs/glossary/latent-space");
    expect(
      items.find(
        (item) => item.registryId === "concept.autoregressive-generation",
      )?.href,
    ).toBe("/docs/glossary/autoregressive-generation");
    expect(
      items.find((item) => item.registryId === "training-regime.pretraining")
        ?.href,
    ).toBe("/docs/training/pretraining");
  });

  test("page renders the layperson explanation and nearby-regime handoffs without reader-shortcut copy", async () => {
    const page = await loadTrainingRegimePage("diffusion-training-objective");

    const html = await renderHtml(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("partial corrections during training");
    expect(html).toContain("noise schedule picks how much corruption");
    expect(html).toContain("nearly clean states through highly noisy ones");
    expect(html).toContain("repeatedly in reverse along the schedule");
    expect(html).toContain(
      "pretraining trains a model to predict the next discrete",
    );
    expect(html).toContain("in sequence order");
    expect(html).toContain("denoising direction for a noisy state");
    expect(html).toContain(
      'data-graph-title="graph.diffusion-training-objective-training-flow"',
    );
    expect(html).toContain(
      'data-graph-legend="graph.diffusion-training-objective-training-flow"',
    );
    expect(html).toContain("Noise schedule adds corruption at level t");
    expect(html).toContain("Repeated reverse denoising at generation");
    expect(html).toContain('href="/docs/training/pretraining"');
    expect(html).toContain('href="/docs/glossary/diffusion-model"');
    expect(html).toContain('href="/docs/glossary/denoising-generation"');
    expect(html).toContain('href="/docs/glossary/latent-space"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('role="math"');
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search documents and runtime search resolve diffusion objective aliases and core terms", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/training/diffusion-training-objective",
    );
    expect(document?.kind).toBe("training-regime");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "diffusion training objective",
        "denoising objective",
        "noise prediction objective",
      ]),
    );
    expect(document?.relatedIds).toEqual([
      "concept.diffusion-model",
      "concept.denoising-generation",
      "concept.latent-space",
      "concept.autoregressive-generation",
      "training-regime.pretraining",
    ]);

    for (const query of [
      "diffusion training objective",
      "denoising objective",
      "noise prediction objective",
    ]) {
      const results = await docsSearchApi.search(query);
      expect(pageBaseUrl(results[0]?.url ?? "")).toBe(
        "/docs/training/diffusion-training-objective",
      );
    }
  });
});
