import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { TOP_K_SAMPLING_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import {
  expectGlossaryBodyOmitsTitleHeading,
  expectGlossaryOmitsOpeningSummary,
  expectGlossarySingleTagPillList,
  expectHtmlToContainProse,
} from "@/lib/content/glossary-test-helpers";
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

const pageDir = TOP_K_SAMPLING_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");
const TOP_K_SAMPLING_TIMEOUT_MS = 15_000;

describe("Phase 5 top-k sampling glossary page (phase-5-sampling-basics-decision-path-003)", () => {
  test("registry record is published with fixed-count aliases, chain tags, and forward top-p relationship", () => {
    const record = getConceptById("concept.top-k-sampling");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "Top K Sampling",
      "top-k sampling",
      "top k sampling",
      "k sampling",
      "fixed-count sampling",
    ]);
    expect(record?.tags).toEqual(["foundations", "token-to-probability-chain"]);
    expect(record?.relatedIds).toEqual([
      "concept.sampling-overview",
      "concept.greedy-decoding",
      "concept.temperature",
      "concept.top-p-sampling",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.top-k-sampling")).toBe(
      true,
    );
  });

  test("sampling overview and greedy decoding surface top-k as the bounded stochastic follow-on page", () => {
    expect(getConceptById("concept.sampling-overview")?.relatedIds).toContain(
      "concept.top-k-sampling",
    );
    expect(getConceptById("concept.greedy-decoding")?.relatedIds).toContain(
      "concept.top-k-sampling",
    );
  });

  test("curated related docs keep published backward links and publish top-p as the next step", () => {
    const source = getConceptById("concept.top-k-sampling");
    if (!source) {
      throw new Error("expected concept.top-k-sampling in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    for (const publishedId of [
      ["concept.sampling-overview", "/docs/glossary/sampling-overview"],
      ["concept.greedy-decoding", "/docs/glossary/greedy-decoding"],
      ["concept.temperature", "/docs/concepts/temperature"],
    ] as const) {
      expect(
        items.some(
          (item) =>
            item.registryId === publishedId[0] &&
            item.href === publishedId[1] &&
            item.isPlanned === false,
        ),
      ).toBe(true);
    }

    expect(
      items.some(
        (item) =>
          item.registryId === "concept.top-p-sampling" &&
          item.href === "/docs/glossary/top-p-sampling" &&
          item.isPlanned === false,
      ),
    ).toBe(true);
  });

  test("messages teach fixed-count truncation and contrast it with argmax and cumulative-mass truncation", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Top-K Sampling");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "top k candidates",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "discards everything below that cutoff",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "smaller k values",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "larger k values",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "diversity",
    );
    expect(messages.sections?.simpleExample.body?.toLowerCase()).toContain(
      "greedy decoding",
    );
    expect(messages.sections?.simpleExample.body?.toLowerCase()).toContain(
      "top-p sampling",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "fixed number of candidates",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "cumulative probability mass",
    );
  });

  test(
    "page renders fixed-count teaching copy, published backward links, and a published top-p link",
    async () => {
      const page = await loadGlossaryPage("top-k-sampling");

      expect(page.frontmatter.kind).toBe("glossary");
      expect(page.frontmatter.status).toBe("published");
      expect(page.frontmatter.registryId).toBe("concept.top-k-sampling");

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
        "Top-k sampling first sorts the next-token distribution by probability, keeps only the top k candidates, discards everything below that cutoff, and then samples from the remaining set.",
      );
      expectHtmlToContainProse(
        html,
        "Top-p sampling would instead keep however many tokens are needed to cross a cumulative probability threshold, so its candidate count can change from one step to the next.",
      );
      expect(html).toContain('href="/docs/glossary/sampling-overview"');
      expect(html).toContain('href="/docs/glossary/greedy-decoding"');
      expect(html).toContain('href="/docs/concepts/temperature"');
      expect(html).toContain('href="/docs/glossary/top-p-sampling"');
      expect(html).toContain('data-testid="curated-related-docs"');
      expect(html).not.toContain('data-planned="true"');
      expect(html).toContain("Top-P Sampling");
      expect(html).not.toContain("Reader Shortcut");
    },
    { timeout: TOP_K_SAMPLING_TIMEOUT_MS },
  );

  test(
    "search index records top-k sampling as a glossary page with aliases",
    async () => {
      const registry = await loadRegistry();
      const pages = await loadPublishedDocsPages("en");
      const documents = buildSearchDocuments(pages, registry);

      const document = documents.find(
        (entry) => entry.url === "/docs/glossary/top-k-sampling",
      );
      expect(document?.kind).toBe("glossary");
      expect(document?.facets.kind).toBe("glossary");
      expect(document?.aliases).toEqual(
        expect.arrayContaining([
          "Top K Sampling",
          "top-k sampling",
          "top k sampling",
          "k sampling",
          "fixed-count sampling",
        ]),
      );
      expect(document?.tags).toEqual(
        expect.arrayContaining(["foundations", "token-to-probability-chain"]),
      );
    },
    { timeout: TOP_K_SAMPLING_TIMEOUT_MS },
  );

  test(
    "search finds top-k sampling by title, aliases, and fixed-count truncation terms",
    async () => {
      for (const query of [
        "Top-K Sampling",
        "top k sampling",
        "k sampling",
        "restrict choices to the highest-probability tokens",
      ] as const) {
        const results = await docsSearchApi.search(query);
        expect(
          results.some(
            (result) => result.url === "/docs/glossary/top-k-sampling",
          ),
        ).toBe(true);
      }
    },
    { timeout: TOP_K_SAMPLING_TIMEOUT_MS },
  );
});
