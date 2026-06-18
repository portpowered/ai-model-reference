import { describe, expect, test } from "bun:test";
import type { Node } from "fumadocs-core/page-tree";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { loadModulePage } from "@/lib/content/module-page";
import {
  isDocsPageShippedForLocale,
  loadShippedLocalizedDocsPages,
} from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { isShippedLocalizedDocsSlug } from "@/lib/content/shipped-localized-docs";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localizePageTree } from "@/lib/i18n/localize-page-tree";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { docsSearchApi } from "@/lib/search/search-server";
import { source } from "@/lib/source";

const QUANTIZATION_CHAPTER_URLS = [
  "/docs/concepts/quantization",
  "/docs/concepts/weight-only-quantization",
  "/docs/concepts/activation-quantization",
  "/docs/concepts/kv-cache-quantization",
  "/docs/concepts/post-training-quantization",
  "/docs/concepts/calibration",
  "/docs/concepts/quantization-aware-training",
  "/docs/concepts/dynamic-quantization",
  "/docs/concepts/why-4-bit-models-are-not-exactly-4x-faster",
] as const;

const VI_QUANTIZATION_CHAPTER_URLS = QUANTIZATION_CHAPTER_URLS.map(
  (url) => `/vi${url}`,
);

function collectLinks(children: Node[]): string[] {
  const links: string[] = [];

  for (const child of children) {
    if ("url" in child && typeof child.url === "string") {
      links.push(child.url);
    }

    if ("children" in child && Array.isArray(child.children)) {
      links.push(...collectLinks(child.children));
    }
  }

  return links;
}

async function renderGlossaryOrConceptPage(
  loader: Promise<
    Awaited<ReturnType<typeof loadGlossaryPage | typeof loadConceptPage>>
  >,
) {
  const page = await loader;
  return renderToStaticMarkup(
    createElement(
      ModulePageProviders,
      {
        messages: page.messages,
        assets: page.assets,
      },
      page.content,
    ),
  );
}

describe("Phase 5 quantization chapter discovery and locale stability (chapter-5-quantization-006)", () => {
  test("registry-derived chapter traversal and quantization tag discovery cover the full chapter", async () => {
    const quantization = getConceptById("concept.quantization");
    if (!quantization) {
      throw new Error("expected concept.quantization in registry");
    }

    const relatedItems = deriveCuratedRelatedItems(
      quantization,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      relatedItems
        .map((item) => item.href)
        .filter((href) => href !== undefined),
    ).toEqual(expect.arrayContaining([...QUANTIZATION_CHAPTER_URLS].slice(1)));

    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups("quantization", messages, "en");
    const conceptGroup = groups.find((group) => group.kind === "concept");

    expect(conceptGroup?.resources.map((resource) => resource.url)).toEqual(
      expect.arrayContaining(QUANTIZATION_CHAPTER_URLS as unknown as string[]),
    );
    expect(conceptGroup?.resources).toHaveLength(
      QUANTIZATION_CHAPTER_URLS.length,
    );
  });

  test("nearby published pages expose reader-visible paths into the quantization chapter", async () => {
    const nearbyPages = await Promise.all([
      renderGlossaryOrConceptPage(loadGlossaryPage("parameter")),
      renderGlossaryOrConceptPage(loadGlossaryPage("activation")),
      renderGlossaryOrConceptPage(
        loadGlossaryPage("autoregressive-generation"),
      ),
      renderGlossaryOrConceptPage(loadConceptPage("kv-cache-quantization")),
      (async () => {
        const page = await loadModulePage("multi-query-attention");
        return renderToStaticMarkup(
          createElement(
            ModulePageProviders,
            {
              messages: page.messages,
              assets: page.assets,
            },
            page.content,
          ),
        );
      })(),
      (async () => {
        const page = await loadModulePage("grouped-query-attention");
        return renderToStaticMarkup(
          createElement(
            ModulePageProviders,
            {
              messages: page.messages,
              assets: page.assets,
            },
            page.content,
          ),
        );
      })(),
    ]);

    for (const html of nearbyPages) {
      expect(html).toContain('href="/docs/concepts/quantization"');
    }
  });

  test("untranslated quantization pages stay out of shipped /vi docs navigation and search surfaces", async () => {
    expect(isShippedLocalizedDocsSlug("concepts/quantization", "vi")).toBe(
      false,
    );
    expect(isDocsPageShippedForLocale("concepts/quantization", "vi")).toBe(
      false,
    );
    expect(
      isDocsPageShippedForLocale("modules/grouped-query-attention", "vi"),
    ).toBe(true);

    const shippedPages = await loadShippedLocalizedDocsPages("vi");
    const shippedSlugs = shippedPages.map((page) => page.docsSlug);
    expect(
      shippedSlugs.filter((slug) => slug.startsWith("concepts/quantization")),
    ).toEqual([]);

    const localizedTree = localizePageTree(source.pageTree, "vi");
    const links = collectLinks(localizedTree.children);
    for (const url of VI_QUANTIZATION_CHAPTER_URLS) {
      expect(links).not.toContain(url);
    }

    const meta = await loadSearchResultMetaMap("vi");
    for (const url of VI_QUANTIZATION_CHAPTER_URLS) {
      expect(meta.has(url)).toBe(false);
    }

    const results = await docsSearchApi.search("quantization", {
      locale: "vi",
    });
    expect(
      results.some((result) =>
        result.url.startsWith("/vi/docs/concepts/quantization"),
      ),
    ).toBe(false);
  });
});
