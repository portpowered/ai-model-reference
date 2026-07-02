import { describe, expect, test } from "bun:test";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import { getConceptById } from "@/lib/content/registry-runtime";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const EMBEDDING_CONCEPT_URL = "/docs/concepts/embedding";
const pageDir = getDocsPageDir("concepts", "embedding");

const DISCOVERY_ALIAS_QUERIES = [
  ["embedding"],
  ["embeddings"],
  ["token embedding"],
  ["vector representation"],
  ["embedding space"],
] as const;

describe("embedding concept discovery (embedding-concept-page-004)", () => {
  test("registry routes embedding to the concept section", () => {
    expect(
      PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS.has("concept.embedding"),
    ).toBe(true);

    const record = getConceptById("concept.embedding");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual(
      expect.arrayContaining([
        "embeddings",
        "token embedding",
        "vector representation",
        "embedding space",
      ]),
    );
  });

  test("search document for the concept page carries canonical aliases", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find(
      (entry) => entry.url === EMBEDDING_CONCEPT_URL,
    );

    expect(document?.kind).toBe("concept");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "embeddings",
        "token embedding",
        "vector representation",
        "embedding space",
      ]),
    );
    expect(document?.registryId).toBe("concept.embedding");
  });

  test.each(
    DISCOVERY_ALIAS_QUERIES,
  )("live search routes %s to the canonical embedding concept page", async (query) => {
    const results = await docsSearchApi.search(query);
    expect(results[0]?.url).toBe(EMBEDDING_CONCEPT_URL);
  });

  test("page bundle resolves from getDocsPageDir", async () => {
    const pages = await loadPublishedDocsPages("en");
    const page = pages.find((entry) => entry.pageDir === pageDir);

    expect(page?.url).toBe(EMBEDDING_CONCEPT_URL);
    expect(page?.frontmatter.registryId).toBe("concept.embedding");
  });
});
