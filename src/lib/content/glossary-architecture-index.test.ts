import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Node } from "fumadocs-core/page-tree";
import { renderToStaticMarkup } from "react-dom/server";
import ArchitectureIndexPage from "@/app/(site)/docs/architecture/page";
import GlossaryIndexPage from "@/app/(site)/docs/glossary/page";
import { loadPublishedArchitectureEntries } from "@/lib/content/architecture";
import { loadPublishedGlossaryEntries } from "@/lib/content/glossary";
import { source } from "@/lib/source";

const TAXONOMY_GLOSSARY_SLUGS = [
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
] as const;

const FFN_ACTIVATION_GLOSSARY_SLUGS = [
  "feed-forward-network",
  "batch-norm",
  "group-norm",
  "standard-ffn",
  "mixture-of-experts",
  "relu",
  "leaky-relu",
  "silu",
  "swiglu",
  "qk-norm",
  "residual-connection",
  "skip-connection",
] as const;

const POSITIONAL_GLOSSARY_SLUGS = [
  "absolute-positional-embeddings",
  "learned-positional-embeddings",
  "longrope",
  "nope",
  "ntk-aware-rope-scaling",
  "positional-interpolation",
  "relative-position-bias",
  "sinusoidal-positional-embeddings",
  "superhot-rope",
  "t5-relative-position-bias",
  "yarn",
] as const;

const CHAIN_GLOSSARY_SLUGS = [
  "embedding",
  "vector",
  "tensor",
  "logit",
  "softmax",
  "entropy",
  "temperature",
  "parameter",
  "activation",
  "computational-graph",
  "gradient",
  "backpropagation",
  "loss-function",
  "optimizer-state",
] as const;

const SEQUENCE_OPERATION_GLOSSARY_SLUGS = [
  "kv-cache",
  "decode",
  "prefill",
  "prefill-decode-split",
] as const;

const GENERATION_GLOSSARY_SLUGS = [
  "sampling-overview",
  "greedy-decoding",
  "top-k-sampling",
  "top-p-sampling",
] as const;

const EXPECTED_GLOSSARY_TITLES: Record<string, string> = {
  model: "Model",
  architecture: "Architecture",
  module: "Module",
  component: "Component",
  modality: "Modality",
  "foundation-model": "Foundation Model",
  "generative-model": "Generative Model",
  "discriminative-model": "Discriminative Model",
  representation: "Representation",
  patch: "Patch",
  latent: "Latent",
  "latent-space": "Latent Space",
  "feed-forward-network": "Feed-forward network",
  "batch-norm": "Batch norm",
  "group-norm": "Group norm",
  "standard-ffn": "Standard FFN",
  "mixture-of-experts": "Mixture of experts",
  relu: "ReLU",
  "leaky-relu": "LeakyReLU",
  silu: "SiLU",
  swiglu: "SwiGLU",
  "qk-norm": "QK norm",
  "residual-connection": "Residual connection",
  "skip-connection": "Skip connection",
  "absolute-positional-embeddings": "Absolute positional embeddings",
  "learned-positional-embeddings": "Learned positional embeddings",
  longrope: "LongRoPE",
  nope: "NoPE",
  "ntk-aware-rope-scaling": "NTK-aware RoPE scaling",
  "positional-interpolation": "Positional interpolation",
  "relative-position-bias": "Relative position bias",
  "sinusoidal-positional-embeddings": "Sinusoidal positional embeddings",
  "superhot-rope": "SuperHOT RoPE",
  "t5-relative-position-bias": "T5 relative position bias",
  yarn: "YaRN",
  token: "Token",
  embedding: "Embedding",
  vector: "Vector",
  tensor: "Tensor",
  logit: "Logit",
  softmax: "Softmax",
  entropy: "Entropy",
  temperature: "Temperature",
  parameter: "Parameter",
  activation: "Activation",
  "computational-graph": "Computational Graph",
  gradient: "Gradient",
  backpropagation: "Backpropagation",
  "loss-function": "Loss Function",
  "optimizer-state": "Optimizer State",
  "kv-cache": "KV cache",
  decode: "Decode",
  prefill: "Prefill",
  "prefill-decode-split": "Prefill/decode split",
  "sampling-overview": "Sampling Overview",
  "greedy-decoding": "Greedy Decoding",
  "top-k-sampling": "Top-K Sampling",
  "top-p-sampling": "Top-P Sampling",
};

const PUBLISHED_GLOSSARY_ENTRY_COUNT = 82;
const PUBLISHED_ARCHITECTURE_ENTRY_COUNT = 71;

const GLOSSARY_SEPARATOR_TITLES = [
  "Model Taxonomy",
  "Sequence And Attention",
  "Math And Training",
  "Generation And Diffusion",
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
  test("glossary meta.json lists merged glossary families and separators", async () => {
    const metaPath = join(process.cwd(), "src/content/docs/glossary/meta.json");
    const meta = JSON.parse(await readFile(metaPath, "utf8")) as {
      pages: string[];
    };
    const linkEntries = meta.pages.filter((entry) => entry.startsWith("["));

    expect(linkEntries).toHaveLength(PUBLISHED_GLOSSARY_ENTRY_COUNT);
    expect(meta.pages).toEqual(
      expect.arrayContaining(
        GLOSSARY_SEPARATOR_TITLES.map((title) => `---${title}---`),
      ),
    );

    for (const slug of [
      ...TAXONOMY_GLOSSARY_SLUGS,
      ...FFN_ACTIVATION_GLOSSARY_SLUGS,
      ...POSITIONAL_GLOSSARY_SLUGS,
      ...CHAIN_GLOSSARY_SLUGS,
      ...SEQUENCE_OPERATION_GLOSSARY_SLUGS,
      ...GENERATION_GLOSSARY_SLUGS,
      "token",
    ] as const) {
      const title = EXPECTED_GLOSSARY_TITLES[slug];
      expect(
        linkEntries.some((entry) => entry.includes(`/docs/glossary/${slug}`)),
      ).toBe(true);
      expect(linkEntries.some((entry) => entry.startsWith(`[${title}]`))).toBe(
        true,
      );
    }
  });

  test("fumadocs glossary sidebar includes merged glossary families", () => {
    const glossaryFolder = source.pageTree.children.find(
      (node) => node.type === "folder" && node.name === "Glossary",
    );
    expect(glossaryFolder?.type).toBe("folder");
    if (glossaryFolder?.type !== "folder") {
      throw new Error("expected Glossary folder in docs sidebar");
    }

    const glossaryUrls = collectPageUrls(glossaryFolder.children);
    for (const slug of [
      ...TAXONOMY_GLOSSARY_SLUGS,
      ...FFN_ACTIVATION_GLOSSARY_SLUGS,
      ...POSITIONAL_GLOSSARY_SLUGS,
      ...CHAIN_GLOSSARY_SLUGS,
      ...SEQUENCE_OPERATION_GLOSSARY_SLUGS,
      ...GENERATION_GLOSSARY_SLUGS,
      "token",
    ] as const) {
      expect(glossaryUrls).toContain(`/docs/glossary/${slug}`);
    }
    expect(glossaryUrls).toHaveLength(PUBLISHED_GLOSSARY_ENTRY_COUNT);
  });

  test("glossary index lists merged published entries with localized titles", async () => {
    const entries = await loadPublishedGlossaryEntries("en");
    expect(entries).toHaveLength(PUBLISHED_GLOSSARY_ENTRY_COUNT);

    for (const slug of [
      ...TAXONOMY_GLOSSARY_SLUGS,
      ...FFN_ACTIVATION_GLOSSARY_SLUGS,
      ...POSITIONAL_GLOSSARY_SLUGS,
      ...CHAIN_GLOSSARY_SLUGS,
      ...SEQUENCE_OPERATION_GLOSSARY_SLUGS,
      ...GENERATION_GLOSSARY_SLUGS,
      "token",
    ] as const) {
      const entry = entries.find(
        (item) => item.url === `/docs/glossary/${slug}`,
      );
      expect(entry?.title).toBe(EXPECTED_GLOSSARY_TITLES[slug]);
    }
  });

  test("architecture index includes merged architecture-related glossary entries", async () => {
    const entries = await loadPublishedArchitectureEntries("en");
    expect(entries).toHaveLength(PUBLISHED_ARCHITECTURE_ENTRY_COUNT);

    expect(
      entries.some((entry) => entry.url === "/docs/glossary/architecture"),
    ).toBe(true);
    expect(
      entries.some((entry) => entry.url === "/docs/glossary/kv-cache"),
    ).toBe(true);
    expect(
      entries.some(
        (entry) => entry.url === "/docs/modules/relative-position-bias",
      ),
    ).toBe(true);
    expect(entries.some((entry) => entry.url === "/docs/glossary/token")).toBe(
      true,
    );
    expect(entries.some((entry) => entry.url === "/docs/glossary/tensor")).toBe(
      false,
    );
  });

  test("glossary and architecture index pages render merged family links", async () => {
    const glossaryHtml = renderToStaticMarkup(await GlossaryIndexPage());
    const architectureHtml = renderToStaticMarkup(
      await ArchitectureIndexPage(),
    );

    for (const [title, href] of [
      ["Architecture", "/docs/glossary/architecture"],
      ["Token", "/docs/glossary/token"],
      ["Embedding", "/docs/glossary/embedding"],
      ["KV cache", "/docs/glossary/kv-cache"],
      [
        "Absolute positional embeddings",
        "/docs/modules/absolute-positional-embeddings",
      ],
      ["Relative position bias", "/docs/modules/relative-position-bias"],
      ["Prefill", "/docs/glossary/prefill"],
      ["Sampling Overview", "/docs/glossary/sampling-overview"],
    ] as const) {
      expect(glossaryHtml).toContain(title);
      expect(glossaryHtml).toContain(`href="${href}"`);
    }

    for (const [title, href] of [
      ["Architecture", "/docs/glossary/architecture"],
      ["Foundation Model", "/docs/glossary/foundation-model"],
      ["KV cache", "/docs/glossary/kv-cache"],
      ["Decode", "/docs/glossary/decode"],
      ["Prefill", "/docs/glossary/prefill"],
      [
        "Absolute positional embeddings",
        "/docs/modules/absolute-positional-embeddings",
      ],
      ["Relative position bias", "/docs/modules/relative-position-bias"],
      ["Token", "/docs/glossary/token"],
    ] as const) {
      expect(architectureHtml).toContain(title);
      expect(architectureHtml).toContain(`href="${href}"`);
    }
  });
});
