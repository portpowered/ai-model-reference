import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { glossaryPageHref } from "@/lib/content/content-hrefs";
import { GLOSSARY_DOCS_ROOT } from "@/lib/content/content-paths";
import { renderGlossaryDocsShell } from "@/lib/content/glossary-shell-render";
import {
  expectGlossaryBodyOmitsTitleHeading,
  expectGlossaryBuiltRoutePresentationConvergence,
  expectGlossaryOmitsOpeningSummary,
  expectGlossaryOpeningSummaryMessage,
  expectGlossaryPresentationConvergence,
  expectGlossaryShellPresentationConvergence,
  expectHtmlToContainProse,
  extractGlossaryArticleHtml,
} from "@/lib/content/glossary-test-helpers";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  TARGET_PATH_REGISTRY_IDS,
  type TargetPathRegistryId,
} from "@/lib/content/phase-2-token-probability-path-inventory";
import { getRegistryRecordById } from "@/lib/content/registry-runtime";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { source } from "@/lib/source";
import { readBuiltHtmlForConvergenceTests } from "@/lib/verify/built-html-convergence-test-helpers";
import { assertDocsShellConvergence } from "@/lib/verify/docs-shell-convergence";
import { shouldRunBuiltHtmlConvergenceTests } from "@/lib/verify/server-lifecycle";

const TARGET_PATH_SLUGS = ["token", "embedding", "logit", "softmax"] as const;

type TargetPathSlug = (typeof TARGET_PATH_SLUGS)[number];

function countH1BlocksContaining(html: string, text: string): number {
  const h1Pattern = /<h1\b[^>]*>[\s\S]*?<\/h1>/gi;
  const blocks = html.match(h1Pattern) ?? [];
  return blocks.filter((block) => block.includes(text)).length;
}

describe("Phase 2 token-probability path route rendering (phase-2-token-probability-path-convergence-002)", () => {
  test("target path registry ids map to the four beginner glossary slugs", () => {
    expect(TARGET_PATH_REGISTRY_IDS).toEqual([
      "concept.token",
      "concept.embedding",
      "concept.logit",
      "concept.softmax",
    ]);
    expect(TARGET_PATH_SLUGS.map((slug) => `concept.${slug}`)).toEqual([
      ...TARGET_PATH_REGISTRY_IDS,
    ]);
  });

  for (const slug of TARGET_PATH_SLUGS) {
    const registryId = `concept.${slug}` as TargetPathRegistryId;
    const canonicalRoute = glossaryPageHref(slug);

    test(`${canonicalRoute} publishes through pages loader and Fumadocs source`, async () => {
      const pages = await loadPublishedDocsPages("en");
      const publishedPage = pages.find(
        (page) =>
          page.url === canonicalRoute &&
          page.frontmatter.registryId === registryId,
      );
      const fumadocsPage = source.getPage(["glossary", slug]);

      expect(publishedPage?.url).toBe(canonicalRoute);
      expect(publishedPage?.frontmatter.status).toBe("published");
      expect(publishedPage?.frontmatter.kind).toBe("glossary");
      expect(fumadocsPage?.url).toBe(canonicalRoute);
    });

    test(`${slug} messages include glossary template keys without draft placeholders`, () => {
      const messagesPath = join(GLOSSARY_DOCS_ROOT, slug, "messages/en.json");
      const messages = pageMessagesSchema.parse(
        JSON.parse(readFileSync(messagesPath, "utf8")),
      );

      expect(messages.title.length).toBeGreaterThan(0);
      expectGlossaryOpeningSummaryMessage(messages);
      expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
      expect(messages.sections?.whyItMatters.body?.length).toBeGreaterThan(0);
      expect(messages.sections?.simpleExample.body?.length).toBeGreaterThan(0);
      expect(messages.sections?.commonConfusions.body?.length).toBeGreaterThan(
        0,
      );
      expect(messages.description).not.toContain("Draft placeholder");
      expect(messages.description).not.toMatch(/convergence|manual gate/i);
    });

    test(`${canonicalRoute} shell renders title, description, tags, and related docs`, async () => {
      const loadedPage = await loadLocalDocsPage({
        section: "glossary",
        slug,
      });
      const registryRecord = getRegistryRecordById(registryId);

      expect(loadedPage.frontmatter.registryId).toBe(registryId);
      expect(registryRecord?.kind).toBe("concept");
      expect(registryRecord?.status).toBe("published");

      const html = renderGlossaryDocsShell(loadedPage);
      const articleHtml = extractGlossaryArticleHtml(html, registryId);

      expect(countH1BlocksContaining(html, loadedPage.messages.title)).toBe(1);
      expectHtmlToContainProse(html, loadedPage.messages.description);
      expectGlossaryShellPresentationConvergence(html, { registryId });
      expectGlossaryBodyOmitsTitleHeading(
        articleHtml,
        loadedPage.messages.title,
      );
      expectGlossaryOmitsOpeningSummary(html);
      expect(articleHtml).toContain('data-testid="tag-pill-list"');
      expect(articleHtml).toContain('data-testid="curated-related-docs"');
      expect(html).not.toContain("Draft placeholder");
      expect(html).not.toMatch(/\bMISSING\b|undefined/);
      expectGlossaryPresentationConvergence(articleHtml, {
        title: loadedPage.messages.title,
      });
    });
  }

  test("/docs/glossary/token renders conceptMap asset without placeholder errors", async () => {
    const loadedPage = await loadLocalDocsPage({
      section: "glossary",
      slug: "token",
    });
    const html = renderGlossaryDocsShell(loadedPage);
    const articleHtml = extractGlossaryArticleHtml(html, "concept.token");

    expect(articleHtml).toContain('data-page-asset="conceptMap"');
    expect(articleHtml).not.toContain("Asset not found");
    expect(articleHtml).not.toContain("missing asset");
  });
});

describe("Phase 2 token-probability path built route rendering (phase-2-token-probability-path-convergence-002)", () => {
  if (!shouldRunBuiltHtmlConvergenceTests()) {
    test("skips built HTML probes during coverage subprocess rerun", () => {});
    return;
  }

  const builtRoutes: Array<{
    slug: TargetPathSlug;
    registryId: TargetPathRegistryId;
    title: string;
    shellDescriptionAutoLinks?: Array<{ href: string; phrase?: string }>;
  }> = [
    {
      slug: "token",
      registryId: "concept.token",
      title: "Token",
    },
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
      slug: "logit",
      registryId: "concept.logit",
      title: "Logit",
    },
    {
      slug: "softmax",
      registryId: "concept.softmax",
      title: "Softmax",
      shellDescriptionAutoLinks: [
        { href: "/docs/glossary/logit", phrase: "logits" },
      ],
    },
  ];

  function readBuiltGlossaryHtml(slug: TargetPathSlug): string | null {
    return readBuiltHtmlForConvergenceTests(
      `.next/server/app/docs/glossary/${slug}.html`,
    );
  }

  for (const route of builtRoutes) {
    test(`/docs/glossary/${route.slug} built HTML passes docs shell and presentation convergence`, () => {
      const html = readBuiltGlossaryHtml(route.slug);
      if (!html) {
        return;
      }

      const articleHtml = extractGlossaryArticleHtml(html, route.registryId);

      expect(assertDocsShellConvergence(html)).toBeNull();
      expectGlossaryBuiltRoutePresentationConvergence(html, {
        registryId: route.registryId,
        title: route.title,
        shellDescriptionAutoLinks: route.shellDescriptionAutoLinks,
      });
      expect(articleHtml).toContain('data-testid="curated-related-docs"');
    });
  }
});
