import { describe, expect, test } from "bun:test";
import { renderGlossaryDocsShell } from "@/lib/content/glossary-shell-render";
import {
  expectGlossaryBodyOmitsTitleHeading,
  expectGlossaryBuiltRoutePresentationConvergence,
  expectGlossaryOmitsOpeningSummary,
  expectGlossaryOmitsWhereItAppears,
  expectGlossaryPresentationConvergence,
  expectGlossaryShellPresentationConvergence,
  expectHtmlToContainProse,
  extractGlossaryArticleHtml,
} from "@/lib/content/glossary-test-helpers";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { readBuiltHtmlForConvergenceTests } from "@/lib/verify/built-html-convergence-test-helpers";
import { assertDocsShellConvergence } from "@/lib/verify/docs-shell-convergence";
import { shouldRunBuiltHtmlConvergenceTests } from "@/lib/verify/server-lifecycle";

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
    expectGlossaryShellPresentationConvergence(html);
    expectGlossaryPresentationConvergence(articleHtml, {
      title,
    });
    expect(countH1BlocksContaining(html, title)).toBe(1);
    expect(articleHtml).toContain('data-testid="curated-related-docs"');
    expect(articleHtml).toContain('data-page-asset="conceptMap"');
  });

  test("/docs/glossary/embedding shell omits opening summary and auto-links description phrases", async () => {
    const loadedPage = await loadLocalDocsPage({
      section: "glossary",
      slug: "embedding",
    });
    const html = renderGlossaryDocsShell(loadedPage);

    expectHtmlToContainProse(
      html,
      "A dense vector that represents a token or other discrete item",
    );
    expectGlossaryShellPresentationConvergence(html, {
      shellDescriptionAutoLinks: [
        { href: "/docs/glossary/vector", phrase: "dense vector" },
        { href: "/docs/glossary/token", phrase: "token" },
      ],
    });
  });

  test("/docs/glossary/vector shell omits opening summary and auto-links description phrases", async () => {
    const loadedPage = await loadLocalDocsPage({
      section: "glossary",
      slug: "vector",
    });
    const html = renderGlossaryDocsShell(loadedPage);

    expectHtmlToContainProse(
      html,
      "An ordered list of numbers that represents a point or direction in continuous space",
    );
    expectGlossaryShellPresentationConvergence(html, {
      shellDescriptionAutoLinks: [
        { href: "/docs/concepts/embedding", phrase: "embeddings" },
      ],
    });
  });

  test("/docs/glossary/hidden-size shell omits opening summary and auto-links description phrases", async () => {
    const loadedPage = await loadLocalDocsPage({
      section: "glossary",
      slug: "hidden-size",
    });
    const html = renderGlossaryDocsShell(loadedPage);

    expectHtmlToContainProse(
      html,
      "The width of a model's internal vectors—the number of dimensions in each token embedding",
    );
    expectGlossaryShellPresentationConvergence(html, {
      shellDescriptionAutoLinks: [
        { href: "/docs/glossary/vector", phrase: "vectors" },
        { href: "/docs/concepts/embedding", phrase: "token embedding" },
        { href: "/docs/glossary/token", phrase: "token" },
      ],
    });
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
  if (!shouldRunBuiltHtmlConvergenceTests()) {
    test("skips built HTML probes during coverage subprocess rerun", () => {});
    return;
  }

  const bridgeBuiltRoutes: Array<{
    slug: string;
    registryId: string;
    title: string;
    shellDescriptionAutoLinks?: Array<{ href: string; phrase?: string }>;
  }> = [
    {
      slug: "embedding",
      registryId: "concept.embedding",
      title: "Embedding",
      shellDescriptionAutoLinks: [
        { href: "/docs/glossary/vector", phrase: "dense vector" },
        { href: "/docs/glossary/token", phrase: "token" },
      ],
    },
    {
      slug: "vector",
      registryId: "concept.vector",
      title: "Vector",
      shellDescriptionAutoLinks: [
        { href: "/docs/concepts/embedding", phrase: "embeddings" },
      ],
    },
    {
      slug: "hidden-size",
      registryId: "concept.hidden-size",
      title: "Hidden Size",
      shellDescriptionAutoLinks: [
        { href: "/docs/glossary/vector", phrase: "vectors" },
        { href: "/docs/concepts/embedding", phrase: "token embedding" },
        { href: "/docs/glossary/token", phrase: "token" },
      ],
    },
  ];

  function readBuiltGlossaryHtml(slug: string): string | null {
    return readBuiltHtmlForConvergenceTests(
      `.next/server/app/docs/glossary/${slug}.html`,
    );
  }

  test("/docs/glossary/token built HTML passes docs shell convergence", () => {
    const html = readBuiltGlossaryHtml("token");
    if (!html) {
      return;
    }

    const articleHtml = extractGlossaryArticleHtml(html, "concept.token");

    expect(assertDocsShellConvergence(html)).toBeNull();
    expectGlossaryBuiltRoutePresentationConvergence(html, {
      registryId: "concept.token",
      title: "Token",
    });
    expectGlossaryOmitsOpeningSummary(articleHtml);
    expect(
      (articleHtml.match(/data-testid="tag-pill-list"/g) ?? []).length,
    ).toBe(1);
    expectGlossaryOmitsWhereItAppears(articleHtml);
  });

  for (const route of bridgeBuiltRoutes) {
    test(`/docs/glossary/${route.slug} built HTML passes bridge presentation convergence`, () => {
      const html = readBuiltGlossaryHtml(route.slug);
      if (!html) {
        return;
      }

      expect(assertDocsShellConvergence(html)).toBeNull();
      expectGlossaryBuiltRoutePresentationConvergence(html, {
        registryId: route.registryId,
        title: route.title,
        shellDescriptionAutoLinks: route.shellDescriptionAutoLinks,
      });
    });
  }
});
