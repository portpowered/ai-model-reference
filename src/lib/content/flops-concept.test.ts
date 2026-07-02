import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadConceptPage } from "@/lib/content/concept-page";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const pageDir = getDocsPageDir("concepts", "flops");
const messagesPath = join(pageDir, "messages/en.json");
const CONCEPT_URL = "/docs/concepts/flops";

describe("flops concept discovery (flops-concept-page-001)", () => {
  test("registry record stays published with compute aliases, inference classification, and focused related ids", () => {
    const record = getConceptById("concept.flops");

    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.slug).toBe("flops");
    expect(record?.defaultTitleKey).toBe("title");
    expect(record?.defaultSummaryKey).toBe("description");
    expect(record?.primaryClassificationId).toBe(
      "classification.concept.inference",
    );
    expect(record?.aliases).toEqual([
      "FLOPs",
      "floating point operations",
      "floating-point operations",
      "compute",
      "inference compute",
      "peak FLOPs",
      "achieved FLOPs",
    ]);
    expect(record?.tags).toEqual(["foundations"]);
    expect(record?.relatedIds).toEqual([
      "concept.transformer-architecture",
      "concept.mixture-of-experts",
      "concept.quantization",
      "system.inference-engine",
    ]);
    expect(record?.citationIds).toEqual([
      "citation.brown-gpt-3",
      "citation.kaplan-scaling-laws",
      "citation.attention-is-all-you-need",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.flops")).toBe(true);
    expect(PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS.has("concept.flops")).toBe(
      true,
    );
  });

  test("curated related links point to transformer architecture, mixture-of-experts, quantization, and inference engine pages", () => {
    const source = getConceptById("concept.flops");
    if (!source) {
      throw new Error("expected concept.flops in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find(
        (item) => item.registryId === "concept.transformer-architecture",
      )?.href,
    ).toBe("/docs/concepts/transformer-architecture");
    expect(
      items.find((item) => item.registryId === "concept.mixture-of-experts")
        ?.href,
    ).toBe("/docs/concepts/mixture-of-experts");
    expect(
      items.find((item) => item.registryId === "concept.quantization")?.href,
    ).toBe("/docs/concepts/quantization");
    expect(
      items.find((item) => item.registryId === "system.inference-engine")?.href,
    ).toBe("/docs/systems/inference-engine");
  });

  test("concept page frontmatter and messages align with the registry contract", async () => {
    const page = await loadConceptPage("flops");
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.flops");
    expect(page.frontmatter.tags).toEqual(["foundations"]);
    expect(page.frontmatter.aliases).toEqual([
      "FLOPs",
      "floating point operations",
      "floating-point operations",
      "compute",
      "inference compute",
      "peak FLOPs",
      "achieved FLOPs",
    ]);
    expect(page.frontmatter.updatedAt).toBe("2026-07-02");
    expect(messages.title).toBe("FLOPs");
    expect(messages.description.toLowerCase()).toContain(
      "floating-point operations",
    );
  });

  test("search index records flops with aliases and foundations tag", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find((entry) => entry.url === CONCEPT_URL);
    expect(document?.kind).toBe("concept");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "FLOPs",
        "floating point operations",
        "inference compute",
        "peak FLOPs",
        "achieved FLOPs",
      ]),
    );
    expect(document?.tags).toEqual(expect.arrayContaining(["foundations"]));
  });

  test("search finds flops by title, aliases, and compute terms", async () => {
    for (const query of [
      "FLOPs",
      "floating point operations",
      "peak FLOPs",
      "inference compute",
      "achieved FLOPs",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === CONCEPT_URL)).toBe(true);
    }
  });
});
