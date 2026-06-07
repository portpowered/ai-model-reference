import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PageAssetsProvider } from "@/features/docs/components/page-assets-context";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import { RegistryGraphFlow } from "@/features/models/components/RegistryGraphFlow";
import {
  REGISTRY_GRAPH_FLOW_INTERACTION,
  REGISTRY_GRAPH_FLOW_MANUAL_VISIBILITY_EVIDENCE,
  REGISTRY_GRAPH_FLOW_MANUAL_VISIBILITY_SELECTORS,
  REGISTRY_GRAPH_FLOW_NODE_THEME,
} from "@/features/models/components/registry-graph-flow-theme";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import { expectModuleComputeFlowGraphTheme } from "@/lib/content/module-test-helpers";
import type { PageAssetConfig, PageMessages } from "@/lib/content/schemas";
import {
  assertGroupedQueryAttentionGraphBuildMarkersConvergence,
  assertGroupedQueryAttentionGraphThemeConvergence,
} from "@/lib/verify/grouped-query-attention-module-convergence";

const GQA_COMPUTE_FLOW_GRAPH_ID =
  "graph.grouped-query-attention-compute-flow" as const;

const messages = {
  title: "Grouped-Query Attention",
  description: "GQA module page",
  assets: {
    computeFlow: {
      alt: "Grouped-query attention compute flow",
      caption: "Query groups route to shared KV heads during attention",
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
    },
  },
} satisfies PageMessages;

const assets = {
  computeFlow: {
    type: "graph",
    graphId: GQA_COMPUTE_FLOW_GRAPH_ID,
    webRenderer: "react-flow",
    printRenderer: "mermaid",
    altKey: "assets.computeFlow.alt",
    captionKey: "assets.computeFlow.caption",
  },
} satisfies PageAssetConfig;

describe("grouped-query-attention module graph theme", () => {
  test("registry graph flow theme exports stable manual visibility selectors", () => {
    expect(REGISTRY_GRAPH_FLOW_NODE_THEME.nodeColor).toBe(
      "var(--card-foreground)",
    );
    expect(REGISTRY_GRAPH_FLOW_NODE_THEME.nodeBackgroundColor).toBe(
      "var(--card)",
    );
    expect(REGISTRY_GRAPH_FLOW_MANUAL_VISIBILITY_EVIDENCE).toBe(
      "registry-graph-flow-node-contrast",
    );
    expect(
      REGISTRY_GRAPH_FLOW_MANUAL_VISIBILITY_SELECTORS.graphWrapper,
    ).toContain(GQA_COMPUTE_FLOW_GRAPH_ID);
    expect(
      REGISTRY_GRAPH_FLOW_MANUAL_VISIBILITY_SELECTORS.themedWrapper,
    ).toContain(REGISTRY_GRAPH_FLOW_MANUAL_VISIBILITY_EVIDENCE);
    expect(
      REGISTRY_GRAPH_FLOW_MANUAL_VISIBILITY_SELECTORS.nodeLabels,
    ).toContain("registry-graph-flow");
    expect(REGISTRY_GRAPH_FLOW_INTERACTION.panOnDrag).toBe(true);
    expect(REGISTRY_GRAPH_FLOW_INTERACTION.zoomOnScroll).toBe(true);
    expect(REGISTRY_GRAPH_FLOW_INTERACTION.zoomOnPinch).toBe(true);
    expect(REGISTRY_GRAPH_FLOW_INTERACTION.nodesDraggable).toBe(false);
  });

  test("RegistryGraphFlow renders themed compute-flow wrapper with manual visibility hook", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={messages} isDev={false}>
        <PageAssetsProvider assets={assets} isDev={false}>
          <RegistryGraphFlow
            assetId="computeFlow"
            graphId={GQA_COMPUTE_FLOW_GRAPH_ID}
            alt={messages.assets?.computeFlow?.alt}
            caption={messages.assets?.computeFlow?.caption}
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toContain(`data-graph-id="${GQA_COMPUTE_FLOW_GRAPH_ID}"`);
    expect(html).toContain("--xy-node-color:var(--card-foreground)");
    expect(html).toContain("--xy-node-background-color:var(--card)");
    expect(html).toContain(
      'data-manual-visibility-evidence="registry-graph-flow-node-contrast"',
    );
    expect(html).toContain('data-graph-interaction-pan="true"');
    expect(html).toContain('data-graph-interaction-zoom="true"');
    expect(html).toContain('data-graph-interaction-editing="false"');
    expect(html).toContain('class="registry-graph-flow');
    expect(html).toContain("Hidden states");
    expect(html).toContain("G query groups");
  });

  test("/docs/modules/grouped-query-attention renders themed compute-flow graph under How It Works", async () => {
    const loadedPage = await loadLocalDocsPage({
      section: "modules",
      slug: "grouped-query-attention",
    });

    const html = renderModuleDocsShell(loadedPage);

    expectModuleComputeFlowGraphTheme(html, GQA_COMPUTE_FLOW_GRAPH_ID);
    expect(assertGroupedQueryAttentionGraphThemeConvergence(html)).toBeNull();
    expect(
      assertGroupedQueryAttentionGraphBuildMarkersConvergence(html),
    ).toBeNull();
  });
});
