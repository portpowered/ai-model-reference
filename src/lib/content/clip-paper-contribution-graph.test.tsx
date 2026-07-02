import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { PageAssetsProvider } from "@/features/docs/components/page-assets-context";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import { RegistryGraphFlow } from "@/features/models/components/RegistryGraphFlow";
import { buildRegistryFlowGraph } from "@/lib/content/graph-flow";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import type { PageAssetConfig } from "@/lib/content/schemas";
import { pageMessagesSchema } from "@/lib/content/schemas";

const GRAPH_ID =
  "graph.learning-transferable-visual-models-from-natural-language-supervision-contribution";
const PAPER_PAGE_DIR =
  "src/content/docs/papers/learning-transferable-visual-models-from-natural-language-supervision";

const clipMessages = pageMessagesSchema.parse(
  JSON.parse(readFileSync(join(PAPER_PAGE_DIR, "messages/en.json"), "utf8")),
);

const clipAssets = JSON.parse(
  readFileSync(join(PAPER_PAGE_DIR, "assets.json"), "utf8"),
) as PageAssetConfig;

const expectedFlowLabels = [
  "CLIP paper",
  "Image-caption pairs",
  "Image and text encoders",
  "Contrastive alignment",
  "Shared embedding space",
  "Multimodal and conditioning use",
];

function renderContributionGraph() {
  return render(
    <PageMessagesProvider messages={clipMessages} isDev={false}>
      <PageAssetsProvider assets={clipAssets} isDev={false}>
        <RegistryGraphFlow
          assetId="contributionGraph"
          graphId={GRAPH_ID}
          alt={clipMessages.assets?.contributionGraph?.alt}
          caption={clipMessages.assets?.contributionGraph?.caption}
        />
      </PageAssetsProvider>
    </PageMessagesProvider>,
  );
}

describe("CLIP paper contribution graph", () => {
  afterEach(() => {
    cleanup();
  });

  test("assets.json wires the local contribution graph with localized alt and caption keys", () => {
    const asset = clipAssets.contributionGraph;
    expect(asset).toMatchObject({
      type: "graph",
      graphId: GRAPH_ID,
      webRenderer: "react-flow",
      printRenderer: "vertical-svg",
      altKey: "assets.contributionGraph.alt",
      captionKey: "assets.contributionGraph.caption",
    });
    expect(clipMessages.assets?.contributionGraph?.alt).toContain(
      "image-caption pairs",
    );
    expect(clipMessages.assets?.contributionGraph?.caption).toContain(
      "shared embedding space",
    );
  });

  test("registry graph record exposes the CLIP training flow from pairs to downstream use", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    expect(graph.graphType).toBe("paper-contribution");
    expect(graph.subjectId).toBe(
      "paper.learning-transferable-visual-models-from-natural-language-supervision",
    );
    expect(graph.rootNodeId).toBe("paper");
    expect(graph.layout).toBe("vertical-expandable");

    const nodeIds = graph.nodes.map((node) => node.id);
    expect(nodeIds).toEqual([
      "paper",
      "pairs",
      "encoders",
      "contrastive",
      "embedding",
      "downstream",
    ]);
    expect(graph.edges.map((edge) => edge.id)).toEqual([
      "paper-pairs",
      "pairs-encoders",
      "encoders-contrastive",
      "contrastive-embedding",
      "embedding-downstream",
    ]);
  });

  test("buildRegistryFlowGraph resolves localized node labels for the contribution flow", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const { nodes, edges } = buildRegistryFlowGraph(graph, clipMessages);
    expect(nodes).toHaveLength(6);
    expect(edges).toHaveLength(5);
    expect(nodes.map((node) => node.data.label)).toEqual(expectedFlowLabels);
  });

  test("RegistryGraphFlow renders readable node labels and caption without placeholders", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={clipMessages} isDev={false}>
        <PageAssetsProvider assets={clipAssets} isDev={false}>
          <RegistryGraphFlow
            assetId="contributionGraph"
            graphId={GRAPH_ID}
            alt={clipMessages.assets?.contributionGraph?.alt}
            caption={clipMessages.assets?.contributionGraph?.caption}
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    for (const label of expectedFlowLabels) {
      expect(html).toContain(label);
    }
    expect(html).toContain("paired image-caption data");
    expect(html).not.toContain("missing-content");
    expect(html).not.toContain("assets.contributionGraph");
  });

  test("RegistryGraphFlow exposes graph labels in the accessibility tree", () => {
    renderContributionGraph();

    for (const label of expectedFlowLabels) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(
      screen.getByText(
        /CLIP is easiest to read as a chain: paired image-caption data/i,
      ),
    ).toBeDefined();
  });
});
