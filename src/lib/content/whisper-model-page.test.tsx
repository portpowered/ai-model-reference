import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  getContentRoot,
  getModelsDocsRoot,
  getRegistryRoot,
} from "@/lib/content/content-paths";
import { loadModelPage } from "@/lib/content/model-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  getPublishedDocsEntryByRegistryId,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getModelById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { validateGeneratedPageBundle } from "@/lib/content/validate-generated-page-bundle";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";
import { source } from "@/lib/source";

const WHISPER_SLUG = "whisper";
const WHISPER_URL = "/docs/models/whisper";

const REPRESENTATIVE_SEARCH_QUERIES = [
  "Whisper",
  "OpenAI Whisper",
  "speech recognition",
  "automatic speech recognition",
  "speech translation",
];

const RELATED_DOC_HREFS = [
  "/docs/glossary/encoder-decoder",
  "/docs/concepts/tokenizers-overview",
  "/docs/glossary/multimodal-model",
  "/docs/modules/cross-attention",
  "/docs/modules/bpe",
] as const;

function pageBaseUrl(url: string): string {
  return url.split("#")[0] ?? url;
}

describe("whisper model page (whisper-model-page-current-main-003)", () => {
  test("published docs registry resolves the canonical whisper route", () => {
    expect(PUBLISHED_DOCS_REGISTRY_IDS).toContain("model.whisper");

    const entry = getPublishedDocsEntryByRegistryId("model.whisper");
    expect(entry?.url).toBe(WHISPER_URL);
    expect(entry?.slug).toBe(WHISPER_SLUG);
  });

  test("registry record matches the published page frontmatter contract", () => {
    const record = getModelById("model.whisper");
    expect(record?.slug).toBe(WHISPER_SLUG);
    expect(record?.status).toBe("published");
    expect(record?.aliases).toContain("OpenAI Whisper");
    expect(record?.aliases).toContain("automatic speech recognition");
    expect(record?.aliases).toContain("speech translation");
  });

  test("route, registry record, English bundle, and search document resolve together", async () => {
    expect(source.getPage(["models", WHISPER_SLUG])).toBeDefined();

    const modelsDocsRoot = getModelsDocsRoot();
    const pageDirectory = join(modelsDocsRoot, WHISPER_SLUG);
    const registryRoot = getRegistryRoot();
    const indexes = await loadRegistry({ registryRoot });

    const errors = await validateGeneratedPageBundle({
      registryRoot,
      docsRoot: join(getContentRoot(), "docs"),
      pageDirectory,
      registryPath: join(registryRoot, "models", `${WHISPER_SLUG}.json`),
      pageUrl: WHISPER_URL,
      indexes,
    });

    expect(errors).toEqual([]);

    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, indexes);
    const document = documents.find((entry) => entry.url === WHISPER_URL);

    expect(document?.kind).toBe("model");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "Whisper",
        "OpenAI Whisper",
        "speech recognition",
        "automatic speech recognition",
        "speech translation",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["model-family", "tokenization"]),
    );
    expect(document?.relatedIds).toEqual(
      expect.arrayContaining([
        "concept.encoder-decoder",
        "concept.tokenizers-overview",
        "concept.multimodal-model",
        "module.cross-attention",
        "module.bpe",
      ]),
    );
  });

  test.each(
    REPRESENTATIVE_SEARCH_QUERIES,
  )("search ranks the canonical whisper page for %s", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(WHISPER_URL);
  });

  test("curated related docs connect encoder-decoder, tokenization, and multimodal paths", () => {
    const model = getModelById("model.whisper");
    if (!model) {
      throw new Error("expected model.whisper in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      model,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    for (const href of RELATED_DOC_HREFS) {
      expect(items.some((item) => item.href === href && !item.isPlanned)).toBe(
        true,
      );
    }
  });

  test("derived related docs and tag areas surface discovery links on the page", async () => {
    const relatedHtml = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="model.whisper"
        groups={[
          "same-model-family",
          "shared-modules",
          "shared-training-regimes",
          "shared-tags",
          "curated-related",
        ]}
      />,
    );

    for (const href of RELATED_DOC_HREFS) {
      expect(relatedHtml).toContain(`href="${href}"`);
    }

    const page = await loadModelPage(WHISPER_SLUG);
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('href="/tags/model-family"');
    expect(html).toContain('href="/tags/tokenization"');
    for (const href of RELATED_DOC_HREFS) {
      expect(html).toContain(`href="${href}"`);
    }
  });

  test("architecture and training narrative explains audio-to-text flow and task framing", async () => {
    const page = await loadModelPage(WHISPER_SLUG);
    const messages = page.messages;

    expect(messages.openingSummary).toContain("OpenAI's Whisper model family");
    expect(messages.openingSummary).toContain("automatic speech recognition");
    expect(messages.openingSummary).toContain("speech translation");
    expect(messages.sections?.inputsAndOutputs?.body).toContain("transcrib");
    expect(messages.sections?.inputsAndOutputs?.body).toContain("translation");
    expect(messages.sections?.architecture?.body).toMatch(
      /spectrogram|time-frequency/i,
    );
    expect(messages.sections?.architecture?.body).toContain("encoder");
    expect(messages.sections?.architecture?.body).toContain("decoder");
    expect(messages.sections?.training?.body).toContain("weak supervision");
    expect(messages.sections?.training?.body).toMatch(/robust/i);
  });

  test("rendered prose auto-links architecture, tokenization, and multimodal discovery targets", async () => {
    const page = await loadModelPage(WHISPER_SLUG);
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('href="/docs/glossary/encoder-decoder"');
    expect(html).toContain('href="/docs/concepts/tokenizers-overview"');
    expect(html).toContain('href="/docs/glossary/multimodal-model"');
    expect(page.messages.sections?.training?.body).toMatch(/rather than/i);
  });

  test("page renders core explainer sections and registry-backed metadata", async () => {
    const page = await loadModelPage(WHISPER_SLUG);
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(page.frontmatter.registryId).toBe("model.whisper");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.openingSummary).toContain(
      "OpenAI's Whisper model family",
    );
    expect(page.messages.openingSummary).toContain("encoder-decoder");
    expect(html).toContain("spectrogram");
    expect(html).toContain("weak supervision");
    expect(html).toContain("automatic speech recognition");
    expect(html).toContain("speech translation");
    expect(html).toContain("What It Is");
    expect(html).toContain("Inputs And Outputs");
    expect(html).toContain("Architecture");
    expect(html).toContain("Important Modules");
    expect(html).toContain("Training");
    expect(html).toContain("Practical Notes");
    expect(html).toContain("Whisper");
    expect(html).toContain("OpenAI");
    expect(html).toContain('href="/docs/modules/cross-attention"');
    expect(html).toContain('href="/docs/modules/bpe"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain('href="https://arxiv.org/abs/2212.04356"');
    expect(html).toContain('href="https://github.com/openai/whisper"');
    expect(html).toContain(
      'href="https://huggingface.co/openai/whisper-large-v3"',
    );
    expect(html).not.toContain("missing-content");
    expect(html).not.toContain("No modules listed yet.");
  });
});
