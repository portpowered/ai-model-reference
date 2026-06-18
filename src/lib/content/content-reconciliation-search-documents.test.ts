import { describe, expect, test } from "bun:test";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { buildSearchDocuments } from "@/lib/search/build-documents";

/** Batch 017 pages reconciled in Phase 2/3 (see prd.md). */
const BATCH_017_DOCS_URLS = [
  "/docs/glossary/transformer",
  "/docs/glossary/diffusion-model",
  "/docs/glossary/multimodal-model",
  "/docs/glossary/world-model",
  "/docs/modules/attention",
  "/docs/modules/multi-head-attention",
  "/docs/modules/multi-query-attention",
  "/docs/modules/multi-head-latent-attention",
  "/docs/modules/sparse-attention",
  "/docs/modules/sliding-window-attention",
  "/docs/modules/linear-attention",
  "/docs/concepts/transformer-architecture",
  "/docs/glossary/feed-forward-network",
  "/docs/glossary/standard-ffn",
  "/docs/glossary/mixture-of-experts",
  "/docs/glossary/normalization",
  "/docs/glossary/layer-norm",
  "/docs/glossary/rmsnorm",
  "/docs/glossary/residual-connection",
  "/docs/concepts/positional-encodings",
  "/docs/glossary/rope",
  "/docs/glossary/alibi",
  "/docs/glossary/context-window",
  "/docs/concepts/context-extension",
  "/docs/concepts/why-long-context-is-hard",
] as const;

const BATCH_017_GLOSSARY_URLS = BATCH_017_DOCS_URLS.filter((url) =>
  url.startsWith("/docs/glossary/"),
);
const BATCH_017_CONCEPT_URLS = BATCH_017_DOCS_URLS.filter((url) =>
  url.startsWith("/docs/concepts/"),
);
const BATCH_017_MODULE_URLS = BATCH_017_DOCS_URLS.filter((url) =>
  url.startsWith("/docs/modules/"),
);

const EXPECTED_ATTENTION_MODULE_URLS = [
  "/docs/modules/attention",
  "/docs/modules/multi-head-attention",
  "/docs/modules/multi-query-attention",
  "/docs/modules/multi-head-latent-attention",
  "/docs/modules/sparse-attention",
  "/docs/modules/sliding-window-attention",
  "/docs/modules/linear-attention",
] as const;

const ALIAS_EXPECTATIONS = [
  { url: "/docs/modules/multi-head-attention", alias: "MHA" },
  { url: "/docs/modules/multi-query-attention", alias: "MQA" },
  { url: "/docs/modules/sparse-attention", alias: "sparse attention" },
  { url: "/docs/glossary/rope", alias: "RoPE" },
  { url: "/docs/glossary/context-window", alias: "context length" },
  { url: "/docs/glossary/standard-ffn", alias: "dense FFN" },
] as const;

describe("Phase 2/3 reconciliation search documents (US-009)", () => {
  test("buildSearchDocuments emits one document per batch 017 page with registry-backed fields", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const byUrl = new Map(
      documents.map((document) => [document.url, document]),
    );

    for (const url of BATCH_017_DOCS_URLS) {
      const document = byUrl.get(url);
      const page = pages.find((entry) => entry.url === url);

      expect(document).toBeDefined();
      expect(page).toBeDefined();
      expect(document?.registryId).toBe(page?.frontmatter.registryId);
      expect(document?.title).toBe(page?.messages.title);
      expect(document?.description).toBe(page?.messages.description);
      expect(document?.description.length).toBeGreaterThan(0);
      expect(document?.aliases.length).toBeGreaterThan(0);
      expect(document?.tags.length).toBeGreaterThan(0);
      expect(document?.bodyText.length).toBeGreaterThan(50);
      expect(document?.headings.length).toBeGreaterThan(0);
    }
  });

  test("batch 017 glossary, concept, and module pages index with matching kind facets", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const byUrl = new Map(
      documents.map((document) => [document.url, document]),
    );

    for (const url of BATCH_017_GLOSSARY_URLS) {
      const document = byUrl.get(url);
      expect(document?.kind).toBe("glossary");
      expect(document?.facets.kind).toBe("glossary");
    }

    for (const url of BATCH_017_CONCEPT_URLS) {
      const document = byUrl.get(url);
      expect(document?.kind).toBe("concept");
      expect(document?.facets.kind).toBe("concept");
    }

    for (const url of BATCH_017_MODULE_URLS) {
      const document = byUrl.get(url);
      expect(document?.kind).toBe("module");
      expect(document?.facets.kind).toBe("module");
    }
  });

  test("batch 017 attention modules include moduleType attention and variantGroup when set", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const byUrl = new Map(
      documents.map((document) => [document.url, document]),
    );

    for (const url of EXPECTED_ATTENTION_MODULE_URLS) {
      const document = byUrl.get(url);
      expect(document?.facets.moduleType).toBe("attention");
      expect(document?.tags).toEqual(expect.arrayContaining(["attention"]));
    }

    expect(
      byUrl.get("/docs/modules/multi-head-attention")?.facets.variantGroup,
    ).toBe("attention-head-sharing");
    expect(
      byUrl.get("/docs/modules/multi-query-attention")?.facets.variantGroup,
    ).toBe("attention-head-sharing");
    expect(
      byUrl.get("/docs/modules/multi-head-latent-attention")?.facets
        .variantGroup,
    ).toBe("attention-head-sharing");
    expect(
      byUrl.get("/docs/modules/sparse-attention")?.facets.variantGroup,
    ).toBe("sparse-patterns");
    expect(
      byUrl.get("/docs/modules/sliding-window-attention")?.facets.variantGroup,
    ).toBe("attention-locality");
    expect(
      byUrl.get("/docs/modules/linear-attention")?.facets.variantGroup,
    ).toBe("subquadratic-attention");
  });

  test("model-family and transformer-component pages include representative registry aliases", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const byUrl = new Map(
      documents.map((document) => [document.url, document]),
    );

    for (const { url, alias } of ALIAS_EXPECTATIONS) {
      const document = byUrl.get(url);
      expect(document?.aliases).toEqual(expect.arrayContaining([alias]));
    }

    for (const url of [
      "/docs/glossary/transformer",
      "/docs/glossary/diffusion-model",
      "/docs/glossary/multimodal-model",
      "/docs/glossary/world-model",
    ] as const) {
      const document = byUrl.get(url);
      expect(document?.kind).toBe("glossary");
      expect(document?.tags).toEqual(expect.arrayContaining(["model-family"]));
    }
  });
});
