import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DocsDescription, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { getGlossaryDocsRoot } from "@/lib/content/content-paths";
import { listPublishedGlossaryPages } from "@/lib/content/glossary";
import { expectGlossaryOmitsWhereItAppears } from "@/lib/content/glossary-test-helpers";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";

async function renderTokenGlossaryShell(): Promise<string> {
  const loadedPage = await loadLocalDocsPage({
    section: "glossary",
    slug: "token",
  });

  return renderToStaticMarkup(
    createElement(
      "div",
      null,
      createElement(DocsTitle, null, loadedPage.messages.title),
      createElement(DocsDescription, null, loadedPage.messages.description),
      createElement(
        "article",
        { "data-registry-id": loadedPage.frontmatter.registryId },
        createElement(ModulePageProviders, {
          messages: loadedPage.messages,
          assets: loadedPage.assets,
          // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
          children: loadedPage.content,
        }),
      ),
    ),
  );
}

describe("glossary where-it-appears convergence", () => {
  test("canonical glossary template omits where-it-appears section", () => {
    const template = readFileSync(
      join(process.cwd(), "docs/templates/glossary.mdx"),
      "utf8",
    );

    expect(template).not.toContain('id="where-it-appears"');
    expect(template).not.toContain("DerivedRelatedDocs");
  });

  test("published glossary pages omit where-it-appears section", async () => {
    const pages = await listPublishedGlossaryPages();
    const root = getGlossaryDocsRoot();

    for (const page of pages) {
      const raw = readFileSync(join(root, page.slug, "page.mdx"), "utf8");
      expect(raw).not.toContain('id="where-it-appears"');
      expect(raw).not.toContain("DerivedRelatedDocs");
    }
  });

  test("/docs/glossary/token omits where-it-appears while keeping related and concept map", async () => {
    const html = await renderTokenGlossaryShell();

    expectGlossaryOmitsWhereItAppears(html);
    expect(html).toContain("Related Concepts And Modules");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-page-asset="conceptMap"');
  });
});
