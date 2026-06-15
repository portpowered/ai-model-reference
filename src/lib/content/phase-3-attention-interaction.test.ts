import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
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

const ATTENTION_INTERACTION_PAGES = [
  {
    slug: "self-attention",
    registryId: "concept.self-attention",
    moduleHref: "/docs/modules/multi-head-attention",
    searchQuery: "self-attention",
  },
  {
    slug: "cross-attention",
    registryId: "concept.cross-attention",
    moduleHref: "/docs/modules/multi-head-attention",
    searchQuery: "cross-attention",
  },
  {
    slug: "causal-attention",
    registryId: "concept.causal-attention",
    moduleHref: "/docs/modules/attention",
    searchQuery: "causal attention",
  },
  {
    slug: "bidirectional-attention",
    registryId: "concept.bidirectional-attention",
    moduleHref: "/docs/modules/attention",
    searchQuery: "bidirectional attention",
  },
] as const;

describe("Phase 3 attention-interaction concept pages (US-004)", () => {
  test("registry records are published architecture concepts with inventory coverage", () => {
    for (const page of ATTENTION_INTERACTION_PAGES) {
      const record = getConceptById(page.registryId);
      expect(record?.status).toBe("published");
      expect(record?.conceptType).toBe("architecture");
      expect(record?.tags).toContain("attention");
      expect(PUBLISHED_DOCS_REGISTRY_IDS.has(page.registryId)).toBe(true);
    }
  });

  test("Fumadocs source discovers concept routes without duplicate title chrome", () => {
    for (const page of ATTENTION_INTERACTION_PAGES) {
      const discovered = source.getPage(["concepts", page.slug]);
      expect(discovered?.url).toBe(`/docs/concepts/${page.slug}`);
    }
  });

  test("concept pages render opening summary, sections, and module family links", async () => {
    for (const page of ATTENTION_INTERACTION_PAGES) {
      const loaded = await loadConceptPage(page.slug);
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

      expect(html).toContain("What It Is");
      expect(html).toContain("Why It Matters");
      expect(html).toContain(`href="${page.moduleHref}"`);
      expect(html).toContain('data-testid="curated-related-docs"');
      expect(html).not.toContain("Draft placeholder");
      expect(html).not.toContain("Reader Shortcut");
    }
  });

  test("curated related links resolve to transformer architecture and attention modules", () => {
    const selfAttention = getConceptById("concept.self-attention");
    if (!selfAttention) {
      throw new Error("expected concept.self-attention");
    }

    const items = deriveCuratedRelatedItems(
      selfAttention,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const transformerArchitecture = items.find(
      (item) => item.registryId === "concept.transformer-architecture",
    );
    expect(transformerArchitecture?.href).toBe(
      "/docs/concepts/transformer-architecture",
    );
    expect(transformerArchitecture?.isPlanned).toBe(false);

    const multiHeadAttention = items.find(
      (item) => item.registryId === "module.multi-head-attention",
    );
    expect(multiHeadAttention?.href).toBe("/docs/modules/multi-head-attention");
    expect(multiHeadAttention?.isPlanned).toBe(false);
  });

  test("search index distinguishes concept pages from module pages for representative queries", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    for (const page of ATTENTION_INTERACTION_PAGES) {
      const conceptDocument = documents.find(
        (entry) => entry.url === `/docs/concepts/${page.slug}`,
      );
      expect(conceptDocument?.kind).toBe("concept");
      expect(conceptDocument?.facets.kind).toBe("concept");
    }

    const selfAttentionConcept = documents.find(
      (entry) => entry.url === "/docs/concepts/self-attention",
    );
    const attentionModule = documents.find(
      (entry) => entry.url === "/docs/modules/attention",
    );
    const mhaModule = documents.find(
      (entry) => entry.url === "/docs/modules/multi-head-attention",
    );
    const gqaModule = documents.find(
      (entry) => entry.url === "/docs/modules/grouped-query-attention",
    );

    expect(selfAttentionConcept?.kind).toBe("concept");
    expect(attentionModule?.kind).toBe("module");
    expect(mhaModule?.kind).toBe("module");
    expect(gqaModule?.kind).toBe("module");
    expect(selfAttentionConcept?.url).not.toBe(attentionModule?.url);
    expect(mhaModule?.url).not.toBe(selfAttentionConcept?.url);
  });
});
