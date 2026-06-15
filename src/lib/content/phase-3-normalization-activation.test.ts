import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { expectGlossaryPresentationConvergence } from "@/lib/content/glossary-test-helpers";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { source } from "@/lib/source";

const NORMALIZATION_VARIANT_PAGES = [
  {
    slug: "batch-norm",
    registryId: "concept.batch-norm",
    foundationHref: "/docs/glossary/normalization",
    searchQuery: "batch norm",
  },
  {
    slug: "group-norm",
    registryId: "concept.group-norm",
    foundationHref: "/docs/glossary/normalization",
    searchQuery: "group norm",
  },
  {
    slug: "qk-norm",
    registryId: "concept.qk-norm",
    foundationHref: "/docs/glossary/layer-norm",
    searchQuery: "QK norm",
  },
] as const;

const ACTIVATION_VARIANT_PAGES = [
  {
    slug: "relu",
    registryId: "concept.relu",
    foundationHref: "/docs/glossary/activation",
    searchQuery: "ReLU",
  },
  {
    slug: "leaky-relu",
    registryId: "concept.leaky-relu",
    foundationHref: "/docs/glossary/activation",
    searchQuery: "leaky ReLU",
  },
  {
    slug: "silu",
    registryId: "concept.silu",
    foundationHref: "/docs/glossary/activation",
    searchQuery: "SiLU",
  },
] as const;

const FFN_VARIANT_PAGES = [
  {
    slug: "standard-ffn",
    registryId: "concept.standard-ffn",
    foundationHref: "/docs/glossary/feed-forward-network",
    searchQuery: "standard FFN",
  },
  {
    slug: "swiglu",
    registryId: "concept.swiglu",
    foundationHref: "/docs/glossary/feed-forward-network",
    searchQuery: "SwiGLU",
  },
] as const;

const ALL_PAGES = [
  ...NORMALIZATION_VARIANT_PAGES,
  ...ACTIVATION_VARIANT_PAGES,
  ...FFN_VARIANT_PAGES,
] as const;

describe("Phase 3 normalization and activation variant pages (US-005)", () => {
  test("registry records are published glossary concepts with inventory coverage", () => {
    for (const page of ALL_PAGES) {
      const record = getConceptById(page.registryId);
      expect(record?.status).toBe("published");
      expect(record?.conceptType).toBe("general");
      expect(PUBLISHED_DOCS_REGISTRY_IDS.has(page.registryId)).toBe(true);
    }
  });

  test("Fumadocs source discovers glossary routes without duplicate title chrome", () => {
    for (const page of ALL_PAGES) {
      const discovered = source.getPage(["glossary", page.slug]);
      expect(discovered?.url).toBe(`/docs/glossary/${page.slug}`);
    }
  });

  test("variant pages render sections and foundation links without draft placeholders", async () => {
    for (const page of ALL_PAGES) {
      const loaded = await loadGlossaryPage(page.slug);
      expect(loaded.frontmatter.kind).toBe("glossary");
      expect(loaded.frontmatter.status).toBe("published");
      expect(loaded.frontmatter.registryId).toBe(page.registryId);
      expect(loaded.messages.openingSummary?.length).toBeGreaterThan(0);

      const html = renderToStaticMarkup(
        createElement(ModulePageProviders, {
          messages: loaded.messages,
          assets: loaded.assets,
          // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
          children: loaded.content,
        }),
      );

      expectGlossaryPresentationConvergence(html, {
        title: loaded.messages.title,
      });
      expect(html).toContain("What It Is");
      expect(html).toContain("Why It Matters");
      expect(html).toContain("Common Confusions");
      expect(html).toContain(`href="${page.foundationHref}"`);
      expect(html).not.toContain("Draft placeholder");
      expect(html).not.toContain("Reader Shortcut");
    }
  });

  test("foundation pages explain the new variant registry ids", () => {
    const normalization = getConceptById("concept.normalization");
    expect(normalization?.explainsIds).toEqual(
      expect.arrayContaining([
        "concept.batch-norm",
        "concept.group-norm",
        "concept.qk-norm",
      ]),
    );

    const activation = getConceptById("concept.activation");
    expect(activation?.explainsIds).toEqual(
      expect.arrayContaining([
        "concept.relu",
        "concept.leaky-relu",
        "concept.silu",
      ]),
    );

    const ffn = getConceptById("concept.feed-forward-network");
    expect(ffn?.explainsIds).toEqual(
      expect.arrayContaining(["concept.standard-ffn", "concept.swiglu"]),
    );
  });

  test("curated related links resolve to published transformer-block foundations", () => {
    const swiglu = getConceptById("concept.swiglu");
    if (!swiglu) {
      throw new Error("expected concept.swiglu");
    }

    const items = deriveCuratedRelatedItems(
      swiglu,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const ffn = items.find(
      (item) => item.registryId === "concept.feed-forward-network",
    );
    expect(ffn?.href).toBe("/docs/glossary/feed-forward-network");
    expect(ffn?.isPlanned).toBe(false);

    const moe = items.find(
      (item) => item.registryId === "concept.mixture-of-experts",
    );
    expect(moe?.href).toBe("/docs/glossary/mixture-of-experts");
    expect(moe?.isPlanned).toBe(false);
  });

  test("search index returns canonical glossary pages for representative variant queries", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    for (const page of ALL_PAGES) {
      const document = documents.find(
        (entry) => entry.url === `/docs/glossary/${page.slug}`,
      );
      expect(document?.kind).toBe("glossary");
      expect(document?.facets.kind).toBe("glossary");
    }

    const swiglu = documents.find(
      (entry) => entry.url === "/docs/glossary/swiglu",
    );
    const silu = documents.find((entry) => entry.url === "/docs/glossary/silu");
    const batchNorm = documents.find(
      (entry) => entry.url === "/docs/glossary/batch-norm",
    );
    const qkNorm = documents.find(
      (entry) => entry.url === "/docs/glossary/qk-norm",
    );

    expect(swiglu?.title).toBe("SwiGLU");
    expect(silu?.title).toBe("SiLU");
    expect(batchNorm?.title).toBe("Batch norm");
    expect(qkNorm?.title).toBe("QK norm");
    expect(swiglu?.url).not.toBe(silu?.url);
  });
});
