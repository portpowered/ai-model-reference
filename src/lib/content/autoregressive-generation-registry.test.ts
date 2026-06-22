import { describe, expect, test } from "bun:test";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { registryRecordHref } from "@/lib/content/registry-linking";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

describe("Autoregressive generation registry discovery", () => {
  test("record carries broad-concept metadata and routes canonically to the concept page", () => {
    const record = getConceptById("concept.autoregressive-generation");

    expect(record?.status).toBe("published");
    expect(record?.conceptType).toBe("general");
    expect(record?.aliases).toEqual(
      expect.arrayContaining([
        "autoregressive decoding",
        "next-token generation",
        "next token generation",
        "next-token prediction",
      ]),
    );
    expect(record?.tags).toEqual(
      expect.arrayContaining([
        "foundations",
        "taxonomy",
        "attention",
        "token-to-probability-chain",
      ]),
    );
    expect(record?.citationIds).toEqual(
      expect.arrayContaining([
        "citation.attention-is-all-you-need",
        "citation.gpt-2-report",
        "citation.raffel-t5",
      ]),
    );
    expect(record?.sidebarGrouping).toEqual({
      glossary: "generation-and-diffusion",
      concepts: "inference",
    });
    expect(record?.explainsIds).toEqual([
      "concept.sampling-overview",
      "concept.prefill",
      "concept.decode",
      "concept.prefill-decode-split",
    ]);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.autoregressive-generation"),
    ).toBe(true);
    if (!record) {
      throw new Error("expected concept.autoregressive-generation in registry");
    }
    expect(registryRecordHref(record)).toBe(
      "/docs/concepts/autoregressive-generation",
    );
  });

  test("curated related discovery connects the broad concept to nearby token, architecture, and serving docs", () => {
    const source = getConceptById("concept.autoregressive-generation");
    if (!source) {
      throw new Error("expected concept.autoregressive-generation in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.token")?.href,
    ).toBe("/docs/glossary/token");
    expect(
      items.find((item) => item.registryId === "concept.logit")?.href,
    ).toBe("/docs/glossary/logit");
    expect(
      items.find((item) => item.registryId === "concept.softmax")?.href,
    ).toBe("/docs/glossary/softmax");
    expect(
      items.find((item) => item.registryId === "concept.decoder")?.href,
    ).toBe("/docs/glossary/decoder");
    expect(
      items.find((item) => item.registryId === "concept.encoder-decoder")?.href,
    ).toBe("/docs/glossary/encoder-decoder");
    expect(
      items.find((item) => item.registryId === "concept.sampling-overview")
        ?.href,
    ).toBe("/docs/glossary/sampling-overview");
    expect(
      items.find((item) => item.registryId === "concept.kv-cache")?.href,
    ).toBe("/docs/concepts/kv-cache");
    expect(
      items.find((item) => item.registryId === "concept.prefill")?.href,
    ).toBe("/docs/concepts/prefill");
    expect(
      items.find((item) => item.registryId === "concept.prefill-decode-split")
        ?.href,
    ).toBe("/docs/glossary/prefill-decode-split");
  });
});
