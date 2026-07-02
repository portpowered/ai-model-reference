import { describe, expect, test } from "bun:test";
import type { Node } from "fumadocs-core/page-tree";
import { buildDocsPageMetadata } from "@/app/docs/docs-slug-renderer";
import {
  loadPublishedDocsPages,
  loadShippedLocalizedDocsPages,
} from "@/lib/content/pages";
import { getConceptById, getModuleById } from "@/lib/content/registry-runtime";
import { isShippedLocalizedDocsSlug } from "@/lib/content/shipped-localized-docs";
import { localizePageTree } from "@/lib/i18n/localize-page-tree";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { docsSearchApi } from "@/lib/search/search-server";
import { source } from "@/lib/source";

const PHASE_5_SERVING_DOCS = [
  {
    docsSlug: "glossary/kv-cache",
    url: "/docs/glossary/kv-cache",
    query: "key-value cache",
  },
  {
    docsSlug: "concepts/prefill",
    url: "/docs/concepts/prefill",
    query: "prompt processing",
  },
  {
    docsSlug: "glossary/decode",
    url: "/docs/glossary/decode",
    query: "token-by-token generation",
  },
  {
    docsSlug: "concepts/prefill-decode-split",
    url: "/docs/concepts/prefill-decode-split",
    query: "disaggregated serving",
  },
] as const;

const SERVING_PATH_ENTRY_SURFACE_IDS = [
  "concept.transformer",
  "concept.autoregressive-generation",
  "module.attention",
  "module.multi-query-attention",
  "module.grouped-query-attention",
  "module.sliding-window-attention",
] as const;

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

describe("Phase 5 serving-path search and locale stability (US-005)", () => {
  test(
    "published English docs and search surfaces include the four-page serving slice",
    async () => {
      const pages = await loadPublishedDocsPages("en");
      const docsSlugs = pages.map((page) => page.docsSlug);
      const meta = await loadSearchResultMetaMap("en");

      for (const page of PHASE_5_SERVING_DOCS) {
        expect(docsSlugs).toContain(page.docsSlug);
        expect(meta.get(page.url)?.title).toBeDefined();

        const results = await docsSearchApi.search(page.query);
        expect(results.some((result) => result.url === page.url)).toBe(true);
      }
    },
    { timeout: 15_000 },
  );

  test("existing transformer and attention surfaces still expose entry points into the serving path", () => {
    const servingPathIds = new Set([
      "concept.kv-cache",
      "concept.prefill",
      "concept.decode",
      "concept.prefill-decode-split",
    ]);

    const sourceRecords = SERVING_PATH_ENTRY_SURFACE_IDS.map((registryId) =>
      registryId.startsWith("module.")
        ? getModuleById(registryId)
        : getConceptById(registryId),
    );

    for (const record of sourceRecords) {
      expect(record).toBeDefined();
      expect(
        record?.relatedIds.some((relatedId) => servingPathIds.has(relatedId)),
      ).toBe(true);
    }
  });

  test("Vietnamese shipped-locale surfaces exclude untranslated Phase 5 serving pages", async () => {
    const localizedPages = await loadShippedLocalizedDocsPages("vi");
    const localizedSlugs = localizedPages.map((page) => page.docsSlug);
    const localizedMeta = await loadSearchResultMetaMap("vi");
    const localizedTree = localizePageTree(source.pageTree, "vi");
    const localizedLinks = collectLinks(localizedTree.children);

    for (const page of PHASE_5_SERVING_DOCS) {
      const localizedUrl = `/vi${page.url}`;
      const docsSegments = page.docsSlug.split("/");

      expect(localizedSlugs).not.toContain(page.docsSlug);
      expect(isShippedLocalizedDocsSlug(page.docsSlug, "vi")).toBe(false);
      expect(localizedMeta.has(localizedUrl)).toBe(false);
      expect(localizedLinks).not.toContain(localizedUrl);

      const metadata = await buildDocsPageMetadata(docsSegments);
      expect(metadata.alternates).toEqual({
        canonical: page.url,
        languages: {
          en: page.url,
        },
      });

      const results = await docsSearchApi.search(page.query, { locale: "vi" });
      expect(results.some((result) => result.url === localizedUrl)).toBe(false);
    }
  });
});
