import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderGlossaryDocsShell } from "@/lib/content/glossary-shell-render";
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
}> {
  const loadedPage = await loadLocalDocsPage({
    section: "glossary",
    slug: "token",
  });

  const html = renderGlossaryDocsShell(loadedPage);

  return {
    html,
    title: loadedPage.messages.title,
  };
}

describe("glossary presentation convergence", () => {
  test("/docs/glossary/token satisfies the full Phase 1 presentation contract", async () => {
    const { html, title } = await renderTokenGlossaryPresentationShell();
    const articleHtml = extractGlossaryArticleHtml(html, "concept.token");

    expect(articleHtml.length).toBeGreaterThan(0);
    expectGlossaryPresentationConvergence(articleHtml, {
      title,
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
    expect(articleHtml).not.toContain('data-testid="glossary-opening"');
    expect(
      (articleHtml.match(/data-testid="tag-pill-list"/g) ?? []).length,
    ).toBe(1);
    expectGlossaryOmitsWhereItAppears(articleHtml);
  });
});
