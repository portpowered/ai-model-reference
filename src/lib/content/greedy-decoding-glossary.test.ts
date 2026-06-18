import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { GREEDY_DECODING_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
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

const pageDir = GREEDY_DECODING_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("Phase 5 greedy decoding glossary page (phase-5-sampling-basics-decision-path-002)", () => {
  test("registry record is published with greedy aliases, chain tags, and forward sampling relationships", () => {
    const record = getConceptById("concept.greedy-decoding");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "Greedy Decoding",
      "greedy decoding",
      "argmax decoding",
      "deterministic decoding",
      "highest-probability decoding",
    ]);
    expect(record?.tags).toEqual(["foundations", "token-to-probability-chain"]);
    expect(record?.relatedIds).toEqual([
      "concept.sampling-overview",
      "concept.temperature",
      "concept.autoregressive-generation",
      "concept.top-k-sampling",
      "concept.top-p-sampling",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.greedy-decoding")).toBe(
      true,
    );
  });

  test("sampling overview, temperature, and autoregressive generation surface greedy decoding as the deterministic baseline", () => {
    expect(getConceptById("concept.sampling-overview")?.relatedIds).toContain(
      "concept.greedy-decoding",
    );
    expect(getConceptById("concept.temperature")?.relatedIds).toContain(
      "concept.greedy-decoding",
    );
    expect(
      getConceptById("concept.autoregressive-generation")?.relatedIds,
    ).toContain("concept.greedy-decoding");
  });

  test("curated related docs keep published backward links and planned forward rows for top-k and top-p", () => {
    const source = getConceptById("concept.greedy-decoding");
    if (!source) {
      throw new Error("expected concept.greedy-decoding in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.some(
        (item) =>
          item.registryId === "concept.sampling-overview" &&
          item.href === "/docs/glossary/sampling-overview" &&
          item.isPlanned === false,
      ),
    ).toBe(true);
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
          item.registryId === "concept.autoregressive-generation" &&
          item.href === "/docs/glossary/autoregressive-generation" &&
          item.isPlanned === false,
      ),
    ).toBe(true);

    for (const plannedId of [
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

  test("messages teach argmax, determinism, and the stability-versus-diversity tradeoff in plain language", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Greedy Decoding");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain("argmax");
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "highest probability",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "deterministic",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "stable",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "repeatable",
    );
    expect(messages.sections?.simpleExample.body?.toLowerCase()).toContain(
      "top-k sampling",
    );
    expect(messages.sections?.simpleExample.body?.toLowerCase()).toContain(
      "top-p sampling",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "temperature",
    );
  });

  test("page renders argmax teaching copy, published backward links, and planned forward alternatives", async () => {
    const page = await loadGlossaryPage("greedy-decoding");

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.greedy-decoding");

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
      "In math language, that is an argmax choice.",
    );
    expectHtmlToContainProse(
      html,
      "The same prompt and model state produce the same next token each time.",
    );
    expect(html).toContain('href="/docs/glossary/sampling-overview"');
    expect(html).toContain('href="/docs/glossary/temperature"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-planned="true"');
    expect(html).toContain("Top K Sampling");
    expect(html).toContain("Top P Sampling");
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search index records greedy decoding as a glossary page with aliases", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/glossary/greedy-decoding",
    );
    expect(document?.kind).toBe("glossary");
    expect(document?.facets.kind).toBe("glossary");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "Greedy Decoding",
        "greedy decoding",
        "argmax decoding",
        "deterministic decoding",
        "highest-probability decoding",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["foundations", "token-to-probability-chain"]),
    );
  });

  test("search finds greedy decoding by title, aliases, and deterministic-decoding terms", async () => {
    for (const query of [
      "Greedy Decoding",
      "argmax decoding",
      "deterministic decoding",
      "highest probability token",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(
        results.some(
          (result) => result.url === "/docs/glossary/greedy-decoding",
        ),
      ).toBe(true);
    }
  });
});
