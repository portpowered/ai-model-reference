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

const DIFFUSION_MODEL_SLUG = "diffusion-model" as const;

function renderGlossaryHtml() {
  return loadGlossaryPage(DIFFUSION_MODEL_SLUG).then((page) =>
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

describe("Phase 2 diffusion model-family glossary page (US-002)", () => {
  test("diffusion-model messages include required concept template keys", () => {
    const messagesPath = join(
      GLOSSARY_DOCS_ROOT,
      DIFFUSION_MODEL_SLUG,
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

  test("diffusion-model glossary page compiles with localized sections, tags, and related docs", async () => {
    const page = await loadGlossaryPage(DIFFUSION_MODEL_SLUG);

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.diffusion-model");

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

  test("diffusion-model links to published denoising and generative foundations", async () => {
    const html = await renderGlossaryHtml();

    expect(html).toContain('href="/docs/glossary/architecture"');
    expect(html).toContain('href="/docs/glossary/denoising-generation"');
    expect(html).toContain('href="/docs/glossary/generative-model"');
    expect(html).toContain('href="/docs/glossary/latent"');
    expect(html).toContain('href="/docs/glossary/conditioning"');
  });

  test("concept.diffusion-model is published in registry and PUBLISHED_DOCS_REGISTRY_IDS", async () => {
    const indexes = await loadRegistry();
    const diffusionModel = indexes.byId.get("concept.diffusion-model") as
      | ConceptRecord
      | undefined;

    expect(diffusionModel?.status).toBe("published");
    expect(diffusionModel?.conceptType).toBe("architecture");
    expect(diffusionModel?.tags).toContain("model-family");
    expect(diffusionModel?.aliases).toContain("diffusion models");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.diffusion-model")).toBe(
      true,
    );
  });

  test("search index records diffusion-model with glossary kind", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/glossary/diffusion-model",
    );
    expect(document?.kind).toBe("glossary");
    expect(document?.facets.kind).toBe("glossary");
    expect(document?.title).toBe("Diffusion Model");
  });

  test("search finds diffusion-model by title, alias, and description keyword", async () => {
    const titleResults = await docsSearchApi.search("Diffusion Model");
    expect(
      titleResults.some((r) => r.url === "/docs/glossary/diffusion-model"),
    ).toBe(true);

    const aliasResults = await docsSearchApi.search("diffusion models");
    expect(
      aliasResults.some((r) => r.url === "/docs/glossary/diffusion-model"),
    ).toBe(true);

    const summaryResults = await docsSearchApi.search("iterative denoising");
    expect(
      summaryResults.some((r) => r.url === "/docs/glossary/diffusion-model"),
    ).toBe(true);
  });
});
