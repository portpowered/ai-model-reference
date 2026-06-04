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
  token: "Token",
};

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

    expect(meta.pages).toHaveLength(10);
    for (const slug of [...TAXONOMY_GLOSSARY_SLUGS, "token"] as const) {
      const title = EXPECTED_GLOSSARY_TITLES[slug];
      expect(
        meta.pages.some((entry) => entry.includes(`/docs/glossary/${slug}`)),
      ).toBe(true);
      expect(meta.pages.some((entry) => entry.startsWith(`[${title}]`))).toBe(
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
    for (const slug of [...TAXONOMY_GLOSSARY_SLUGS, "token"] as const) {
      expect(glossaryUrls).toContain(`/docs/glossary/${slug}`);
    }
    expect(glossaryUrls).toHaveLength(10);
  });

  test("glossary index lists ten entries with localized titles sorted by title", async () => {
    const entries = await loadPublishedGlossaryEntries("en");
    expect(entries).toHaveLength(10);

    for (const slug of TAXONOMY_GLOSSARY_SLUGS) {
      const entry = entries.find(
        (item) => item.url === `/docs/glossary/${slug}`,
      );
      expect(entry?.title).toBe(EXPECTED_GLOSSARY_TITLES[slug]);
      expect(entry?.title).not.toContain("-");
    }

    const token = entries.find((item) => item.url === "/docs/glossary/token");
    expect(token?.title).toBe("Token");
  });

  test("architecture index includes architecture taxonomy and other taxonomy entries", async () => {
    const entries = await loadPublishedArchitectureEntries("en");
    expect(entries).toHaveLength(10);

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

    const token = entries.find((entry) => entry.url === "/docs/glossary/token");
    expect(token?.title).toBe("Token");
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
    expect(architectureHtml).toContain('href="/docs/glossary/token"');
  });
});
