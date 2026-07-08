/**
 * Slice verification for the multimodal tokenization module page bundle.
 * Routine bundle invariants are covered by validate-data; this file proves
 * observable route rendering, related docs, and introductory narrative wiring.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildDocsPageMetadata,
  renderDocsSlugPage,
} from "@/app/docs/docs-slug-renderer";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { loadModulePage } from "@/lib/content/module-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getModuleById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";

const REGISTRY_ID = "module.multimodal-tokenization";
const SLUG = "multimodal-tokenization";
const PAGE_URL = "/docs/modules/multimodal-tokenization";
const GRAPH_ID = "graph.multimodal-tokenization-compute-flow";
const TABLE_ID = "table.multimodal-tokenization-comparison";

const pageDir = getDocsPageDir("modules", SLUG);
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

async function renderMultimodalTokenizationPageHtml(): Promise<string> {
  const page = await loadModulePage(SLUG);
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("multimodal tokenization module page slice (multimodal-tokenization-module-page-003)", () => {
  test("published route, registry record, bundled messages, and assets stay aligned", async () => {
    const record = getModuleById(REGISTRY_ID);
    const page = await loadLocalDocsPage({
      section: "modules",
      slug: SLUG,
    });
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const bundledAssets = JSON.parse(readFileSync(assetsPath, "utf8"));

    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe(SLUG);
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("module");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.description).toBe(bundledMessages.description);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(bundledAssets.computeFlow).toMatchObject({
      type: "graph",
      graphId: GRAPH_ID,
    });
    expect(bundledAssets.comparisonTable).toMatchObject({
      type: "table",
      tableId: TABLE_ID,
    });
  });

  test("app route metadata and English render resolve without missing-content placeholders", async () => {
    const metadata = await buildDocsPageMetadata(["modules", SLUG]);
    expect(metadata.alternates).toEqual({
      canonical: PAGE_URL,
      languages: {
        en: PAGE_URL,
      },
    });
    expect(metadata.title).toContain("Multimodal Tokenization");

    const rendered = await renderDocsSlugPage(["modules", SLUG], "en");
    expect(rendered).toBeDefined();
  });

  test(
    "rendered page exposes introductory narrative, teaching assets, related docs, and tags",
    async () => {
      const page = await loadModulePage(SLUG);
      const shellHtml = renderModuleDocsShell(page);
      const contentHtml = await renderMultimodalTokenizationPageHtml();
      const record = getModuleById(REGISTRY_ID);
      if (!record) {
        throw new Error("expected module.multimodal-tokenization in registry");
      }

      const related = deriveCuratedRelatedItems(
        record,
        listRelatedRegistryRecords(),
        PUBLISHED_DOCS_REGISTRY_IDS,
      );

      expect(shellHtml).toContain("Multimodal Tokenization");
      expect(shellHtml).toContain("token-like embeddings");
      expect(contentHtml).toContain("image patches");
      expect(contentHtml).toContain("audio");
      expect(contentHtml).toContain("video");
      expect(contentHtml).toContain("modality adapter");
      expect(contentHtml).toContain("finite vocabulary");
      expect(contentHtml).toContain(`data-graph-id="${GRAPH_ID}"`);
      expect(contentHtml).toContain(`data-table-id="${TABLE_ID}"`);
      expect(contentHtml).toContain('data-testid="tag-pill-list"');
      expect(contentHtml).toContain('href="/tags/tokenization"');
      expect(contentHtml).toContain('data-testid="curated-related-docs"');
      expect(contentHtml).toContain(
        'href="/docs/modules/clip-image-tokenization"',
      );
      expect(contentHtml).toContain('href="/docs/glossary/token"');
      expect(contentHtml).toContain('data-testid="citation-list"');
      expect(contentHtml).not.toContain("Reader Shortcut");
      expect(contentHtml).not.toMatch(/\{\{[^}]+\}\}/);
      expect(related.length).toBeGreaterThan(0);
    },
    { timeout: 15_000 },
  );
});
