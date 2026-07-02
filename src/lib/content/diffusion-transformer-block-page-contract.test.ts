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
  assertDiffusionTransformerBlockGraphAccessibilityConvergence,
  assertDiffusionTransformerBlockGraphInteractionConvergence,
  assertDiffusionTransformerBlockGraphThemeConvergence,
  assertDiffusionTransformerBlockModuleConvergence,
  assertDiffusionTransformerBlockResponsiveConvergence,
  assertDiffusionTransformerBlockSingleGraphConvergence,
  DIFFUSION_TRANSFORMER_BLOCK_DIT_CITATION_ID,
  DIFFUSION_TRANSFORMER_BLOCK_GRAPH_ID,
  DIFFUSION_TRANSFORMER_BLOCK_REGISTRY_ID,
  DIFFUSION_TRANSFORMER_BLOCK_ROUTE,
} from "@/lib/verify/diffusion-transformer-block-module-convergence";
import { validateColocatedPageBundle } from "./validate-registry";

const SLUG = "diffusion-transformer-block";
const TABLE_ID = "table.diffusion-transformer-block-comparison";
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
 * diffusion transformer block slice.
 */
describe("diffusion-transformer-block canonical page contract (diffusion-transformer-block-module-005)", () => {
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
        DIFFUSION_TRANSFORMER_BLOCK_REGISTRY_ID,
      );
      const record = registry.byId.get(DIFFUSION_TRANSFORMER_BLOCK_REGISTRY_ID);
      const citation = getCitationById(
        DIFFUSION_TRANSFORMER_BLOCK_DIT_CITATION_ID,
      );

      expect(route).toBe(DIFFUSION_TRANSFORMER_BLOCK_ROUTE);
      expect(entry).toMatchObject({
        registryId: DIFFUSION_TRANSFORMER_BLOCK_REGISTRY_ID,
        url: DIFFUSION_TRANSFORMER_BLOCK_ROUTE,
      });
      expect(page.frontmatter.kind).toBe("module");
      expect(page.frontmatter.registryId).toBe(
        DIFFUSION_TRANSFORMER_BLOCK_REGISTRY_ID,
      );
      expect(page.frontmatter.messageNamespace).toBe("local");
      expect(page.frontmatter.assetNamespace).toBe("local");
      expect(page.frontmatter.status).toBe("published");
      expect(bundle.errors).toEqual([]);
      expect(bundle.messages?.title).toBe("Diffusion Transformer Block");
      expect(bundle.messages?.openingSummary).toContain(
        "Diffusion Transformer",
      );
      expect(bundle.assets?.computeFlow).toBeDefined();
      expect(bundle.assets?.comparisonTable).toBeDefined();
      expect(record?.kind).toBe("module");
      expect(record?.slug).toBe(SLUG);
      expect(
        PUBLISHED_DOCS_REGISTRY_IDS.has(
          DIFFUSION_TRANSFORMER_BLOCK_REGISTRY_ID,
        ),
      ).toBe(true);
      expect(citation?.url).toBe("https://arxiv.org/abs/2212.09748");
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
    const record = getModuleById(DIFFUSION_TRANSFORMER_BLOCK_REGISTRY_ID);

    if (!record) {
      throw new Error(
        "expected module.diffusion-transformer-block in registry runtime",
      );
    }

    expect(assets.computeFlow).toMatchObject({
      type: "graph",
      graphId: DIFFUSION_TRANSFORMER_BLOCK_GRAPH_ID,
    });
    expect(assets.comparisonTable).toMatchObject({
      type: "table",
      tableId: TABLE_ID,
    });
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
    expect(getGraphById(DIFFUSION_TRANSFORMER_BLOCK_GRAPH_ID)?.subjectId).toBe(
      DIFFUSION_TRANSFORMER_BLOCK_REGISTRY_ID,
    );
    expect(getTableById(TABLE_ID)?.subjectId).toBe(
      DIFFUSION_TRANSFORMER_BLOCK_REGISTRY_ID,
    );
    expect(messages.assets?.computeFlow?.caption).toContain(
      "timestep and optional conditioning",
    );

    const citations = resolveCitations(record.citationIds);
    expect(citations.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([
        DIFFUSION_TRANSFORMER_BLOCK_DIT_CITATION_ID,
        "citation.denoising-diffusion-probabilistic-models",
      ]),
    );
    expect(citations[0]?.url).toContain("arxiv.org");
  });

  test("live search routes DiT block to the canonical diffusion transformer block page", async () => {
    const results = await docsSearchApi.search("DiT block");

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(
      DIFFUSION_TRANSFORMER_BLOCK_ROUTE,
    );
  });

  test("curated related items expose diffusion and transformer nearby-doc hrefs", () => {
    const source = getModuleById(DIFFUSION_TRANSFORMER_BLOCK_REGISTRY_ID);
    if (!source) {
      throw new Error(
        "expected module.diffusion-transformer-block in registry runtime",
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
        (item) => item.registryId === "concept.denoising-generation",
      )?.href,
    ).toBe("/docs/glossary/denoising-generation");
    expect(
      relatedItems.find(
        (item) =>
          item.registryId === "training-regime.diffusion-training-objective",
      )?.href,
    ).toBe("/docs/training/diffusion-training-objective");
  });

  test(
    "rendered docs shell meets module convergence markers for title, graph, math, tags, references, and related docs",
    async () => {
      const loadedPage = await loadLocalDocsPage({
        section: "modules",
        slug: SLUG,
      });
      const html = renderModuleDocsShell(loadedPage);

      expect(assertDiffusionTransformerBlockModuleConvergence(html)).toBeNull();
      expect(html).toContain("noisy image patches");
      expect(html).toContain('data-testid="folded-summary"');
      expect(html).toContain('href="/docs/papers/latent-diffusion"');
      expect(html).not.toContain("/docs/papers/diffusion-transformers");
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

      expect(
        assertDiffusionTransformerBlockSingleGraphConvergence(html),
      ).toBeNull();
      expect(
        assertDiffusionTransformerBlockGraphThemeConvergence(html),
      ).toBeNull();
      expect(
        assertDiffusionTransformerBlockGraphInteractionConvergence(html),
      ).toBeNull();
      expect(
        assertDiffusionTransformerBlockGraphAccessibilityConvergence(html),
      ).toBeNull();
      expect(
        assertDiffusionTransformerBlockResponsiveConvergence(html),
      ).toBeNull();
      expect(html).toContain("Timestep embedding c_t");
      expect(html).toContain("Optional class or text conditioning c");
    },
    { timeout: PAGE_CONTRACT_TIMEOUT_MS },
  );
});
