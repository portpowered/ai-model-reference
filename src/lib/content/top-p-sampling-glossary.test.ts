import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { TOP_P_SAMPLING_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
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

const pageDir = TOP_P_SAMPLING_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("Phase 5 top-p sampling glossary page (phase-5-sampling-basics-decision-path-004)", () => {
  test("registry record is published with nucleus aliases, chain tags, and nearby backward links", () => {
    const record = getConceptById("concept.top-p-sampling");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "Top-P Sampling",
      "top-p sampling",
      "top p sampling",
      "nucleus sampling",
      "cumulative-mass sampling",
    ]);
    expect(record?.tags).toEqual(["foundations", "token-to-probability-chain"]);
    expect(record?.relatedIds).toEqual([
      "concept.sampling-overview",
      "concept.greedy-decoding",
      "concept.top-k-sampling",
      "concept.temperature",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.top-p-sampling")).toBe(
      true,
    );
  });

  test("sampling overview, greedy decoding, and top-k sampling all surface top-p as a published next step", () => {
    expect(getConceptById("concept.sampling-overview")?.relatedIds).toContain(
      "concept.top-p-sampling",
    );
    expect(getConceptById("concept.greedy-decoding")?.relatedIds).toContain(
      "concept.top-p-sampling",
    );
    expect(getConceptById("concept.top-k-sampling")?.relatedIds).toContain(
      "concept.top-p-sampling",
    );
  });

  test("curated related docs keep the completed chain traversable without a dead end", () => {
    const source = getConceptById("concept.top-p-sampling");
    if (!source) {
      throw new Error("expected concept.top-p-sampling in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    for (const publishedId of [
      ["concept.sampling-overview", "/docs/glossary/sampling-overview"],
      ["concept.greedy-decoding", "/docs/glossary/greedy-decoding"],
      ["concept.top-k-sampling", "/docs/glossary/top-k-sampling"],
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
  });

  test("messages teach nucleus sampling, cumulative-mass truncation, and the variable candidate count", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Top-P Sampling");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "cumulative probability mass",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "threshold p",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "number of eligible tokens can change",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "stability",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "diversity",
    );
    expect(messages.sections?.simpleExample.body?.toLowerCase()).toContain(
      "greedy decoding",
    );
    expect(messages.sections?.simpleExample.body?.toLowerCase()).toContain(
      "top-k sampling",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "nucleus sampling",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "variable number",
    );
  });

  test("page renders cumulative-mass teaching copy and published nearby links", async () => {
    const page = await loadGlossaryPage("top-p-sampling");

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.top-p-sampling");

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
      "Top-p sampling sorts the next-token distribution from most likely to least likely, keeps the smallest prefix whose cumulative probability mass crosses a chosen threshold p, and then samples from that retained set.",
    );
    expectHtmlToContainProse(
      html,
      "Top-k sampling would keep a fixed number of candidates even if the distribution became much sharper or flatter on the next step.",
    );
    expect(html).toContain('href="/docs/glossary/sampling-overview"');
    expect(html).toContain('href="/docs/glossary/greedy-decoding"');
    expect(html).toContain('href="/docs/glossary/top-k-sampling"');
    expect(html).toContain('href="/docs/concepts/temperature"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain('data-planned="true"');
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search index records top-p sampling as a glossary page with aliases", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/glossary/top-p-sampling",
    );
    expect(document?.kind).toBe("glossary");
    expect(document?.facets.kind).toBe("glossary");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "Top-P Sampling",
        "top-p sampling",
        "top p sampling",
        "nucleus sampling",
        "cumulative-mass sampling",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["foundations", "token-to-probability-chain"]),
    );
  });

  test("search finds top-p sampling by title, aliases, and cumulative-mass terms", async () => {
    for (const query of [
      "Top-P Sampling",
      "nucleus sampling",
      "cumulative-mass sampling",
      "smallest set whose cumulative probability mass crosses a threshold",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(
        results.some(
          (result) => result.url === "/docs/glossary/top-p-sampling",
        ),
      ).toBe(true);
    }
  });
});
