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
  getModuleById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { getTableById } from "@/lib/content/table-registry-runtime";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";
import {
  closePlaywrightBrowserWithTimeout,
  launchPlaywrightBrowser,
} from "@/lib/verify/launch-playwright-browser";
import {
  assertMambaSelectiveStateSpaceGraphPresentationConvergence,
  assertMambaSelectiveStateSpaceGraphThemeConvergence,
  assertMambaSelectiveStateSpaceModuleConvergence,
  assertMambaSelectiveStateSpaceSingleGraphConvergence,
  MAMBA_SELECTIVE_STATE_SPACE_CITATION_ID,
  MAMBA_SELECTIVE_STATE_SPACE_GRAPH_ID,
  MAMBA_SELECTIVE_STATE_SPACE_REGISTRY_ID,
  MAMBA_SELECTIVE_STATE_SPACE_ROUTE,
  MAMBA_SELECTIVE_STATE_SPACE_TABLE_ID,
} from "@/lib/verify/mamba-selective-state-space-module-convergence";
import {
  acquireVerifyServerSession,
  shouldRunVerifyProductionIntegrationTests,
} from "@/lib/verify/server-lifecycle";
import { validateColocatedPageBundle } from "./validate-registry";

const SLUG = "mamba-selective-state-space";
const PAGE_DIR = getDocsPageDir("modules", SLUG);
const messagesPath = join(PAGE_DIR, "messages/en.json");
const assetsPath = join(PAGE_DIR, "assets.json");
const PAGE_CONTRACT_TIMEOUT_MS = 15_000;
const repoRoot = join(import.meta.dir, "../../..");

function extractHowItWorksSection(html: string): string {
  const match = html.match(
    /<section[^>]*\bid="how-it-works"[^>]*>[\s\S]*?<\/section>/i,
  );
  return match?.[0] ?? html;
}

/**
 * Routine page-bundle checks (frontmatter, messages, registryId, tags, assets)
 * are covered by `validateDerivedPublishedPageBundles` via `validateRegistryContent`.
 * These tests stay focused on graph/table/citation resolution, search and related-doc
 * wiring, convergence markers, and rendered shell contracts specific to the Mamba slice.
 */
describe("mamba selective state-space canonical page contract (MAMBA-005)", () => {
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
        MAMBA_SELECTIVE_STATE_SPACE_REGISTRY_ID,
      );
      const record = registry.byId.get(MAMBA_SELECTIVE_STATE_SPACE_REGISTRY_ID);

      expect(route).toBe(MAMBA_SELECTIVE_STATE_SPACE_ROUTE);
      expect(entry).toMatchObject({
        registryId: MAMBA_SELECTIVE_STATE_SPACE_REGISTRY_ID,
        url: MAMBA_SELECTIVE_STATE_SPACE_ROUTE,
      });
      expect(page.frontmatter.kind).toBe("module");
      expect(page.frontmatter.registryId).toBe(
        MAMBA_SELECTIVE_STATE_SPACE_REGISTRY_ID,
      );
      expect(page.frontmatter.messageNamespace).toBe("local");
      expect(page.frontmatter.assetNamespace).toBe("local");
      expect(page.frontmatter.status).toBe("published");
      expect(bundle.errors).toEqual([]);
      expect(bundle.messages?.title).toBe("Mamba Selective State-Space Module");
      expect(bundle.messages?.openingSummary).toContain("input-dependent");
      expect(bundle.assets?.computeFlow).toBeDefined();
      expect(bundle.assets?.comparisonTable).toBeDefined();
      expect(record?.kind).toBe("module");
      expect(record?.slug).toBe(SLUG);
      expect(
        PUBLISHED_DOCS_REGISTRY_IDS.has(
          MAMBA_SELECTIVE_STATE_SPACE_REGISTRY_ID,
        ),
      ).toBe(true);
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
    const record = getModuleById(MAMBA_SELECTIVE_STATE_SPACE_REGISTRY_ID);

    if (!record) {
      throw new Error(
        "expected module.mamba-selective-state-space in registry runtime",
      );
    }

    expect(assets.computeFlow.type).toBe("attention-variant-graph");
    if (assets.computeFlow.type === "attention-variant-graph") {
      expect(assets.computeFlow.captionKey).toBe("assets.computeFlow.caption");
      expect(
        assets.computeFlow.variants.map((variant) => variant.graphId),
      ).toEqual(
        expect.arrayContaining([
          "graph.multi-head-attention-time-pattern",
          MAMBA_SELECTIVE_STATE_SPACE_GRAPH_ID,
        ]),
      );
    }
    expect(assets.comparisonTable).toMatchObject({
      type: "table",
      tableId: MAMBA_SELECTIVE_STATE_SPACE_TABLE_ID,
    });
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
    expect(getGraphById(MAMBA_SELECTIVE_STATE_SPACE_GRAPH_ID)?.subjectId).toBe(
      MAMBA_SELECTIVE_STATE_SPACE_REGISTRY_ID,
    );
    expect(getTableById(MAMBA_SELECTIVE_STATE_SPACE_TABLE_ID)?.subjectId).toBe(
      MAMBA_SELECTIVE_STATE_SPACE_REGISTRY_ID,
    );
    expect(messages.assets?.computeFlow?.caption).toContain(
      "Dense attention compares the current query",
    );

    const citations = resolveCitations(record.citationIds);
    expect(citations).toHaveLength(1);
    expect(citations[0]?.id).toBe(MAMBA_SELECTIVE_STATE_SPACE_CITATION_ID);
    expect(citations[0]?.url).toBe("https://arxiv.org/abs/2312.00752");
  });

  test(
    "live search routes selective SSM queries to the canonical Mamba module page",
    async () => {
      const results = await docsSearchApi.search("selective SSM");

      expect(results.length).toBeGreaterThan(0);
      expect(pageBaseUrl(results[0]?.url ?? "")).toBe(
        MAMBA_SELECTIVE_STATE_SPACE_ROUTE,
      );
    },
    { timeout: PAGE_CONTRACT_TIMEOUT_MS },
  );

  test("curated related items expose attention, long-context, and hybrid-model nearby-doc hrefs", () => {
    const source = getModuleById(MAMBA_SELECTIVE_STATE_SPACE_REGISTRY_ID);
    if (!source) {
      throw new Error(
        "expected module.mamba-selective-state-space in registry runtime",
      );
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
      relatedItems.find((item) => item.registryId === "concept.context-window")
        ?.href,
    ).toBe("/docs/glossary/context-window");
    expect(
      relatedItems.find((item) => item.registryId === "model.nemotron-3-super")
        ?.href,
    ).toBe("/docs/models/nemotron-3-super");
  });

  test(
    "rendered docs shell meets module convergence markers for title, graph, math, tags, citations, and related docs",
    async () => {
      const loadedPage = await loadLocalDocsPage({
        section: "modules",
        slug: SLUG,
      });
      const html = renderModuleDocsShell(loadedPage);

      expect(assertMambaSelectiveStateSpaceModuleConvergence(html)).toBeNull();
      expect(html).toContain("walks the sequence in order");
      expect(html).toContain('data-testid="folded-summary"');
      expect(html).toContain('data-testid="citation-list"');
      expect(html).toContain('href="https://arxiv.org/abs/2312.00752"');
      expect(html).toContain('data-testid="curated-related-docs"');
      expect(html).toContain('href="/docs/models/nemotron-3-super"');
      expect(html).not.toContain("missing-content");
    },
    { timeout: PAGE_CONTRACT_TIMEOUT_MS },
  );

  test(
    "how-it-works graph shell exposes visible graph, legend, and selective update markers",
    async () => {
      const loadedPage = await loadLocalDocsPage({
        section: "modules",
        slug: SLUG,
      });
      const html = extractHowItWorksSection(renderModuleDocsShell(loadedPage));

      expect(
        assertMambaSelectiveStateSpaceSingleGraphConvergence(html),
      ).toBeNull();
      expect(
        assertMambaSelectiveStateSpaceGraphThemeConvergence(html),
      ).toBeNull();
      expect(
        assertMambaSelectiveStateSpaceGraphPresentationConvergence(html),
      ).toBeNull();
      expect(html).toContain("Sequence mixing over time");
      expect(html).toContain("Input-dependent update path");
    },
    { timeout: PAGE_CONTRACT_TIMEOUT_MS },
  );

  test("served module page renders docs shell, graph, math, tags, citations, and related docs on desktop and mobile", async () => {
    if (!shouldRunVerifyProductionIntegrationTests(repoRoot)) {
      return;
    }

    const session = await acquireVerifyServerSession({ projectRoot: repoRoot });
    const browser = await launchPlaywrightBrowser();

    try {
      for (const viewport of [
        { width: 1280, height: 800 },
        { width: 375, height: 667 },
      ]) {
        const page = await browser.newPage({ viewport });
        page.setDefaultTimeout(30_000);
        await page.goto(
          `${session.baseUrl}${MAMBA_SELECTIVE_STATE_SPACE_ROUTE}`,
          {
            waitUntil: "load",
          },
        );

        await page
          .getByRole("heading", {
            name: "Mamba Selective State-Space Module",
            exact: true,
          })
          .waitFor({ state: "visible" });

        const graph = page.locator('[data-react-flow-graph="true"]');
        await graph.waitFor({ state: "visible" });
        expect(await graph.getAttribute("data-graph-id")).toBe(
          MAMBA_SELECTIVE_STATE_SPACE_GRAPH_ID,
        );

        await page
          .locator('[data-testid="tag-pill-list"]')
          .first()
          .waitFor({ state: "visible" });
        await page
          .locator('[data-testid="citation-list"]')
          .first()
          .waitFor({ state: "visible" });
        await page
          .locator('[data-testid="curated-related-docs"]')
          .first()
          .waitFor({ state: "visible" });
        await page
          .locator('[data-message-block-math="math.ssmSchema.formula"]')
          .first()
          .waitFor({ state: "visible" });

        const bodyText = await page.locator("article").innerText();
        expect(bodyText).not.toContain("missing message");
        expect(bodyText).not.toContain("missing asset");
        expect(bodyText).not.toContain("Draft placeholder");

        await page.close();
      }
    } finally {
      await closePlaywrightBrowserWithTimeout(browser);
      await session.cleanup();
    }
  }, 120_000);
});
