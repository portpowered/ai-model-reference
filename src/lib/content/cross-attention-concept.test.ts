import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { renderGlossaryDocsShell } from "@/lib/content/glossary-shell-render";
import {
  expectGlossaryShellPresentationConvergence,
  expectHtmlToContainProse,
  extractGlossaryArticleHtml,
} from "@/lib/content/glossary-test-helpers";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { loadTagResourceEntries } from "@/lib/content/tag-resources";

describe("Cross-attention concept page", () => {
  test("registry record is published and listed as a published docs page", () => {
    const record = getConceptById("concept.cross-attention");
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("cross-attention");
    expect(record?.conceptType).toBe("general");
    expect(record?.aliases).toEqual([
      "cross attention",
      "encoder-decoder attention",
      "cross modal attention",
    ]);
    expect(record?.tags).toEqual(["attention", "foundations"]);
    expect(record?.relatedIds).toEqual([
      "module.attention",
      "concept.transformer-architecture",
      "concept.encoder-decoder",
      "concept.multimodal-model",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.cross-attention")).toBe(
      true,
    );
  });

  test("curated related links and attention-tag discovery stay navigable for cross-attention", async () => {
    const source = getConceptById("concept.cross-attention");
    if (!source) {
      throw new Error("expected concept.cross-attention in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(items.map((item) => item.registryId)).toEqual([
      "module.attention",
      "concept.transformer-architecture",
      "concept.encoder-decoder",
      "concept.multimodal-model",
    ]);
    expect(items.map((item) => item.href)).toEqual([
      "/docs/modules/attention",
      "/docs/concepts/transformer-architecture",
      "/docs/glossary/encoder-decoder",
      "/docs/glossary/multimodal-model",
    ]);
    expect(items.every((item) => item.isPlanned === false)).toBe(true);

    const publishedPages = await loadPublishedDocsPages("en");
    expect(
      publishedPages.some(
        (page) =>
          page.frontmatter.registryId === "concept.cross-attention" &&
          page.url === "/docs/concepts/cross-attention",
      ),
    ).toBe(true);

    const attentionEntries = await loadTagResourceEntries("attention", "en");
    expect(
      attentionEntries.some(
        (entry) =>
          entry.url === "/docs/concepts/cross-attention" &&
          entry.kind === "concept" &&
          entry.slug === "cross-attention",
      ),
    ).toBe(true);
  });

  test("page resolves the canonical concept route without missing-content placeholders", async () => {
    const page = await loadConceptPage("cross-attention");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.cross-attention");
    expect(page.messages.title).toBe("Cross-Attention");
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "cross-attention",
    );

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
    expect(html).toContain("Simple Example");
    expect(html).toContain("Common Confusions");
    expect(html).toContain("bridge between two representations");
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/glossary/encoder-decoder"');
    expect(html).toContain('href="/docs/glossary/multimodal-model"');
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("missing message");
    expect(html).not.toContain("missing asset");
    expect(html).not.toContain("TODO");
  });

  test("docs shell renders title, summary, tags, and related links on the canonical route", async () => {
    const loadedPage = await loadLocalDocsPage({
      section: "concepts",
      slug: "cross-attention",
    });

    const html = renderGlossaryDocsShell(loadedPage);
    const articleHtml = extractGlossaryArticleHtml(
      html,
      loadedPage.frontmatter.registryId,
    );

    expect(articleHtml.length).toBeGreaterThan(0);
    expectHtmlToContainProse(html, loadedPage.messages.description);
    expectGlossaryShellPresentationConvergence(html, {
      registryId: loadedPage.frontmatter.registryId,
    });
    expect(articleHtml).toContain('data-testid="tag-pill-list"');
    expect(articleHtml).toContain('data-testid="curated-related-docs"');
    expect(articleHtml).toContain('href="/docs/modules/attention"');
    expect(articleHtml).toContain(
      'href="/docs/concepts/transformer-architecture"',
    );
    expect(articleHtml).toContain('href="/docs/glossary/encoder-decoder"');
    expect(articleHtml).toContain('href="/docs/glossary/multimodal-model"');
    expect(articleHtml).not.toContain("missing message");
    expect(articleHtml).not.toContain("missing asset");
  });
});
