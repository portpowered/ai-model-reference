import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { BLOCK_SPARSE_ATTENTION_PAGE_DIR } from "@/lib/content/content-paths";
import {
  loadLocalDocsPage,
  localDocsRoute,
} from "@/lib/content/local-docs-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";
import { validateColocatedPageBundle } from "./validate-registry";

const BLOCK_SPARSE_SLUG = "block-sparse-attention";
const BLOCK_SPARSE_ROUTE = "/docs/modules/block-sparse-attention";

describe("block-sparse attention canonical page contract (block-sparse-attention-module-page-004)", () => {
  test("canonical route, registry record, and default English page bundle resolve together", async () => {
    const route = localDocsRoute({
      section: "modules",
      slug: BLOCK_SPARSE_SLUG,
    });
    const page = await loadLocalDocsPage({
      section: "modules",
      slug: BLOCK_SPARSE_SLUG,
    });
    const registry = await loadRegistry();
    const bundle = await validateColocatedPageBundle(
      BLOCK_SPARSE_ATTENTION_PAGE_DIR,
      registry,
    );
    const record = registry.byId.get("module.block-sparse-attention");

    expect(route).toBe(BLOCK_SPARSE_ROUTE);
    expect(page.frontmatter.kind).toBe("module");
    expect(page.frontmatter.registryId).toBe("module.block-sparse-attention");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.frontmatter.status).toBe("published");
    expect(bundle.errors).toEqual([]);
    expect(bundle.messages?.title).toBe("Block-Sparse Attention");
    expect(bundle.messages?.openingSummary).toContain(
      "groups tokens into blocks",
    );
    expect(bundle.assets?.computeFlow).toBeDefined();
    expect(bundle.assets?.comparisonTable).toBeDefined();

    expect(record?.kind).toBe("module");
    expect(record?.slug).toBe(BLOCK_SPARSE_SLUG);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("module.block-sparse-attention"),
    ).toBe(true);
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
      Array.from(registry.byId.values()).filter(
        (candidate) =>
          candidate.kind !== "tag" &&
          candidate.kind !== "citation" &&
          candidate.kind !== "graph",
      ),
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
