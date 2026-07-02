import { describe, expect, setDefaultTimeout, test } from "bun:test";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getModuleById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const CROSS_ATTENTION_URL = "/docs/modules/cross-attention";

setDefaultTimeout(15_000);

describe("cross-attention discovery wiring", () => {
  test("search documents carry the canonical cross-attention discovery phrases", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find(
      (entry) => entry.url === CROSS_ATTENTION_URL,
    );

    expect(document).toBeDefined();
    expect(document?.kind).toBe("module");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "cross attention",
        "cross-attention",
        "encoder-decoder attention",
        "encoder decoder attention",
      ]),
    );
    expect(document?.tags).toEqual(["attention"]);
    expect(document?.relatedIds).toEqual(
      expect.arrayContaining([
        "module.attention",
        "module.multi-head-attention",
        "module.causal-attention",
        "module.bidirectional-attention",
        "concept.transformer-architecture",
        "concept.encoder-decoder",
        "concept.multimodal-model",
      ]),
    );
  });

  test.each([
    "cross attention",
    "cross-attention",
    "encoder-decoder attention",
    "encoder decoder attention",
  ] as const)("live search routes %s to the canonical cross-attention page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(CROSS_ATTENTION_URL);
  });

  test("attention tag browsing includes the published cross-attention module", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups("attention", messages, "en");
    const moduleGroup = groups.find((group) => group.kind === "module");

    expect(moduleGroup).toBeDefined();
    expect(
      moduleGroup?.resources.some(
        (resource) => resource.url === CROSS_ATTENTION_URL,
      ),
    ).toBe(true);
  });

  test("cross-attention derives nearby published related docs in registry order", () => {
    const source = getModuleById("module.cross-attention");
    if (!source) {
      throw new Error("expected module.cross-attention in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(items.map((item) => item.registryId)).toEqual([
      "module.attention",
      "module.multi-head-attention",
      "module.causal-attention",
      "module.bidirectional-attention",
      "concept.transformer-architecture",
      "concept.encoder-decoder",
      "concept.multimodal-model",
    ]);
    expect(items.map((item) => item.href)).toEqual([
      "/docs/modules/attention",
      "/docs/modules/multi-head-attention",
      "/docs/modules/causal-attention",
      "/docs/modules/bidirectional-attention",
      "/docs/concepts/transformer-architecture",
      "/docs/glossary/encoder-decoder",
      "/docs/glossary/multimodal-model",
    ]);
    expect(items.every((item) => item.isPlanned === false)).toBe(true);
  });
});
