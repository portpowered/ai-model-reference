import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadPublishedArchitectureEntries } from "@/lib/content/architecture";
import { loadConceptPage } from "@/lib/content/concept-page";
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

const CONCEPT_PAGES = [
  {
    slug: "architectures-overview",
    registryId: "concept.architectures-overview",
    relatedHref: "/docs/glossary/architecture",
    searchQuery: "architectures overview",
  },
  {
    slug: "encoder-only-architecture",
    registryId: "concept.encoder-only-architecture",
    relatedHref: "/docs/glossary/encoder",
    searchQuery: "encoder-only architecture",
  },
  {
    slug: "decoder-only-architecture",
    registryId: "concept.decoder-only-architecture",
    relatedHref: "/docs/glossary/decoder",
    searchQuery: "decoder-only architecture",
  },
  {
    slug: "encoder-decoder-architecture",
    registryId: "concept.encoder-decoder-architecture",
    relatedHref: "/docs/glossary/encoder-decoder",
    searchQuery: "encoder-decoder architecture",
  },
] as const;

const GLOSSARY_PAGES = [
  {
    slug: "sequence-model",
    registryId: "concept.sequence-model",
    relatedHref: "/docs/glossary/transformer",
    searchQuery: "sequence model",
  },
  {
    slug: "state-space-model",
    registryId: "concept.state-space-model",
    relatedHref: "/docs/glossary/sequence-model",
    searchQuery: "state space model",
  },
  {
    slug: "recurrent-neural-network",
    registryId: "concept.recurrent-neural-network",
    relatedHref: "/docs/glossary/sequence-model",
    searchQuery: "recurrent neural network",
  },
  {
    slug: "convolutional-neural-network",
    registryId: "concept.convolutional-neural-network",
    relatedHref: "/docs/glossary/architecture",
    searchQuery: "convolutional neural network",
  },
  {
    slug: "graph-neural-network",
    registryId: "concept.graph-neural-network",
    relatedHref: "/docs/glossary/architecture",
    searchQuery: "graph neural network",
  },
] as const;

const ALL_REGISTRY_IDS = [
  ...CONCEPT_PAGES.map((page) => page.registryId),
  ...GLOSSARY_PAGES.map((page) => page.registryId),
];

describe("Phase 3 architecture and sequence-family pages (US-003)", () => {
  test("registry records are published architecture concepts with inventory coverage", () => {
    for (const registryId of ALL_REGISTRY_IDS) {
      const record = getConceptById(registryId);
      expect(record?.status).toBe("published");
      expect(record?.conceptType).toBe("architecture");
      expect(PUBLISHED_DOCS_REGISTRY_IDS.has(registryId)).toBe(true);
    }
  });

  test("architecture index lists the new family and layout pages", async () => {
    const entries = await loadPublishedArchitectureEntries();
    const urls = entries.map((entry) => entry.url);

    for (const page of CONCEPT_PAGES) {
      expect(urls).toContain(`/docs/concepts/${page.slug}`);
    }
    for (const page of GLOSSARY_PAGES) {
      expect(urls).toContain(`/docs/glossary/${page.slug}`);
    }
  });

  test("Fumadocs source discovers concept routes without duplicate title chrome", () => {
    for (const page of CONCEPT_PAGES) {
      const discovered = source.getPage(["concepts", page.slug]);
      expect(discovered?.url).toBe(`/docs/concepts/${page.slug}`);
    }
  });

  test("concept pages render opening summary, sections, and foundation links", async () => {
    for (const page of CONCEPT_PAGES) {
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
      expect(html).toContain(`href="${page.relatedHref}"`);
      expect(html).toContain('data-testid="curated-related-docs"');
      expect(html).not.toContain("Draft placeholder");
      expect(html).not.toContain("Reader Shortcut");
    }
  });

  test("glossary family pages render without draft placeholders or opening-summary chrome", async () => {
    for (const page of GLOSSARY_PAGES) {
      const loaded = await loadGlossaryPage(page.slug);
      expect(loaded.frontmatter.kind).toBe("glossary");
      expect(loaded.frontmatter.status).toBe("published");
      expect(loaded.frontmatter.registryId).toBe(page.registryId);

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
      expect(html).toContain(`href="${page.relatedHref}"`);
      expect(html).not.toContain("Draft placeholder");
    }
  });

  test("curated related links resolve to published architecture foundations", () => {
    const overview = getConceptById("concept.architectures-overview");
    if (!overview) {
      throw new Error("expected concept.architectures-overview");
    }

    const items = deriveCuratedRelatedItems(
      overview,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const architecture = items.find(
      (item) => item.registryId === "concept.architecture",
    );
    expect(architecture?.href).toBe("/docs/glossary/architecture");
    expect(architecture?.isPlanned).toBe(false);

    const transformerArchitecture = items.find(
      (item) => item.registryId === "concept.transformer-architecture",
    );
    expect(transformerArchitecture?.href).toBe(
      "/docs/concepts/transformer-architecture",
    );
    expect(transformerArchitecture?.isPlanned).toBe(false);
  });

  test("search index distinguishes concept and glossary hits for representative queries", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    for (const page of CONCEPT_PAGES) {
      const document = documents.find((entry) => entry.url.includes(page.slug));
      expect(document?.kind).toBe("concept");
      expect(document?.facets.kind).toBe("concept");
      expect(document?.title.toLowerCase()).toContain(
        page.searchQuery.split(" ")[0] ?? "",
      );
    }

    for (const page of GLOSSARY_PAGES) {
      const document = documents.find((entry) => entry.url.includes(page.slug));
      expect(document?.kind).toBe("glossary");
      expect(document?.facets.kind).toBe("glossary");
    }

    const sequenceDocument = documents.find(
      (entry) => entry.url === "/docs/glossary/sequence-model",
    );
    expect(sequenceDocument?.title).toBe("Sequence model");
  });
});
