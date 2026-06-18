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

const MULTIMODAL_MODEL_SLUG = "multimodal-model" as const;

function renderGlossaryHtml() {
  return loadGlossaryPage(MULTIMODAL_MODEL_SLUG).then((page) =>
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

describe("Phase 2 multimodal model-family glossary page (US-003)", () => {
  test("multimodal-model messages include required concept template keys", () => {
    const messagesPath = join(
      GLOSSARY_DOCS_ROOT,
      MULTIMODAL_MODEL_SLUG,
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

  test("multimodal-model glossary page compiles with localized sections, tags, and related docs", async () => {
    const page = await loadGlossaryPage(MULTIMODAL_MODEL_SLUG);

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.multimodal-model");

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

  test("multimodal-model links to published modality and representation foundations", async () => {
    const html = await renderGlossaryHtml();

    expect(html).toContain('href="/docs/glossary/architecture"');
    expect(html).toContain('href="/docs/concepts/cross-attention"');
    expect(html).toContain('href="/docs/glossary/modality"');
    expect(html).toContain('href="/docs/glossary/patch"');
    expect(html).toContain('href="/docs/glossary/representation"');
    expect(html).toContain('href="/docs/glossary/generative-model"');
  });

  test("concept.multimodal-model is published in registry and PUBLISHED_DOCS_REGISTRY_IDS", async () => {
    const indexes = await loadRegistry();
    const multimodalModel = indexes.byId.get("concept.multimodal-model") as
      | ConceptRecord
      | undefined;

    expect(multimodalModel?.status).toBe("published");
    expect(multimodalModel?.conceptType).toBe("architecture");
    expect(multimodalModel?.tags).toContain("model-family");
    expect(multimodalModel?.aliases).toContain("multimodal models");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.multimodal-model")).toBe(
      true,
    );
  });

  test("search index records multimodal-model with glossary kind", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/glossary/multimodal-model",
    );
    expect(document?.kind).toBe("glossary");
    expect(document?.facets.kind).toBe("glossary");
    expect(document?.title).toBe("Multimodal Model");
  });

  test("search finds multimodal-model by title, alias, and description keyword", async () => {
    const titleResults = await docsSearchApi.search("Multimodal Model");
    expect(
      titleResults.some((r) => r.url === "/docs/glossary/multimodal-model"),
    ).toBe(true);

    const aliasResults = await docsSearchApi.search("multimodal models");
    expect(
      aliasResults.some((r) => r.url === "/docs/glossary/multimodal-model"),
    ).toBe(true);

    const summaryResults = await docsSearchApi.search(
      "more than one data modality",
    );
    expect(
      summaryResults.some((r) => r.url === "/docs/glossary/multimodal-model"),
    ).toBe(true);
  });
});
