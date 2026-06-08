import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { GLOSSARY_DOCS_ROOT } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import {
  expectGlossaryOmitsWhereItAppears,
  expectGlossaryPresentationConvergence,
} from "@/lib/content/glossary-test-helpers";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import { type ConceptRecord, pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const TRANSFORMER_SLUG = "transformer" as const;

function renderGlossaryHtml() {
  return loadGlossaryPage(TRANSFORMER_SLUG).then((page) =>
    renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    ),
  );
}

describe("Phase 2 transformer model-family glossary page (US-001)", () => {
  test("transformer messages include required concept template keys", () => {
    const messagesPath = join(
      GLOSSARY_DOCS_ROOT,
      TRANSFORMER_SLUG,
      "messages/en.json",
    );
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title.length).toBeGreaterThan(0);
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.whyItMatters.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.simpleExample.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.commonConfusions.body?.length).toBeGreaterThan(0);
    expect(messages.description).not.toContain("Draft placeholder");
    expect(messages.description).not.toMatch(/phase|factory|coming later/i);
  });

  test("transformer glossary page compiles with localized sections, tags, and related docs", async () => {
    const page = await loadGlossaryPage(TRANSFORMER_SLUG);

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.transformer");

    const html = await renderGlossaryHtml();

    expectGlossaryPresentationConvergence(html, { title: page.messages.title });
    expect(html).toContain('href="/tags/taxonomy"');
    expect(html).toContain('href="/tags/model-family"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expectGlossaryOmitsWhereItAppears(html);
    expect(html).not.toContain("Draft placeholder");
    expect(html).not.toContain("Reader Shortcut");
  });

  test("transformer links backward to published architecture foundations", async () => {
    const html = await renderGlossaryHtml();

    expect(html).toContain('href="/docs/glossary/architecture"');
    expect(html).toContain('href="/docs/glossary/module"');
    expect(html).toContain('href="/docs/glossary/encoder-decoder"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('href="/docs/glossary/foundation-model"');
  });

  test("concept.transformer is published in registry and PUBLISHED_DOCS_REGISTRY_IDS", async () => {
    const indexes = await loadRegistry();
    const transformer = indexes.byId.get("concept.transformer") as
      | ConceptRecord
      | undefined;

    expect(transformer?.status).toBe("published");
    expect(transformer?.conceptType).toBe("architecture");
    expect(transformer?.tags).toContain("model-family");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.transformer")).toBe(true);
  });

  test("search index records transformer with glossary kind", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/glossary/transformer",
    );
    expect(document?.kind).toBe("glossary");
    expect(document?.facets.kind).toBe("glossary");
    expect(document?.title).toBe("Transformer");
  });

  test("search finds transformer by title, alias, and description keyword", async () => {
    const titleResults = await docsSearchApi.search("Transformer");
    expect(
      titleResults.some((r) => r.url === "/docs/glossary/transformer"),
    ).toBe(true);

    const aliasResults = await docsSearchApi.search("transformer architecture");
    expect(
      aliasResults.some((r) => r.url === "/docs/glossary/transformer"),
    ).toBe(true);

    const summaryResults = await docsSearchApi.search("feed-forward blocks");
    expect(
      summaryResults.some((r) => r.url === "/docs/glossary/transformer"),
    ).toBe(true);
  });
});
