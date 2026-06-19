import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { TOKENIZER_MISMATCH_PAGE_DIR } from "@/lib/content/content-paths";
import { expectGlossaryBodyOmitsTitleHeading } from "@/lib/content/glossary-test-helpers";
import { loadModulePage } from "@/lib/content/module-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { getRegistryRecordById } from "@/lib/content/registry-runtime";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const pageDir = TOKENIZER_MISMATCH_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

describe("tokenizer-mismatch page messages", () => {
  test("includes the required localized fields for the canonical module page", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Tokenizer mismatch");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body?.length).toBeGreaterThan(0);
    expect(messages.openingSummary).toContain("chat-template boundaries");
    expect(messages.sections?.howItWorks.body).toContain("shift token counts");
    expect(messages.sections?.howItWorks.body).toContain("wrong rows");
    expect(messages.sections?.limitationsAndTradeoffs.body).toContain(
      "chat separators",
    );
  });
});

describe("loadModulePage tokenizer-mismatch", () => {
  test("keeps the canonical tokenizer-mismatch runtime contract aligned across route, registry, English messages, and discovery", async () => {
    const [pages, registry, messages] = await Promise.all([
      loadPublishedDocsPages("en"),
      loadRegistry(),
      loadUiMessages(),
    ]);
    const page = pages.find(
      (entry) => entry.url === "/docs/modules/tokenizer-mismatch",
    );

    expect(page).toBeDefined();
    expect(page?.frontmatter.registryId).toBe("module.tokenizer-mismatch");
    expect(page?.messages.title).toBe("Tokenizer mismatch");
    expect(page?.messages.openingSummary?.length).toBeGreaterThan(0);

    const record = getRegistryRecordById("module.tokenizer-mismatch");
    expect(record?.kind).toBe("module");
    if (record?.kind !== "module") {
      throw new Error("expected module.tokenizer-mismatch in registry runtime");
    }

    expect(record.status).toBe("published");
    expect(record.moduleType).toBe("tokenizer");
    expect(record.moduleFamily).toBe("tokenization");
    expect(record.slug).toBe("tokenizer-mismatch");
    expect(record.tags).toEqual(
      expect.arrayContaining(["tokenization", "foundations"]),
    );

    const searchDocument = buildSearchDocuments(pages, registry).find(
      (entry) => entry.url === "/docs/modules/tokenizer-mismatch",
    );
    expect(searchDocument?.aliases).toEqual(
      expect.arrayContaining([
        "tokenizer mismatch",
        "wrong tokenizer",
        "special token mismatch",
      ]),
    );

    const groups = await loadTagResourceGroups("tokenization", messages, "en");
    expect(
      groups
        .flatMap((group) => group.resources)
        .some(
          (resource) => resource.url === "/docs/modules/tokenizer-mismatch",
        ),
    ).toBe(true);
  });

  test("published docs inventory resolves the canonical route, registry id, and English messages together", async () => {
    const pages = await loadPublishedDocsPages("en");
    const page = pages.find(
      (entry) => entry.url === "/docs/modules/tokenizer-mismatch",
    );

    expect(page).toBeDefined();
    expect(page?.frontmatter.registryId).toBe("module.tokenizer-mismatch");
    expect(page?.messages.title).toBe("Tokenizer mismatch");
    expect(page?.messages.openingSummary?.length).toBeGreaterThan(0);
  });

  test("shell keeps the folded opening summary outside the article body and starts with at-a-glance", async () => {
    const page = await loadModulePage("tokenizer-mismatch");
    const html = renderModuleDocsShell(page);

    const atAGlanceIndex = html.indexOf('aria-label="At a glance"');
    const whatItIsIndex = html.indexOf('id="what-it-is"');

    expect(html).not.toContain('data-testid="folded-summary"');
    expect(html).not.toContain('data-opening-summary="folded"');
    if (atAGlanceIndex >= 0) {
      expect(atAGlanceIndex).toBeLessThan(whatItIsIndex);
    }
    expect(whatItIsIndex).toBeGreaterThanOrEqual(0);
  });

  test("compiles MDX with local namespaces and renders tokenizer compatibility content", async () => {
    const page = await loadModulePage("tokenizer-mismatch");

    expect(page.frontmatter.registryId).toBe("module.tokenizer-mismatch");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Tokenizer mismatch");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expect(html).toContain("broad compatibility problem");
    expect(html).toContain("reader intends one text sequence");
    expect(html).toContain("prompt wrapper before inference");
    expect(html).toContain("chat-template wrappers");
    expect(html).toContain("wrong rows");
    expect(html).toContain("weaker completions");
    expect(html).toContain("weakens embeddings-based retrieval");
    expect(html).toContain(
      'data-graph-id="graph.tokenizer-mismatch-compute-flow"',
    );
    expect(html).toContain('data-math-schema="tokenizerMismatch"');
    expect(html).toContain('href="/docs/modules/bpe"');
    expect(html).toContain('href="/docs/glossary/embedding"');
    expect(html).toContain('href="/docs/models/gpt-3"');
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search documents and live search surface tokenizer mismatch for representative tokenizer failure queries", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find(
      (entry) => entry.url === "/docs/modules/tokenizer-mismatch",
    );

    expect(document?.kind).toBe("module");
    expect(document?.facets.kind).toBe("module");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "tokenizer mismatch",
        "wrong tokenizer",
        "special token mismatch",
        "prompt token mismatch",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["tokenization", "foundations"]),
    );
    expect(document?.bodyText).toContain("chat-template wrappers");
    expect(document?.bodyText).toContain("weakens embeddings-based retrieval");

    for (const query of [
      "tokenizer mismatch",
      "wrong tokenizer",
      "special token mismatch",
      "prompt token mismatch",
    ] as const) {
      const results = await docsSearchApi.search(query);

      expect(results.length).toBeGreaterThan(0);
      expect(
        results.some(
          (result) => result.url === "/docs/modules/tokenizer-mismatch",
        ),
      ).toBe(true);
    }
  });

  test("tokenization tag landing page surfaces tokenizer mismatch without typing the direct route", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups("tokenization", messages, "en");
    const moduleGroup = groups.find((group) => group.kind === "module");

    expect(moduleGroup?.resources.map((resource) => resource.url)).toContain(
      "/docs/modules/tokenizer-mismatch",
    );

    const page = await TagLandingPage({
      params: Promise.resolve({ slug: "tokenization" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Tokenization");
    expect(html).toContain('href="/docs/modules/tokenizer-mismatch"');
    expect(html).toContain('href="/search?tag=tokenization"');
  });
});

describe("tokenizer-mismatch page assets", () => {
  test("parses graph and table assets for the canonical module page", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.computeFlow.type).toBe("graph");
    if (assets.computeFlow.type === "graph") {
      expect(assets.computeFlow.graphId).toBe(
        "graph.tokenizer-mismatch-compute-flow",
      );
    }
    expect(assets.comparisonTable.type).toBe("table");
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});
