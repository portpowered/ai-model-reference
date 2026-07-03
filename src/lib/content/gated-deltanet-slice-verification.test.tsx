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
import { getDocsPageDir } from "@/lib/content/content-paths";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import {
  loadLocalDocsPage,
  localDocsRoute,
} from "@/lib/content/local-docs-page";
import { loadModulePage } from "@/lib/content/module-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import { loadPublishedDocsPages } from "@/lib/content/pages";
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
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "module.gated-deltanet";
const SLUG = "gated-deltanet";
const PAGE_URL = "/docs/modules/gated-deltanet";
const GRAPH_ID = "graph.gated-deltanet-gdn-comparison";
const TABLE_ID = "table.gated-deltanet-comparison";
const CITATION_ID = "citation.gated-delta-networks-paper";

const pageDir = getDocsPageDir("modules", SLUG);
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

function pageBaseUrlFromResults(
  results: Array<{ url: string }>,
  pageUrl: string,
): boolean {
  return results.some(
    (result) =>
      pageBaseUrl(result.url) === pageUrl ||
      result.url.startsWith(`${pageUrl}#`),
  );
}

/**
 * Routine page-bundle checks (frontmatter, messages, registryId, tags, assets)
 * are covered by `validateDerivedPublishedPageBundles` via `validateRegistryContent`.
 * These tests stay focused on search, discovery, related-doc wiring, citation/graph
 * resolution, and rendered surface contracts specific to the Gated DeltaNet slice.
 */
describe("gated deltanet slice verification (gated-deltanet-005)", () => {
  test("canonical route, registry record, English messages, and local assets resolve together", async () => {
    const entry = getPublishedDocsEntryByRegistryId(REGISTRY_ID);
    const route = localDocsRoute({ section: "modules", slug: SLUG });
    const page = await loadLocalDocsPage({ section: "modules", slug: SLUG });
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const record = getModuleById(REGISTRY_ID);

    expect(route).toBe(PAGE_URL);
    expect(entry).toMatchObject({
      registryId: REGISTRY_ID,
      url: PAGE_URL,
    });
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(record?.status).toBe("published");
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(page.assets.computeFlow).toBeDefined();
    expect(page.assets.comparisonTable).toBeDefined();
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
      throw new Error("expected module.gated-deltanet in registry");
    }

    expect(assets.computeFlow.type).toBe("attention-variant-graph");
    if (assets.computeFlow.type === "attention-variant-graph") {
      expect(assets.computeFlow.captionKey).toBe("assets.computeFlow.caption");
      expect(
        assets.computeFlow.variants.map((variant) => variant.graphId),
      ).toEqual(
        expect.arrayContaining([
          "graph.multi-head-attention-mha-comparison",
          GRAPH_ID,
        ]),
      );
    }
    expect(assets.comparisonTable).toMatchObject({
      type: "table",
      tableId: TABLE_ID,
    });
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
    expect(getGraphById(GRAPH_ID)?.subjectId).toBe(REGISTRY_ID);
    expect(getTableById(TABLE_ID)?.subjectId).toBe(REGISTRY_ID);
    expect(messages.assets?.computeFlow?.caption).toContain(
      "Gate α_t controls decay",
    );

    const citations = resolveCitations(record.citationIds);
    expect(citations).toHaveLength(1);
    expect(citations[0]?.id).toBe(CITATION_ID);
    expect(citations[0]?.url).toContain("arxiv.org/abs/2412.06464");
  });

  test("discovery metadata carries representative Gated DeltaNet search phrases", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === PAGE_URL);

    expect(document).toBeDefined();
    expect(document?.registryId).toBe(REGISTRY_ID);
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "Gated DeltaNet",
        "Gated Delta Network",
        "gated delta nets",
        "gated deltanet",
        "GDN",
        "gated delta rule",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["attention", "context-window"]),
    );
    expect(document?.relatedIds).toEqual(
      expect.arrayContaining([
        "module.attention",
        "module.linear-attention",
        "module.sparse-attention",
        "module.sliding-window-attention",
        "concept.context-window",
      ]),
    );
  });

  test.each([
    "gated deltanet",
    "gated delta network",
    "gated delta nets",
    "delta rule",
    "linear attention",
  ] as const)("live search returns the canonical Gated DeltaNet page for %s", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrlFromResults(results, PAGE_URL)).toBe(true);
  });

  test("attention and context-window tag browsing include the published module under Module groups", async () => {
    const messages = await loadUiMessages();

    for (const tagSlug of ["attention", "context-window"] as const) {
      const groups = await loadTagResourceGroups(tagSlug, messages, "en");
      const moduleGroup = groups.find((group) => group.kind === "module");

      expect(moduleGroup).toBeDefined();
      expect(
        moduleGroup?.resources.some((resource) => resource.url === PAGE_URL),
      ).toBe(true);
    }
  });

  test("curated related items expose nearby shipped attention and long-context hrefs", () => {
    const source = getModuleById(REGISTRY_ID);
    if (!source) {
      throw new Error("expected module.gated-deltanet in registry");
    }

    const relatedItems = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      relatedItems.find((item) => item.registryId === "module.attention")?.href,
    ).toBe("/docs/modules/attention");
    expect(
      relatedItems.find((item) => item.registryId === "module.linear-attention")
        ?.href,
    ).toBe("/docs/modules/linear-attention");
    expect(
      relatedItems.find(
        (item) => item.registryId === "module.sliding-window-attention",
      )?.href,
    ).toBe("/docs/modules/sliding-window-attention");
    expect(
      relatedItems.find((item) => item.registryId === "module.sparse-attention")
        ?.href,
    ).toBe("/docs/modules/sparse-attention");
    expect(
      relatedItems.find((item) => item.registryId === "concept.context-window")
        ?.href,
    ).toBe("/docs/glossary/context-window");
  });

  test("rendered page shell exposes title, summary, graph, math, tags, citations, and related docs without placeholders", async () => {
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

    expect(shellHtml).toContain("Gated DeltaNet");
    expect(shellHtml).toContain("At a glance");
    expect(shellHtml).toContain("Gated Delta Networks");
    expect(shellHtml).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(shellHtml).toContain(`data-graph-legend="${GRAPH_ID}"`);
    expect(shellHtml).toContain('data-math-schema="gdn"');
    expect(shellHtml).toContain("\\alpha_t");
    expect(contentHtml).toContain('data-testid="tag-pill-list"');
    expect(contentHtml).toContain('href="/tags/attention"');
    expect(contentHtml).toContain('href="/tags/context-window"');
    expect(contentHtml).toContain('data-testid="citation-list"');
    expect(contentHtml).toContain('href="https://arxiv.org/abs/2412.06464"');
    expect(contentHtml).toContain('data-testid="curated-related-docs"');
    expect(contentHtml).toContain('href="/docs/modules/linear-attention"');
    expect(contentHtml).toContain(`data-table-id="${TABLE_ID}"`);
    expect(contentHtml).toContain('data-attention-variant-active="gdn"');
    expect(shellHtml).not.toContain("TODO");
    expect(shellHtml).not.toContain("__MISSING");
    expect(shellHtml).not.toContain("missing-content");
  });
});
