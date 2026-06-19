import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { CONCEPTS_DOCS_ROOT } from "@/lib/content/content-paths";
import { loadPageAssets } from "@/lib/content/page-assets-load";
import { loadPageMessages } from "@/lib/content/page-messages-load";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import { getConceptById } from "@/lib/content/registry-runtime";
import { buildSearchDocuments } from "@/lib/search/build-documents";

const NORMALIZATION_CONCEPT_PAGE_DIR = join(
  CONCEPTS_DOCS_ROOT,
  "normalization",
);

describe("Normalization concept page (normalization-concept-page-001)", () => {
  test("registry record stays published while the concept route is added", () => {
    const record = getConceptById("concept.normalization");

    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.aliases).toEqual(["normalization layer", "norm layer"]);
    expect(record?.tags).toEqual(["normalization", "foundations"]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.normalization")).toBe(true);
  });

  test("page bundle teaches the broad normalization idea and hands off to variant pages", async () => {
    const page = await loadConceptPage("normalization");
    const mdxSource = readFileSync(
      join("src/content/docs/concepts/normalization", "page.mdx"),
      "utf8",
    );

    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.registryId).toBe("concept.normalization");
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "stable range",
    );
    expect(page.messages.sections?.whatItIs.body).toContain("rescaling");
    expect(page.messages.sections?.whyItMatters.body).toContain("training");
    expect(page.messages.sections?.whyItMatters.body).toContain("inference");
    expect(page.messages.sections?.whenToOpenAVariantPage.body)?.toContain(
      "Layer norm",
    );
    expect(page.messages.sections?.whenToOpenAVariantPage.body)?.toContain(
      "QK norm",
    );
    expect(page.toc.map((item) => item.title)).toEqual(
      expect.arrayContaining([
        "What It Is",
        "Why It Matters",
        "Simple Example",
        "When To Open A Variant Page",
      ]),
    );
    expect(mdxSource).toContain('href="/docs/modules/layer-norm"');
    expect(mdxSource).toContain('href="/docs/modules/rmsnorm"');
    expect(mdxSource).toContain('href="/docs/modules/batch-norm"');
    expect(mdxSource).toContain('href="/docs/modules/group-norm"');
    expect(mdxSource).toContain('href="/docs/modules/qk-norm"');
    expect(mdxSource).not.toContain("Reader Shortcut");
    expect(mdxSource).not.toContain("benchmark leaderboard");
  });

  test("rendered concept page keeps the normalization family navigable from the broad explainer", async () => {
    const page = await loadConceptPage("normalization");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('href="/docs/modules/layer-norm"');
    expect(html).toContain('href="/docs/modules/rmsnorm"');
    expect(html).toContain('href="/docs/modules/batch-norm"');
    expect(html).toContain('href="/docs/modules/group-norm"');
    expect(html).toContain('href="/docs/modules/qk-norm"');
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/docs/glossary/residual-connection"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Draft placeholder");
  });

  test("published docs and search documents include the normalization concept route", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");

    expect(
      pages.some((page) => page.url === "/docs/concepts/normalization"),
    ).toBe(true);

    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find(
      (entry) => entry.url === "/docs/concepts/normalization",
    );

    expect(document?.kind).toBe("concept");
    expect(document?.facets.kind).toBe("concept");
    expect(document?.registryId).toBe("concept.normalization");
    expect(document?.tags).toEqual(
      expect.arrayContaining(["normalization", "foundations"]),
    );
    expect(document?.bodyText).toContain("Layer norm");
    expect(document?.bodyText).toContain("RMSNorm");
  });

  test("message and asset bundles load cleanly for the published normalization concept route", async () => {
    const page = await loadConceptPage("normalization");
    const messages = await loadPageMessages(
      NORMALIZATION_CONCEPT_PAGE_DIR,
      "en",
    );
    const assets = await loadPageAssets(NORMALIZATION_CONCEPT_PAGE_DIR);

    expect(messages.title).toBe("Normalization");
    expect(messages.description).not.toContain("Draft placeholder");
    expect(messages.openingSummary).toBe(page.messages.openingSummary);
    expect(messages.sections?.whyItMatters.body).toContain("stabilize");
    expect(page.messages.title).toBe(messages.title);
    expect(page.messages.description).toBe(messages.description);
    expect(Object.keys(assets)).toEqual([]);
    expect(page.assets).toEqual(assets);
  });
});
