import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PageAsset } from "@/features/docs/components/PageAsset";
import { PageAssetsProvider } from "@/features/docs/components/page-assets-context";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import assetFixture from "@/lib/content/__fixtures__/page-assets.json";
import messageFixture from "@/lib/content/__fixtures__/page-messages.json";
import type { PageAssetConfig, PageMessages } from "@/lib/content/schemas";

const assets = assetFixture as PageAssetConfig;
const messages = messageFixture as PageMessages;

function renderPageAsset(assetId: string, isDev: boolean) {
  return renderToStaticMarkup(
    <PageMessagesProvider messages={messages} isDev={isDev}>
      <PageAssetsProvider assets={assets} isDev={isDev}>
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

  test("shows a developer-visible error for a missing asset ID", () => {
    const html = renderPageAsset("missingAsset", true);
    expect(html).toContain('data-missing-asset-id="missingAsset"');
    expect(html).toContain("Missing asset ID: missingAsset");
  });

  test("renders nothing outside development for a missing asset ID", () => {
    const html = renderPageAsset("missingAsset", false);
    expect(html).toBe("");
  });
});
