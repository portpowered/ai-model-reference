import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { loadModulePage } from "@/lib/content/module-page";
import { docsSearchApi } from "@/lib/search/search-server";
import { source } from "@/lib/source";
import {
  getContentRoot,
  getModulesDocsRoot,
  getRegistryRoot,
} from "./content-paths";
import { loadRegistry } from "./registry";
import { validateGeneratedPageBundle } from "./validate-generated-page-bundle";

const WORDPIECE_SLUG = "wordpiece";

/**
 * Routine published page-bundle checks are covered by derived validation.
 * `validateGeneratedPageBundle` here guards the page-generation workflow slice.
 */
describe("wordpiece generation and discovery contract", () => {
  test("page-generation workflow validates the committed WordPiece bundle", async () => {
    expect(source.getPage(["modules", WORDPIECE_SLUG])).toBeDefined();

    const modulesDocsRoot = getModulesDocsRoot();
    const pageDirectory = join(modulesDocsRoot, WORDPIECE_SLUG);
    const registryRoot = getRegistryRoot();
    const indexes = await loadRegistry({ registryRoot });

    const errors = await validateGeneratedPageBundle({
      registryRoot,
      docsRoot: join(getContentRoot(), "docs"),
      pageDirectory,
      registryPath: join(registryRoot, "modules", `${WORDPIECE_SLUG}.json`),
      pageUrl: `/docs/modules/${WORDPIECE_SLUG}`,
      indexes,
    });

    expect(errors).toEqual([]);
  });

  test("stays directly discoverable for representative WordPiece queries", async () => {
    const results = await docsSearchApi.search("wordpiece tokenizer");

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe("/docs/modules/wordpiece");
  });

  test("renders the required nearby concept and module links from the WordPiece surface", async () => {
    const page = await loadModulePage(WORDPIECE_SLUG);
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/glossary/token"');
    expect(html).toContain('href="/docs/concepts/embedding"');
    expect(html).toContain('href="/docs/glossary/encoder"');
    expect(html).toContain('href="/docs/modules/bidirectional-attention"');
  });

  test("stays reachable through the shipped token -> tokenizers overview discovery path", async () => {
    const tokenPage = await loadGlossaryPage("token");
    const tokenHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: tokenPage.messages,
        assets: tokenPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: tokenPage.content,
      }),
    );

    expect(tokenHtml).toContain('data-testid="curated-related-docs"');
    expect(tokenHtml).toContain('href="/docs/concepts/tokenizers-overview"');

    const tokenizerOverviewPage = await loadConceptPage("tokenizers-overview");
    const tokenizerOverviewHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: tokenizerOverviewPage.messages,
        assets: tokenizerOverviewPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: tokenizerOverviewPage.content,
      }),
    );

    expect(tokenizerOverviewHtml).toContain(
      'data-testid="curated-related-docs"',
    );
    expect(tokenizerOverviewHtml).toContain('href="/docs/modules/wordpiece"');
    expect(tokenizerOverviewHtml).toContain("WordPiece");
  });
});
