import { describe, expect, test } from "bun:test";
import type { Node } from "fumadocs-core/page-tree";
import { source } from "@/lib/source";

const GLOSSARY_INDEX_URLS = [
  "/docs/glossary/activation",
  "/docs/glossary/alignment",
  "/docs/glossary/architecture",
  "/docs/glossary/autoregressive-generation",
  "/docs/glossary/backpropagation",
  "/docs/glossary/component",
  "/docs/glossary/computational-graph",
  "/docs/glossary/conditioning",
  "/docs/glossary/context-window",
  "/docs/glossary/decode",
  "/docs/glossary/decoder",
  "/docs/glossary/denoising-generation",
  "/docs/glossary/diffusion-model",
  "/docs/glossary/discriminative-model",
  "/docs/glossary/embedding",
  "/docs/glossary/emergent-behavior",
  "/docs/glossary/encoder",
  "/docs/glossary/encoder-decoder",
  "/docs/glossary/entropy",
  "/docs/glossary/foundation-model",
  "/docs/glossary/generalization",
  "/docs/glossary/generative-model",
  "/docs/glossary/gradient",
  "/docs/glossary/greedy-decoding",
  "/docs/glossary/hidden-size",
  "/docs/glossary/kv-cache",
  "/docs/glossary/latent",
  "/docs/glossary/latent-space",
  "/docs/glossary/logit",
  "/docs/glossary/loss-function",
  "/docs/glossary/modality",
  "/docs/glossary/model",
  "/docs/glossary/model-capacity",
  "/docs/glossary/module",
  "/docs/glossary/multimodal-model",
  "/docs/glossary/normalization",
  "/docs/glossary/optimizer-state",
  "/docs/glossary/overfitting",
  "/docs/glossary/parameter",
  "/docs/glossary/patch",
  "/docs/glossary/perplexity",
  "/docs/glossary/prefill",
  "/docs/glossary/prefill-decode-split",
  "/docs/glossary/representation",
  "/docs/glossary/residual-connection",
  "/docs/glossary/sampling-overview",
  "/docs/glossary/scaling-law",
  "/docs/glossary/skip-connection",
  "/docs/glossary/softmax",
  "/docs/glossary/temperature",
  "/docs/glossary/tensor",
  "/docs/glossary/token",
  "/docs/glossary/top-k-sampling",
  "/docs/glossary/top-p-sampling",
  "/docs/glossary/transformer",
  "/docs/glossary/vector",
  "/docs/glossary/world-model",
] as const;

const MODULE_INDEX_URLS = [
  "/docs/modules/absolute-positional-embeddings",
  "/docs/modules/alibi",
  "/docs/modules/attention",
  "/docs/modules/batch-norm",
  "/docs/modules/compressed-sparse-attention",
  "/docs/modules/deepseekmoe",
  "/docs/modules/feed-forward-network",
  "/docs/modules/group-norm",
  "/docs/modules/grouped-query-attention",
  "/docs/modules/heavily-compressed-attention",
  "/docs/modules/layer-norm",
  "/docs/modules/leaky-relu",
  "/docs/modules/learned-positional-embeddings",
  "/docs/modules/linear-attention",
  "/docs/modules/longrope",
  "/docs/modules/manifold-constrained-hyper-connections",
  "/docs/modules/mixture-of-experts",
  "/docs/modules/multi-head-attention",
  "/docs/modules/multi-head-latent-attention",
  "/docs/modules/multi-query-attention",
  "/docs/modules/nope",
  "/docs/modules/ntk-aware-rope-scaling",
  "/docs/modules/positional-interpolation",
  "/docs/modules/qk-norm",
  "/docs/modules/relu",
  "/docs/modules/relative-position-bias",
  "/docs/modules/rmsnorm",
  "/docs/modules/rope",
  "/docs/modules/silu",
  "/docs/modules/sinusoidal-positional-embeddings",
  "/docs/modules/sliding-window-attention",
  "/docs/modules/sparse-attention",
  "/docs/modules/standard-ffn",
  "/docs/modules/superhot-rope",
  "/docs/modules/swiglu",
  "/docs/modules/t5-relative-position-bias",
  "/docs/modules/yarn",
] as const;

const MODEL_INDEX_URLS = [
  "/docs/models/deepseek-v4-flash",
  "/docs/models/deepseek-v4-pro",
  "/docs/models/gpt-3",
] as const;

const PAPER_INDEX_URLS = ["/docs/papers/deepseek-v4"] as const;

const TRAINING_INDEX_URLS = [
  "/docs/training/fp4-quantization-aware-training",
  "/docs/training/on-policy-distillation",
  "/docs/training/specialist-training",
] as const;

const SYSTEM_INDEX_URLS = [
  "/docs/systems/expert-parallel-overlap",
  "/docs/systems/on-disk-kv-cache",
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
    for (const url of MODULE_INDEX_URLS) {
      expect(urls).toContain(url);
    }
    for (const url of MODEL_INDEX_URLS) {
      expect(urls).toContain(url);
    }
    for (const url of PAPER_INDEX_URLS) {
      expect(urls).toContain(url);
    }
    for (const url of TRAINING_INDEX_URLS) {
      expect(urls).toContain(url);
    }
    for (const url of SYSTEM_INDEX_URLS) {
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

    const modulesFolder = source.pageTree.children.find(
      (node) => node.type === "folder" && node.name === "Modules",
    );
    expect(modulesFolder?.type).toBe("folder");
    if (modulesFolder?.type !== "folder") {
      throw new Error("expected Modules folder in docs sidebar");
    }

    const moduleUrls = collectPageUrls(modulesFolder.children).sort();
    expect(moduleUrls).toEqual([...MODULE_INDEX_URLS].sort());

    const modelsFolder = source.pageTree.children.find(
      (node) => node.type === "folder" && node.name === "Models",
    );
    expect(modelsFolder?.type).toBe("folder");
    if (modelsFolder?.type !== "folder") {
      throw new Error("expected Models folder in docs sidebar");
    }

    const modelUrls = collectPageUrls(modelsFolder.children).sort();
    expect(modelUrls).toEqual([...MODEL_INDEX_URLS].sort());

    const papersFolder = source.pageTree.children.find(
      (node) => node.type === "folder" && node.name === "Papers",
    );
    expect(papersFolder?.type).toBe("folder");
    if (papersFolder?.type !== "folder") {
      throw new Error("expected Papers folder in docs sidebar");
    }

    const paperUrls = collectPageUrls(papersFolder.children).sort();
    expect(paperUrls).toEqual([...PAPER_INDEX_URLS].sort());

    const trainingFolder = source.pageTree.children.find(
      (node) => node.type === "folder" && node.name === "Training",
    );
    expect(trainingFolder?.type).toBe("folder");
    if (trainingFolder?.type !== "folder") {
      throw new Error("expected Training folder in docs sidebar");
    }

    const trainingUrls = collectPageUrls(trainingFolder.children).sort();
    expect(trainingUrls).toEqual([...TRAINING_INDEX_URLS].sort());

    const systemsFolder = source.pageTree.children.find(
      (node) => node.type === "folder" && node.name === "Systems",
    );
    expect(systemsFolder?.type).toBe("folder");
    if (systemsFolder?.type !== "folder") {
      throw new Error("expected Systems folder in docs sidebar");
    }

    const systemUrls = collectPageUrls(systemsFolder.children).sort();
    expect(systemUrls).toEqual([...SYSTEM_INDEX_URLS].sort());
  });

  test("glossary navigation URLs resolve through Fumadocs source entries", () => {
    for (const url of GLOSSARY_INDEX_URLS) {
      const slug = url.replace("/docs/", "").split("/");
      expect(source.getPage(slug)).toBeDefined();
    }

    for (const url of [
      ...MODEL_INDEX_URLS,
      ...PAPER_INDEX_URLS,
      ...TRAINING_INDEX_URLS,
      ...SYSTEM_INDEX_URLS,
    ]) {
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
