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
import { SYSTEMS_DOCS_ROOT } from "@/lib/content/content-paths";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  getPublishedDocsEntryByRegistryId,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getSystemById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { loadSystemPage } from "@/lib/content/system-page";
import { renderSystemDocsShell } from "@/lib/content/system-shell-render";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "system.dynamic-batching";
const SLUG = "dynamic-batching";
const PAGE_URL = "/docs/systems/dynamic-batching";
const GRAPH_ID = "graph.dynamic-batching-system-flow";
const ORCA_CITATION_ID = "citation.orca-serving-system";

const pageDir = join(SYSTEMS_DOCS_ROOT, SLUG);
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
 * resolution, and rendered surface contracts specific to the dynamic batching slice.
 */
describe("dynamic batching slice verification (dynamic-batching-system-page-004)", () => {
  test("canonical route resolves to the published registry record and default English messages", async () => {
    const entry = getPublishedDocsEntryByRegistryId(REGISTRY_ID);
    const page = await loadSystemPage(SLUG);
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const record = getSystemById(REGISTRY_ID);

    expect(entry).toMatchObject({
      registryId: REGISTRY_ID,
      url: PAGE_URL,
    });
    expect(record?.status).toBe("published");
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("system");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
  });

  test("page-local graph, caption, and citation references resolve for the bundle", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );
    const record = getSystemById(REGISTRY_ID);

    if (!record) {
      throw new Error("expected system.dynamic-batching in registry");
    }

    expect(assets.systemFlow).toMatchObject({
      type: "graph",
      graphId: GRAPH_ID,
      altKey: "assets.systemFlow.alt",
      captionKey: "assets.systemFlow.caption",
    });
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
    expect(getGraphById(GRAPH_ID)?.subjectId).toBe(REGISTRY_ID);
    expect(messages.assets?.systemFlow?.alt).toContain("batch window");
    expect(messages.assets?.systemFlow?.caption).toContain(
      "pre-execution wait",
    );

    const citations = resolveCitations(record.citationIds);
    expect(citations).toHaveLength(1);
    expect(citations[0]?.id).toBe(ORCA_CITATION_ID);
    expect(citations[0]?.url).toContain("usenix.org");
  });

  test("discovery metadata and live search resolve the canonical page for dynamic-batching-specific aliases", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === PAGE_URL);

    expect(document).toBeDefined();
    expect(document?.registryId).toBe(REGISTRY_ID);
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "dynamic batching",
        "batch window",
        "request batching",
      ]),
    );
    expect(document?.tags).toEqual(["foundations"]);

    const results = await docsSearchApi.search("batch window");
    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(PAGE_URL);
  });

  test.each([
    "dynamic batching",
    "request batching",
    "queueing delay",
    "utilization tradeoff",
  ] as const)("live search routes %s to the canonical dynamic batching page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrlFromResults(results, PAGE_URL)).toBe(true);
  });

  test("curated related items and tag landing expose nearby serving discovery paths", async () => {
    const source = getSystemById(REGISTRY_ID);
    if (!source) {
      throw new Error("expected system.dynamic-batching in registry");
    }

    const relatedItems = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      relatedItems.find((item) => item.registryId === "system.batching")?.href,
    ).toBe("/docs/systems/batching");
    expect(
      relatedItems.find(
        (item) => item.registryId === "system.continuous-batching",
      )?.href,
    ).toBe("/docs/systems/continuous-batching");
    expect(
      relatedItems.find((item) => item.registryId === "system.routing")?.href,
    ).toBe("/docs/systems/routing");

    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups("foundations", messages, "en");
    const systemGroup = groups.find((group) => group.kind === "system");

    expect(
      systemGroup?.resources.some((resource) => resource.url === PAGE_URL),
    ).toBe(true);
  });

  test("rendered page shell exposes graph, tags, citations, and curated related docs without placeholders", async () => {
    const page = await loadSystemPage(SLUG);
    const shellHtml = await renderSystemDocsShell(page);
    const contentHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(shellHtml).toContain('data-testid="folded-opening-summary"');
    expect(shellHtml).toContain("batch window");
    expect(contentHtml).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(contentHtml).toContain('data-testid="tag-pill-list"');
    expect(contentHtml).toContain('href="/tags/foundations"');
    expect(contentHtml).toContain('data-testid="citation-list"');
    expect(contentHtml).toContain('data-testid="curated-related-docs"');
    expect(contentHtml).toContain('href="/docs/systems/batching"');
    expect(contentHtml).toContain('href="/docs/systems/continuous-batching"');
    expect(contentHtml).toContain("Wait through batch window");
    expect(contentHtml).not.toContain("missing-content");
  });
});
