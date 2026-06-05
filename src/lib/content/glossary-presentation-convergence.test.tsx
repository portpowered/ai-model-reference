import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DocsDescription, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  expectGlossaryBodyOmitsTitleHeading,
  expectGlossaryOmitsWhereItAppears,
  expectGlossaryPresentationConvergence,
  extractGlossaryArticleHtml,
} from "@/lib/content/glossary-test-helpers";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { assertDocsShellConvergence } from "@/lib/verify/docs-shell-convergence";

function countH1BlocksContaining(html: string, text: string): number {
  const h1Pattern = /<h1\b[^>]*>[\s\S]*?<\/h1>/gi;
  const blocks = html.match(h1Pattern) ?? [];
  return blocks.filter((block) => block.includes(text)).length;
}

async function renderTokenGlossaryPresentationShell(): Promise<{
  html: string;
  title: string;
  openingSummary: string;
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
    openingSummary: loadedPage.messages.openingSummary ?? "",
  };
}

describe("glossary presentation convergence", () => {
  test("/docs/glossary/token satisfies the full Phase 1 presentation contract", async () => {
    const { html, title, openingSummary } =
      await renderTokenGlossaryPresentationShell();
    const articleHtml = extractGlossaryArticleHtml(html, "concept.token");

    expect(articleHtml.length).toBeGreaterThan(0);
    expectGlossaryPresentationConvergence(articleHtml, {
      title,
      openingSummary,
    });
    expect(countH1BlocksContaining(html, title)).toBe(1);
    expect(articleHtml).toContain('data-testid="curated-related-docs"');
    expect(articleHtml).toContain('data-page-asset="conceptMap"');
  });

  test("token article body omits pre-repair duplicate title and crowded sections", async () => {
    const { html, title } = await renderTokenGlossaryPresentationShell();
    const articleHtml = extractGlossaryArticleHtml(html, "concept.token");

    expectGlossaryBodyOmitsTitleHeading(articleHtml, title);
    expect(articleHtml).not.toContain('<T k="problemStatement" />');
    expect(articleHtml).not.toContain('<T k="coreIdea" />');
  });
});

describe("glossary presentation route convergence (built HTML)", () => {
  test("/docs/glossary/token built HTML passes docs shell convergence", () => {
    const builtPath = join(
      process.cwd(),
      ".next/server/app/docs/glossary/token.html",
    );

    if (!existsSync(builtPath)) {
      return;
    }

    const html = readFileSync(builtPath, "utf8");
    const articleHtml = extractGlossaryArticleHtml(html, "concept.token");

    expect(assertDocsShellConvergence(html)).toBeNull();
    expect(articleHtml).toContain('data-testid="glossary-opening"');
    expect(
      (articleHtml.match(/data-testid="tag-pill-list"/g) ?? []).length,
    ).toBe(1);
    expectGlossaryOmitsWhereItAppears(articleHtml);
  });
});
