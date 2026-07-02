import { describe, expect, test } from "bun:test";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getCitationById,
  getPrimaryClassificationForRecord,
  getTrainingRegimeById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "training-regime.rlhf";
const PAGE_URL = "/docs/training/rlhf";
const INSTRUCTGPT_CITATION_ID =
  "citation.training-language-models-to-follow-instructions-with-human-feedback";

function pageBaseUrl(url: string): string {
  return url.split("#")[0] ?? url;
}

describe("RLHF training-regime discovery contracts (rlhf-page-001)", () => {
  test("registry record publishes RLHF aliases, alignment classification, InstructGPT citation, and adjacent related ids", () => {
    const record = getTrainingRegimeById(REGISTRY_ID);
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("rlhf");
    expect(record?.aliases).toEqual([
      "RLHF",
      "reinforcement learning from human feedback",
      "human feedback reinforcement learning",
      "preference reinforcement learning",
    ]);
    expect(record?.tags).toEqual(["alignment", "foundations"]);
    expect(record?.primaryClassificationId).toBe(
      "classification.training.alignment",
    );
    expect(getPrimaryClassificationForRecord(REGISTRY_ID)?.id).toBe(
      "classification.training.alignment",
    );
    expect(record?.relatedIds).toEqual([
      "concept.alignment",
      "training-regime.instruction-tuning",
      "training-regime.dpo",
      "training-regime.post-training",
    ]);
    expect(record?.citationIds).toEqual([INSTRUCTGPT_CITATION_ID]);
    expect(getCitationById(INSTRUCTGPT_CITATION_ID)?.url).toBe(
      "https://arxiv.org/abs/2203.02155",
    );
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
  });

  test("curated related docs keep RLHF attached to alignment and nearby training-regime pages", () => {
    const source = getTrainingRegimeById(REGISTRY_ID);
    if (!source) {
      throw new Error("expected training-regime.rlhf in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.alignment")?.href,
    ).toBe("/docs/concepts/alignment");
    expect(
      items.find(
        (item) => item.registryId === "training-regime.instruction-tuning",
      )?.href,
    ).toBe("/docs/training/instruction-tuning");
    expect(
      items.find((item) => item.registryId === "training-regime.dpo")?.href,
    ).toBe("/docs/training/dpo");
    expect(
      items.find((item) => item.registryId === "training-regime.post-training")
        ?.href,
    ).toBe("/docs/training/post-training");
  });

  test("search documents and runtime search resolve RLHF aliases to the canonical training-regime page", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find((entry) => entry.url === PAGE_URL);
    expect(document?.kind).toBe("training-regime");
    expect(document?.registryId).toBe(REGISTRY_ID);
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "RLHF",
        "reinforcement learning from human feedback",
      ]),
    );
    expect(document?.relatedIds).toEqual([
      "concept.alignment",
      "training-regime.instruction-tuning",
      "training-regime.dpo",
      "training-regime.post-training",
    ]);
    expect(document?.tags).toEqual(
      expect.arrayContaining(["alignment", "foundations"]),
    );

    for (const query of [
      "RLHF",
      "reinforcement learning from human feedback",
    ]) {
      const results = await docsSearchApi.search(query);
      expect(
        results.some((result) => pageBaseUrl(result.url) === PAGE_URL),
      ).toBe(true);
    }
  });
});
