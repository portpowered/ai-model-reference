/**
 * Consolidated review-facing slice proof for the GPU system page.
 * Routine bundle invariants (frontmatter, messages, tags, citations, assets)
 * are covered by `make validate-data`; this file proves observable route,
 * rendering, search, graph/citation resolution, and adjacent-link behavior together.
 */
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

const REGISTRY_ID = "system.gpu";
const SLUG = "gpu";
const PAGE_URL = "/docs/systems/gpu";
const GRAPH_ID = "graph.gpu-system-flow";
const GOODFELLOW_CITATION_ID = "citation.goodfellow-deep-learning";

const pageDir = join(SYSTEMS_DOCS_ROOT, SLUG);
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

const ADJACENT_RELATED_HREFS = [
  ["/docs/concepts/memory-bandwidth", "concept.memory-bandwidth"],
  ["/docs/concepts/roofline-model", "concept.roofline-model"],
  ["/docs/concepts/quantization", "concept.quantization"],
  ["/docs/concepts/flops", "concept.flops"],
  ["/docs/systems/inference-engine", "system.inference-engine"],
  ["/docs/systems/batching", "system.batching"],
  ["/docs/systems/deployment", "system.deployment"],
  ["/docs/systems/memory", "system.memory"],
] as const;

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

describe("gpu system slice verification (gpu-system-page-004)", () => {
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
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
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
      throw new Error("expected system.gpu in registry");
    }

    expect(assets.systemFlow).toMatchObject({
      type: "graph",
      graphId: GRAPH_ID,
      altKey: "assets.systemFlow.alt",
      captionKey: "assets.systemFlow.caption",
    });
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
    expect(getGraphById(GRAPH_ID)?.subjectId).toBe(REGISTRY_ID);
    expect(messages.assets?.systemFlow?.alt).toContain("parallel cores");
    expect(messages.assets?.systemFlow?.caption).toContain("memory bandwidth");

    const citations = resolveCitations(record.citationIds);
    expect(citations).toHaveLength(1);
    expect(citations[0]?.id).toBe(GOODFELLOW_CITATION_ID);
    expect(citations[0]?.url).toContain("deeplearningbook.org");
  });

  test("discovery metadata and live search resolve the canonical page for GPU-specific aliases", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === PAGE_URL);

    expect(document).toBeDefined();
    expect(document?.registryId).toBe(REGISTRY_ID);
    expect(document?.aliases).toEqual(
      expect.arrayContaining(["graphics processing unit", "AI accelerator"]),
    );
    expect(document?.tags).toEqual(["foundations", "hardware-distributed"]);

    const results = await docsSearchApi.search("graphics processing unit");
    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrlFromResults(results, PAGE_URL)).toBe(true);
  });

  test.each([
    "GPU",
    "graphics processing unit",
    "AI accelerator",
    "tensor cores",
    "VRAM",
  ] as const)("live search routes %s to the canonical GPU page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrlFromResults(results, PAGE_URL)).toBe(true);
  });

  test("curated related items and tag landing expose adjacent hardware and serving discovery paths", async () => {
    const source = getSystemById(REGISTRY_ID);
    if (!source) {
      throw new Error("expected system.gpu in registry");
    }

    const relatedItems = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    for (const [href, registryId] of ADJACENT_RELATED_HREFS) {
      expect(
        relatedItems.find((item) => item.registryId === registryId)?.href,
      ).toBe(href);
      expect(getPublishedDocsEntryByRegistryId(registryId)?.url).toBe(href);
    }

    const messages = await loadUiMessages();
    const foundationGroups = await loadTagResourceGroups(
      "foundations",
      messages,
      "en",
    );
    const hardwareGroups = await loadTagResourceGroups(
      "hardware-distributed",
      messages,
      "en",
    );
    const foundationSystems = foundationGroups.find(
      (group) => group.kind === "system",
    );
    const hardwareSystems = hardwareGroups.find(
      (group) => group.kind === "system",
    );

    expect(
      foundationSystems?.resources.some(
        (resource) => resource.url === PAGE_URL,
      ),
    ).toBe(true);
    expect(
      hardwareSystems?.resources.some((resource) => resource.url === PAGE_URL),
    ).toBe(true);
  });

  test("rendered page shell exposes graph, tags, citations, adjacent links, and curated related docs without placeholders", async () => {
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
    expect(shellHtml).toContain("graphics processing unit");
    expect(contentHtml).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(contentHtml).toContain('data-testid="tag-pill-list"');
    expect(contentHtml).toContain('href="/tags/foundations"');
    expect(contentHtml).toContain('href="/tags/hardware-distributed"');
    expect(contentHtml).toContain('data-testid="citation-list"');
    expect(contentHtml).toContain('data-testid="curated-related-docs"');
    expect(contentHtml).toContain("Thousands of parallel cores");
    expect(contentHtml).toContain("Tensor cores accelerate matrix blocks");
    expect(contentHtml).toContain("raise throughput");
    expect(contentHtml).toContain("wait in queue for batch formation");
    expect(contentHtml).toContain("deployment placement");
    expect(contentHtml).toContain("not which product to buy today");

    for (const [href] of ADJACENT_RELATED_HREFS) {
      expect(contentHtml).toContain(`href="${href}"`);
    }

    expect(contentHtml).not.toContain("missing-content");
    expect(contentHtml).not.toContain("missing-message");
    expect(contentHtml).not.toContain("missing asset");
  });
});
