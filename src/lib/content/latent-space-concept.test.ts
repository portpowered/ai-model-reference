import { describe, expect, test } from "bun:test";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const GLOSSARY_URL = "/docs/glossary/latent-space";

const DISCOVERY_ALIAS_QUERIES = [
  ["latent manifold"],
  ["compressed representation"],
  ["latent representation"],
  ["latent diffusion"],
] as const;

describe("latent-space concept discovery (latent-space-concept-page-001)", () => {
  test("registry record stays published with representation aliases, diffusion tags, and focused related ids", () => {
    const record = getConceptById("concept.latent-space");
    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.slug).toBe("latent-space");
    expect(record?.conceptType).toBe("architecture");
    expect(record?.aliases).toEqual([
      "latent manifold",
      "compressed representation",
      "compressed representation space",
      "latent representation",
      "latent representation space",
      "latent diffusion",
    ]);
    expect(record?.tags).toEqual(["foundations", "taxonomy", "model-family"]);
    expect(record?.relatedIds).toEqual([
      "concept.diffusion-model",
      "concept.denoising-generation",
      "concept.conditioning",
      "paper.latent-diffusion",
      "concept.embedding",
      "concept.latent",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.latent-space")).toBe(true);
  });

  test("curated related links point to diffusion, conditioning, paper, embedding, and latent peers", () => {
    const source = getConceptById("concept.latent-space");
    if (!source) {
      throw new Error("expected concept.latent-space in registry");
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
      items.find((item) => item.registryId === "concept.conditioning")?.href,
    ).toBe("/docs/glossary/conditioning");
    expect(
      items.find((item) => item.registryId === "paper.latent-diffusion")?.href,
    ).toBe("/docs/papers/latent-diffusion");
    expect(
      items.find((item) => item.registryId === "concept.embedding")?.href,
    ).toBe("/docs/concepts/embedding");
    expect(
      items.find((item) => item.registryId === "concept.latent")?.href,
    ).toBe("/docs/glossary/latent");
    expect(
      items.some((item) => item.registryId === "model.stable-diffusion"),
    ).toBe(false);
    expect(
      items.some((item) => item.registryId === "concept.generative-model"),
    ).toBe(false);
    expect(items.some((item) => item.registryId === "concept.encoder")).toBe(
      false,
    );
  });

  test("search index records latent-space with aliases and diffusion tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find((entry) => entry.url === GLOSSARY_URL);
    expect(document?.kind).toBe("glossary");
    expect(document?.registryId).toBe("concept.latent-space");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "latent manifold",
        "compressed representation",
        "latent representation",
        "latent diffusion",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["foundations", "taxonomy", "model-family"]),
    );
  });

  test.each(
    DISCOVERY_ALIAS_QUERIES,
  )("live search routes %s to the latent-space glossary page", async (query) => {
    const results = await docsSearchApi.search(query);
    expect(results.some((result) => result.url === GLOSSARY_URL)).toBe(true);
  });
});
