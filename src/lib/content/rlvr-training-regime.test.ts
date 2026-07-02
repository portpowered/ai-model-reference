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
import { loadTrainingRegimePage } from "@/lib/content/training-regime-page";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "training-regime.rlvr";
const PAGE_URL = "/docs/training/rlvr";

function pageBaseUrl(url: string): string {
  return url.split("#")[0] ?? url;
}

describe("RLVR training-regime identity contracts", () => {
  test("registry record publishes canonical aliases, classification, relationships, and citation metadata", () => {
    const record = getTrainingRegimeById(REGISTRY_ID);

    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("rlvr");
    expect(record?.kind).toBe("training-regime");
    expect(record?.aliases).toEqual([
      "RLVR",
      "Reinforcement Learning with Verifiable Rewards",
      "reinforcement learning from verifiable rewards",
      "verifiable rewards",
    ]);
    expect(record?.tags).toEqual(["alignment", "foundations"]);
    expect(record?.primaryClassificationId).toBe("classification.training");
    expect(record?.regimeType).toBe("rl");
    expect(record?.relatedIds).toEqual([
      "concept.alignment",
      "training-regime.post-training",
      "training-regime.supervised-fine-tuning",
    ]);
    expect(record?.citationIds).toEqual(["citation.deepseek-r1"]);
    expect(record?.variantGroup).toBe("verifiable-reward-optimization");
    expect(getPrimaryClassificationForRecord(REGISTRY_ID)?.id).toBe(
      "classification.training",
    );
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
  });

  test("published docs inventory resolves the canonical route and registry id together", async () => {
    const pages = await loadPublishedDocsPages("en");
    const page = pages.find((entry) => entry.url === PAGE_URL);

    expect(page).toBeDefined();
    expect(page?.docsSlug).toBe("training/rlvr");
    expect(page?.frontmatter.kind).toBe("training-regime");
    expect(page?.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page?.frontmatter.messageNamespace).toBe("local");
    expect(page?.frontmatter.assetNamespace).toBe("local");
    expect(page?.messages.title).toBe(
      "Reinforcement Learning with Verifiable Rewards",
    );
    expect(page?.messages.openingSummary).toContain("RLVR");
    expect(page?.messages.openingSummary).toContain("externally checkable");
  });

  test(
    "canonical RLVR bundle resolves registry record, English messages, and citation together",
    async () => {
      const record = getTrainingRegimeById(REGISTRY_ID);
      if (!record) {
        throw new Error("expected training-regime.rlvr in registry");
      }

      const page = await loadTrainingRegimePage("rlvr");
      const citation = getCitationById("citation.deepseek-r1");

      expect(page.frontmatter.kind).toBe("training-regime");
      expect(page.frontmatter.registryId).toBe(record.id);
      expect(page.messages.description).toContain("externally checkable");
      expect(record.defaultTitleKey).toBe("title");
      expect(record.defaultSummaryKey).toBe("description");
      expect(citation?.url).toBe("https://arxiv.org/abs/2501.12948");
      expect(citation?.title).toContain("DeepSeek-R1");
    },
    { timeout: 15000 },
  );

  test("curated related docs keep RLVR attached to alignment and nearby post-training regimes", () => {
    const source = getTrainingRegimeById(REGISTRY_ID);
    if (!source) {
      throw new Error("expected training-regime.rlvr in registry");
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
      items.find((item) => item.registryId === "training-regime.post-training")
        ?.href,
    ).toBe("/docs/training/post-training");
    expect(
      items.find(
        (item) => item.registryId === "training-regime.supervised-fine-tuning",
      )?.href,
    ).toBe("/docs/training/supervised-fine-tuning");
  });

  test("search documents and runtime search resolve RLVR aliases and core terms", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find((entry) => entry.url === PAGE_URL);
    expect(document?.kind).toBe("training-regime");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "RLVR",
        "Reinforcement Learning with Verifiable Rewards",
        "reinforcement learning from verifiable rewards",
        "verifiable rewards",
      ]),
    );
    expect(document?.relatedIds).toEqual([
      "concept.alignment",
      "training-regime.post-training",
      "training-regime.supervised-fine-tuning",
    ]);
    expect(document?.tags).toEqual(
      expect.arrayContaining(["alignment", "foundations"]),
    );

    for (const query of [
      "RLVR",
      "Reinforcement Learning with Verifiable Rewards",
      "reinforcement learning from verifiable rewards",
      "verifiable rewards",
    ]) {
      const results = await docsSearchApi.search(query);
      expect(pageBaseUrl(results[0]?.url ?? "")).toBe(PAGE_URL);
    }
  });
});
