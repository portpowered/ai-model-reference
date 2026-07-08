/**
 * Consolidated review-facing slice proof for the multimodal tokenization module page.
 * Routine bundle invariants (frontmatter, messages, tags, citations, assets) are
 * covered by `make validate-data`; this file proves observable route rendering,
 * teaching assets, related docs, search discovery, and tag landing behavior.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import {
  buildDocsPageMetadata,
  renderDocsSlugPage,
} from "@/app/docs/docs-slug-renderer";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { loadModulePage } from "@/lib/content/module-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getModuleById,
  getPublishedDocsRegistryIds,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";
import { resultsIncludeUrl } from "@/tests/search/helpers";

const REGISTRY_ID = "module.multimodal-tokenization";
const SLUG = "multimodal-tokenization";
const PAGE_URL = "/docs/modules/multimodal-tokenization";
const GRAPH_ID = "graph.multimodal-tokenization-compute-flow";
const TABLE_ID = "table.multimodal-tokenization-comparison";
const TOKENIZER_CLASSIFICATION_ID = "classification.module.tokenization";
const TOKENIZATION_TAG_SLUG = "tokenization";

const pageDir = getDocsPageDir("modules", SLUG);
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

const DISCOVERY_QUERIES = [
  { query: "multimodal tokenization", expectFirst: true },
  { query: "audio tokenization", expectFirst: true },
  { query: "omni tokenization", expectFirst: true },
  { query: "image tokenization", expectFirst: false },
  { query: "video tokenization", expectFirst: false },
] as const;

async function renderMultimodalTokenizationPageHtml(): Promise<string> {
  const page = await loadModulePage(SLUG);
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("multimodal tokenization module slice (multimodal-tokenization-module-page-005)", () => {
  test("keeps a single canonical module.multimodal-tokenization record", async () => {
    const indexes = await loadRegistry();
    const matches = [...indexes.byId.values()].filter(
      (record) => record.id === REGISTRY_ID || record.slug === SLUG,
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]?.id).toBe(REGISTRY_ID);
    expect(indexes.bySlug.get(SLUG)?.id).toBe(REGISTRY_ID);
  });

  test("published registry record carries discovery aliases and tokenizer metadata", () => {
    const record = getRegistryRecordById(REGISTRY_ID);
    expect(record?.kind).toBe("module");
    if (record?.kind !== "module") {
      throw new Error(
        "expected module.multimodal-tokenization in registry runtime",
      );
    }

    expect(record.status).toBe("published");
    expect(record.moduleType).toBe("tokenizer");
    expect(record.moduleFamily).toBe("tokenization");
    expect(record.primaryClassificationId).toBe(TOKENIZER_CLASSIFICATION_ID);
    expect(record.aliases).toEqual(
      expect.arrayContaining([
        "multimodal tokenization",
        "multimodal tokenizer",
        "image tokenization",
        "audio tokenization",
        "video tokenization",
        "modality adapter",
        "token-like embeddings",
        "omni tokenization",
      ]),
    );
    expect(record.tags).toEqual(
      expect.arrayContaining(["tokenization", "foundations", "taxonomy"]),
    );
  });

  test("curated related ids preserve published routes for available neighbors", () => {
    const source = getRegistryRecordById(REGISTRY_ID);
    if (!source) {
      throw new Error(
        "expected module.multimodal-tokenization in registry runtime",
      );
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      getPublishedDocsRegistryIds(),
    );

    expect(items.map((item) => item.registryId)).toEqual([
      "concept.token",
      "concept.tokenizers-overview",
      "concept.visual-tokenization",
      "concept.multimodal-model",
      "concept.modality",
      "module.clip-image-tokenization",
      "module.cross-attention",
      "model.clip",
    ]);
    expect(items.map((item) => item.href)).toEqual([
      "/docs/glossary/token",
      "/docs/concepts/tokenizers-overview",
      "/docs/concepts/visual-tokenization",
      "/docs/glossary/multimodal-model",
      "/docs/glossary/modality",
      "/docs/modules/clip-image-tokenization",
      "/docs/modules/cross-attention",
      "/docs/models/clip",
    ]);
    expect(items.every((item) => item.isPlanned === false)).toBe(true);
  });

  test("published route, registry record, bundled messages, and assets stay aligned", async () => {
    const record = getModuleById(REGISTRY_ID);
    const page = await loadLocalDocsPage({
      section: "modules",
      slug: SLUG,
    });
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const bundledAssets = JSON.parse(readFileSync(assetsPath, "utf8"));

    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe(SLUG);
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("module");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.description).toBe(bundledMessages.description);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(bundledAssets.computeFlow).toMatchObject({
      type: "graph",
      graphId: GRAPH_ID,
    });
    expect(bundledAssets.comparisonTable).toMatchObject({
      type: "table",
      tableId: TABLE_ID,
    });
  });

  test("app route metadata and English render resolve without missing-content placeholders", async () => {
    const metadata = await buildDocsPageMetadata(["modules", SLUG]);
    expect(metadata.alternates).toEqual({
      canonical: PAGE_URL,
      languages: {
        en: PAGE_URL,
      },
    });
    expect(metadata.title).toContain("Multimodal Tokenization");

    const rendered = await renderDocsSlugPage(["modules", SLUG], "en");
    expect(rendered).toBeDefined();
  });

  test(
    "rendered page exposes introductory narrative, teaching assets, related docs, and tags",
    async () => {
      const page = await loadModulePage(SLUG);
      const shellHtml = renderModuleDocsShell(page);
      const contentHtml = await renderMultimodalTokenizationPageHtml();
      const record = getModuleById(REGISTRY_ID);
      if (!record) {
        throw new Error("expected module.multimodal-tokenization in registry");
      }

      const related = deriveCuratedRelatedItems(
        record,
        listRelatedRegistryRecords(),
        PUBLISHED_DOCS_REGISTRY_IDS,
      );

      expect(shellHtml).toContain("Multimodal Tokenization");
      expect(shellHtml).toContain("token-like embeddings");
      expect(contentHtml).toContain("image patches");
      expect(contentHtml).toContain("audio");
      expect(contentHtml).toContain("video");
      expect(contentHtml).toContain("modality adapter");
      expect(contentHtml).toContain("finite vocabulary");
      expect(contentHtml).toContain(`data-graph-id="${GRAPH_ID}"`);
      expect(contentHtml).toContain(`data-table-id="${TABLE_ID}"`);
      expect(contentHtml).toContain('data-testid="tag-pill-list"');
      expect(contentHtml).toContain('href="/tags/tokenization"');
      expect(contentHtml).toContain('data-testid="curated-related-docs"');
      expect(contentHtml).toContain(
        'href="/docs/modules/clip-image-tokenization"',
      );
      expect(contentHtml).toContain('href="/docs/glossary/token"');
      expect(contentHtml).toContain('data-testid="citation-list"');
      expect(contentHtml).not.toContain("Reader Shortcut");
      expect(contentHtml).not.toMatch(/\{\{[^}]+\}\}/);
      expect(related.length).toBeGreaterThan(0);
    },
    { timeout: 15_000 },
  );

  test("page-local assets resolve graph and table references from colocated messages", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.computeFlow).toMatchObject({
      type: "graph",
      graphId: GRAPH_ID,
      webRenderer: "react-flow",
      altKey: "assets.computeFlow.alt",
    });
    expect(assets.comparisonTable).toMatchObject({
      type: "table",
      tableId: TABLE_ID,
    });
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
    expect(messages.assets?.computeFlow?.title).toBe(
      "Multimodal input to shared sequence",
    );
    expect(messages.assets?.computeFlow?.legend?.["data-flow"]?.label).toBe(
      "Modality encoding and fusion path",
    );
    expect(messages.tables?.comparison?.dimensions?.inputForm).toBe(
      "Input form",
    );
    expect(messages.tables?.comparison?.values?.videoTokens?.outputForm).toBe(
      "Patch or clip embeddings repeated across time",
    );
  });

  test(
    "rendered graph and comparison table expose message-backed modality teaching copy",
    async () => {
      const html = await renderMultimodalTokenizationPageHtml();

      expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
      expect(html).toContain(`data-table-id="${TABLE_ID}"`);
      expect(html).toContain("Multimodal input to shared sequence");
      expect(html).toContain("Modality encoding and fusion path");
      expect(html).toContain("Raw modality inputs");
      expect(html).toContain("Split into patches, frames, or clips");
      expect(html).toContain("Align widths with modality adapters");
      expect(html).toContain("Token-like embedding vectors");
      expect(html).toContain("Shared model sequence");
      expect(html).toContain('data-graph-node-id="raw-inputs"');
      expect(html).toContain('data-graph-node-id="shared-sequence"');
      expect(html).toContain("Input form");
      expect(html).toContain("Ordering and time");
      expect(html).toContain("Unicode text strings");
      expect(html).toContain("learned text vocabulary");
      expect(html).toContain("continuous embedding");
      expect(html).toContain("short time frame or feature step");
      expect(html).toContain(
        'data-comparison-cell="outputForm:concept.visual-tokenization"',
      );
      expect(html).toContain("repeated across time");
      expect(html).toContain(
        'data-comparison-cell="outputForm:concept.modality"',
      );
      expect(html).toContain(
        'data-comparison-cell="mainTradeoff:module.multimodal-tokenization"',
      );
      expect(html).toContain('href="/docs/glossary/hidden-size"');
      expect(html).toContain('data-math-schema="modalityUnitSplit"');
    },
    { timeout: 15_000 },
  );

  test("search documents carry canonical aliases, tags, and registry metadata", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === PAGE_URL);

    expect(document).toBeDefined();
    expect(document?.kind).toBe("module");
    expect(document?.registryId).toBe(REGISTRY_ID);
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "multimodal tokenization",
        "image tokenization",
        "audio tokenization",
        "video tokenization",
        "omni tokenization",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["tokenization", "foundations", "taxonomy"]),
    );
    expect(document?.bodyText).toContain("token-like embeddings");
  });

  for (const { query, expectFirst } of DISCOVERY_QUERIES) {
    test(`search query "${query}" surfaces the canonical multimodal tokenization page`, async () => {
      const results = await docsSearchApi.search(query);

      expect(resultsIncludeUrl(results, PAGE_URL)).toBe(true);

      if (expectFirst) {
        expect(pageBaseUrl(results[0]?.url ?? "")).toBe(PAGE_URL);
      }
    });
  }

  test("tokenization tag landing surfaces multimodal tokenization as a tokenizer-family module entry point", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups(
      TOKENIZATION_TAG_SLUG,
      messages,
      "en",
    );
    const moduleGroup = groups.find((group) => group.kind === "module");

    expect(moduleGroup).toBeDefined();
    expect(moduleGroup?.kindLabel).toBe("Module");
    expect(
      moduleGroup?.resources.some((resource) => resource.url === PAGE_URL),
    ).toBe(true);
  });

  test("tokenization tag landing renders multimodal tokenization without empty-state placeholders", async () => {
    const page = await TagLandingPage({
      params: Promise.resolve({ slug: TOKENIZATION_TAG_SLUG }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Tokenization");
    expect(html).toContain("Multimodal Tokenization");
    expect(html).toContain(`href="${PAGE_URL}"`);
    expect(html).toContain('href="/search?tag=tokenization"');
    expect(html).not.toContain("No resources");
    expect(html).not.toContain("Nothing has shipped");
  });
});
