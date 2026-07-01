import { describe, expect, test } from "bun:test";
import { MULTI_TOKEN_PREDICTION_PAGE_DIR } from "@/lib/content/content-paths";
import {
  loadLocalDocsPage,
  localDocsRoute,
} from "@/lib/content/local-docs-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import { getCitationById } from "@/lib/content/registry-runtime";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";
import {
  assertMultiTokenPredictionGraphAccessibilityConvergence,
  assertMultiTokenPredictionGraphComparisonConvergence,
  assertMultiTokenPredictionGraphInteractionConvergence,
  assertMultiTokenPredictionGraphThemeConvergence,
  assertMultiTokenPredictionModuleConvergence,
  assertMultiTokenPredictionSingleGraphConvergence,
  MULTI_TOKEN_PREDICTION_CITATION_ID,
  MULTI_TOKEN_PREDICTION_REGISTRY_ID,
  MULTI_TOKEN_PREDICTION_ROUTE,
} from "@/lib/verify/multi-token-prediction-module-convergence";
import { validateColocatedPageBundle } from "./validate-registry";

const MULTI_TOKEN_PREDICTION_SLUG = "multi-token-prediction";

function extractHowItWorksSection(html: string): string {
  const match = html.match(
    /<section[^>]*\bid="how-it-works"[^>]*>[\s\S]*?<\/section>/i,
  );
  return match?.[0] ?? html;
}

describe("multi-token-prediction canonical page contract (multi-token-prediction-005)", () => {
  test("canonical route, registry record, messages, assets, and citation resolve together", async () => {
    const route = localDocsRoute({
      section: "modules",
      slug: MULTI_TOKEN_PREDICTION_SLUG,
    });
    const page = await loadLocalDocsPage({
      section: "modules",
      slug: MULTI_TOKEN_PREDICTION_SLUG,
    });
    const registry = await loadRegistry();
    const bundle = await validateColocatedPageBundle(
      MULTI_TOKEN_PREDICTION_PAGE_DIR,
      registry,
    );
    const record = registry.byId.get(MULTI_TOKEN_PREDICTION_REGISTRY_ID);
    const citation = getCitationById(MULTI_TOKEN_PREDICTION_CITATION_ID);

    expect(route).toBe(MULTI_TOKEN_PREDICTION_ROUTE);
    expect(page.frontmatter.kind).toBe("module");
    expect(page.frontmatter.registryId).toBe(
      MULTI_TOKEN_PREDICTION_REGISTRY_ID,
    );
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.frontmatter.status).toBe("published");
    expect(bundle.errors).toEqual([]);
    expect(bundle.messages?.title).toBe("Multi-Token Prediction");
    expect(bundle.messages?.openingSummary?.length).toBeGreaterThan(0);
    expect(bundle.assets?.computeFlow).toBeDefined();
    expect(bundle.assets?.comparisonTable).toBeDefined();

    expect(record?.kind).toBe("module");
    expect(record?.slug).toBe(MULTI_TOKEN_PREDICTION_SLUG);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has(MULTI_TOKEN_PREDICTION_REGISTRY_ID),
    ).toBe(true);
    expect(citation?.url).toBe("https://arxiv.org/abs/2404.19737");
    expect(citation?.aliases).toEqual(expect.arrayContaining(["2404.19737"]));
  });

  test("MTP alias search routes to the canonical multi-token prediction page", async () => {
    const results = await docsSearchApi.search("MTP");

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(
      MULTI_TOKEN_PREDICTION_ROUTE,
    );
  });

  test("rendered docs shell meets module convergence markers", async () => {
    const loadedPage = await loadLocalDocsPage({
      section: "modules",
      slug: MULTI_TOKEN_PREDICTION_SLUG,
    });
    const html = renderModuleDocsShell(loadedPage);

    expect(assertMultiTokenPredictionModuleConvergence(html)).toBeNull();
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain('href="/docs/training/pretraining"');
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
  });

  test("how-it-works graph shell exposes visible, keyboard-safe, and responsive markers", async () => {
    const loadedPage = await loadLocalDocsPage({
      section: "modules",
      slug: MULTI_TOKEN_PREDICTION_SLUG,
    });
    const html = extractHowItWorksSection(renderModuleDocsShell(loadedPage));

    expect(assertMultiTokenPredictionSingleGraphConvergence(html)).toBeNull();
    expect(assertMultiTokenPredictionGraphThemeConvergence(html)).toBeNull();
    expect(assertMultiTokenPredictionGraphInteractionConvergence(html)).toBeNull();
    expect(assertMultiTokenPredictionGraphAccessibilityConvergence(html)).toBeNull();
    expect(assertMultiTokenPredictionGraphComparisonConvergence(html)).toBeNull();
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('focus-visible:outline-ring');
    expect(html).toContain("registry-graph-flow w-full min-w-0");
    expect(html).toContain("registry-graph-flow__viewport");
    expect(html).toContain("max-w-full overflow-hidden");
  });
});
