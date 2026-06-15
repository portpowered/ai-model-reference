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

const POSITIONAL_EMBEDDING_VARIANT_PAGES = [
  {
    slug: "absolute-positional-embeddings",
    registryId: "concept.absolute-positional-embeddings",
    foundationHref: "/docs/concepts/positional-encodings",
    searchTitle: "Absolute positional embeddings",
  },
  {
    slug: "learned-positional-embeddings",
    registryId: "concept.learned-positional-embeddings",
    foundationHref: "/docs/concepts/positional-encodings",
    searchTitle: "Learned positional embeddings",
  },
  {
    slug: "sinusoidal-positional-embeddings",
    registryId: "concept.sinusoidal-positional-embeddings",
    foundationHref: "/docs/concepts/positional-encodings",
    searchTitle: "Sinusoidal positional embeddings",
  },
  {
    slug: "relative-position-bias",
    registryId: "concept.relative-position-bias",
    foundationHref: "/docs/concepts/positional-encodings",
    searchTitle: "Relative position bias",
  },
  {
    slug: "t5-relative-position-bias",
    registryId: "concept.t5-relative-position-bias",
    foundationHref: "/docs/glossary/relative-position-bias",
    searchTitle: "T5 relative position bias",
  },
  {
    slug: "nope",
    registryId: "concept.nope",
    foundationHref: "/docs/concepts/positional-encodings",
    searchTitle: "NoPE",
  },
] as const;

const CONTEXT_EXTENSION_VARIANT_PAGES = [
  {
    slug: "superhot-rope",
    registryId: "concept.superhot-rope",
    foundationHref: "/docs/concepts/context-extension",
    searchTitle: "SuperHOT RoPE",
  },
  {
    slug: "ntk-aware-rope-scaling",
    registryId: "concept.ntk-aware-rope-scaling",
    foundationHref: "/docs/concepts/context-extension",
    searchTitle: "NTK-aware RoPE scaling",
  },
  {
    slug: "yarn",
    registryId: "concept.yarn",
    foundationHref: "/docs/concepts/context-extension",
    searchTitle: "YaRN",
  },
  {
    slug: "longrope",
    registryId: "concept.longrope",
    foundationHref: "/docs/concepts/context-extension",
    searchTitle: "LongRoPE",
  },
  {
    slug: "positional-interpolation",
    registryId: "concept.positional-interpolation",
    foundationHref: "/docs/concepts/context-extension",
    searchTitle: "Positional interpolation",
  },
] as const;

const ALL_PAGES = [
  ...POSITIONAL_EMBEDDING_VARIANT_PAGES,
  ...CONTEXT_EXTENSION_VARIANT_PAGES,
] as const;

describe("Phase 3 positional and context-extension variant pages (US-006)", () => {
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
      expect(html).not.toContain("ConceptMap");
    }
  });

  test("foundation pages explain the new variant registry ids", () => {
    const positionalEncodings = getConceptById("concept.positional-encodings");
    expect(positionalEncodings?.explainsIds).toEqual(
      expect.arrayContaining([
        "concept.absolute-positional-embeddings",
        "concept.learned-positional-embeddings",
        "concept.sinusoidal-positional-embeddings",
        "concept.relative-position-bias",
        "concept.t5-relative-position-bias",
        "concept.nope",
      ]),
    );

    const rope = getConceptById("concept.rope");
    expect(rope?.explainsIds).toEqual(
      expect.arrayContaining([
        "concept.superhot-rope",
        "concept.ntk-aware-rope-scaling",
      ]),
    );

    const contextExtension = getConceptById("concept.context-extension");
    expect(contextExtension?.explainsIds).toEqual(
      expect.arrayContaining([
        "concept.yarn",
        "concept.longrope",
        "concept.positional-interpolation",
        "concept.superhot-rope",
        "concept.ntk-aware-rope-scaling",
      ]),
    );
  });

  test("curated related links resolve to published long-context foundations", () => {
    const yarn = getConceptById("concept.yarn");
    if (!yarn) {
      throw new Error("expected concept.yarn");
    }

    const items = deriveCuratedRelatedItems(
      yarn,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const rope = items.find((item) => item.registryId === "concept.rope");
    expect(rope?.href).toBe("/docs/glossary/rope");
    expect(rope?.isPlanned).toBe(false);

    const contextExtension = items.find(
      (item) => item.registryId === "concept.context-extension",
    );
    expect(contextExtension?.href).toBe("/docs/concepts/context-extension");
    expect(contextExtension?.isPlanned).toBe(false);

    const contextWindow = items.find(
      (item) => item.registryId === "concept.context-window",
    );
    expect(contextWindow?.href).toBe("/docs/glossary/context-window");
    expect(contextWindow?.isPlanned).toBe(false);
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
      expect(document?.title).toBe(page.searchTitle);
    }

    const nope = documents.find((entry) => entry.url === "/docs/glossary/nope");
    const yarn = documents.find((entry) => entry.url === "/docs/glossary/yarn");
    const longrope = documents.find(
      (entry) => entry.url === "/docs/glossary/longrope",
    );
    const interpolation = documents.find(
      (entry) => entry.url === "/docs/glossary/positional-interpolation",
    );

    expect(nope?.title).toBe("NoPE");
    expect(yarn?.title).toBe("YaRN");
    expect(longrope?.title).toBe("LongRoPE");
    expect(interpolation?.title).toBe("Positional interpolation");
    expect(nope?.url).not.toBe(yarn?.url);
  });
});
