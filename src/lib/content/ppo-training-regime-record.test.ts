import { describe, expect, test } from "bun:test";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  getTrainingRegimeById,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

describe("ppo training regime registry record", () => {
  test("classifies PPO as a canonical post-training regime used in alignment workflows", () => {
    const record = getTrainingRegimeById("training-regime.ppo");

    expect(record).toBeDefined();
    expect(record?.slug).toBe("ppo");
    expect(record?.kind).toBe("training-regime");
    expect(record?.regimeType).toBe("post-training");
    expect(record?.conceptType).toBe("training");
    expect(record?.variantGroup).toBe("preference-optimization");
    expect(record?.sidebarGrouping?.training).toBe("post-training");
    expect(record?.aliases).toEqual(
      expect.arrayContaining([
        "PPO",
        "Proximal Policy Optimization",
        "PPO RLHF",
        "RLHF PPO",
      ]),
    );
    expect(record?.citationIds).toEqual(
      expect.arrayContaining([
        "citation.proximal-policy-optimization-algorithms",
        "citation.training-language-models-to-follow-instructions-with-human-feedback",
      ]),
    );
  });

  test("curated related docs route PPO into the published alignment page", () => {
    const record = getTrainingRegimeById("training-regime.ppo");
    const alignment = getConceptById("concept.alignment");

    if (!record || !alignment) {
      throw new Error("expected PPO and alignment registry records");
    }

    const related = deriveCuratedRelatedItems(
      record,
      [alignment],
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(related).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          registryId: "concept.alignment",
          href: "/docs/glossary/alignment",
        }),
      ]),
    );
  });
});
