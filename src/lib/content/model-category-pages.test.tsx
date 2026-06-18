import { describe, expect, test } from "bun:test";
import { search } from "@orama/orama";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";
import { TagPillList } from "@/features/docs/components/TagPillList";
import { loadModelPage } from "@/lib/content/model-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { createOramaDatabase } from "@/lib/search/orama-index";

const CATEGORY_URLS = [
  "/docs/models/encoder-only-models",
  "/docs/models/decoder-only-models",
  "/docs/models/encoder-decoder-models",
  "/docs/models/autoregressive-models",
  "/docs/models/masked-language-models",
  "/docs/models/sequence-to-sequence-models",
] as const;

describe("chapter 7 model category pages", () => {
  test("loadModelPage compiles encoder-only and seq2seq category pages", async () => {
    const encoderOnly = await loadModelPage("encoder-only-models");
    const seq2seq = await loadModelPage("sequence-to-sequence-models");

    expect(encoderOnly.frontmatter.registryId).toBe(
      "model.encoder-only-models",
    );
    expect(encoderOnly.messages.title).toBe("Encoder-Only Models");
    expect(
      encoderOnly.toc.some(
        (item) => item.url === "#representative-checkpoints",
      ),
    ).toBe(true);

    expect(seq2seq.frontmatter.registryId).toBe(
      "model.sequence-to-sequence-models",
    );
    expect(seq2seq.messages.title).toBe("Sequence-to-Sequence Models");
  });

  test("published docs discovery includes all six category pages", async () => {
    const pages = await loadPublishedDocsPages("en");
    const urls = pages.map((page) => page.url);

    expect(urls).toEqual(expect.arrayContaining([...CATEGORY_URLS]));
  });

  test("search documents index category pages as model results with taxonomy tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    for (const url of CATEGORY_URLS) {
      const document = documents.find((entry) => entry.url === url);
      expect(document).toBeDefined();
      expect(document?.kind).toBe("model");
      expect(document?.facets.kind).toBe("model");
      expect(document?.tags).toContain("taxonomy");
    }
  });

  test("search ranks category pages for encoder-only, masked language model, and seq2seq queries", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const db = await createOramaDatabase(documents);

    const encoderOnly = await search(db, { term: "encoder-only" });
    expect(
      (encoderOnly.hits[0]?.document as { url?: string } | undefined)?.url,
    ).toBe("/docs/models/encoder-only-models");

    const maskedLanguage = await search(db, { term: "masked language model" });
    expect(
      (maskedLanguage.hits[0]?.document as { url?: string } | undefined)?.url,
    ).toBe("/docs/models/masked-language-models");

    const seq2seq = await search(db, { term: "seq2seq" });
    expect(
      (seq2seq.hits[0]?.document as { url?: string } | undefined)?.url,
    ).toBe("/docs/models/sequence-to-sequence-models");
  });

  test("category related docs link to live checkpoints and adjacent concepts", () => {
    const encoderOnlyHtml = renderToStaticMarkup(
      <RelatedDocs registryId="model.encoder-only-models" />,
    );
    const decoderOnlyHtml = renderToStaticMarkup(
      <RelatedDocs registryId="model.decoder-only-models" />,
    );
    const seq2seqHtml = renderToStaticMarkup(
      <RelatedDocs registryId="model.sequence-to-sequence-models" />,
    );

    expect(encoderOnlyHtml).toContain("/docs/models/bert");
    expect(encoderOnlyHtml).toContain("/docs/glossary/encoder");
    expect(decoderOnlyHtml).toContain("/docs/models/gpt-2");
    expect(decoderOnlyHtml).toContain("/docs/glossary/causal-attention");
    expect(seq2seqHtml).toContain("/docs/models/t5");
    expect(seq2seqHtml).toContain("/docs/glossary/encoder-decoder");
  });

  test("category pages expose taxonomy tag pills without model-family tags", () => {
    const html = renderToStaticMarkup(
      <TagPillList registryId="model.masked-language-models" />,
    );

    expect(html).toContain('href="/tags/taxonomy"');
    expect(html).not.toContain('href="/tags/model-family"');
  });
});

describe("chapter 7 BERT and T5 checkpoint support", () => {
  test("BERT and T5 render canonical sections with live category links and explicit training empty states", async () => {
    const bert = await loadModelPage("bert");
    const t5 = await loadModelPage("t5");

    const bertHtml = renderToStaticMarkup(
      <ModulePageProviders messages={bert.messages} assets={bert.assets}>
        {bert.content}
      </ModulePageProviders>,
    );
    const t5Html = renderToStaticMarkup(
      <ModulePageProviders messages={t5.messages} assets={t5.assets}>
        {t5.content}
      </ModulePageProviders>,
    );

    expect(bertHtml).toContain('data-testid="model-at-a-glance"');
    expect(bertHtml).toContain('data-testid="model-module-list"');
    expect(bertHtml).toContain("/docs/models/encoder-only-models");
    expect(bertHtml).toContain("/docs/models/masked-language-models");
    expect(bertHtml).toContain(
      "Structured training-regime details are not available yet.",
    );

    expect(t5Html).toContain('data-testid="model-at-a-glance"');
    expect(t5Html).toContain('data-testid="model-module-list"');
    expect(t5Html).toContain("/docs/models/encoder-decoder-models");
    expect(t5Html).toContain("/docs/models/sequence-to-sequence-models");
    expect(t5Html).toContain(
      "Structured dataset details are not available yet.",
    );
  });
});

describe("chapter 7 foundational checkpoint pages", () => {
  test("published docs discovery includes PaLM and Chinchilla", async () => {
    const pages = await loadPublishedDocsPages("en");
    const urls = pages.map((page) => page.url);

    expect(urls).toEqual(
      expect.arrayContaining(["/docs/models/palm", "/docs/models/chinchilla"]),
    );
  });

  test("PaLM and Chinchilla render canonical sections with decoder-only and autoregressive links plus explicit training empty states", async () => {
    const palm = await loadModelPage("palm");
    const chinchilla = await loadModelPage("chinchilla");

    const palmHtml = renderToStaticMarkup(
      <ModulePageProviders messages={palm.messages} assets={palm.assets}>
        {palm.content}
      </ModulePageProviders>,
    );
    const chinchillaHtml = renderToStaticMarkup(
      <ModulePageProviders
        messages={chinchilla.messages}
        assets={chinchilla.assets}
      >
        {chinchilla.content}
      </ModulePageProviders>,
    );

    expect(palmHtml).toContain('data-testid="model-at-a-glance"');
    expect(palmHtml).toContain('data-testid="model-module-list"');
    expect(palmHtml).toContain("/docs/models/decoder-only-models");
    expect(palmHtml).toContain("/docs/models/autoregressive-models");
    expect(palmHtml).toContain("Structured paper links are not available yet.");

    expect(chinchillaHtml).toContain('data-testid="model-at-a-glance"');
    expect(chinchillaHtml).toContain('data-testid="model-module-list"');
    expect(chinchillaHtml).toContain("/docs/models/decoder-only-models");
    expect(chinchillaHtml).toContain("/docs/models/autoregressive-models");
    expect(chinchillaHtml).toContain(
      "Structured training-regime details are not available yet.",
    );
  });
});

describe("chapter 7 frontier representative checkpoints", () => {
  test("published docs discovery includes Llama 3, Qwen3, and DeepSeek-R1", async () => {
    const pages = await loadPublishedDocsPages("en");
    const urls = pages.map((page) => page.url);

    expect(urls).toEqual(
      expect.arrayContaining([
        "/docs/models/llama-3",
        "/docs/models/qwen3",
        "/docs/models/deepseek-r1",
      ]),
    );
  });

  test("frontier checkpoints render canonical sections with family links and explicit empty states", async () => {
    const llama3 = await loadModelPage("llama-3");
    const qwen3 = await loadModelPage("qwen3");
    const deepseekR1 = await loadModelPage("deepseek-r1");

    const llama3Html = renderToStaticMarkup(
      <ModulePageProviders messages={llama3.messages} assets={llama3.assets}>
        {llama3.content}
      </ModulePageProviders>,
    );
    const qwen3Html = renderToStaticMarkup(
      <ModulePageProviders messages={qwen3.messages} assets={qwen3.assets}>
        {qwen3.content}
      </ModulePageProviders>,
    );
    const deepseekR1Html = renderToStaticMarkup(
      <ModulePageProviders
        messages={deepseekR1.messages}
        assets={deepseekR1.assets}
      >
        {deepseekR1.content}
      </ModulePageProviders>,
    );

    expect(llama3Html).toContain('data-testid="model-at-a-glance"');
    expect(llama3Html).toContain("/docs/models/llama-family");
    expect(llama3Html).toContain(
      "Structured training-regime details are not available yet.",
    );

    expect(qwen3Html).toContain('data-testid="model-at-a-glance"');
    expect(qwen3Html).toContain("/docs/models/qwen-family");
    expect(qwen3Html).toContain(
      "Structured dataset details are not available yet.",
    );

    expect(deepseekR1Html).toContain('data-testid="model-at-a-glance"');
    expect(deepseekR1Html).toContain("/docs/models/deepseek-family");
    expect(deepseekR1Html).toContain(
      "Structured paper links are not available yet.",
    );
  });
});
