import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import {
  getPublishedDocsEntryByRegistryId,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getCitationById,
  getModuleById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { getTableById } from "@/lib/content/table-registry-runtime";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";
import {
  assertLoopedTransformersGraphAccessibilityConvergence,
  assertLoopedTransformersGraphInteractionConvergence,
  assertLoopedTransformersGraphThemeConvergence,
  assertLoopedTransformersModuleConvergence,
  assertLoopedTransformersResponsiveConvergence,
  assertLoopedTransformersSingleGraphConvergence,
  LOOPED_TRANSFORMERS_GRAPH_ID,
  LOOPED_TRANSFORMERS_ICLR_CITATION_ID,
  LOOPED_TRANSFORMERS_REGISTRY_ID,
  LOOPED_TRANSFORMERS_ROUTE,
} from "@/lib/verify/looped-transformers-module-convergence";
import { validateColocatedPageBundle } from "./validate-registry";

const SLUG = "looped-transformers";
const TABLE_ID = "table.looped-transformers-comparison";
const PAGE_DIR = getDocsPageDir("modules", SLUG);
const messagesPath = join(PAGE_DIR, "messages/en.json");
const assetsPath = join(PAGE_DIR, "assets.json");
const PAGE_CONTRACT_TIMEOUT_MS = 15_000;

function extractHowItWorksSection(html: string): string {
  const match = html.match(
    /<section[^>]*\bid="how-it-works"[^>]*>[\s\S]*?<\/section>/i,
  );
  return match?.[0] ?? html;
}

/**
 * Routine page-bundle checks (frontmatter, messages, registryId, tags, assets)
 * are covered by `validateDerivedPublishedPageBundles` via `validateRegistryContent`.
 * These tests stay focused on graph/citation resolution, search and related-doc
 * wiring, convergence markers, and rendered shell contracts specific to the
 * looped transformers slice.
 */
describe("looped-transformers canonical page contract (looped-transformers-005)", () => {
  test(
    "canonical route, registry record, English messages, local assets, and citations resolve together",
    async () => {
      const route = localDocsRoute({ section: "modules", slug: SLUG });
      const [page, registry] = await Promise.all([
        loadLocalDocsPage({ section: "modules", slug: SLUG }),
        loadRegistry(),
      ]);
      const bundle = await validateColocatedPageBundle(PAGE_DIR, registry);
      const entry = getPublishedDocsEntryByRegistryId(
        LOOPED_TRANSFORMERS_REGISTRY_ID,
      );
      const record = registry.byId.get(LOOPED_TRANSFORMERS_REGISTRY_ID);
      const citation = getCitationById(LOOPED_TRANSFORMERS_ICLR_CITATION_ID);

      expect(route).toBe(LOOPED_TRANSFORMERS_ROUTE);
      expect(entry).toMatchObject({
        registryId: LOOPED_TRANSFORMERS_REGISTRY_ID,
        url: LOOPED_TRANSFORMERS_ROUTE,
      });
      expect(page.frontmatter.kind).toBe("module");
      expect(page.frontmatter.registryId).toBe(LOOPED_TRANSFORMERS_REGISTRY_ID);
      expect(page.frontmatter.messageNamespace).toBe("local");
      expect(page.frontmatter.assetNamespace).toBe("local");
      expect(page.frontmatter.status).toBe("published");
      expect(bundle.errors).toEqual([]);
      expect(bundle.messages?.title).toBe("Looped Transformers");
      expect(bundle.messages?.openingSummary).toContain("Looped transformers");
      expect(bundle.assets?.computeFlow).toBeDefined();
      expect(bundle.assets?.comparisonTable).toBeDefined();
      expect(record?.kind).toBe("module");
      expect(record?.slug).toBe(SLUG);
      expect(
        PUBLISHED_DOCS_REGISTRY_IDS.has(LOOPED_TRANSFORMERS_REGISTRY_ID),
      ).toBe(true);
      expect(citation?.url).toBe("https://arxiv.org/abs/2311.12424");
    },
    { timeout: PAGE_CONTRACT_TIMEOUT_MS },
  );

  test("page-local graph, table, caption, and citation references resolve for the bundle", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );
    const record = getModuleById(LOOPED_TRANSFORMERS_REGISTRY_ID);

    if (!record) {
      throw new Error(
        "expected module.looped-transformers in registry runtime",
      );
    }

    expect(assets.computeFlow).toMatchObject({
      type: "graph",
      graphId: LOOPED_TRANSFORMERS_GRAPH_ID,
    });
    expect(assets.comparisonTable).toMatchObject({
      type: "table",
      tableId: TABLE_ID,
    });
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
    expect(getGraphById(LOOPED_TRANSFORMERS_GRAPH_ID)?.subjectId).toBe(
      LOOPED_TRANSFORMERS_REGISTRY_ID,
    );
    expect(getTableById(TABLE_ID)?.subjectId).toBe(
      LOOPED_TRANSFORMERS_REGISTRY_ID,
    );
    expect(messages.assets?.computeFlow?.caption).toContain("loop-back");

    const citations = resolveCitations(record.citationIds);
    expect(citations.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([LOOPED_TRANSFORMERS_ICLR_CITATION_ID]),
    );
    expect(citations[0]?.url).toContain("arxiv.org");
  });

  test("live search routes looped transformers to the canonical module page", async () => {
    const results = await docsSearchApi.search("looped transformers");

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(LOOPED_TRANSFORMERS_ROUTE);
  });

  test("live search routes learning learning algorithms to the canonical module page", async () => {
    const results = await docsSearchApi.search("learning learning algorithms");

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(LOOPED_TRANSFORMERS_ROUTE);
  });

  test("curated related items expose transformer and attention nearby-doc hrefs", () => {
    const source = getModuleById(LOOPED_TRANSFORMERS_REGISTRY_ID);
    if (!source) {
      throw new Error(
        "expected module.looped-transformers in registry runtime",
      );
    }

    const relatedItems = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      relatedItems.find(
        (item) => item.registryId === "concept.transformer-architecture",
      )?.href,
    ).toBe("/docs/concepts/transformer-architecture");
    expect(
      relatedItems.find((item) => item.registryId === "module.attention")?.href,
    ).toBe("/docs/modules/attention");
    expect(
      relatedItems.find(
        (item) => item.registryId === "module.feed-forward-network",
      )?.href,
    ).toBe("/docs/modules/feed-forward-network");
  });

  test(
    "rendered docs shell meets module convergence markers for title, graph, math, tags, references, and related docs",
    async () => {
      const loadedPage = await loadLocalDocsPage({
        section: "modules",
        slug: SLUG,
      });
      const html = renderModuleDocsShell(loadedPage);

      expect(assertLoopedTransformersModuleConvergence(html)).toBeNull();
      expect(html).toContain("Input context token embeddings");
      expect(html).toContain('data-testid="folded-summary"');
      expect(html).not.toContain(
        "/docs/papers/looped-transformers-learning-learning-algorithms",
      );
    },
    { timeout: PAGE_CONTRACT_TIMEOUT_MS },
  );

  test(
    "how-it-works graph shell exposes visible, keyboard-safe, and responsive markers",
    async () => {
      const loadedPage = await loadLocalDocsPage({
        section: "modules",
        slug: SLUG,
      });
      const html = extractHowItWorksSection(renderModuleDocsShell(loadedPage));

      expect(assertLoopedTransformersSingleGraphConvergence(html)).toBeNull();
      expect(assertLoopedTransformersGraphThemeConvergence(html)).toBeNull();
      expect(
        assertLoopedTransformersGraphInteractionConvergence(html),
      ).toBeNull();
      expect(
        assertLoopedTransformersGraphAccessibilityConvergence(html),
      ).toBeNull();
      expect(assertLoopedTransformersResponsiveConvergence(html)).toBeNull();
      expect(html).toContain("Loop count L");
      expect(html).toContain("Updated hidden states");
    },
    { timeout: PAGE_CONTRACT_TIMEOUT_MS },
  );
});
