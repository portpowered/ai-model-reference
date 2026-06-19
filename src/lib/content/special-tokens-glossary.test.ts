import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { SPECIAL_TOKENS_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import {
  expectGlossaryBodyOmitsTitleHeading,
  expectGlossaryOmitsOpeningSummary,
  expectGlossarySingleTagPillList,
  expectHtmlToContainProse,
} from "@/lib/content/glossary-test-helpers";
import { loadModulePage } from "@/lib/content/module-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const pageDir = SPECIAL_TOKENS_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("special tokens glossary page (special-tokens-page-002)", () => {
  test("registry record is now backed by a published glossary route", () => {
    const record = getConceptById("concept.special-tokens");

    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("special-tokens");
    expect(record?.tags).toEqual(["tokenization", "foundations"]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.special-tokens")).toBe(
      true,
    );
  });

  test("messages explain reserved markers, BOS and EOS, padding, and chat formatting", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Special Tokens");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "reserved",
    );
    expect(messages.sections?.whatItIs.body).toContain("BOS");
    expect(messages.sections?.whatItIs.body).toContain("EOS");
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "padding token",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "chat",
    );
    expect(messages.sections?.simpleExample.body?.toLowerCase()).toContain(
      "batch",
    );
    expect(messages.sections?.whereYouSeeThem.body?.toLowerCase()).toContain(
      "prompt templates",
    );
    expect(messages.sections?.commonConfusions.body).toContain(
      "byte pair encoding (BPE)",
    );
  });

  test("page renders the canonical glossary route with practical links to tokenization and prompting surfaces", async () => {
    const page = await loadGlossaryPage("special-tokens");

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.special-tokens");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expectGlossaryOmitsOpeningSummary(html);
    expectGlossarySingleTagPillList(html);
    expectHtmlToContainProse(
      html,
      "A special token is a vocabulary entry that is set aside for a predefined job instead of representing an ordinary piece of user text.",
    );
    expectHtmlToContainProse(
      html,
      "A chat-style format might also add a BOS token at the front, separator or role markers between turns, and an EOS token at the end",
    );
    expect(html).toContain('href="/docs/glossary/token"');
    expect(html).toContain('href="/docs/modules/bpe"');
    expect(html).toContain('href="/docs/glossary/conditioning"');
    expect(html).toContain('href="/docs/glossary/prefill"');
    expect(html).toContain('href="/docs/models/gpt-3"');
    expect(html).toContain('href="/tags/tokenization"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
  });

  test("registry record, shipped route, and default English messages resolve the same canonical search document", async () => {
    const registry = await loadRegistry();
    const page = await loadGlossaryPage("special-tokens");
    const pages = await loadPublishedDocsPages("en");
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const record = registry.byId.get("concept.special-tokens");

    expect(record?.slug).toBe("special-tokens");
    expect(page.frontmatter.registryId).toBe("concept.special-tokens");
    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);

    const publishedPage = pages.find(
      (entry) => entry.docsSlug === "glossary/special-tokens",
    );
    expect(publishedPage?.url).toBe("/docs/glossary/special-tokens");
    expect(publishedPage?.frontmatter.registryId).toBe(
      "concept.special-tokens",
    );
    expect(publishedPage?.messages.title).toBe(bundledMessages.title);

    const searchDocument = buildSearchDocuments(pages, registry).find(
      (entry) => entry.url === "/docs/glossary/special-tokens",
    );
    expect(searchDocument?.registryId).toBe("concept.special-tokens");
    expect(searchDocument?.title).toBe(bundledMessages.title);
    expect(searchDocument?.aliases).toEqual(
      expect.arrayContaining(["special token", "control token"]),
    );
    expect(searchDocument?.relatedIds).toEqual(record?.relatedIds ?? []);
  });

  test("curated related docs keep tokenizer, prompting, and model paths connected", () => {
    const source = getConceptById("concept.special-tokens");
    if (!source) {
      throw new Error("expected concept.special-tokens in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.some(
        (item) =>
          item.registryId === "concept.token" &&
          item.href === "/docs/glossary/token",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "module.bpe" && item.href === "/docs/modules/bpe",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "concept.conditioning" &&
          item.href === "/docs/glossary/conditioning",
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "concept.prefill" &&
          item.href === "/docs/glossary/prefill",
      ),
    ).toBe(true);
  });

  test.each([
    "special tokens",
    "BOS EOS",
    "padding token",
    "control token",
  ] as const)("%s query routes discovery into the canonical special-tokens page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe("/docs/glossary/special-tokens");
  });

  test("token glossary renders a navigable related-doc link to special tokens", async () => {
    const page = await loadGlossaryPage("token");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('href="/docs/glossary/special-tokens"');
  });

  test("neighboring tokenizer, prompt-adjacent, and vocabulary pages render navigable links back to special tokens", async () => {
    const [bpe, conditioning, vocabularySize] = await Promise.all([
      loadModulePage("bpe"),
      loadGlossaryPage("conditioning"),
      loadGlossaryPage("vocabulary-size"),
    ]);

    const bpeHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: bpe.messages,
        assets: bpe.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: bpe.content,
      }),
    );
    const conditioningHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: conditioning.messages,
        assets: conditioning.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: conditioning.content,
      }),
    );
    const vocabularySizeHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: vocabularySize.messages,
        assets: vocabularySize.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: vocabularySize.content,
      }),
    );

    expect(bpeHtml).toContain('href="/docs/glossary/special-tokens"');
    expect(conditioningHtml).toContain('href="/docs/glossary/special-tokens"');
    expect(vocabularySizeHtml).toContain(
      'href="/docs/glossary/special-tokens"',
    );
  });
});
