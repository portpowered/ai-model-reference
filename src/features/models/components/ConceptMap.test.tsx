import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PageAssetsProvider } from "@/features/docs/components/page-assets-context";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import { ConceptMap } from "@/features/models/components/ConceptMap";
import type { PageAssetConfig, PageMessages } from "@/lib/content/schemas";

const messages = {
  title: "Token",
  description: "Token glossary page.",
  assets: {
    conceptMap: {
      title: "Token flow concept map",
      alt: "Diagram showing text flowing through a tokenizer into token IDs and embeddings",
      caption: "How raw text becomes token IDs before the transformer stack",
      legend: {
        "data-flow": {
          label: "Token computation path",
        },
      },
    },
  },
} satisfies PageMessages;

const assets = {
  conceptMap: {
    type: "graph",
    graphId: "graph.token-concept-map",
    webRenderer: "react-flow",
    printRenderer: "mermaid",
    altKey: "assets.conceptMap.alt",
    captionKey: "assets.conceptMap.caption",
  },
} satisfies PageAssetConfig;

describe("ConceptMap", () => {
  test("renders the concept map graph asset with message-backed title, legend, alt, and caption", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={messages} isDev={false}>
        <PageAssetsProvider assets={assets} isDev={false}>
          <ConceptMap registryId="concept.token" assetId="conceptMap" />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toContain('data-graph-id="graph.token-concept-map"');
    expect(html).toContain('data-graph-title="graph.token-concept-map"');
    expect(html).toContain("Token flow concept map");
    expect(html).toContain('data-graph-legend="graph.token-concept-map"');
    expect(html).toContain("Token computation path");
    expect(html).toContain(
      "Diagram showing text flowing through a tokenizer into token IDs and embeddings",
    );
    expect(html).toContain(
      "How raw text becomes token IDs before the transformer stack",
    );
  });
});
