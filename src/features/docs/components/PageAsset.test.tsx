import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { PageAsset } from "@/features/docs/components/PageAsset";
import { PageAssetsProvider } from "@/features/docs/components/page-assets-context";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import assetFixture from "@/lib/content/__fixtures__/page-assets.json";
import messageFixture from "@/lib/content/__fixtures__/page-messages.json";
import { parsePageAssetConfig } from "@/lib/content/assets";
import { GROUPED_QUERY_ATTENTION_PAGE_DIR } from "@/lib/content/content-paths";
import type { PageAssetConfig, PageMessages } from "@/lib/content/schemas";
import { pageMessagesSchema } from "@/lib/content/schemas";

const assets = assetFixture as PageAssetConfig;
const messages = messageFixture as PageMessages;

const gqaMessages = pageMessagesSchema.parse(
  JSON.parse(
    readFileSync(
      join(GROUPED_QUERY_ATTENTION_PAGE_DIR, "messages/en.json"),
      "utf8",
    ),
  ),
);

const gqaAssets = parsePageAssetConfig(
  JSON.parse(
    readFileSync(join(GROUPED_QUERY_ATTENTION_PAGE_DIR, "assets.json"), "utf8"),
  ),
);

function renderPageAsset(
  assetId: string,
  isDev: boolean,
  assetConfig: PageAssetConfig = assets,
  pageMessages: PageMessages = messages,
) {
  return renderToStaticMarkup(
    <PageMessagesProvider messages={pageMessages} isDev={isDev}>
      <PageAssetsProvider assets={assetConfig} isDev={isDev}>
        <PageAsset assetId={assetId} />
      </PageAssetsProvider>
    </PageMessagesProvider>,
  );
}

describe("PageAsset", () => {
  test("renders a visible image asset with alt text and caption", () => {
    const html = renderPageAsset("hero", false);
    expect(html).toContain('data-page-asset="hero"');
    expect(html).toContain('src="./assets/gqa-hero.png"');
    expect(html).toContain(
      "Diagram comparing multi-head attention and grouped-query attention head grouping.",
    );
    expect(html).toContain(
      "Query heads share fewer key-value heads in grouped-query attention.",
    );
  });

  test("renders a react-flow graph asset with graph id, markers, and caption", () => {
    const html = renderPageAsset("computeFlow", false);
    expect(html).toContain('data-page-asset="computeFlow"');
    expect(html).toContain(
      'data-graph-id="graph.grouped-query-attention-compute-flow"',
    );
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain('data-web-renderer="react-flow"');
    expect(html).toContain(
      "GQA compute flow from queries through shared KV heads.",
    );
    expect(html).not.toContain(">graph.grouped-query-attention-compute-flow<");
  });

  test("renders GQA computeFlow via RegistryGraphFlow with real assets and messages", () => {
    const html = renderPageAsset("computeFlow", false, gqaAssets, gqaMessages);
    expect(html).toContain('data-page-asset="computeFlow"');
    expect(html).toContain(
      'data-graph-id="graph.grouped-query-attention-compute-flow"',
    );
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain('data-web-renderer="react-flow"');
    expect(html).toContain('data-graph-node-id="hidden-states"');
    expect(html).toContain('data-graph-node-count="6"');
    expect(html).toContain(
      "Query groups route to shared KV heads during attention",
    );
    expect(html).not.toContain(">graph.grouped-query-attention-compute-flow<");
  });

  test("renders GQA computeSchema via RegistryGraphFlow with real assets and messages", () => {
    const html = renderPageAsset(
      "computeSchema",
      false,
      gqaAssets,
      gqaMessages,
    );
    expect(html).toContain('data-page-asset="computeSchema"');
    expect(html).toContain(
      'data-graph-id="graph.grouped-query-attention-compute-schema"',
    );
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain('data-web-renderer="react-flow"');
    expect(html).toContain('data-graph-node-id="query-heads"');
    expect(html).toContain('data-graph-node-id="kv-cache"');
    expect(html).toContain('data-graph-node-count="5"');
    expect(html).toContain("H query heads map to G shared KV groups");
    expect(html).not.toContain(
      ">graph.grouped-query-attention-compute-schema<",
    );
  });

  test("renders a registry-backed comparison table asset", () => {
    const html = renderPageAsset(
      "comparisonTable",
      false,
      gqaAssets,
      gqaMessages,
    );
    expect(html).toContain('data-page-asset="comparisonTable"');
    expect(html).toContain('data-registry-comparison-table="true"');
    expect(html).not.toContain(">table.grouped-query-attention-comparison<");
  });

  test("renders chart and code-schema structured asset placeholders", () => {
    const chartHtml = renderPageAsset("trainingChart", false);
    expect(chartHtml).toContain('data-page-asset="trainingChart"');
    expect(chartHtml).toContain('data-asset-type="chart"');
    expect(chartHtml).toContain(
      'data-asset-reference-id="chart.gqa-training-cost"',
    );
    expect(chartHtml).toContain(
      "Training cost trend for grouped-query attention.",
    );

    const schemaHtml = renderPageAsset("codeSchema", false);
    expect(schemaHtml).toContain('data-page-asset="codeSchema"');
    expect(schemaHtml).toContain('data-asset-type="code-schema"');
    expect(schemaHtml).toContain(
      'data-asset-reference-id="schema.gqa-forward-pass"',
    );
  });

  test("renders non-react-flow graph fallback markup when webRenderer is not react-flow", () => {
    const legacyAssets = {
      ...assets,
      legacyGraph: {
        ...assets.legacyGraph,
        type: "graph" as const,
        graphId: "graph.legacy-stub",
        webRenderer: "static-svg" as "react-flow",
        printRenderer: "mermaid" as const,
      },
    };

    const html = renderPageAsset("legacyGraph", false, legacyAssets);
    expect(html).toContain('data-page-asset="legacyGraph"');
    expect(html).toContain('data-graph-id="graph.legacy-stub"');
    expect(html).toContain('data-web-renderer="static-svg"');
    expect(html).toContain('aria-label="Legacy graph placeholder alt text."');
    expect(html).not.toContain('data-react-flow-graph="true"');
  });

  test("shows a developer-visible error for a missing asset ID", () => {
    const html = renderPageAsset("missingAsset", true);
    expect(html).toContain('data-missing-asset-id="missingAsset"');
    expect(html).toContain("Missing asset ID: missingAsset");
  });

  test("renders nothing outside development for a missing asset ID", () => {
    const html = renderPageAsset("missingAsset", false);
    expect(html).toBe("");
  });

  test("shows a developer-visible error for a missing image alt key", () => {
    const brokenMessages = {
      ...messages,
      assets: {
        hero: {
          caption: messages.assets?.hero?.caption ?? "",
        },
      },
    };

    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={brokenMessages} isDev>
        <PageAssetsProvider assets={assets} isDev>
          <PageAsset assetId="hero" />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toContain('data-missing-message-key="assets.hero.alt"');
  });

  test("renders nothing outside development for a missing image alt key", () => {
    const brokenMessages = {
      ...messages,
      assets: {
        hero: {
          caption: messages.assets?.hero?.caption ?? "",
        },
      },
    };

    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={brokenMessages} isDev={false}>
        <PageAssetsProvider assets={assets} isDev={false}>
          <PageAsset assetId="hero" />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toBe("");
  });
});
