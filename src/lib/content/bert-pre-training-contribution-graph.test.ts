/**
 * BERT paper contribution graph runtime proof.
 * Routine page-bundle graph wiring is covered by `make validate-data`; this
 * file proves observable flow-graph labels, registry-backed node links, and
 * teaching edges that derived validation cannot express.
 */
import { describe, expect, test } from "bun:test";
import bertPaperMessages from "@/content/docs/papers/bert-pre-training-of-deep-bidirectional-transformers/messages/en.json";
import {
  buildRegistryFlowGraph,
  resolveGraphNodeLabel,
} from "@/lib/content/graph-flow";
import { getGraphById } from "@/lib/content/graph-registry-runtime";

const CONTRIBUTION_GRAPH_ID = "graph.bert-pre-training-contribution";

describe("BERT paper contribution graph", () => {
  test("maps the paper to WordPiece inputs, encoder stack, bidirectional attention, masked pretraining, and encoder-only downstream use", () => {
    const graph = getGraphById(CONTRIBUTION_GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    expect(graph.subjectId).toBe(
      "paper.bert-pre-training-of-deep-bidirectional-transformers",
    );
    expect(graph.graphType).toBe("paper-contribution");
    expect(graph.rootNodeId).toBe("paper");

    const rootNode = graph.nodes.find((node) => node.id === "paper");
    expect(rootNode?.childNodeIds).toEqual([
      "inputs",
      "encoder",
      "bidirectional-attention",
      "pretraining",
      "downstream",
    ]);

    const inputsNode = graph.nodes.find((node) => node.id === "inputs");
    const encoderNode = graph.nodes.find((node) => node.id === "encoder");
    const attentionNode = graph.nodes.find(
      (node) => node.id === "bidirectional-attention",
    );
    const pretrainingNode = graph.nodes.find(
      (node) => node.id === "pretraining",
    );
    const downstreamNode = graph.nodes.find((node) => node.id === "downstream");

    expect(inputsNode?.registryId).toBe("module.wordpiece");
    expect(encoderNode?.registryId).toBe("concept.transformer-architecture");
    expect(attentionNode?.registryId).toBe("module.bidirectional-attention");
    expect(pretrainingNode?.registryId).toBe("training-regime.pretraining");

    expect(
      resolveGraphNodeLabel(bertPaperMessages, inputsNode?.labelKey ?? ""),
    ).toBe("WordPiece inputs");
    expect(
      resolveGraphNodeLabel(bertPaperMessages, encoderNode?.labelKey ?? ""),
    ).toBe("Transformer encoder stack");
    expect(
      resolveGraphNodeLabel(bertPaperMessages, attentionNode?.labelKey ?? ""),
    ).toBe("Bidirectional attention");
    expect(
      resolveGraphNodeLabel(bertPaperMessages, pretrainingNode?.labelKey ?? ""),
    ).toBe("Masked language modeling");
    expect(
      resolveGraphNodeLabel(bertPaperMessages, downstreamNode?.labelKey ?? ""),
    ).toBe("Encoder-only fine-tuning");

    const { nodes, edges } = buildRegistryFlowGraph(graph, bertPaperMessages);
    const labels = nodes.map((node) => node.data.label);
    expect(labels).toContain("WordPiece inputs");
    expect(labels).toContain("Transformer encoder stack");
    expect(labels).toContain("Bidirectional attention");
    expect(labels).toContain("Masked language modeling");
    expect(labels).toContain("Encoder-only fine-tuning");

    const attentionNodeData = nodes.find(
      (node) => node.id === "bidirectional-attention",
    );
    expect(attentionNodeData?.data.semantic.hasCanonicalPage).toBe(true);
    expect(attentionNodeData?.data.semantic.canonicalPageHref).toBe(
      "/docs/modules/bidirectional-attention",
    );

    expect(
      edges.some(
        (edge) =>
          edge.source === "encoder" &&
          edge.target === "bidirectional-attention",
      ),
    ).toBe(true);
    expect(
      edges.some(
        (edge) => edge.source === "pretraining" && edge.target === "downstream",
      ),
    ).toBe(true);
  });

  test("keeps contribution graph alt and caption aligned with the teaching relationships", () => {
    expect(bertPaperMessages.assets.contributionGraph.alt).toContain(
      "WordPiece inputs",
    );
    expect(bertPaperMessages.assets.contributionGraph.alt).toContain(
      "bidirectional attention",
    );
    expect(bertPaperMessages.assets.contributionGraph.alt).toContain(
      "encoder-only fine-tuning",
    );
    expect(bertPaperMessages.assets.contributionGraph.caption).toContain(
      "masked language modeling pretraining",
    );
    expect(bertPaperMessages.assets.contributionGraph.caption).toContain(
      "encoder-only fine-tuning",
    );
  });
});
