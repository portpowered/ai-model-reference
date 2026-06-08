import { describe, expect, test } from "bun:test";
import type { Node } from "fumadocs-core/page-tree";
import { source } from "@/lib/source";

const GLOSSARY_INDEX_URLS = [
  "/docs/glossary/alignment",
  "/docs/glossary/architecture",
  "/docs/glossary/autoregressive-generation",
  "/docs/glossary/component",
  "/docs/glossary/conditioning",
  "/docs/glossary/decoder",
  "/docs/glossary/denoising-generation",
  "/docs/glossary/diffusion-model",
  "/docs/glossary/discriminative-model",
  "/docs/glossary/emergent-behavior",
  "/docs/glossary/encoder",
  "/docs/glossary/encoder-decoder",
  "/docs/glossary/foundation-model",
  "/docs/glossary/generalization",
  "/docs/glossary/generative-model",
  "/docs/glossary/latent",
  "/docs/glossary/latent-space",
  "/docs/glossary/modality",
  "/docs/glossary/model",
  "/docs/glossary/model-capacity",
  "/docs/glossary/module",
  "/docs/glossary/multimodal-model",
  "/docs/glossary/overfitting",
  "/docs/glossary/patch",
  "/docs/glossary/perplexity",
  "/docs/glossary/representation",
  "/docs/glossary/scaling-law",
  "/docs/glossary/token",
  "/docs/glossary/transformer",
  "/docs/glossary/world-model",
  "/docs/glossary/embedding",
  "/docs/glossary/tensor",
  "/docs/glossary/vector",
  "/docs/glossary/hidden-size",
  "/docs/glossary/logit",
  "/docs/glossary/softmax",
  "/docs/glossary/entropy",
  "/docs/glossary/temperature",
  "/docs/glossary/parameter",
  "/docs/glossary/activation",
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
