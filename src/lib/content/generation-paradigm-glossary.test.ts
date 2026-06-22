import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { GLOSSARY_DOCS_ROOT } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import {
  expectGlossaryBodyOmitsTitleHeading,
  expectGlossaryOmitsOpeningSummary,
  expectGlossaryOmitsWhereItAppears,
} from "@/lib/content/glossary-test-helpers";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const GENERATION_PARADIGM_SLUGS = [
  "autoregressive-generation",
  "denoising-generation",
  "conditioning",
] as const;

function renderGlossaryHtml(slug: (typeof GENERATION_PARADIGM_SLUGS)[number]) {
  return loadGlossaryPage(slug).then((page) =>
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

describe("Phase 2 generation paradigm glossary pages (US-003)", () => {
  for (const slug of GENERATION_PARADIGM_SLUGS) {
    test(`${slug} messages include required concept template keys`, () => {
      const messagesPath = join(GLOSSARY_DOCS_ROOT, slug, "messages/en.json");
      const messages = pageMessagesSchema.parse(
        JSON.parse(readFileSync(messagesPath, "utf8")),
      );

      expect(messages.title.length).toBeGreaterThan(0);
      expect(messages.openingSummary?.length).toBeGreaterThan(0);
      expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
      expect(messages.sections?.whyItMatters.body?.length).toBeGreaterThan(0);
      expect(messages.sections?.simpleExample.body?.length).toBeGreaterThan(0);
      expect(messages.sections?.commonConfusions.body?.length).toBeGreaterThan(
        0,
      );
      expect(messages.description).not.toContain("Draft placeholder");
    });

    test(`${slug} glossary page compiles with localized sections and tags`, async () => {
      const page = await loadGlossaryPage(slug);

      expect(page.frontmatter.kind).toBe("glossary");
      expect(page.frontmatter.status).toBe("published");
      expect(page.frontmatter.registryId).toBe(`concept.${slug}`);

      const html = await renderGlossaryHtml(slug);

      expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
      expectGlossaryOmitsOpeningSummary(html);
      expect(html).toContain('href="/tags/foundations"');
      expect(html).toContain('href="/tags/taxonomy"');
      expectGlossaryOmitsWhereItAppears(html);
      expect(html).not.toContain("Draft placeholder");
    });
  }

  test("autoregressive generation links backward to token chain and decoder architecture", async () => {
    const html = await renderGlossaryHtml("autoregressive-generation");

    expect(html).toContain('href="/docs/glossary/token"');
    expect(html).toContain('href="/docs/concepts/decoder"');
    expect(html).toContain('href="/docs/glossary/encoder-decoder"');
    expect(html).toContain('href="/docs/glossary/logit"');
    expect(html).toContain('href="/docs/glossary/softmax"');
    expect(html).toContain('href="/docs/glossary/embedding"');
  });

  test("denoising generation links backward to latent cluster and generative model", async () => {
    const html = await renderGlossaryHtml("denoising-generation");

    expect(html).toContain('href="/docs/glossary/latent"');
    expect(html).toContain('href="/docs/glossary/latent-space"');
    expect(html).toContain('href="/docs/glossary/generative-model"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
  });

  test("conditioning links to both generation paradigms and special tokens with reason labels", async () => {
    const html = await renderGlossaryHtml("conditioning");

    expect(html).toContain('href="/docs/glossary/special-tokens"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('href="/docs/glossary/denoising-generation"');
    expect(html).toContain("curated");
  });

  test("search index records generation pages with glossary kind not module", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    for (const slug of GENERATION_PARADIGM_SLUGS) {
      const document = documents.find(
        (entry) => entry.url === `/docs/glossary/${slug}`,
      );
      expect(document?.kind).toBe("glossary");
      expect(document?.facets.kind).toBe("glossary");
    }

    const gqa = documents.find(
      (entry) => entry.url === "/docs/modules/grouped-query-attention",
    );
    expect(gqa?.kind).toBe("module");
  });

  test("search finds autoregressive generation by alias and separates glossary from module hits", async () => {
    const aliasResults = await docsSearchApi.search("next-token generation");
    expect(
      aliasResults.some(
        (r) => r.url === "/docs/glossary/autoregressive-generation",
      ),
    ).toBe(true);

    const mixedResults = await docsSearchApi.search("autoregressive attention");
    const autoregressive = mixedResults.find(
      (r) => r.url === "/docs/glossary/autoregressive-generation",
    );
    const gqa = mixedResults.find(
      (r) => r.url === "/docs/modules/grouped-query-attention",
    );

    expect(autoregressive).toBeDefined();
    expect(gqa).toBeDefined();

    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const autoregressiveDoc = documents.find(
      (entry) => entry.url === "/docs/glossary/autoregressive-generation",
    );
    const gqaDoc = documents.find(
      (entry) => entry.url === "/docs/modules/grouped-query-attention",
    );

    expect(autoregressiveDoc?.facets.kind).toBe("glossary");
    expect(gqaDoc?.facets.kind).toBe("module");
  });

  test("search finds denoising generation and conditioning by title or alias", async () => {
    const denoisingResults = await docsSearchApi.search("iterative denoising");
    expect(
      denoisingResults.some(
        (r) => r.url === "/docs/glossary/denoising-generation",
      ),
    ).toBe(true);

    const conditioningResults = await docsSearchApi.search(
      "classifier-free guidance",
    );
    expect(
      conditioningResults.some((r) => r.url === "/docs/glossary/conditioning"),
    ).toBe(true);
  });
});
