import { describe, expect, test } from "bun:test";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const FFN_FAMILY_IDS = [
  "concept.feed-forward-network",
  "concept.activation",
  "concept.standard-ffn",
  "concept.relu",
  "concept.leaky-relu",
  "concept.silu",
  "concept.swiglu",
  "concept.mixture-of-experts",
] as const;

const FFN_FAMILY_ID_SET = new Set<string>(FFN_FAMILY_IDS);

const SEARCH_EXPECTATIONS = [
  { query: "standard FFN", url: "/docs/glossary/standard-ffn" },
  { query: "ReLU", url: "/docs/glossary/relu" },
  { query: "LeakyReLU", url: "/docs/glossary/leaky-relu" },
  { query: "SiLU", url: "/docs/glossary/silu" },
  { query: "SwiGLU", url: "/docs/glossary/swiglu" },
] as const;

describe("FFN variant family navigation and search (US-004)", () => {
  test("every FFN family page exposes at least one published in-family related doc link", () => {
    const candidates = listRelatedRegistryRecords();

    for (const registryId of FFN_FAMILY_IDS) {
      const source = getConceptById(registryId);
      expect(source).toBeDefined();
      if (!source) {
        continue;
      }

      const familyItems = deriveCuratedRelatedItems(
        source,
        candidates,
        PUBLISHED_DOCS_REGISTRY_IDS,
      ).filter((item) => FFN_FAMILY_ID_SET.has(item.registryId));

      expect(familyItems.length).toBeGreaterThan(0);

      for (const item of familyItems) {
        expect(item.isPlanned).toBe(false);
        expect(item.href).toMatch(/^\/docs\//);
      }
    }
  });

  test("activation and feed-forward-network act as broad entry pages that can reach the whole FFN family cluster", () => {
    const queue = ["concept.activation", "concept.feed-forward-network"];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const registryId = queue.shift();
      if (!registryId || visited.has(registryId)) {
        continue;
      }

      visited.add(registryId);
      const source = getConceptById(registryId);
      if (!source) {
        continue;
      }

      for (const relatedId of source.relatedIds) {
        if (FFN_FAMILY_ID_SET.has(relatedId) && !visited.has(relatedId)) {
          queue.push(relatedId);
        }
      }
    }

    expect(visited).toEqual(new Set(FFN_FAMILY_IDS));
  });

  test("representative FFN family searches return the canonical page first", async () => {
    for (const { query, url } of SEARCH_EXPECTATIONS) {
      const results = await docsSearchApi.search(query);
      expect(pageBaseUrl(results[0]?.url ?? "")).toBe(url);
    }
  });
});
