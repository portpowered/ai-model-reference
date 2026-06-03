import { describe, expect, test } from "bun:test";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { querySearchDocuments } from "@/lib/search/orama-index";

const TOKEN_GLOSSARY_URL = "/docs/glossary/token";

describe("buildSearchDocuments", () => {
  test("indexes token glossary page with registry-backed facets and message body text", async () => {
    const indexes = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, indexes);
    const token = documents.find(
      (document) => document.url === TOKEN_GLOSSARY_URL,
    );

    expect(token).toBeDefined();
    expect(token?.title).toBe("Token");
    expect(token?.description).toContain("smallest unit");
    expect(token?.kind).toBe("glossary");
    expect(token?.registryId).toBe("concept.token");
    expect(token?.url).toBe(TOKEN_GLOSSARY_URL);
    expect(token?.aliases).toEqual(
      expect.arrayContaining(["subword token", "token id", "tokens"]),
    );
    expect(token?.tags).toEqual(expect.arrayContaining(["attention"]));
    expect(token?.facets).toEqual({
      kind: "glossary",
      tags: ["attention"],
      conceptType: "architecture",
    });
    expect(token?.bodyText).toContain("Subword tokenizers");
    expect(token?.bodyText).toContain("128k tokens");
    expect(token?.headings).toEqual(
      expect.arrayContaining(["Token", "What It Is", "Why It Matters"]),
    );
  });
});

describe("token glossary search index", () => {
  async function tokenSearchDocuments() {
    const indexes = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    return buildSearchDocuments(pages, indexes);
  }

  test("returns token glossary page for token query", async () => {
    const documents = await tokenSearchDocuments();
    const results = await querySearchDocuments(documents, "token");

    expect(
      results.some((document) => document.url === TOKEN_GLOSSARY_URL),
    ).toBe(true);
  });

  test("returns token glossary page for subword token alias query", async () => {
    const documents = await tokenSearchDocuments();
    const results = await querySearchDocuments(documents, "subword token");

    expect(
      results.some((document) => document.url === TOKEN_GLOSSARY_URL),
    ).toBe(true);
  });

  test("returns token glossary page for distinctive body phrase 128k context", async () => {
    const documents = await tokenSearchDocuments();
    const results = await querySearchDocuments(documents, "128k context");

    expect(
      results.some((document) => document.url === TOKEN_GLOSSARY_URL),
    ).toBe(true);
  });
});
