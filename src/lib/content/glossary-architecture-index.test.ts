import { describe, expect, test } from "bun:test";
import type { Node } from "fumadocs-core/page-tree";
import { renderToStaticMarkup } from "react-dom/server";
import ArchitectureIndexPage from "@/app/(site)/docs/architecture/page";
import GlossaryIndexPage from "@/app/(site)/docs/glossary/page";
import { loadPublishedArchitectureEntries } from "@/lib/content/architecture";
import { loadPublishedGlossaryEntries } from "@/lib/content/glossary";
import { buildGeneratedDocsPageTree } from "@/lib/navigation/generated-docs-page-tree";

const GLOSSARY_SEPARATOR_TITLES = [
  "Model Taxonomy",
  "Sequence And Attention",
  "Math And Training",
  "Generation And Diffusion",
] as const;

const ARCHITECTURE_CONCEPT_URLS = [
  "/docs/concepts/alibi",
  "/docs/concepts/context-extension",
  "/docs/concepts/kv-cache",
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

function getGlossaryFolder() {
  const pageTree = buildGeneratedDocsPageTree({ name: "Docs", children: [] });
  const glossaryFolder = pageTree.children.find(
    (node) => node.type === "folder" && node.name === "Glossary",
  );
  expect(glossaryFolder?.type).toBe("folder");
  if (glossaryFolder?.type !== "folder") {
    throw new Error("expected Glossary folder in docs sidebar");
  }
  return glossaryFolder;
}

describe("Phase 2 glossary and architecture index navigation (US-007)", () => {
  test("generated glossary sidebar lists current glossary families and separators", async () => {
    const entries = await loadPublishedGlossaryEntries("en");
    const glossaryFolder = getGlossaryFolder();

    const separatorTitles = glossaryFolder.children
      .filter((node) => node.type === "separator")
      .map((node) => node.name);
    const linkNodes = glossaryFolder.children.filter(
      (node): node is Extract<Node, { type: "page" }> => node.type === "page",
    );

    expect(linkNodes).toHaveLength(entries.length);
    expect(separatorTitles).toEqual(
      expect.arrayContaining([...GLOSSARY_SEPARATOR_TITLES]),
    );

    for (const entry of entries) {
      expect(linkNodes.some((node) => node.url === entry.url)).toBe(true);
      expect(linkNodes.some((node) => node.name === entry.title)).toBe(true);
    }
  });

  test("fumadocs glossary sidebar includes the shipped glossary surface", async () => {
    const entries = await loadPublishedGlossaryEntries("en");
    const glossaryFolder = getGlossaryFolder();
    const glossaryUrls = collectPageUrls(glossaryFolder.children);

    for (const entry of entries) {
      expect(glossaryUrls).toContain(entry.url);
    }
    expect(glossaryUrls).toHaveLength(entries.length);
  });

  test("glossary index lists shipped published entries with localized titles", async () => {
    const entries = await loadPublishedGlossaryEntries("en");
    const glossaryFolder = getGlossaryFolder();
    const glossaryUrls = collectPageUrls(glossaryFolder.children).sort();

    expect(entries.map((entry) => entry.url).sort()).toEqual(glossaryUrls);

    for (const entry of entries) {
      const indexEntry = entries.find((item) => item.url === entry.url);
      expect(indexEntry?.title).toBe(entry.title);
    }
  });

  test("architecture index includes current architecture-related glossary and concept entries", async () => {
    const entries = await loadPublishedArchitectureEntries("en");
    expect(entries.length).toBeGreaterThan(0);

    for (const url of [
      "/docs/glossary/architecture",
      "/docs/glossary/kv-cache",
      "/docs/glossary/normalization",
      "/docs/glossary/residual-connection",
      "/docs/glossary/special-tokens",
      "/docs/glossary/token",
      "/docs/concepts/prefill",
      "/docs/concepts/alignment",
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
      ["Sampling Overview", "/docs/glossary/sampling-overview"],
    ] as const) {
      expect(glossaryHtml).toContain(title);
      expect(glossaryHtml).toContain(`href="${href}"`);
    }

    for (const [title, href] of [
      ["Attention with linear biases (ALiBi)", "/docs/concepts/alibi"],
      ["Architecture", "/docs/glossary/architecture"],
      ["Foundation Model", "/docs/glossary/foundation-model"],
      ["Key-value cache", "/docs/concepts/kv-cache"],
      ["Decode", "/docs/glossary/decode"],
      ["Prefill", "/docs/concepts/prefill"],
      ["Positional encodings", "/docs/concepts/positional-encodings"],
      ["Token", "/docs/glossary/token"],
      ["Transformer architecture", "/docs/concepts/transformer-architecture"],
    ] as const) {
      expect(architectureHtml).toContain(title);
      expect(architectureHtml).toContain(`href="${href}"`);
    }
  });
});
