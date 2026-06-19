import { describe, expect, test } from "bun:test";
import type { Node } from "fumadocs-core/page-tree";
import { source } from "@/lib/source";

function getFolderChildren(folderName: string): Node[] {
  const folder = source.pageTree.children.find(
    (node) => node.type === "folder" && node.name === folderName,
  );
  expect(folder?.type).toBe("folder");
  if (folder?.type !== "folder") {
    throw new Error(`expected ${folderName} folder in docs sidebar`);
  }

  return folder.children;
}

function findNodeIndex(
  nodes: Node[],
  target: { name?: string; url?: string },
): number {
  return nodes.findIndex((node) => {
    if (target.name) {
      return node.name === target.name;
    }

    return node.type === "page" && "url" in node && node.url === target.url;
  });
}

describe("generated docs page tree", () => {
  test("glossary, concepts, and modules keep representative registry-driven subgroup placements", () => {
    const glossaryChildren = getFolderChildren("Glossary");
    expect(
      findNodeIndex(glossaryChildren, { name: "Model Taxonomy" }),
    ).toBeLessThan(
      findNodeIndex(glossaryChildren, { url: "/docs/glossary/architecture" }),
    );
    expect(
      findNodeIndex(glossaryChildren, { name: "Sequence And Attention" }),
    ).toBeLessThan(
      findNodeIndex(glossaryChildren, { url: "/docs/glossary/token" }),
    );
    expect(
      findNodeIndex(glossaryChildren, { name: "Math And Training" }),
    ).toBeLessThan(
      findNodeIndex(glossaryChildren, { url: "/docs/glossary/tensor" }),
    );
    expect(
      findNodeIndex(glossaryChildren, { name: "Generation And Diffusion" }),
    ).toBeLessThan(
      findNodeIndex(glossaryChildren, { url: "/docs/glossary/top-k-sampling" }),
    );

    const conceptChildren = getFolderChildren("Concepts");
    expect(
      findNodeIndex(conceptChildren, { name: "Long Context" }),
    ).toBeLessThan(
      findNodeIndex(conceptChildren, {
        url: "/docs/concepts/context-extension",
      }),
    );
    expect(findNodeIndex(conceptChildren, { name: "Inference" })).toBeLessThan(
      findNodeIndex(conceptChildren, { url: "/docs/concepts/calibration" }),
    );
    expect(
      findNodeIndex(conceptChildren, { name: "Architecture" }),
    ).toBeLessThan(
      findNodeIndex(conceptChildren, {
        url: "/docs/concepts/transformer-architecture",
      }),
    );
    expect(
      findNodeIndex(conceptChildren, { name: "Reference Samples" }),
    ).toBeLessThan(
      findNodeIndex(conceptChildren, {
        url: "/docs/concepts/page-spec-workflow-sample",
      }),
    );

    const moduleChildren = getFolderChildren("Modules");
    expect(
      findNodeIndex(moduleChildren, { name: "Attention Foundations" }),
    ).toBeLessThan(
      findNodeIndex(moduleChildren, {
        url: "/docs/modules/multi-head-attention",
      }),
    );
    expect(
      findNodeIndex(moduleChildren, { name: "Attention Variants" }),
    ).toBeLessThan(
      findNodeIndex(moduleChildren, {
        url: "/docs/modules/grouped-query-attention",
      }),
    );
    expect(
      findNodeIndex(moduleChildren, { name: "Feed-Forward And Activation" }),
    ).toBeLessThan(
      findNodeIndex(moduleChildren, {
        url: "/docs/modules/feed-forward-network",
      }),
    );
    expect(
      findNodeIndex(moduleChildren, { name: "Normalization" }),
    ).toBeLessThan(
      findNodeIndex(moduleChildren, { url: "/docs/modules/layer-norm" }),
    );
    expect(
      findNodeIndex(moduleChildren, {
        name: "Positional And Sequence Encoding",
      }),
    ).toBeLessThan(
      findNodeIndex(moduleChildren, { url: "/docs/modules/rope" }),
    );
  });

  test("training and systems folders keep representative derived subgroup placements", () => {
    const trainingChildren = getFolderChildren("Training");
    expect(
      findNodeIndex(trainingChildren, { name: "Post-Training" }),
    ).toBeLessThan(
      findNodeIndex(trainingChildren, {
        url: "/docs/training/specialist-training",
      }),
    );
    expect(
      findNodeIndex(trainingChildren, { name: "Distillation" }),
    ).toBeLessThan(
      findNodeIndex(trainingChildren, {
        url: "/docs/training/on-policy-distillation",
      }),
    );
    expect(
      findNodeIndex(trainingChildren, { name: "Optimization" }),
    ).toBeLessThan(
      findNodeIndex(trainingChildren, {
        url: "/docs/training/fp4-quantization-aware-training",
      }),
    );
    expect(
      findNodeIndex(trainingChildren, { name: "Post-Training" }),
    ).toBeLessThan(
      findNodeIndex(trainingChildren, {
        url: "/docs/training/ppo",
      }),
    );

    const systemsChildren = getFolderChildren("Systems");
    expect(findNodeIndex(systemsChildren, { name: "Memory" })).toBeLessThan(
      findNodeIndex(systemsChildren, { url: "/docs/systems/on-disk-kv-cache" }),
    );
    expect(findNodeIndex(systemsChildren, { name: "Routing" })).toBeLessThan(
      findNodeIndex(systemsChildren, { url: "/docs/systems/routing" }),
    );
  });
});
