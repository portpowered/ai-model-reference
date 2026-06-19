import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

describe("pretraining training-regime identity contracts", () => {
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
