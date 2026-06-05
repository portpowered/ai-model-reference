import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DocsDescription, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { getGlossaryDocsRoot } from "@/lib/content/content-paths";
import { listPublishedGlossaryPages } from "@/lib/content/glossary";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";

const TOKEN_DESCRIPTION_SNIPPET =
  "The smallest unit of text a language model reads and predicts";

function countH1BlocksContaining(html: string, text: string): number {
  const h1Pattern = /<h1\b[^>]*>[\s\S]*?<\/h1>/gi;
  const blocks = html.match(h1Pattern) ?? [];
  return blocks.filter((block) => block.includes(text)).length;
}

function extractTokenArticleHtml(html: string): string {
  const match = html.match(
    /<article[^>]*data-registry-id="concept\.token"[^>]*>[\s\S]*?<\/article>/,
  );
  return match?.[0] ?? "";
}

async function renderTokenGlossaryTitleShell(): Promise<string> {
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
    const html = await renderTokenGlossaryTitleShell();

    expect(countH1BlocksContaining(html, "Token")).toBe(1);
    expect(html).toContain(TOKEN_DESCRIPTION_SNIPPET);
    expect(extractTokenArticleHtml(html)).not.toMatch(
      /<h1\b[^>]*>\s*Token\s*<\/h1>/i,
    );
  });
});
