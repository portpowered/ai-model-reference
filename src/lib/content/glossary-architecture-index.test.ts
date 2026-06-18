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
  token: "Token",
  embedding: "Embedding",
  tensor: "Tensor",
  vector: "Vector",
  logit: "Logit",
  softmax: "Softmax",
  entropy: "Entropy",
  temperature: "Temperature",
  parameter: "Parameter",
  activation: "Activation",
  relu: "ReLU",
  "leaky-relu": "LeakyReLU",
  silu: "SiLU",
  "computational-graph": "Computational Graph",
  gradient: "Gradient",
  backpropagation: "Backpropagation",
  "loss-function": "Loss Function",
  "optimizer-state": "Optimizer State",
  "standard-ffn": "Standard FFN",
  swiglu: "SwiGLU",
};

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
  "relu",
  "leaky-relu",
  "silu",
  "computational-graph",
  "gradient",
  "backpropagation",
  "loss-function",
  "optimizer-state",
] as const;
const PUBLISHED_GLOSSARY_ENTRY_COUNT = 59;
const PUBLISHED_ARCHITECTURE_ENTRY_COUNT = 52;
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
  test("glossary meta.json lists token and all nine taxonomy pages", async () => {
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
      ...CHAIN_GLOSSARY_SLUGS,
      "standard-ffn",
      "swiglu",
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

  test("fumadocs glossary sidebar includes all taxonomy glossary URLs", () => {
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
      ...CHAIN_GLOSSARY_SLUGS,
      "standard-ffn",
      "swiglu",
      "token",
    ] as const) {
      expect(glossaryUrls).toContain(`/docs/glossary/${slug}`);
    }
    expect(glossaryUrls).toHaveLength(PUBLISHED_GLOSSARY_ENTRY_COUNT);
  });

  test("glossary index lists published entries with localized titles sorted by title", async () => {
    const entries = await loadPublishedGlossaryEntries("en");
    expect(entries).toHaveLength(PUBLISHED_GLOSSARY_ENTRY_COUNT);

    for (const slug of TAXONOMY_GLOSSARY_SLUGS) {
      const entry = entries.find(
        (item) => item.url === `/docs/glossary/${slug}`,
      );
      expect(entry?.title).toBe(EXPECTED_GLOSSARY_TITLES[slug]);
      if (slug !== "latent-space") {
        expect(entry?.title).not.toContain("-");
      }
    }

    const token = entries.find((item) => item.url === "/docs/glossary/token");
    expect(token?.title).toBe("Token");

    const standardFfn = entries.find(
      (item) => item.url === "/docs/glossary/standard-ffn",
    );
    expect(standardFfn?.title).toBe("Standard FFN");

    const swiglu = entries.find((item) => item.url === "/docs/glossary/swiglu");
    expect(swiglu?.title).toBe("SwiGLU");

    for (const slug of CHAIN_GLOSSARY_SLUGS) {
      const entry = entries.find(
        (item) => item.url === `/docs/glossary/${slug}`,
      );
      expect(entry?.title).toBe(EXPECTED_GLOSSARY_TITLES[slug]);
    }
  });

  test("architecture index includes architecture taxonomy and other taxonomy entries", async () => {
    const entries = await loadPublishedArchitectureEntries("en");
    expect(entries).toHaveLength(PUBLISHED_ARCHITECTURE_ENTRY_COUNT);

    const architecture = entries.find(
      (entry) => entry.url === "/docs/glossary/architecture",
    );
    expect(architecture?.title).toBe("Architecture");

    for (const slug of TAXONOMY_GLOSSARY_SLUGS) {
      const entry = entries.find(
        (item) => item.url === `/docs/glossary/${slug}`,
      );
      expect(entry?.title).toBe(EXPECTED_GLOSSARY_TITLES[slug]);
    }

    const standardFfn = entries.find(
      (entry) => entry.url === "/docs/glossary/standard-ffn",
    );
    expect(standardFfn?.title).toBe("Standard FFN");

    const swiglu = entries.find(
      (entry) => entry.url === "/docs/glossary/swiglu",
    );
    expect(swiglu?.title).toBe("SwiGLU");

    const token = entries.find((entry) => entry.url === "/docs/glossary/token");
    expect(token?.title).toBe("Token");

    const embedding = entries.find(
      (entry) => entry.url === "/docs/glossary/embedding",
    );
    expect(embedding?.title).toBe("Embedding");
    expect(entries.some((entry) => entry.url === "/docs/glossary/tensor")).toBe(
      false,
    );
  });

  test("glossary and architecture index pages render taxonomy links with localized titles", async () => {
    const glossaryHtml = renderToStaticMarkup(await GlossaryIndexPage());
    const architectureHtml = renderToStaticMarkup(
      await ArchitectureIndexPage(),
    );

    for (const slug of TAXONOMY_GLOSSARY_SLUGS) {
      const title = EXPECTED_GLOSSARY_TITLES[slug];
      expect(glossaryHtml).toContain(title);
      expect(glossaryHtml).toContain(`href="/docs/glossary/${slug}"`);
      expect(architectureHtml).toContain(title);
      expect(architectureHtml).toContain(`href="/docs/glossary/${slug}"`);
    }

    expect(glossaryHtml).toContain("Token");
    expect(glossaryHtml).toContain('href="/docs/glossary/token"');
    expect(glossaryHtml).toContain("Embedding");
    expect(glossaryHtml).toContain('href="/docs/glossary/embedding"');
    expect(glossaryHtml).toContain("Tensor");
    expect(glossaryHtml).toContain('href="/docs/glossary/tensor"');
    expect(glossaryHtml).toContain("Logit");
    expect(glossaryHtml).toContain('href="/docs/glossary/logit"');
    expect(glossaryHtml).toContain("Softmax");
    expect(glossaryHtml).toContain('href="/docs/glossary/softmax"');
    expect(glossaryHtml).toContain("Entropy");
    expect(glossaryHtml).toContain('href="/docs/glossary/entropy"');
    expect(glossaryHtml).toContain("Temperature");
    expect(glossaryHtml).toContain('href="/docs/glossary/temperature"');
    expect(glossaryHtml).toContain("Parameter");
    expect(glossaryHtml).toContain('href="/docs/glossary/parameter"');
    expect(glossaryHtml).toContain("Activation");
    expect(glossaryHtml).toContain('href="/docs/glossary/activation"');
    expect(glossaryHtml).toContain("ReLU");
    expect(glossaryHtml).toContain('href="/docs/glossary/relu"');
    expect(glossaryHtml).toContain("LeakyReLU");
    expect(glossaryHtml).toContain('href="/docs/glossary/leaky-relu"');
    expect(glossaryHtml).toContain("SiLU");
    expect(glossaryHtml).toContain('href="/docs/glossary/silu"');
    expect(glossaryHtml).toContain("SwiGLU");
    expect(glossaryHtml).toContain('href="/docs/glossary/swiglu"');
    expect(glossaryHtml).toContain("Computational Graph");
    expect(glossaryHtml).toContain('href="/docs/glossary/computational-graph"');
    expect(architectureHtml).toContain("Activation");
    expect(architectureHtml).toContain('href="/docs/glossary/activation"');
    expect(architectureHtml).toContain("ReLU");
    expect(architectureHtml).toContain('href="/docs/glossary/relu"');
    expect(architectureHtml).toContain("LeakyReLU");
    expect(architectureHtml).toContain('href="/docs/glossary/leaky-relu"');
    expect(architectureHtml).toContain("SiLU");
    expect(architectureHtml).toContain('href="/docs/glossary/silu"');
    expect(architectureHtml).toContain("SwiGLU");
    expect(architectureHtml).toContain('href="/docs/glossary/swiglu"');
    expect(architectureHtml).toContain("Computational Graph");
    expect(architectureHtml).toContain(
      'href="/docs/glossary/computational-graph"',
    );
    expect(architectureHtml).not.toContain('href="/docs/glossary/parameter"');
    expect(architectureHtml).toContain("Embedding");
    expect(architectureHtml).toContain('href="/docs/glossary/embedding"');
    expect(architectureHtml).not.toContain('href="/docs/glossary/tensor"');
  });
});
