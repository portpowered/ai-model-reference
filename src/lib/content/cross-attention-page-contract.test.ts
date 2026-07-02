import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { resolveCitations } from "@/lib/content/citations";
import { MODULES_DOCS_ROOT } from "@/lib/content/content-paths";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadModulePage } from "@/lib/content/module-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import {
  getPublishedDocsEntryByRegistryId,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getModuleById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { getTableById } from "@/lib/content/table-registry-runtime";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";
import { validateColocatedPageBundle } from "./validate-registry";

const REGISTRY_ID = "module.cross-attention";
const SLUG = "cross-attention";
const PAGE_URL = "/docs/modules/cross-attention";
const GRAPH_ID = "graph.cross-attention-memory-pattern";
const TABLE_ID = "table.cross-attention-comparison";
const CITATION_ID = "citation.attention-is-all-you-need";

const pageDir = join(MODULES_DOCS_ROOT, SLUG);
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

/**
 * Routine page-bundle checks (frontmatter, messages, registryId, tags, assets)
 * are covered by `validateDerivedPublishedPageBundles` via `validateRegistryContent`.
 * These tests stay focused on graph/table asset resolution, search and related-doc
 * wiring, and rendered surface contracts specific to the cross-attention slice.
 */
describe("cross-attention page contract (cross-attention-module-page-005)", () => {
  test("canonical route, registry record, English messages, and local assets resolve together", async () => {
    const entry = getPublishedDocsEntryByRegistryId(REGISTRY_ID);
    const registry = await loadRegistry();
    const bundle = await validateColocatedPageBundle(pageDir, registry);
    const record = getModuleById(REGISTRY_ID);
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(entry).toMatchObject({
      registryId: REGISTRY_ID,
      url: PAGE_URL,
    });
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(record?.status).toBe("published");
    expect(bundle.errors).toEqual([]);
    expect(bundle.messages?.title).toBe("Cross-Attention");
    expect(bundle.messages?.openingSummary?.length).toBeGreaterThan(0);
    expect(bundle.assets?.computeFlow).toBeDefined();
    expect(bundle.assets?.comparisonTable).toBeDefined();
    expect(bundledMessages.title).toBe("Cross-Attention");
  });

  test("page-local graph, table, caption, and citation references resolve for the bundle", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );
    const record = getModuleById(REGISTRY_ID);

    if (!record) {
      throw new Error("expected module.cross-attention in registry");
    }

    expect(assets.computeFlow.type).toBe("attention-variant-graph");
    if (assets.computeFlow.type === "attention-variant-graph") {
      expect(assets.computeFlow.captionKey).toBe("assets.computeFlow.caption");
      expect(
        assets.computeFlow.variants.map((variant) => variant.graphId),
      ).toEqual(expect.arrayContaining([GRAPH_ID]));
    }
    expect(assets.comparisonTable).toMatchObject({
      type: "table",
      tableId: TABLE_ID,
    });
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
    expect(getGraphById(GRAPH_ID)?.subjectId).toBe(REGISTRY_ID);
    expect(getTableById(TABLE_ID)?.subjectId).toBe(REGISTRY_ID);
    expect(messages.assets?.computeFlow?.caption).toContain(
      "separate memory source",
    );

    const citations = resolveCitations(record.citationIds);
    expect(citations).toHaveLength(1);
    expect(citations[0]?.id).toBe(CITATION_ID);
    expect(citations[0]?.url).toContain("arxiv.org");
  });

  test("live search routes encoder-decoder attention to the canonical cross-attention page", async () => {
    const results = await docsSearchApi.search("encoder-decoder attention");

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(PAGE_URL);
  });

  test("curated related items expose the attention-family nearby-doc href order", () => {
    const source = getModuleById(REGISTRY_ID);
    if (!source) {
      throw new Error("expected module.cross-attention in registry");
    }

    const relatedItems = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(relatedItems.map((item) => item.href)).toEqual([
      "/docs/modules/attention",
      "/docs/modules/multi-head-attention",
      "/docs/modules/causal-attention",
      "/docs/modules/bidirectional-attention",
      "/docs/concepts/transformer-architecture",
      "/docs/glossary/encoder-decoder",
      "/docs/glossary/multimodal-model",
    ]);
  });

  test("rendered docs shell exposes title, opening summary, graph, comparison, citations, and related docs", async () => {
    const page = await loadModulePage(SLUG);
    const shellHtml = renderModuleDocsShell(page);
    const contentHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(shellHtml).toContain("Cross-Attention");
    expect(shellHtml).toContain('data-testid="folded-summary"');
    expect(shellHtml).toContain(
      "queries come from one stream while keys and values come from a separate memory source",
    );
    expect(contentHtml).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(contentHtml).toContain(`data-table-id="${TABLE_ID}"`);
    expect(contentHtml).toContain("Causal Attention");
    expect(contentHtml).toContain('data-testid="citation-list"');
    expect(contentHtml).toContain('href="https://arxiv.org/abs/1706.03762"');
    expect(contentHtml).toContain('data-testid="curated-related-docs"');
    expect(contentHtml).toContain('href="/docs/modules/causal-attention"');
    expect(contentHtml).not.toContain("missing-content");
  });
});
