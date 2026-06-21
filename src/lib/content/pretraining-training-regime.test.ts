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
import { TRAINING_DOCS_ROOT } from "@/lib/content/content-paths";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getCitationById,
  getModelById,
  getTrainingRegimeById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import {
  pageFrontmatterSchema,
  pageMessagesSchema,
} from "@/lib/content/schemas";
import { loadTrainingRegimePage } from "@/lib/content/training-regime-page";
import { parseYamlFrontmatterBlock } from "@/lib/content/validate-registry";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

function pageBaseUrl(url: string): string {
  return url.split("#")[0] ?? url;
}

function loadPretrainingPageBundle() {
  const pageDir = join(TRAINING_DOCS_ROOT, "pretraining");
  const source = readFileSync(join(pageDir, "page.mdx"), "utf8");
  const frontmatterBlock = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterBlock?.[1]) {
    throw new Error("expected frontmatter block in pretraining page");
  }

  return {
    source,
    frontmatter: pageFrontmatterSchema.parse(
      parseYamlFrontmatterBlock(frontmatterBlock[1]),
    ),
    messages: pageMessagesSchema.parse(
      JSON.parse(readFileSync(join(pageDir, "messages", "en.json"), "utf8")),
    ),
    assets: JSON.parse(readFileSync(join(pageDir, "assets.json"), "utf8")) as {
      trainingFlow: { type: string; graphId: string };
    },
  };
}

async function renderHtml(
  element: ReturnType<typeof createElement>,
): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}

describe("pretraining training-regime identity contracts", () => {
  test("published docs inventory resolves the canonical route, registry id, and English messages together", async () => {
    const pages = await loadPublishedDocsPages("en");
    const page = pages.find(
      (entry) => entry.url === "/docs/training/pretraining",
    );

    expect(page).toBeDefined();
    expect(page?.docsSlug).toBe("training/pretraining");
    expect(page?.frontmatter.kind).toBe("training-regime");
    expect(page?.frontmatter.registryId).toBe("training-regime.pretraining");
    expect(page?.frontmatter.messageNamespace).toBe("local");
    expect(page?.frontmatter.assetNamespace).toBe("local");
    expect(page?.messages.title).toBe("Pretraining");
    expect(page?.messages.openingSummary).toContain("base model");
  });

  test("registry record publishes canonical aliases, relationships, and sidebar grouping", () => {
    const record = getTrainingRegimeById("training-regime.pretraining");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "Pretraining",
      "language model pretraining",
      "base model training",
      "next-token prediction",
      "next-token pretraining",
    ]);
    expect(record?.tags).toEqual(["foundations", "tokenization"]);
    expect(record?.relatedIds).toEqual([
      "model.gpt-3",
      "concept.transformer-architecture",
      "module.byte-level-tokenization",
      "module.bpe",
      "concept.foundation-model",
      "concept.autoregressive-generation",
      "concept.alignment",
      "training-regime.dpo",
    ]);
    expect(record?.usedByModelIds).toEqual(["model.gpt-3"]);
    expect(record?.relatedModuleIds).toEqual([
      "module.byte-level-tokenization",
      "module.bpe",
    ]);
    expect(record?.sidebarGrouping?.training).toBe("pretraining");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("training-regime.pretraining")).toBe(
      true,
    );
  });

  test("canonical pretraining bundle resolves the route, registry record, graph asset, and release citations together", async () => {
    const record = getTrainingRegimeById("training-regime.pretraining");
    const model = getModelById("model.gpt-3");
    if (!record || !model) {
      throw new Error("expected pretraining registry slice in runtime");
    }

    const page = loadPretrainingPageBundle();
    const gpt2 = getCitationById("citation.gpt-2-report");
    const gpt3 = getCitationById("citation.brown-gpt-3");

    expect(page.frontmatter.kind).toBe("training-regime");
    expect(page.frontmatter.registryId).toBe(record.id);
    expect(page.messages.title).toBe("Pretraining");
    expect(page.messages.description).toContain("base-model training stage");
    expect(page.messages.openingSummary).toContain("base model");
    expect(page.messages.sections?.howItWorks.body).toContain(
      "predicts the next token",
    );
    expect(page.messages.math?.nextTokenObjective?.formula).toBe(
      "\\max_\\theta \\sum_t \\log p_\\theta(x_t \\mid x_{<t})",
    );
    expect(page.messages.sections?.whyItExists.body).toContain(
      "Scale matters here",
    );
    expect(page.messages.sections?.limitationsAndFailureModes.body).toContain(
      "Data mixture matters",
    );
    expect(page.messages.sections?.limitationsAndFailureModes.body).toContain(
      "Compute matters",
    );
    expect(page.messages.sections?.comparedToNearbyRegimes.body).toContain(
      "reinforcement learning from human feedback",
    );
    expect(page.messages.links?.gpt2Bridge).toContain(
      "GPT-2 is a useful historical bridge",
    );
    expect(
      page.messages.math?.nextTokenObjective?.variableDefinitions?.theta
        ?.definition,
    ).toBe("model weights");
    expect(page.assets.trainingFlow).toMatchObject({
      type: "graph",
      graphId: "graph.pretraining-training-flow",
    });
    expect(record.citationIds).toEqual([
      "citation.gpt-2-report",
      "citation.brown-gpt-3",
      "citation.kaplan-scaling-laws",
    ]);
    expect(gpt2?.url).toContain("openai.com");
    expect(gpt3?.title).toContain("Few-Shot Learners");
    expect(model.trainingRegimeIds).toContain("training-regime.pretraining");
    expect(model.relatedIds).toContain("training-regime.pretraining");
  });

  test("local asset config resolves the pretraining graph with message-backed references", () => {
    const page = loadPretrainingPageBundle();
    const assets = parsePageAssetConfig(page.assets);

    expect(assets.trainingFlow.type).toBe("graph");
    if (assets.trainingFlow.type === "graph") {
      expect(assets.trainingFlow.graphId).toBe(
        "graph.pretraining-training-flow",
      );
    }
    expect(validatePageAssetReferences(assets, page.messages)).toEqual([]);
  });

  test("curated related docs keep pretraining attached to model, architecture, tokenization, and alignment paths", () => {
    const source = getTrainingRegimeById("training-regime.pretraining");
    if (!source) {
      throw new Error("expected training-regime.pretraining in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(items.find((item) => item.registryId === "model.gpt-3")?.href).toBe(
      "/docs/models/gpt-3",
    );
    expect(
      items.find(
        (item) => item.registryId === "concept.transformer-architecture",
      )?.href,
    ).toBe("/docs/concepts/transformer-architecture");
    expect(
      items.find((item) => item.registryId === "module.byte-level-tokenization")
        ?.href,
    ).toBe("/docs/modules/byte-level-tokenization");
    expect(
      items.find((item) => item.registryId === "concept.alignment")?.href,
    ).toBe("/docs/glossary/alignment");
    expect(
      items.find((item) => item.registryId === "training-regime.dpo")?.href,
    ).toBe("/docs/training/dpo");
  });

  test("page renders the layperson explanation, tradeoffs, and reader handoffs without reader-shortcut copy", async () => {
    const page = await loadTrainingRegimePage("pretraining");

    const html = await renderHtml(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("broad statistical learner");
    expect(html).toContain("Scale matters here");
    expect(html).toContain(
      "Data mixture matters because web text, books, code",
    );
    expect(html).toContain(
      "Compute matters because hardware time, memory, and optimization budget",
    );
    expect(html).toContain("GPT-2 is a useful historical bridge");
    expect(html).toContain("later chat-style");
    expect(html).toContain("reinforcement learning from human feedback");
    expect(html).toContain(
      "Pretraining turns huge token corpora into a base model by repeating the next-token objective at scale.",
    );
    expect(html).toContain(
      'data-graph-title="graph.pretraining-training-flow"',
    );
    expect(html).toContain(
      'data-graph-legend="graph.pretraining-training-flow"',
    );
    expect(html).toContain('role="math"');
    expect(html).toContain(
      'data-page-math-variable-definitions="nextTokenObjective"',
    );
    expect(html).toContain('data-math-variable-definition="theta"');
    expect(html).toContain('data-math-variable-definition="xt"');
    expect(html).toContain(">weights<");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/models/gpt-3"');
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/docs/modules/byte-level-tokenization"');
    expect(html).toContain('href="/docs/glossary/alignment"');
    expect(html).toContain('href="/docs/training/dpo"');
    expect(html).toContain('href="/search?q=RLHF"');
    expect(html).not.toContain("Reader Shortcut");
  });

  test("page source keeps nearby-regime labels message-backed instead of hard-coding visible prose", () => {
    const page = loadPretrainingPageBundle();

    expect(page.source).toContain('<T k="links.gpt3ModelPage" />');
    expect(page.source).toContain('<T k="links.transformerArchitecture" />');
    expect(page.source).toContain('<T k="links.byteLevelTokenization" />');
    expect(page.source).toContain('<T k="links.alignmentOverview" />');
    expect(page.source).toContain('<T k="links.dpo" />');
    expect(page.source).toContain('<T k="links.rlhfSearch" />');
    expect(page.source).toContain('k="links.gpt2Bridge"');
    expect(page.source).not.toContain(">GPT-3 model page<");
    expect(page.source).not.toContain(">Transformer architecture<");
    expect(page.source).not.toContain(">Byte-level tokenization<");
    expect(page.source).not.toContain(">Alignment overview<");
    expect(page.source).not.toContain(">Direct Preference Optimization<");
    expect(page.source).not.toContain(">RLHF search<");
  });

  test("search documents and runtime search resolve pretraining title, aliases, and core terms", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/training/pretraining",
    );
    expect(document?.kind).toBe("training-regime");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "Pretraining",
        "language model pretraining",
        "base model training",
        "next-token prediction",
      ]),
    );
    expect(document?.relatedIds).toEqual([
      "model.gpt-3",
      "concept.transformer-architecture",
      "module.byte-level-tokenization",
      "module.bpe",
      "concept.foundation-model",
      "concept.autoregressive-generation",
      "concept.alignment",
      "training-regime.dpo",
    ]);

    for (const query of [
      "pretraining",
      "language model pretraining",
      "base model training",
      "next-token prediction",
    ]) {
      const results = await docsSearchApi.search(query);
      expect(pageBaseUrl(results[0]?.url ?? "")).toBe(
        "/docs/training/pretraining",
      );
    }
  });
});
