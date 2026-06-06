import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DocsDescription, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { getGlossaryDocsRoot } from "@/lib/content/content-paths";
import { listPublishedGlossaryPages } from "@/lib/content/glossary";
import {
  expectGlossaryBodyOmitsShellDescription,
  expectGlossaryBodyOmitsTitleHeading,
  extractGlossaryArticleHtml,
} from "@/lib/content/glossary-test-helpers";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";

const TOKEN_DESCRIPTION_SNIPPET =
  "The smallest unit of text a language model reads and predicts";

function countH1BlocksContaining(html: string, text: string): number {
  const h1Pattern = /<h1\b[^>]*>[\s\S]*?<\/h1>/gi;
  const blocks = html.match(h1Pattern) ?? [];
  return blocks.filter((block) => block.includes(text)).length;
}

async function renderTokenGlossaryTitleShell(): Promise<{
  html: string;
  title: string;
  description: string;
}> {
  const loadedPage = await loadLocalDocsPage({
    section: "glossary",
    slug: "token",
  });

  const html = renderToStaticMarkup(
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

  return {
    html,
    title: loadedPage.messages.title,
    description: loadedPage.messages.description,
  };
}

describe("glossary shell title convergence", () => {
  test("canonical glossary template omits in-body title heading", () => {
    const template = readFileSync(
      join(process.cwd(), "docs/templates/glossary.mdx"),
      "utf8",
    );

    expect(template).not.toContain('# <T k="title" />');
  });

  test("published glossary pages omit in-body title heading", async () => {
    const pages = await listPublishedGlossaryPages();
    const root = getGlossaryDocsRoot();

    for (const page of pages) {
      const raw = readFileSync(join(root, page.slug, "page.mdx"), "utf8");
      expect(raw).not.toContain('# <T k="title" />');
    }
  });

  test("/docs/glossary/token renders one DocsTitle and no duplicate body h1", async () => {
    const { html, title, description } = await renderTokenGlossaryTitleShell();
    const articleHtml = extractGlossaryArticleHtml(html, "concept.token");

    expect(countH1BlocksContaining(html, title)).toBe(1);
    expect(html).toContain(TOKEN_DESCRIPTION_SNIPPET);
    expectGlossaryBodyOmitsTitleHeading(articleHtml, title);
    expectGlossaryBodyOmitsShellDescription(articleHtml, description);
  });
});
