import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModulePage } from "@/lib/content/module-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const BLOCK_SPARSE_URL = "/docs/modules/block-sparse-attention";

describe("block-sparse attention discovery surfaces (block-sparse-attention-module-page-003)", () => {
  test("search documents carry the canonical block-sparse discovery phrases", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === BLOCK_SPARSE_URL);

    expect(document).toBeDefined();
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "block-sparse attention",
        "block sparse attention",
        "structured sparse attention",
        "sparse attention blocks",
        "long-context sparse attention",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["attention", "context-window"]),
    );
    expect(document?.relatedIds).toEqual(
      expect.arrayContaining([
        "module.attention",
        "module.sparse-attention",
        "module.sliding-window-attention",
        "concept.context-window",
        "concept.why-long-context-is-hard",
      ]),
    );
  });

  test.each([
    "block sparse attention",
    "block-sparse attention",
    "structured sparse attention",
    "sparse attention blocks",
    "long-context sparse attention",
  ] as const)("live search routes %s to the canonical block-sparse page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(BLOCK_SPARSE_URL);
  });

  test("attention and context-window tag browsing include the published module under Module groups", async () => {
    const messages = await loadUiMessages();

    for (const tagSlug of ["attention", "context-window"] as const) {
      const groups = await loadTagResourceGroups(tagSlug, messages, "en");
      const moduleGroup = groups.find((group) => group.kind === "module");

      expect(moduleGroup).toBeDefined();
      expect(
        moduleGroup?.resources.some(
          (resource) => resource.url === BLOCK_SPARSE_URL,
        ),
      ).toBe(true);
    }
  });

  test("rendered page shell exposes summary, teaching aid, tags, citations, and related docs", async () => {
    const page = await loadModulePage("block-sparse-attention");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("Block-Sparse Attention");
    expect(html).toContain("At a glance");
    expect(html).toContain(
      'data-graph-id="graph.block-sparse-attention-time-block-pattern"',
    );
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("TODO");
    expect(html).not.toContain("__MISSING");
  });
});
