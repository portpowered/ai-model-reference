/**
 * Behavioral proof for the synthetic data concept page.
 * Routine bundle invariants (frontmatter, messages, tags, citations, assets)
 * are covered by `make validate-data` / `validateDerivedPublishedPageBundles`.
 */
import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildDocsPageMetadata,
  renderDocsSlugPage,
} from "@/app/docs/docs-slug-renderer";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const PAGE_URL = "/docs/concepts/synthetic-data";
const TRAINING_WORKFLOW_HREFS = [
  "/docs/training/distillation",
  "/docs/training/on-policy-distillation",
  "/docs/training/post-training",
  "/docs/training/rlhf",
  "/docs/training/rlvr",
] as const;

function pageBaseUrlFromResults(
  results: Array<{ url: string }>,
  pageUrl: string,
): boolean {
  return results.some(
    (result) =>
      pageBaseUrl(result.url) === pageUrl ||
      result.url.startsWith(`${pageUrl}#`),
  );
}

describe("synthetic-data concept page", () => {
  test("app route metadata and English render resolve the canonical page", async () => {
    const metadata = await buildDocsPageMetadata([
      "concepts",
      "synthetic-data",
    ]);
    expect(metadata.alternates).toEqual({
      canonical: PAGE_URL,
      languages: {
        en: PAGE_URL,
      },
    });
    expect(metadata.title).toContain("Synthetic Data");

    const rendered = await renderDocsSlugPage(
      ["concepts", "synthetic-data"],
      "en",
    );
    expect(rendered).toBeDefined();
  });

  test("live search routes representative queries to the canonical page", async () => {
    for (const query of [
      "synthetic data",
      "generated data",
      "preference data",
      "teacher model",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.length).toBeGreaterThan(0);
      expect(pageBaseUrlFromResults(results, PAGE_URL)).toBe(true);
    }
  });

  test("rendered page exposes teaching sections, tags, citations, and training workflow links", async () => {
    const page = await loadConceptPage("synthetic-data");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("What It Is");
    expect(html).toContain("Why It Matters");
    expect(html).toContain("Common Forms");
    expect(html).toContain("Compared To Other Data Sources");
    expect(html.toLowerCase()).toContain(
      "training material produced or transformed by a model",
    );
    expect(html.toLowerCase()).toContain("produced or transformed by a model");
    expect(html.toLowerCase()).toContain("model-generated examples");
    expect(html.toLowerCase()).toContain("reasoning or tool-use traces");
    expect(html.toLowerCase()).toContain("generated labels");
    expect(html.toLowerCase()).toContain("preference data");
    expect(html.toLowerCase()).toContain("web pretraining data");
    expect(html.toLowerCase()).toContain("human-authored instruction data");
    expect(html).toContain("not a synonym for all training data");
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('href="/tags/alignment"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-related-group="curated-related"');
    expect(html).toContain('data-testid="citation-list"');
    for (const href of TRAINING_WORKFLOW_HREFS) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("on this page");
    expect(html).not.toContain("missing-content");
    expect(html).not.toMatch(/\{\{[^}]+\}\}/);
  });
});
