import { describe, expect, test } from "bun:test";
import type { Node } from "fumadocs-core/page-tree";
import { source } from "@/lib/source";

const GLOSSARY_INDEX_URLS = [
  "/docs/glossary/absolute-positional-embeddings",
  "/docs/glossary/activation",
  "/docs/glossary/alibi",
  "/docs/glossary/alignment",
  "/docs/glossary/architecture",
  "/docs/glossary/autoregressive-generation",
  "/docs/glossary/backpropagation",
  "/docs/glossary/batch-norm",
  "/docs/glossary/bpe",
  "/docs/glossary/byte-level-tokenization",
  "/docs/glossary/component",
  "/docs/glossary/computational-graph",
  "/docs/glossary/chat-templates",
  "/docs/glossary/conditioning",
  "/docs/glossary/context-window",
  "/docs/glossary/convolutional-neural-network",
  "/docs/glossary/decoder",
  "/docs/glossary/denoising-generation",
  "/docs/glossary/diffusion-model",
  "/docs/glossary/discriminative-model",
  "/docs/glossary/embedding",
  "/docs/glossary/emergent-behavior",
  "/docs/glossary/encoder",
  "/docs/glossary/encoder-decoder",
  "/docs/glossary/entropy",
  "/docs/glossary/feed-forward-network",
  "/docs/glossary/foundation-model",
  "/docs/glossary/generalization",
  "/docs/glossary/generative-model",
  "/docs/glossary/gradient",
  "/docs/glossary/graph-neural-network",
  "/docs/glossary/group-norm",
  "/docs/glossary/hidden-size",
  "/docs/glossary/latent",
  "/docs/glossary/latent-space",
  "/docs/glossary/layer-norm",
  "/docs/glossary/leaky-relu",
  "/docs/glossary/learned-positional-embeddings",
  "/docs/glossary/logit",
  "/docs/glossary/longrope",
  "/docs/glossary/loss-function",
  "/docs/glossary/mixture-of-experts",
  "/docs/glossary/modality",
  "/docs/glossary/model",
  "/docs/glossary/model-capacity",
  "/docs/glossary/module",
  "/docs/glossary/multimodal-model",
  "/docs/glossary/nope",
  "/docs/glossary/normalization",
  "/docs/glossary/ntk-aware-rope-scaling",
  "/docs/glossary/optimizer-state",
  "/docs/glossary/overfitting",
  "/docs/glossary/parameter",
  "/docs/glossary/patch",
  "/docs/glossary/perplexity",
  "/docs/glossary/positional-interpolation",
  "/docs/glossary/qk-norm",
  "/docs/glossary/recurrent-neural-network",
  "/docs/glossary/relative-position-bias",
  "/docs/glossary/relu",
  "/docs/glossary/representation",
  "/docs/glossary/residual-connection",
  "/docs/glossary/rmsnorm",
  "/docs/glossary/rope",
  "/docs/glossary/scaling-law",
  "/docs/glossary/sequence-model",
  "/docs/glossary/sentencepiece",
  "/docs/glossary/silu",
  "/docs/glossary/sinusoidal-positional-embeddings",
  "/docs/glossary/softmax",
  "/docs/glossary/special-tokens",
  "/docs/glossary/standard-ffn",
  "/docs/glossary/state-space-model",
  "/docs/glossary/superhot-rope",
  "/docs/glossary/swiglu",
  "/docs/glossary/t5-relative-position-bias",
  "/docs/glossary/temperature",
  "/docs/glossary/tensor",
  "/docs/glossary/token",
  "/docs/glossary/tokenizer-mismatch",
  "/docs/glossary/transformer",
  "/docs/glossary/unigram-tokenizer",
  "/docs/glossary/vector",
  "/docs/glossary/vocabulary-size",
  "/docs/glossary/world-model",
  "/docs/glossary/wordpiece",
  "/docs/glossary/yarn",
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
});
