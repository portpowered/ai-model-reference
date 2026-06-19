import { describe, expect, test } from "bun:test";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { buildSearchDocuments } from "@/lib/search/build-documents";

const SAMPLE_URL = "/docs/modules/grouped-query-attention";
const TOKEN_GLOSSARY_URL = "/docs/glossary/token";
const GRPO_URL = "/docs/training/grpo";

describe("buildSearchDocuments", () => {
  test("indexes only published docs pages for the default locale", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    expect(documents.length).toBe(pages.length);
    expect(documents.map((document) => document.url).sort()).toEqual(
      pages.map((page) => page.url).sort(),
    );
  });

  test("indexes grouped-query attention sample page with aliases and tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const sample = documents.find((document) => document.url === SAMPLE_URL);

    expect(sample).toBeDefined();
    expect(sample?.title).toBe("Grouped-Query Attention");
    expect(sample?.description).toContain("key-value cache");
    expect(sample?.aliases).toEqual(
      expect.arrayContaining([
        "GQA",
        "grouped-query attention",
        "grouped query attention",
      ]),
    );
    expect(sample?.tags).toEqual(
      expect.arrayContaining(["attention", "kv-cache"]),
    );
    expect(sample?.bodyText).toContain("GQA");
    expect(sample?.bodyText).toContain("key-value cache");
    expect(sample?.registryId).toBe("module.grouped-query-attention");
    expect(sample?.facets.moduleType).toBe("attention");
  });

  test("indexes published token glossary page with title, body text, aliases, and tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const token = documents.find(
      (document) => document.url === TOKEN_GLOSSARY_URL,
    );

    expect(token).toBeDefined();
    expect(token?.title).toBe("Token");
    expect(token?.description).toContain("smallest unit");
    expect(token?.kind).toBe("glossary");
    expect(token?.registryId).toBe("concept.token");
    expect(token?.aliases).toEqual(
      expect.arrayContaining(["tokens", "token id", "subword token"]),
    );
    expect(token?.tags).toEqual(expect.arrayContaining(["attention"]));
    expect(token?.bodyText).toContain("tokenizer");
    expect(token?.bodyText).toContain("token IDs");
  });

  test("indexes GRPO training page with search aliases and training facets", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const grpo = documents.find((document) => document.url === GRPO_URL);

    expect(grpo).toBeDefined();
    expect(grpo?.kind).toBe("training-regime");
    expect(grpo?.registryId).toBe("training-regime.grpo");
    expect(grpo?.aliases).toEqual(
      expect.arrayContaining([
        "GRPO",
        "group relative policy optimization",
        "group relative preference optimization",
        "group-relative policy optimization",
        "group-relative preference optimization",
      ]),
    );
    expect(grpo?.tags).toEqual(expect.arrayContaining(["foundations"]));
    expect(grpo?.facets.conceptType).toBe("training");
    expect(grpo?.facets.variantGroup).toBe(
      "group-relative-reinforcement-learning",
    );
  });
});
