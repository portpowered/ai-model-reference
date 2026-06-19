import { describe, expect, test } from "bun:test";
import type { Node } from "fumadocs-core/page-tree";
import { renderToStaticMarkup } from "react-dom/server";
import ArchitectureIndexPage from "@/app/(site)/docs/architecture/page";
import GlossaryIndexPage from "@/app/(site)/docs/glossary/page";
import { loadPublishedArchitectureEntries } from "@/lib/content/architecture";
import { loadPublishedGlossaryEntries } from "@/lib/content/glossary";
import { source } from "@/lib/source";

const CURRENT_GLOSSARY_SLUGS = [
  "model",
  "architecture",
  "module",
  "component",
  "modality",
  "foundation-model",
  "generative-model",
  "discriminative-model",
  "representation",
  "patch",
  "latent",
  "latent-space",
  "model-capacity",
  "multimodal-model",
  "world-model",
  "context-window",
  "decoder",
  "decode",
  "encoder",
  "encoder-decoder",
  "hidden-size",
  "kv-cache",
  "normalization",
  "prefill",
  "prefill-decode-split",
  "perplexity",
  "residual-connection",
  "skip-connection",
  "token",
  "transformer",
  "activation",
  "alignment",
  "backpropagation",
  "computational-graph",
  "embedding",
  "entropy",
  "emergent-behavior",
  "generalization",
  "gradient",
  "logit",
  "loss-function",
  "optimizer-state",
  "overfitting",
  "parameter",
  "scaling-law",
  "special-tokens",
  "softmax",
  "temperature",
  "tensor",
  "vector",
  "autoregressive-generation",
  "greedy-decoding",
  "sampling-overview",
  "top-k-sampling",
  "top-p-sampling",
  "conditioning",
  "denoising-generation",
  "diffusion-model",
  "vocabulary-size",
] as const;

const EXPECTED_GLOSSARY_TITLES: Record<
  (typeof CURRENT_GLOSSARY_SLUGS)[number],
  string
> = {
  activation: "Activation",
  alignment: "Alignment",
  architecture: "Architecture",
  "autoregressive-generation": "Autoregressive Generation",
  backpropagation: "Backpropagation",
  component: "Component",
  "computational-graph": "Computational Graph",
  conditioning: "Conditioning",
  "context-window": "Context window",
  decode: "Decode",
  decoder: "Decoder",
  "denoising-generation": "Denoising Generation",
  "diffusion-model": "Diffusion Model",
  "discriminative-model": "Discriminative Model",
  embedding: "Embedding",
  entropy: "Entropy",
  "emergent-behavior": "Emergent Behavior",
  encoder: "Encoder",
  "encoder-decoder": "Encoder-Decoder",
  "foundation-model": "Foundation Model",
  generalization: "Generalization",
  "generative-model": "Generative Model",
  "greedy-decoding": "Greedy Decoding",
  gradient: "Gradient",
  "hidden-size": "Hidden Size",
  "kv-cache": "KV cache",
  latent: "Latent",
  "latent-space": "Latent Space",
  logit: "Logit",
  "loss-function": "Loss Function",
  modality: "Modality",
  model: "Model",
  "model-capacity": "Model Capacity",
  module: "Module",
  "multimodal-model": "Multimodal Model",
  normalization: "Normalization",
  "optimizer-state": "Optimizer State",
  overfitting: "Overfitting",
  parameter: "Parameter",
  patch: "Patch",
  perplexity: "Perplexity",
  prefill: "Prefill",
  "prefill-decode-split": "Prefill/decode split",
  representation: "Representation",
  "residual-connection": "Residual connection",
  "sampling-overview": "Sampling Overview",
  "scaling-law": "Scaling Law",
  "special-tokens": "Special Tokens",
  "skip-connection": "Skip connection",
  softmax: "Softmax",
  temperature: "Temperature",
  tensor: "Tensor",
  token: "Token",
  "top-k-sampling": "Top-K Sampling",
  "top-p-sampling": "Top-P Sampling",
  transformer: "Transformer",
  vector: "Vector",
  "vocabulary-size": "Vocabulary Size",
  "world-model": "World Model",
};

const PUBLISHED_GLOSSARY_ENTRY_COUNT = 59;
const PUBLISHED_ARCHITECTURE_ENTRY_COUNT = 48;

const GLOSSARY_SEPARATOR_TITLES = [
  "Model Taxonomy",
  "Sequence And Attention",
  "Math And Training",
  "Generation And Diffusion",
] as const;

const ARCHITECTURE_CONCEPT_URLS = [
  "/docs/concepts/alibi",
  "/docs/concepts/context-extension",
  "/docs/concepts/page-spec-workflow-sample",
  "/docs/concepts/positional-encodings",
  "/docs/concepts/transformer-architecture",
  "/docs/concepts/why-long-context-is-hard",
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

describe("Phase 2 glossary and architecture index navigation (US-007)", () => {
  test("generated glossary sidebar lists current glossary families and separators", () => {
    const glossaryFolder = source.pageTree.children.find(
      (node) => node.type === "folder" && node.name === "Glossary",
    );
    expect(glossaryFolder?.type).toBe("folder");
    if (glossaryFolder?.type !== "folder") {
      throw new Error("expected Glossary folder in docs sidebar");
    }

    const separatorTitles = glossaryFolder.children
      .filter((node) => node.type === "separator")
      .map((node) => node.name);
    const linkNodes = glossaryFolder.children.filter(
      (node): node is Extract<Node, { type: "page" }> => node.type === "page",
    );

    expect(linkNodes).toHaveLength(PUBLISHED_GLOSSARY_ENTRY_COUNT);
    expect(separatorTitles).toEqual(
      expect.arrayContaining([...GLOSSARY_SEPARATOR_TITLES]),
    );

    for (const slug of CURRENT_GLOSSARY_SLUGS) {
      const title = EXPECTED_GLOSSARY_TITLES[slug];
      expect(
        linkNodes.some((entry) => entry.url === `/docs/glossary/${slug}`),
      ).toBe(true);
      expect(linkNodes.some((entry) => entry.name === title)).toBe(true);
    }
  });

  test("fumadocs glossary sidebar includes the shipped glossary surface", () => {
    const glossaryFolder = source.pageTree.children.find(
      (node) => node.type === "folder" && node.name === "Glossary",
    );
    expect(glossaryFolder?.type).toBe("folder");
    if (glossaryFolder?.type !== "folder") {
      throw new Error("expected Glossary folder in docs sidebar");
    }

    const glossaryUrls = collectPageUrls(glossaryFolder.children);
    for (const slug of CURRENT_GLOSSARY_SLUGS) {
      expect(glossaryUrls).toContain(`/docs/glossary/${slug}`);
    }
    expect(glossaryUrls).toHaveLength(PUBLISHED_GLOSSARY_ENTRY_COUNT);
  });

  test("glossary index lists shipped published entries with localized titles", async () => {
    const entries = await loadPublishedGlossaryEntries("en");
    expect(entries).toHaveLength(PUBLISHED_GLOSSARY_ENTRY_COUNT);

    for (const slug of CURRENT_GLOSSARY_SLUGS) {
      const entry = entries.find(
        (item) => item.url === `/docs/glossary/${slug}`,
      );
      expect(entry?.title).toBe(EXPECTED_GLOSSARY_TITLES[slug]);
    }
  });

  test("architecture index includes current architecture-related glossary and concept entries", async () => {
    const entries = await loadPublishedArchitectureEntries("en");
    expect(entries).toHaveLength(PUBLISHED_ARCHITECTURE_ENTRY_COUNT);

    for (const url of [
      "/docs/glossary/architecture",
      "/docs/glossary/kv-cache",
      "/docs/glossary/normalization",
      "/docs/glossary/residual-connection",
      "/docs/glossary/special-tokens",
      "/docs/glossary/token",
      ...ARCHITECTURE_CONCEPT_URLS,
    ] as const) {
      expect(entries.some((entry) => entry.url === url)).toBe(true);
    }

    expect(entries.some((entry) => entry.url === "/docs/glossary/tensor")).toBe(
      false,
    );
  });

  test("glossary and architecture index pages render current family links", async () => {
    const glossaryHtml = renderToStaticMarkup(await GlossaryIndexPage());
    const architectureHtml = renderToStaticMarkup(
      await ArchitectureIndexPage(),
    );

    for (const [title, href] of [
      ["Architecture", "/docs/glossary/architecture"],
      ["Token", "/docs/glossary/token"],
      ["Embedding", "/docs/glossary/embedding"],
      ["KV cache", "/docs/glossary/kv-cache"],
      ["Normalization", "/docs/glossary/normalization"],
      ["Prefill", "/docs/glossary/prefill"],
      ["Sampling Overview", "/docs/glossary/sampling-overview"],
    ] as const) {
      expect(glossaryHtml).toContain(title);
      expect(glossaryHtml).toContain(`href="${href}"`);
    }

    for (const [title, href] of [
      ["Attention with linear biases (ALiBi)", "/docs/concepts/alibi"],
      ["Architecture", "/docs/glossary/architecture"],
      ["Foundation Model", "/docs/glossary/foundation-model"],
      ["KV cache", "/docs/glossary/kv-cache"],
      ["Decode", "/docs/glossary/decode"],
      ["Prefill", "/docs/glossary/prefill"],
      ["Positional encodings", "/docs/concepts/positional-encodings"],
      ["Token", "/docs/glossary/token"],
      ["Transformer architecture", "/docs/concepts/transformer-architecture"],
    ] as const) {
      expect(architectureHtml).toContain(title);
      expect(architectureHtml).toContain(`href="${href}"`);
    }
  });
});
