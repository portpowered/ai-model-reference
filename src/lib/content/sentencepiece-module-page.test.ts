import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { MODULES_DOCS_ROOT } from "@/lib/content/content-paths";
import {
  expectGlossaryBodyOmitsTitleHeading,
  expectGlossarySingleTagPillList,
  expectHtmlToContainProse,
} from "@/lib/content/glossary-test-helpers";
import { loadModulePage } from "@/lib/content/module-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getModuleById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";

const pageDir = join(MODULES_DOCS_ROOT, "sentencepiece");
const messagesPath = join(pageDir, "messages/en.json");

describe("sentencepiece canonical module page (sentencepiece-page-002)", () => {
  test("registry relationships expose the token glossary as a concrete nearby page", () => {
    const record = getModuleById("module.sentencepiece");

    expect(record?.status).toBe("published");
    expect(record?.moduleType).toBe("tokenizer");
    expect(record?.tags).toEqual(["tokenization", "foundations"]);
    expect(record?.relatedIds).toEqual(["concept.token"]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("module.sentencepiece")).toBe(true);

    const items = deriveCuratedRelatedItems(
      record ??
        (() => {
          throw new Error("expected module.sentencepiece in registry");
        })(),
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const token = items.find((item) => item.registryId === "concept.token");
    expect(token?.href).toBe("/docs/glossary/token");
    expect(token?.isPlanned).toBe(false);
  });

  test("messages explain raw-text segmentation, multilingual value, and the unigram or BPE relationship", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("SentencePiece");
    expect(messages.openingSummary?.toLowerCase()).toContain("raw text");
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "subword",
    );
    expect(messages.sections?.whatItOptimizes.body?.toLowerCase()).toContain(
      "multilingual",
    );
    expect(messages.sections?.practicalBenefit.body?.toLowerCase()).toContain(
      "languages",
    );
    expect(messages.sections?.practicalBenefit.body?.toLowerCase()).toContain(
      "inference",
    );
    expect(
      messages.sections?.comparedToNearbyModules.body?.toLowerCase(),
    ).toContain("unigram");
    expect(messages.sections?.comparedToNearbyModules.body).toContain("BPE");
    expect(messages.math?.sentencepieceSchema?.formula).toContain("\\arg\\max");
    expect(messages.math?.bpeSchema?.formula).toContain("\\operatorname");
  });

  test("page renders the canonical explainer, graph, table, token link, tags, and citation list", async () => {
    const page = await loadModulePage("sentencepiece");

    expect(page.frontmatter.kind).toBe("module");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("module.sentencepiece");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expectGlossarySingleTagPillList(html);
    expect(page.messages.openingSummary).toContain("raw text");
    expectHtmlToContainProse(
      html,
      "SentencePiece is a tokenizer training and segmentation system",
    );
    expect(html).toContain("At a glance");
    expect(html).toContain("What It Optimizes");
    expect(html).toContain('data-graph-id="graph.sentencepiece-compute-flow"');
    expect(html).toContain('data-table-id="table.sentencepiece-comparison"');
    expect(html).toContain('href="/docs/glossary/token"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/tags/tokenization"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain("Kudo, Taku, and John Richardson.");
    expect(html).toContain("https://arxiv.org/abs/1808.06226");
    expect(html).toContain("SentencePiece unigram-style vocabulary selection");
    expect(html).toContain("Byte Pair Encoding merge growth");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("Phase");
  });

  test("search index records SentencePiece as a tokenizer-focused module page", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/modules/sentencepiece",
    );

    expect(document).toBeDefined();
    expect(document?.title).toBe("SentencePiece");
    expect(document?.kind).toBe("module");
    expect(document?.registryId).toBe("module.sentencepiece");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "SentencePiece",
        "sentence piece",
        "sentencepiece tokenizer",
        "sentencepiece unigram",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["tokenization", "foundations"]),
    );
    expect(document?.facets.moduleType).toBe("tokenizer");
    expect(document?.bodyText.toLowerCase()).toContain("raw text");
    expect(document?.bodyText.toLowerCase()).toContain("whitespace");
  });
});
