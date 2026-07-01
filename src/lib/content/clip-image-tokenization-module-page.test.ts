import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { CLIP_IMAGE_TOKENIZATION_PAGE_DIR } from "@/lib/content/content-paths";
import {
  expectGlossaryBodyOmitsTitleHeading,
  expectHtmlToContainProse,
} from "@/lib/content/glossary-test-helpers";
import { loadModulePage } from "@/lib/content/module-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { getRegistryRecordById } from "@/lib/content/registry-runtime";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const pageDir = CLIP_IMAGE_TOKENIZATION_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");
const CLIP_IMAGE_TOKENIZATION_URL = "/docs/modules/clip-image-tokenization";
const TOKENIZER_CLASSIFICATION_ID = "classification.module.tokenization";

describe("clip-image-tokenization page messages", () => {
  test("includes required localized fields for the module template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("CLIP Image Tokenization");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body?.length).toBeGreaterThan(0);
    expect(
      messages.math?.patchProjectionSchema?.variableDefinitions?.zi?.term,
    ).toBe("z_i");
  });
});

describe("loadModulePage clip-image-tokenization", () => {
  test("compiles MDX with local namespaces and message-driven CLIP image tokenization copy", async () => {
    const page = await loadModulePage("clip-image-tokenization");

    expect(page.frontmatter.registryId).toBe("module.clip-image-tokenization");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("CLIP Image Tokenization");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expect(page.messages.openingSummary).toContain("patch");
    expectHtmlToContainProse(
      html,
      "CLIP image tokenization is a vision tokenizer",
    );
    expect(html).toContain("characters or subwords");
    expect(html).toContain("linguistic rather than spatial");
    expect(html).toContain("224×224");
    expect(html).toContain("16×16");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("Phase");
    expect(html).toContain("At a glance");
    expect((html.match(/data-testid="tag-pill-list"/g) ?? []).length).toBe(1);
    expect(html).toContain('href="/tags/tokenization"');
    expect(html).toContain('href="/docs/concepts/tokenizers-overview"');
    expect(html).toContain('href="/docs/glossary/patch"');
    expect(html).toContain('href="/docs/glossary/multimodal-model"');
    expect(html).toContain('href="/docs/modules/bpe"');
    expect(html).toContain(
      'href="/docs/modules/learned-positional-embeddings"',
    );
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain("Radford");
    expect(html).toContain('href="https://arxiv.org/abs/2103.00020"');
    expect(html).toContain("Dosovitskiy");
    expect(html).toContain('href="https://arxiv.org/abs/2010.11929"');
    expect(html).toContain(
      'data-graph-id="graph.clip-image-tokenization-compute-flow"',
    );
    expect(html).toContain('data-math-schema="patchSplit"');
    expect(html).toContain('data-math-schema="patchProjection"');
  });

  test("published route is discoverable through source and search documents", async () => {
    const pages = await loadPublishedDocsPages("en");
    expect(pages.some((page) => page.url === CLIP_IMAGE_TOKENIZATION_URL)).toBe(
      true,
    );

    const documents = buildSearchDocuments(pages, await loadRegistry());
    const clipDocument = documents.find(
      (document) => document.url === CLIP_IMAGE_TOKENIZATION_URL,
    );

    expect(clipDocument).toBeDefined();
    expect(clipDocument?.aliases).toContain("CLIP image tokenization");
    expect(clipDocument?.aliases).toContain("image patch tokenization");
    expect(clipDocument?.tags).toContain("tokenization");
    expect(clipDocument?.relatedIds).toContain("concept.tokenizers-overview");
    expect(clipDocument?.relatedIds).toContain("concept.patch");
  });

  test.each([
    "CLIP image tokenization",
    "image patch tokenization",
    "CLIP patch tokenization",
  ] as const)("search ranks the canonical CLIP image tokenization page for %s", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url.split("#")[0]).toBe(CLIP_IMAGE_TOKENIZATION_URL);
  });
});

describe("clip-image-tokenization page assets and registry", () => {
  test("resolves graph and table assets with message-backed copy", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.computeFlow.type).toBe("graph");
    expect(assets.comparisonTable.type).toBe("table");
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });

  test("published registry record keeps tokenizer-family metadata", () => {
    const record = getRegistryRecordById("module.clip-image-tokenization");
    expect(record?.kind).toBe("module");
    if (record?.kind !== "module") {
      throw new Error(
        "expected module.clip-image-tokenization in registry runtime",
      );
    }

    expect(record.status).toBe("published");
    expect(record.moduleType).toBe("tokenizer");
    expect(record.moduleFamily).toBe("tokenization");
    expect(record.primaryClassificationId).toBe(TOKENIZER_CLASSIFICATION_ID);
    expect(record.citationIds).toContain(
      "citation.learning-transferable-visual-models-from-natural-language-supervision",
    );
    expect(record.citationIds).toContain("citation.image-is-worth-16x16-words");
  });
});
