import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PageAssetsProvider } from "@/features/docs/components/page-assets-context";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import { RegistryGraphFlow } from "@/features/models/components/RegistryGraphFlow";
import type { PageAssetConfig, PageMessages } from "@/lib/content/schemas";

const messages = {
  title: "Grouped-Query Attention",
  description: "GQA module page",
  assets: {
    computeFlow: {
      alt: "Grouped-query attention compute flow",
      caption: "Query groups route to shared KV heads during attention",
    },
    computeSchema: {
      alt: "Grouped-query attention tensor grouping",
      caption: "H query heads map to G shared KV groups",
    },
  },
  graph: {
    nodes: {
      hiddenStates: { label: "Hidden states" },
      queryProjection: { label: "H query heads (Q projection)" },
      queryGroups: { label: "G query groups" },
      sharedKv: { label: "Shared KV heads per group" },
      attentionScores: { label: "Attention scores per query head" },
      outputProjection: { label: "Output projection" },
      queryHeads: { label: "H query heads" },
      queryGroupsSchema: { label: "G groups (H/G query heads each)" },
      sharedKeyHeads: { label: "G shared key heads" },
      sharedValueHeads: { label: "G shared value heads" },
      kvCache: { label: "KV cache (G keys + G values per token)" },
    },
  },
} satisfies PageMessages;

const assets = {
  computeFlow: {
    type: "graph",
    graphId: "graph.grouped-query-attention-compute-flow",
    webRenderer: "react-flow",
    printRenderer: "mermaid",
    altKey: "assets.computeFlow.alt",
    captionKey: "assets.computeFlow.caption",
  },
} satisfies PageAssetConfig;

describe("RegistryGraphFlow", () => {
  test("renders react-flow graph markers for the GQA compute-flow fixture", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={messages} isDev={false}>
        <PageAssetsProvider assets={assets} isDev={false}>
          <RegistryGraphFlow
            assetId="computeFlow"
            graphId="graph.grouped-query-attention-compute-flow"
            alt={messages.assets?.computeFlow?.alt}
            caption={messages.assets?.computeFlow?.caption}
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toContain('data-page-asset="computeFlow"');
    expect(html).toContain(
      'data-graph-id="graph.grouped-query-attention-compute-flow"',
    );
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain('data-web-renderer="react-flow"');
    expect(html).toContain("--xy-node-color:var(--card-foreground)");
    expect(html).toContain("--xy-node-background-color:var(--card)");
    expect(html).toContain('aria-label="Grouped-query attention compute flow"');
    expect(html).toContain('data-graph-node-id="hidden-states"');
    expect(html).toContain('data-graph-node-id="query-groups"');
    expect(html).toContain('data-graph-node-id="shared-kv"');
    expect(html).toContain('data-graph-node-count="6"');
    expect(html).toContain("Hidden states");
    expect(html).toContain("G query groups");
    expect(html).toContain(
      "Query groups route to shared KV heads during attention",
    );
    expect(html).not.toContain(">graph.grouped-query-attention-compute-flow<");
  });

  test("renders react-flow graph markers for the GQA compute-schema fixture", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={messages} isDev={false}>
        <PageAssetsProvider assets={assets} isDev={false}>
          <RegistryGraphFlow
            assetId="computeSchema"
            graphId="graph.grouped-query-attention-compute-schema"
            alt={messages.assets?.computeSchema?.alt}
            caption={messages.assets?.computeSchema?.caption}
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toContain('data-page-asset="computeSchema"');
    expect(html).toContain(
      'data-graph-id="graph.grouped-query-attention-compute-schema"',
    );
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain('data-web-renderer="react-flow"');
    expect(html).toContain(
      'aria-label="Grouped-query attention tensor grouping"',
    );
    expect(html).toContain('data-graph-node-id="query-heads"');
    expect(html).toContain('data-graph-node-id="kv-cache"');
    expect(html).toContain('data-graph-node-count="5"');
    expect(html).toContain("H query heads");
    expect(html).toContain("KV cache (G keys + G values per token)");
    expect(html).toContain("H query heads map to G shared KV groups");
    expect(html).not.toContain(
      ">graph.grouped-query-attention-compute-schema<",
    );
  });

  test("renders a missing graph record marker when graphId is unknown", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={messages} isDev={false}>
        <PageAssetsProvider assets={assets} isDev={false}>
          <RegistryGraphFlow
            assetId="computeFlow"
            graphId="graph.missing-fixture"
            alt="Missing graph"
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toContain('data-missing-graph-id="graph.missing-fixture"');
    expect(html).toContain("Missing graph record: graph.missing-fixture");
  });
});
