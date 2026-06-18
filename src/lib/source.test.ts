import { describe, expect, test } from "bun:test";
import type { Node } from "fumadocs-core/page-tree";
import { source } from "@/lib/source";

const GLOSSARY_INDEX_URLS = [
  "/docs/glossary/alibi",
  "/docs/glossary/alignment",
  "/docs/glossary/architecture",
  "/docs/glossary/autoregressive-generation",
  "/docs/glossary/batch-norm",
  "/docs/glossary/component",
  "/docs/glossary/conditioning",
  "/docs/glossary/context-window",
  "/docs/glossary/decode",
  "/docs/glossary/decoder",
  "/docs/glossary/denoising-generation",
  "/docs/glossary/diffusion-model",
  "/docs/glossary/discriminative-model",
  "/docs/glossary/emergent-behavior",
  "/docs/glossary/encoder",
  "/docs/glossary/encoder-decoder",
  "/docs/glossary/feed-forward-network",
  "/docs/glossary/foundation-model",
  "/docs/glossary/generalization",
  "/docs/glossary/generative-model",
  "/docs/glossary/group-norm",
  "/docs/glossary/latent",
  "/docs/glossary/latent-space",
  "/docs/glossary/leaky-relu",
  "/docs/glossary/modality",
  "/docs/glossary/model",
  "/docs/glossary/model-capacity",
  "/docs/glossary/module",
  "/docs/glossary/layer-norm",
  "/docs/glossary/mixture-of-experts",
  "/docs/glossary/multimodal-model",
  "/docs/glossary/normalization",
  "/docs/glossary/residual-connection",
  "/docs/glossary/skip-connection",
  "/docs/glossary/rope",
  "/docs/glossary/rmsnorm",
  "/docs/glossary/overfitting",
  "/docs/glossary/patch",
  "/docs/glossary/perplexity",
  "/docs/glossary/prefill",
  "/docs/glossary/prefill-decode-split",
  "/docs/glossary/qk-norm",
  "/docs/glossary/greedy-decoding",
  "/docs/glossary/top-k-sampling",
  "/docs/glossary/top-p-sampling",
  "/docs/glossary/representation",
  "/docs/glossary/scaling-law",
  "/docs/glossary/standard-ffn",
  "/docs/glossary/token",
  "/docs/glossary/transformer",
  "/docs/glossary/world-model",
  "/docs/glossary/embedding",
  "/docs/glossary/tensor",
  "/docs/glossary/vector",
  "/docs/glossary/hidden-size",
  "/docs/glossary/kv-cache",
  "/docs/glossary/logit",
  "/docs/glossary/softmax",
  "/docs/glossary/entropy",
  "/docs/glossary/temperature",
  "/docs/glossary/sampling-overview",
  "/docs/glossary/parameter",
  "/docs/glossary/activation",
  "/docs/glossary/relu",
  "/docs/glossary/silu",
  "/docs/glossary/standard-ffn",
  "/docs/glossary/swiglu",
  "/docs/glossary/computational-graph",
  "/docs/glossary/gradient",
  "/docs/glossary/backpropagation",
  "/docs/glossary/loss-function",
  "/docs/glossary/optimizer-state",
] as const;

function collectPageUrls(nodes: Node[]): string[] {
  const urls: string[] = [];

  for (const node of nodes) {
    if (node.type === "page" && "url" in node && typeof node.url === "string") {
      urls.push(node.url);
    }
    if (node.type === "folder" && "children" in node) {
      urls.push(...collectPageUrls(node.children));
    }
  }

  return urls;
}

function collectSeparatorNames(nodes: Node[]): string[] {
  const names: string[] = [];

  for (const node of nodes) {
    if (node.type === "separator" && typeof node.name === "string") {
      names.push(node.name);
    }
    if (node.type === "folder" && "children" in node) {
      names.push(...collectSeparatorNames(node.children));
    }
  }

  return names;
}

describe("docs navigation source", () => {
  test("page tree includes taxonomy glossary links under Glossary", () => {
    const urls = collectPageUrls(source.pageTree.children);
    for (const url of GLOSSARY_INDEX_URLS) {
      expect(urls).toContain(url);
    }

    const glossaryFolder = source.pageTree.children.find(
      (node) => node.type === "folder" && node.name === "Glossary",
    );
    expect(glossaryFolder?.type).toBe("folder");
    if (glossaryFolder?.type !== "folder") {
      throw new Error("expected Glossary folder in docs sidebar");
    }

    const glossaryUrls = collectPageUrls(glossaryFolder.children).sort();
    expect(glossaryUrls).toEqual([...GLOSSARY_INDEX_URLS].sort());
  });

  test("glossary navigation URLs resolve through Fumadocs source entries", () => {
    for (const url of GLOSSARY_INDEX_URLS) {
      const slug = url.replace("/docs/", "").split("/");
      expect(source.getPage(slug)).toBeDefined();
    }
  });

  test("page tree exposes sidebar grouping separators for modules, concepts, and glossary", () => {
    const separatorNames = collectSeparatorNames(source.pageTree.children);

    expect(separatorNames).toEqual(
      expect.arrayContaining([
        "Attention Foundations",
        "Attention Variants",
        "Long Context",
        "Architecture",
        "Reference Samples",
        "Model Taxonomy",
        "Sequence And Attention",
        "Math And Training",
        "Generation And Diffusion",
      ]),
    );
  });
});
