import { describe, expect, test } from "bun:test";
import qwen35Messages from "@/content/docs/models/qwen3-5-0-8b/messages/en.json";
import {
  buildRegistryFlowGraph,
  resolveGraphNodeLabel,
} from "@/lib/content/graph-flow";
import { getGraphById } from "@/lib/content/graph-registry-runtime";

const HYBRID_GRAPH_ID = "graph.qwen3-5-0-8b-architecture";

describe("Qwen3.5-0.8B architecture graph", () => {
  test("resolves the hybrid stack with distinct Gated DeltaNet and Gated Attention paths", () => {
    const graph = getGraphById(HYBRID_GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const gatedDeltaNetNode = graph.nodes.find(
      (node) => node.id === "gated-deltanet",
    );
    const gatedAttentionNode = graph.nodes.find(
      (node) => node.id === "gated-attention",
    );
    const denseFfnNode = graph.nodes.find((node) => node.id === "dense-ffn");

    expect(gatedDeltaNetNode?.moduleKind).toBe("attention");
    expect(gatedAttentionNode?.relatedRegistryId).toBe("module.attention");
    expect(denseFfnNode?.registryId).toBe("module.standard-ffn");
    expect(
      resolveGraphNodeLabel(qwen35Messages, gatedDeltaNetNode?.labelKey ?? ""),
    ).toBe("Gated\nDeltaNet");
    expect(
      resolveGraphNodeLabel(qwen35Messages, gatedAttentionNode?.labelKey ?? ""),
    ).toBe("Gated\nAttention");

    const { nodes } = buildRegistryFlowGraph(graph, qwen35Messages);
    const labels = nodes.map((node) => node.data.label);
    expect(labels).toContain("Gated\nDeltaNet");
    expect(labels).toContain("Gated\nAttention");
    expect(labels).toContain("Feed\nForward");
    expect(labels).toContain("Input\nEmbedding");
    expect(labels).not.toContain("Expert\nRouting");
    expect(labels).not.toContain("Decoder\nAttention");
  });

  test("architecture prose names repeated and periodic hybrid blocks from official sources", () => {
    expect(qwen35Messages.sections.architecture.body).toContain(
      "repeated Gated DeltaNet",
    );
    expect(qwen35Messages.sections.architecture.body).toContain(
      "periodic Gated Attention",
    );
    expect(qwen35Messages.assets.architectureGraph.alt).toContain(
      "Gated DeltaNet",
    );
    expect(qwen35Messages.assets.architectureGraph.alt).toContain(
      "Gated Attention",
    );
  });
});
