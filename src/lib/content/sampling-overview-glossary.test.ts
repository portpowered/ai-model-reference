import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { SAMPLING_OVERVIEW_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
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

const pageDir = SAMPLING_OVERVIEW_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("Phase 5 sampling overview glossary page (phase-5-sampling-basics-decision-path-001)", () => {
  test("registry record is published and links backward to foundations and forward to planned decoding pages", () => {
    const record = getConceptById("concept.sampling-overview");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "sampling overview",
      "token sampling",
      "next-token sampling",
      "sampling basics",
    ]);
    expect(record?.relatedIds).toEqual([
      "concept.temperature",
      "concept.softmax",
      "concept.autoregressive-generation",
      "concept.greedy-decoding",
      "concept.top-k-sampling",
      "concept.top-p-sampling",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.sampling-overview")).toBe(
      true,
    );
  });

  test("temperature, softmax, entropy, and autoregressive generation surface sampling overview as a nearby next step", () => {
    expect(getConceptById("concept.temperature")?.relatedIds).toContain(
      "concept.sampling-overview",
    );
    expect(getConceptById("concept.softmax")?.relatedIds).toContain(
      "concept.sampling-overview",
    );
    expect(getConceptById("concept.entropy")?.relatedIds).toContain(
      "concept.sampling-overview",
    );
    expect(
      getConceptById("concept.autoregressive-generation")?.relatedIds,
    ).toContain("concept.sampling-overview");
  });

  test("curated related docs preserve published links backward and planned forward rows for the three follow-on decoding pages", () => {
    const source = getConceptById("concept.sampling-overview");
    if (!source) {
      throw new Error("expected concept.sampling-overview in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.some(
        (item) =>
          item.registryId === "concept.temperature" &&
          item.href === "/docs/glossary/temperature" &&
          item.isPlanned === false,
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "concept.softmax" &&
          item.href === "/docs/glossary/softmax" &&
          item.isPlanned === false,
      ),
    ).toBe(true);
    expect(
      items.some(
        (item) =>
          item.registryId === "concept.autoregressive-generation" &&
          item.href === "/docs/glossary/autoregressive-generation" &&
          item.isPlanned === false,
      ),
    ).toBe(true);

    for (const plannedId of [
      "concept.greedy-decoding",
      "concept.top-k-sampling",
      "concept.top-p-sampling",
    ] as const) {
      expect(
        items.some(
          (item) =>
            item.registryId === plannedId &&
            item.href === undefined &&
            item.isPlanned === true,
        ),
      ).toBe(true);
    }
  });

  test("messages explain the final next-token choice and distinguish greedy, top-k, and top-p in plain language", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Sampling Overview");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "final choice step",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "diversity",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "stability",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "control",
    );
    expect(messages.sections?.simpleExample.body?.toLowerCase()).toContain(
      "greedy decoding",
    );
    expect(messages.sections?.simpleExample.body?.toLowerCase()).toContain(
      "top-k sampling",
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

  test("page renders overview tradeoff copy, published backward links, and planned forward rows", async () => {
    const page = await loadGlossaryPage("sampling-overview");

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.sampling-overview");

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
      "people use sampling settings to balance diversity, stability, and control rather than to change the model's underlying knowledge",
    );
    expectHtmlToContainProse(
      html,
      "top-k keeps a fixed number of candidates while top-p keeps a variable number of candidates based on cumulative probability mass",
    );
    expect(html).toContain('href="/docs/glossary/temperature"');
    expect(html).toContain('href="/docs/glossary/softmax"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-planned="true"');
    expect(html).toContain("Greedy Decoding");
    expect(html).toContain("Top K Sampling");
    expect(html).toContain("Top P Sampling");
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search index records sampling overview as a glossary page with aliases", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/glossary/sampling-overview",
    );
    expect(document?.kind).toBe("glossary");
    expect(document?.facets.kind).toBe("glossary");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "sampling overview",
        "token sampling",
        "next-token sampling",
        "sampling basics",
      ]),
    );
    expect(document?.tags).toEqual(expect.arrayContaining(["foundations"]));
  });

  test("search finds sampling overview by title, aliases, and next-token choice terms", async () => {
    for (const query of [
      "Sampling Overview",
      "token sampling",
      "next-token sampling",
      "choose the next token from a probability distribution",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(
        results.some(
          (result) => result.url === "/docs/glossary/sampling-overview",
        ),
      ).toBe(true);
    }
  });
});
