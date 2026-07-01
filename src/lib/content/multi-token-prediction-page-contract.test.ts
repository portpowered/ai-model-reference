import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
  closePlaywrightBrowserWithTimeout,
  launchPlaywrightBrowser,
} from "@/lib/verify/launch-playwright-browser";
import {
  assertMultiTokenPredictionModuleConvergence,
  MULTI_TOKEN_PREDICTION_CITATION_ID,
  MULTI_TOKEN_PREDICTION_REGISTRY_ID,
  MULTI_TOKEN_PREDICTION_ROUTE,
} from "@/lib/verify/multi-token-prediction-module-convergence";
import { RENDERED_QUALITY_VIEWPORTS } from "@/lib/verify/rendered-quality-baseline";
import { validateColocatedPageBundle } from "./validate-registry";

const MULTI_TOKEN_PREDICTION_SLUG = "multi-token-prediction";

const GRAPH_THEME_CSS_PATH = join(
  process.cwd(),
  "src/features/docs/styles/registry-graph-flow-theme.css",
);

type ViewportProbe = {
  graphVisible: boolean;
  variantTabsFocusable: boolean;
  overlappingNodePairs: number;
  graphFitsViewportWidth: boolean;
};

function extractHowItWorksSection(html: string): string {
  const match = html.match(
    /<section[^>]*\bid="how-it-works"[^>]*>[\s\S]*?<\/section>/i,
  );
  return match?.[0] ?? html;
}

function buildBrowserFixtureHtml(bodyHtml: string): string {
  const css = readFileSync(GRAPH_THEME_CSS_PATH, "utf8");
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { margin: 0; font-family: system-ui, sans-serif; }
      ${css}
    </style>
  </head>
  <body>${bodyHtml}</body>
</html>`;
}

async function probeRenderedGraphAtViewport(
  bodyHtml: string,
  viewport: { width: number; height: number },
): Promise<ViewportProbe> {
  const browser = await launchPlaywrightBrowser();
  const page = await browser.newPage({ viewport });
  try {
    await page.setContent(
      buildBrowserFixtureHtml(extractHowItWorksSection(bodyHtml)),
      {
        waitUntil: "domcontentloaded",
      },
    );

    return await page.evaluate((viewportWidth) => {
      const graph = document.querySelector('[data-react-flow-graph="true"]');
      const graphRect = graph?.getBoundingClientRect();
      const graphVisible = Boolean(
        graphRect && graphRect.width > 0 && graphRect.height > 0,
      );
      const graphFitsViewportWidth = Boolean(
        graphRect && graphRect.width <= viewportWidth,
      );

      const tabs = Array.from(
        document.querySelectorAll("[data-attention-variant-option]"),
      );
      const variantTabsFocusable = tabs.every((tab) => {
        if (!(tab instanceof HTMLElement)) {
          return false;
        }
        tab.focus();
        return document.activeElement === tab;
      });

      const nodeRects = Array.from(
        document.querySelectorAll("[data-graph-node-id]"),
      )
        .map((node) => node.getBoundingClientRect())
        .filter((rect) => rect.width > 0 && rect.height > 0);

      let overlappingNodePairs = 0;
      for (let index = 0; index < nodeRects.length; index += 1) {
        for (let inner = index + 1; inner < nodeRects.length; inner += 1) {
          const left = nodeRects[index];
          const right = nodeRects[inner];
          if (!left || !right) {
            continue;
          }

          const overlapWidth =
            Math.min(left.right, right.right) - Math.max(left.left, right.left);
          const overlapHeight =
            Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top);
          if (overlapWidth > 8 && overlapHeight > 8) {
            overlappingNodePairs += 1;
          }
        }
      }

      return {
        graphVisible,
        variantTabsFocusable,
        overlappingNodePairs,
        graphFitsViewportWidth,
      };
    }, viewport.width);
  } finally {
    await page.close().catch(() => {});
    await closePlaywrightBrowserWithTimeout(browser);
  }
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

  test.each([
    ...RENDERED_QUALITY_VIEWPORTS,
  ])("browser viewport $label keeps the graph visible, focusable, and non-overlapping", async (viewport) => {
    const loadedPage = await loadLocalDocsPage({
      section: "modules",
      slug: MULTI_TOKEN_PREDICTION_SLUG,
    });
    const probe = await probeRenderedGraphAtViewport(
      renderModuleDocsShell(loadedPage),
      { width: viewport.width, height: viewport.height },
    );

    expect(probe.graphVisible).toBe(true);
    expect(probe.variantTabsFocusable).toBe(true);
    expect(probe.graphFitsViewportWidth).toBe(true);
    if (viewport.id === "desktop") {
      expect(probe.overlappingNodePairs).toBe(0);
    }
  }, 60_000);
});
