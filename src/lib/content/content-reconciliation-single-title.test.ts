import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DOCS_ROOT } from "@/lib/content/content-paths";
import { renderGlossaryDocsShell } from "@/lib/content/glossary-shell-render";
import {
  expectGlossaryBodyOmitsShellDescription,
  expectGlossaryBodyOmitsTitleHeading,
  expectGlossaryOmitsOpeningSummary,
  extractGlossaryArticleHtml,
} from "@/lib/content/glossary-test-helpers";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import { extractModuleArticleHtml } from "@/lib/content/module-test-helpers";
import { VERIFY_COVERAGE_SUBPROCESS_ENV } from "@/lib/verify/server-lifecycle";

/** Batch 017 pages reconciled in Phase 2/3 (see prd.md). */
const BATCH_017_DOCS_URLS = [
  "/docs/glossary/transformer",
  "/docs/glossary/diffusion-model",
  "/docs/glossary/multimodal-model",
  "/docs/glossary/world-model",
  "/docs/modules/attention",
  "/docs/modules/multi-head-attention",
  "/docs/modules/multi-query-attention",
  "/docs/modules/multi-head-latent-attention",
  "/docs/modules/sparse-attention",
  "/docs/modules/sliding-window-attention",
  "/docs/modules/linear-attention",
  "/docs/concepts/transformer-architecture",
  "/docs/modules/feed-forward-network",
  "/docs/modules/batch-norm",
  "/docs/modules/group-norm",
  "/docs/modules/standard-ffn",
  "/docs/modules/mixture-of-experts",
  "/docs/modules/relu",
  "/docs/modules/leaky-relu",
  "/docs/modules/silu",
  "/docs/modules/swiglu",
  "/docs/glossary/normalization",
  "/docs/modules/qk-norm",
  "/docs/modules/layer-norm",
  "/docs/modules/rmsnorm",
  "/docs/glossary/residual-connection",
  "/docs/glossary/skip-connection",
  "/docs/concepts/positional-encodings",
  "/docs/concepts/alibi",
  "/docs/modules/rope",
  "/docs/modules/alibi",
  "/docs/glossary/context-window",
  "/docs/concepts/context-extension",
  "/docs/concepts/why-long-context-is-hard",
] as const;

const SPOT_CHECK_URLS = [
  "/docs/glossary/transformer",
  "/docs/modules/multi-head-attention",
  "/docs/modules/rope",
  "/docs/glossary/context-window",
] as const;

const BATCH_017_DOCS_URL_GROUPS = [
  BATCH_017_DOCS_URLS.slice(0, 9),
  BATCH_017_DOCS_URLS.slice(9, 18),
  BATCH_017_DOCS_URLS.slice(18, 26),
  BATCH_017_DOCS_URLS.slice(26),
] as const;
const SHELL_TITLE_CONVERGENCE_TIMEOUT_MS = 30_000;

function parseDocsUrl(url: string): {
  section: "concepts" | "glossary" | "modules";
  slug: string;
} {
  const match = url.match(/^\/docs\/(concepts|glossary|modules)\/(.+)$/);
  if (!match) {
    throw new Error(`unsupported docs url: ${url}`);
  }

  return {
    section: match[1] as "concepts" | "glossary" | "modules",
    slug: match[2],
  };
}

function countH1BlocksContaining(html: string, text: string): number {
  const h1Pattern = /<h1\b[^>]*>[\s\S]*?<\/h1>/gi;
  const blocks = html.match(h1Pattern) ?? [];
  return blocks.filter((block) => block.includes(text)).length;
}

function readPageMdx(section: string, slug: string): string {
  return readFileSync(join(DOCS_ROOT, section, slug, "page.mdx"), "utf8");
}

function renderReconciledDocsShell(
  section: "concepts" | "glossary" | "modules",
  loadedPage: Awaited<ReturnType<typeof loadLocalDocsPage>>,
): string {
  return section === "modules"
    ? renderModuleDocsShell(loadedPage)
    : renderGlossaryDocsShell(loadedPage);
}

function extractArticleHtml(html: string, registryId: string): string {
  return extractModuleArticleHtml(html, registryId);
}

async function expectSingleShellOwnedPrimaryTitle(url: string): Promise<void> {
  const { section, slug } = parseDocsUrl(url);
  const loadedPage = await loadLocalDocsPage({ section, slug });
  const html = renderReconciledDocsShell(section, loadedPage);
  const articleHtml = extractArticleHtml(
    html,
    loadedPage.frontmatter.registryId,
  );

  expect(articleHtml.length).toBeGreaterThan(0);
  expect(countH1BlocksContaining(html, loadedPage.messages.title)).toBe(1);
  expectGlossaryBodyOmitsTitleHeading(articleHtml, loadedPage.messages.title);
  expectGlossaryBodyOmitsShellDescription(
    articleHtml,
    loadedPage.messages.description,
  );

  if (section === "glossary" || section === "concepts") {
    expectGlossaryOmitsOpeningSummary(html);
  }
}

describe("Phase 2/3 reconciliation single primary title (US-005)", () => {
  if (process.env[VERIFY_COVERAGE_SUBPROCESS_ENV] === "1") {
    test("skips shell title convergence during coverage subprocess rerun", () => {});
    return;
  }

  test("batch 017 page.mdx sources omit duplicate body title chrome", () => {
    for (const url of BATCH_017_DOCS_URLS) {
      const { section, slug } = parseDocsUrl(url);
      const raw = readPageMdx(section, slug);

      expect(raw).not.toContain('# <T k="title" />');
      expect(raw).not.toContain('<T k="title" />');
      expect(raw).not.toContain("<ModuleMetadataCard");
      expect(raw).not.toContain("<GlossaryOpening />");
      expect(raw).not.toContain('<T k="problemStatement" />');
      expect(raw).not.toContain('<T k="coreIdea" />');

      if (section === "glossary") {
        expect(raw).not.toContain('<T k="openingSummary" />');
      }
    }
  });

  for (const [index, urls] of BATCH_017_DOCS_URL_GROUPS.entries()) {
    test(
      `batch 017 title convergence group ${index + 1} renders exactly one shell-owned primary title`,
      async () => {
        for (const url of urls) {
          await expectSingleShellOwnedPrimaryTitle(url);
        }
      },
      { timeout: SHELL_TITLE_CONVERGENCE_TIMEOUT_MS },
    );
  }

  test("spot-check pages keep glossary or module shell title patterns", async () => {
    for (const url of SPOT_CHECK_URLS) {
      const { section, slug } = parseDocsUrl(url);
      const loadedPage = await loadLocalDocsPage({ section, slug });
      const html = renderReconciledDocsShell(section, loadedPage);
      const articleHtml =
        section === "glossary"
          ? extractGlossaryArticleHtml(html, loadedPage.frontmatter.registryId)
          : extractArticleHtml(html, loadedPage.frontmatter.registryId);

      expect(articleHtml.length).toBeGreaterThan(0);
      expect(countH1BlocksContaining(html, loadedPage.messages.title)).toBe(1);
      expectGlossaryBodyOmitsTitleHeading(
        articleHtml,
        loadedPage.messages.title,
      );
    }
  });
});
