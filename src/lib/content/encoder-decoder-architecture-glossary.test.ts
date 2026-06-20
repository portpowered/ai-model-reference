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

const ENCODER_DECODER_SLUGS = [
  "encoder",
  "decoder",
  "encoder-decoder",
] as const;

function renderGlossaryHtml(slug: (typeof ENCODER_DECODER_SLUGS)[number]) {
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

describe("Phase 2 encoder-decoder architecture glossary pages (US-002)", () => {
  for (const slug of ENCODER_DECODER_SLUGS) {
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

  test("encoder links to latent space and representation via curated related docs", async () => {
    const html = await renderGlossaryHtml("encoder");

    expect(html).toContain('href="/docs/glossary/latent-space"');
    expect(html).toContain('href="/docs/glossary/representation"');
    expect(html).toContain('data-testid="curated-related-docs"');
  });

  test("encoder-decoder surfaces published autoregressive generation and transformer links", async () => {
    const html = await renderGlossaryHtml("encoder-decoder");

    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('href="/docs/glossary/transformer"');
    expect(html).toContain("Transformers");
    expect(html).not.toContain("Planned related doc");
  });

  test("encoder-decoder links to encoder and decoder peers", async () => {
    const html = await renderGlossaryHtml("encoder-decoder");

    expect(html).toContain('href="/docs/glossary/encoder"');
    expect(html).toContain('href="/docs/glossary/decoder"');
  });

  test("search index records encoder cluster with glossary kind not module", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    for (const slug of ENCODER_DECODER_SLUGS) {
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

  test("search finds encoder, decoder, and encoder-decoder by title or alias", async () => {
    const encoderResults = await docsSearchApi.search("encoding network");
    expect(encoderResults.some((r) => r.url === "/docs/glossary/encoder")).toBe(
      true,
    );

    const decoderResults = await docsSearchApi.search("decoding network");
    expect(decoderResults.some((r) => r.url === "/docs/glossary/decoder")).toBe(
      true,
    );

    const seq2seqResults = await docsSearchApi.search("seq2seq");
    expect(
      seq2seqResults.some((r) => r.url === "/docs/glossary/encoder-decoder"),
    ).toBe(true);
  });
});
