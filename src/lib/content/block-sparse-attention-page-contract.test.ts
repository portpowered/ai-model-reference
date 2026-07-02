import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  loadLocalDocsPage,
  localDocsRoute,
} from "@/lib/content/local-docs-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import { listRelatedRegistryRecords } from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const BLOCK_SPARSE_SLUG = "block-sparse-attention";
const BLOCK_SPARSE_ROUTE = "/docs/modules/block-sparse-attention";

/**
 * Routine page-bundle checks (frontmatter, messages, registryId, tags, assets)
 * are covered by `validateDerivedPublishedPageBundles` via `validateRegistryContent`.
 * These tests stay focused on search, discovery, related-doc wiring, and rendered
 * surface contracts that are special to this page slice.
 */
describe("block-sparse attention discovery and rendering contract (block-sparse-attention-module-page-004)", () => {
  test("canonical route and shipped copy stay wired for the block-sparse module slice", async () => {
    const route = localDocsRoute({
      section: "modules",
      slug: BLOCK_SPARSE_SLUG,
    });
    const page = await loadLocalDocsPage({
      section: "modules",
      slug: BLOCK_SPARSE_SLUG,
    });

    expect(route).toBe(BLOCK_SPARSE_ROUTE);
    expect(page.messages.title).toBe("Block-Sparse Attention");
    expect(page.messages.openingSummary).toContain("groups tokens into blocks");
    expect(page.assets.computeFlow).toBeDefined();
    expect(page.assets.comparisonTable).toBeDefined();
  });

  test("discovery metadata and live search resolve the canonical page for representative reader queries", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find(
      (entry) => entry.url === BLOCK_SPARSE_ROUTE,
    );

    expect(document).toBeDefined();
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "block-sparse attention",
        "block sparse attention",
        "structured sparse attention",
        "long-context sparse attention",
      ]),
    );

    const results = await docsSearchApi.search("long-context sparse attention");
    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(BLOCK_SPARSE_ROUTE);
  });

  test("canonical page related-doc links stay wired to nearby shipped attention and long-context pages", async () => {
    const registry = await loadRegistry();
    const record = registry.byId.get("module.block-sparse-attention");

    if (record?.kind !== "module") {
      throw new Error("expected module.block-sparse-attention module record");
    }

    const relatedItems = deriveCuratedRelatedItems(
      record,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      relatedItems.find((item) => item.registryId === "module.sparse-attention")
        ?.href,
    ).toBe("/docs/modules/sparse-attention");
    expect(
      relatedItems.find((item) => item.registryId === "concept.context-window")
        ?.href,
    ).toBe("/docs/glossary/context-window");

    const page = await loadLocalDocsPage({
      section: "modules",
      slug: BLOCK_SPARSE_SLUG,
    });
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/modules/sparse-attention"');
    expect(html).toContain('href="/docs/glossary/context-window"');
  });
});
